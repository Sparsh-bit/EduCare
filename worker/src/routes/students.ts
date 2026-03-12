import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'
import { createAuditLog, getClientIp } from '../utils/auditLog'
import { generateAdmissionNo, generateRollNo, generateStudentUid, generateTCNo, getPaginationParams } from '../utils/helpers'
import { uploadToR2, buildR2Key } from '../utils/r2'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── Helper functions (ported from backend) ───

function cleanText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizePhone(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return null
}

function normalizeKey(v: string): string {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeGender(value: unknown): 'male' | 'female' | 'other' {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'male' || v === 'm' || v === 'boy') return 'male'
  if (v === 'female' || v === 'f' || v === 'girl') return 'female'
  return 'other'
}

function valueOrNull(value: unknown): string | null {
  const v = String(value ?? '').trim()
  return v ? v : null
}

function parseClassNumeric(value: unknown): number | null {
  const v = cleanText(value).toLowerCase()
  if (!v) return null
  const num = v.match(/\d+/)
  if (num) {
    const n = Number(num[0])
    if (n >= 1 && n <= 12) return n
  }
  const roman: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 }
  return roman[v] ?? null
}

function normalizeClassDisplay(value: unknown): string {
  const parsed = parseClassNumeric(value)
  if (parsed !== null) return String(parsed)
  const v = cleanText(value)
  if (!v) return ''
  const lv = v.toLowerCase()
  if (lv.includes('nursery')) return 'Nursery'
  if (lv.includes('lkg') || lv.includes('lower kg')) return 'LKG'
  if (lv.includes('ukg') || lv.includes('upper kg')) return 'UKG'
  return v
}

function normalizeSection(value: unknown): string {
  const v = cleanText(value)
  if (!v) return ''
  const m = v.match(/[a-z]/i)
  if (m) return m[0].toUpperCase()
  return v.toUpperCase()
}

function buildDuplicateKey(studentName: unknown, fatherName: unknown, classRef: unknown): string {
  const name = normalizeKey(String(studentName || ''))
  const father = normalizeKey(String(fatherName || ''))
  const cls = normalizeKey(String(classRef || ''))
  if (!name || !cls) return ''
  return `${name}|${father}|${cls}`
}

function resolveClass(classes: Record<string, unknown>[], input: unknown): Record<string, unknown> | null {
  const val = String(input || '').trim()
  if (!val) return null
  const key = normalizeKey(val)
  const byName = classes.find((c) => {
    const cKey = normalizeKey(String(c.name))
    return cKey === key || `class${cKey}` === key || cKey === key.replace('class', '')
  })
  if (byName) return byName
  const numericInput = parseClassNumeric(val)
  if (numericInput !== null) {
    const byGrade = classes.find((c) => parseClassNumeric(String(c.name)) === numericInput)
    if (byGrade) return byGrade
  }
  const numericId = Number(val)
  if (Number.isFinite(numericId) && Number.isInteger(numericId) && numericId > 0) {
    const byId = classes.find((c) => Number(c.id) === numericId)
    if (byId) return byId
  }
  return null
}

function resolveSection(sections: Record<string, unknown>[], classId: number, input: unknown): Record<string, unknown> | null {
  const val = String(input || '').trim()
  if (!val) return null
  const numericId = Number(val)
  if (Number.isFinite(numericId) && numericId > 0) {
    const byId = sections.find((s) => Number(s.id) === numericId && Number(s.class_id) === Number(classId))
    if (byId) return byId
  }
  const key = normalizeKey(val)
  return sections.find((s) => s.class_id === classId && normalizeKey(String(s.name)) === key) || null
}

function parseDateToIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().split('T')[0]
  if (typeof value === 'number') {
    // Excel serial date
    const excelEpochUtcMs = Date.UTC(1899, 11, 30)
    const date = new Date(excelEpochUtcMs + Math.round(value * 86400000))
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString().split('T')[0]
  }
  const asString = String(value).trim()
  if (!asString) return null
  const direct = new Date(asString)
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().split('T')[0]
  const parts = asString.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (parts) {
    const d = parseInt(parts[1], 10)
    const m = parseInt(parts[2], 10)
    let y = parseInt(parts[3], 10)
    if (y < 100) y += 2000
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  return null
}

function parseCsvText(text: string): Array<Record<string, unknown>> {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: Array<Record<string, unknown>> = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const row: Record<string, unknown> = {}
    headers.forEach((h, idx) => { row[h] = cols[idx] ?? '' })
    rows.push(row)
  }
  return rows
}

function buildMappingPayload(mapping: Record<string, string | null>) {
  const fieldLabels: Record<string, string> = {
    name: 'student_name', class_name: 'class', section_name: 'section',
    father_name: 'father_name', mother_name: 'mother_name', phone: 'phone',
    admission_number: 'admission_number', roll_number: 'roll_number',
    dob: 'date_of_birth', address: 'address', gender: 'gender', email: 'email',
  }
  const out: Record<string, { field: string; confidence: number }> = {}
  for (const [target, source] of Object.entries(mapping)) {
    if (!source) continue
    const field = fieldLabels[target] || target
    out[source] = { field, confidence: 85 }
  }
  return out
}

function autoMapHeaders(headers: string[]): Record<string, string | null> {
  const fieldAliases: Record<string, string[]> = {
    name: ['name', 'student_name', 'full_name', 'student name'],
    class_name: ['class', 'class_name', 'std', 'standard', 'grade'],
    section_name: ['section', 'section_name', 'sec'],
    father_name: ['father_name', 'father name', 'guardian', 'guardian_name'],
    mother_name: ['mother_name', 'mother name'],
    phone: ['phone', 'mobile', 'contact', 'father_phone', 'father phone'],
    admission_number: ['admission_number', 'admission_no', 'adm_no', 'admno', 'admission no'],
    roll_number: ['roll_number', 'roll_no', 'roll no'],
    dob: ['dob', 'date_of_birth', 'birth_date', 'date of birth'],
    address: ['address'],
    gender: ['gender', 'sex'],
    email: ['email', 'father_email', 'father email'],
  }
  const out: Record<string, string | null> = {}
  for (const [field, aliases] of Object.entries(fieldAliases)) {
    const match = headers.find(h => aliases.includes(normalizeKey(h).replace(/_/g, '')))
      || headers.find(h => aliases.some(a => normalizeKey(h).includes(normalizeKey(a))))
    out[field] = match || null
  }
  return out
}

function remapRow(raw: Record<string, unknown>, mapping: Record<string, string | null>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw }
  for (const [target, source] of Object.entries(mapping)) {
    if (source && source in raw) out[target] = raw[source]
  }
  return out
}

// POST /api/students — Create admission
router.post('/', authenticate, authorize('tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const data = await c.req.json()
    if (!data.name || !data.dob || !data.gender || !data.father_name || !data.current_class_id || !data.current_section_id) {
      return c.json({ error: 'name, dob, gender, father_name, current_class_id, current_section_id are required' }, 400)
    }

    const supabase = getSupabase(c.env)

    const { data: academicYear } = await supabase.from('academic_years')
      .select('id, year').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year found' }, 400)

    const { data: targetClass } = await supabase.from('classes')
      .select('id, numeric_order').eq('id', data.current_class_id).eq('school_id', schoolId).single()
    if (!targetClass) return c.json({ error: 'Selected class is invalid for your school' }, 400)

    const { data: targetSection } = await supabase.from('sections')
      .select('id').eq('id', data.current_section_id).eq('class_id', data.current_class_id).single()
    if (!targetSection) return c.json({ error: 'Selected section is invalid for your school/class' }, 400)

    const { data: school } = await supabase.from('schools')
      .select('admission_prefix').eq('id', schoolId).single()
    const admissionPrefix = (school as Record<string, unknown>)?.admission_prefix as string || 'SCH'

    const yearStr = (academicYear as Record<string, unknown>).year as string
    const admissionNo = data.admission_no || await generateAdmissionNo(supabase, yearStr.split('-')[0], admissionPrefix)
    const rollNo = await generateRollNo(
      supabase,
      (targetClass as Record<string, unknown>).numeric_order as number,
      data.current_class_id,
      (academicYear as Record<string, unknown>).id as number,
      data.current_section_id,
      schoolId,
    )
    const studentUid = generateStudentUid()

    const insertData: Record<string, unknown> = {
      school_id: schoolId,
      student_uid: studentUid,
      admission_no: admissionNo,
      sr_no: data.sr_no || null,
      name: data.name,
      name_hi: data.name_hi || null,
      dob: data.dob,
      gender: data.gender,
      aadhaar_last4: data.aadhaar ? String(data.aadhaar).slice(-4) : null,
      category: data.category || 'GEN',
      religion: data.religion || null,
      nationality: data.nationality || 'Indian',
      blood_group: data.blood_group || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      father_name: data.father_name,
      father_phone: data.father_phone || null,
      father_occupation: data.father_occupation || null,
      father_email: data.father_email || null,
      mother_name: data.mother_name || null,
      mother_phone: data.mother_phone || null,
      mother_occupation: data.mother_occupation || null,
      guardian_name: data.guardian_name || null,
      guardian_phone: data.guardian_phone || null,
      guardian_relation: data.guardian_relation || null,
      current_class_id: data.current_class_id,
      current_section_id: data.current_section_id,
      current_roll_no: rollNo,
      academic_year_id: (academicYear as Record<string, unknown>).id,
      status: 'active',
      admission_date: data.admission_date || new Date().toISOString().split('T')[0],
      previous_school: data.previous_school || null,
    }

    const { data: student, error: insertErr } = await supabase.from('students').insert(insertData).select().single()
    if (insertErr) {
      if (insertErr.code === '23505') return c.json({ error: 'Admission number already exists' }, 409)
      return c.json({ error: 'Failed to create student' }, 500)
    }

    await supabase.from('student_class_history').insert({
      student_id: (student as Record<string, unknown>).id,
      school_id: schoolId,
      class_id: data.current_class_id,
      section_id: data.current_section_id,
      roll_no: (student as Record<string, unknown>).current_roll_no,
      academic_year_id: (academicYear as Record<string, unknown>).id,
      status: 'admitted',
    })

    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'create',
      entity_type: 'student',
      entity_id: (student as Record<string, unknown>).id as number,
      new_value: { admission_no: admissionNo, name: data.name },
      ip_address: getClientIp(c),
      description: 'Student admitted',
    })

    const { aadhaar_encrypted: _ae, ...safeStudent } = student as Record<string, unknown>
    return c.json(safeStudent, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/students — List students
router.get('/', authenticate, authorize('tenant_admin', 'admin', 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const q = c.req.query()
    const { limit, offset, page } = getPaginationParams(q)
    const { class_id, section_id, status, search, academic_year_id } = q

    const supabase = getSupabase(c.env)

    let query = supabase.from('students')
      .select('*, classes(name, numeric_order), sections(name)', { count: 'exact' })
      .eq('school_id', schoolId)
      .is('deleted_at', null)

    if (class_id) query = query.eq('current_class_id', class_id)
    if (section_id) query = query.eq('current_section_id', section_id)
    if (status) query = query.eq('status', status)
    if (academic_year_id) query = query.eq('academic_year_id', academic_year_id)
    if (search) {
      query = query.or(`name.ilike.%${search}%,admission_no.ilike.%${search}%,father_name.ilike.%${search}%,current_roll_no.ilike.%${search}%`)
    }

    const { data: students, count, error } = await query
      .order('current_roll_no')
      .range(offset, offset + limit - 1)

    if (error) return c.json({ error: 'Failed to fetch students' }, 500)

    const safeStudents = (students || []).map((s: Record<string, unknown>) => {
      const { aadhaar_encrypted: _ae, ...rest } = s
      return rest
    })

    return c.json({
      data: safeStudents,
      pagination: { page, limit, total: count || 0 },
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/students/classes
router.get('/classes', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('classes').select('*').eq('school_id', schoolId).order('numeric_order')
    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/students/sections/:classId
router.get('/sections/:classId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { classId } = c.req.param()
    const supabase = getSupabase(c.env)
    const { data: classExists } = await supabase.from('classes').select('id').eq('id', classId).eq('school_id', schoolId).single()
    if (!classExists) return c.json({ error: 'Class not found' }, 404)
    const { data } = await supabase.from('sections').select('*').eq('class_id', classId).order('name')
    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/students/academic-years
router.get('/academic-years', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('academic_years').select('*').eq('school_id', schoolId).order('start_date', { ascending: false })
    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/students/subjects/:classId
router.get('/subjects/:classId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { classId } = c.req.param()
    const supabase = getSupabase(c.env)
    const { data: classExists } = await supabase.from('classes').select('id').eq('id', classId).eq('school_id', schoolId).single()
    if (!classExists) return c.json({ error: 'Class not found' }, 404)
    const { data } = await supabase.from('subjects').select('*').eq('class_id', classId).order('name')
    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/students/import/preview — Upload CSV and preview rows
router.post('/import/preview', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'File is required' }, 400)

    const fileName = file.name || ''
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (!['csv'].includes(ext || '')) {
      return c.json({ error: 'Only CSV files supported on this plan. XLSX requires Node.js.' }, 400)
    }
    if (file.size > 10 * 1024 * 1024) return c.json({ error: 'File too large (max 10MB)' }, 400)

    const text = await file.text()
    const rawRows = parseCsvText(text)

    if (!rawRows.length) return c.json({ error: 'File has no data rows' }, 400)
    if (rawRows.length > 5000) return c.json({ error: 'File exceeds maximum import limit of 5,000 rows' }, 400)

    const supabase = getSupabase(c.env)
    const headers = Object.keys(rawRows[0] || {})
    const headerMap = autoMapHeaders(headers)
    const mappingPayload = buildMappingPayload(headerMap)

    const { data: classes } = await supabase.from('classes').select('*').eq('school_id', schoolId).order('numeric_order')
    const classIds = (classes || []).map((c: Record<string, unknown>) => c.id)
    const { data: sections } = classIds.length
      ? await supabase.from('sections').select('*').in('class_id', classIds)
      : { data: [] }

    const normalizedRows: Array<{ row: number; normalized: Record<string, unknown>; errors: string[]; warnings: string[]; new_class_required: boolean; new_section_required: boolean }> = []
    const admissionSeen = new Set<string>()
    const rowKeySeen = new Set<string>()

    for (let i = 0; i < rawRows.length; i++) {
      const rowNo = i + 2
      const raw = rawRows[i] || {}
      const row = remapRow(raw, headerMap)
      const errors: string[] = []
      const warnings: string[] = []

      const student_name = cleanText(row.name || row.student_name || row.full_name)
      const father_name = cleanText(row.father_name || row.guardian || row.guardian_name)
      const mother_name = cleanText(row.mother_name)
      const admission_number = cleanText(row.admission_number || row.admission_no || row.adm_no || row.admno)
      const roll_number = cleanText(row.roll_number || row.roll_no)
      const date_of_birth = parseDateToIso(row.dob || row.date_of_birth)
      const address = cleanText(row.address)
      const gender = normalizeGender(row.gender)
      const email = cleanText(row.email || row.father_email)
      const phone = normalizePhone(row.phone || row.mobile || row.contact || row.father_phone)

      const classInput = row.class_name || row.class || row.std || row.standard || row.grade
      const sectionInput = row.section_name || row.section || row.sec
      const classRec = resolveClass(classes || [], classInput)
      const sectionRec = classRec ? (resolveSection(sections || [], Number(classRec.id), sectionInput) || null) : null

      const classVal = (classRec?.name as string) || normalizeClassDisplay(classInput)
      const sectionVal = (sectionRec?.name as string) || normalizeSection(sectionInput)

      const new_class_required = !classRec
      const new_section_required = !!classRec && !sectionRec

      if (!student_name) errors.push('Missing required field: student_name')
      if (!classVal) errors.push('Missing required field: class')
      if (!sectionVal) errors.push('Missing required field: section')
      if (new_class_required && classVal) errors.push('Class does not exist in ERP (new_class_required=true)')
      if (new_section_required && sectionVal) errors.push('Section does not exist in ERP (new_section_required=true)')
      if ((row.phone || row.mobile || row.contact || row.father_phone) && !phone) errors.push('Invalid phone number')
      if (!father_name) warnings.push('Missing recommended field: father_name')
      if (!phone) warnings.push('Missing recommended field: phone')
      if (!admission_number) warnings.push('Missing recommended field: admission_number')

      const admissionKey = admission_number.toLowerCase()
      if (admissionKey) {
        if (admissionSeen.has(admissionKey)) errors.push('Duplicate admission number in upload')
        admissionSeen.add(admissionKey)
      }

      const duplicateKey = buildDuplicateKey(student_name, father_name, classRec?.id || classVal)
      if (duplicateKey) {
        if (rowKeySeen.has(duplicateKey)) errors.push('Duplicate student record in upload')
        rowKeySeen.add(duplicateKey)
      }

      normalizedRows.push({
        row: rowNo,
        normalized: { student_name, class: classVal, section: sectionVal, class_id: classRec?.id || null, section_id: sectionRec?.id || null, father_name, mother_name, phone, admission_number, roll_number, date_of_birth, address, gender, email },
        errors, warnings, new_class_required, new_section_required,
      })
    }

    // Check admission duplicates in DB
    const admissionNumbers = normalizedRows.map(r => r.normalized.admission_number as string).filter(v => !!v)
    if (admissionNumbers.length) {
      const { data: existingByAdmission } = await supabase.from('students')
        .select('admission_no').eq('school_id', schoolId).is('deleted_at', null).in('admission_no', admissionNumbers)
      const existingAdmissions = new Set((existingByAdmission || []).map((s: Record<string, unknown>) => String(s.admission_no).toLowerCase()))
      normalizedRows.forEach(r => {
        const adm = String(r.normalized.admission_number || '').toLowerCase()
        if (adm && existingAdmissions.has(adm)) r.errors.push('Duplicate admission number in ERP')
      })
    }

    const validRows = normalizedRows.filter(r => r.errors.length === 0)
    const invalidRows = normalizedRows.filter(r => r.errors.length > 0)
    const classDistribution = validRows.reduce((acc, r) => {
      const cls = String(r.normalized.class || 'Unknown')
      acc[cls] = (acc[cls] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const classWiseSummary = Object.entries(classDistribution).map(([class_name, added_count]) => ({ class_name, added_count }))

    const items = normalizedRows.map((r, idx) => ({
      school_id: schoolId,
      row_number: r.row,
      class_id: r.normalized.class_id,
      class_name: r.normalized.class,
      student_name: r.normalized.student_name,
      status: r.errors.length ? 'invalid' : 'valid',
      error: r.errors.join('; ') || null,
      raw_payload: { source_row: rawRows[idx], normalized: r.normalized, errors: r.errors, warnings: r.warnings, flags: { new_class_required: r.new_class_required, new_section_required: r.new_section_required } },
    }))

    const { data: batch } = await supabase.from('student_import_batches').insert({
      school_id: schoolId,
      uploaded_by: user.id,
      original_file_name: fileName,
      total_rows: rawRows.length,
      created_count: 0,
      failed_count: invalidRows.length,
      status: 'preview_ready',
      detected_header_mapping: { mapping: mappingPayload, headers },
      class_wise_summary: classWiseSummary,
    }).select().single()

    if (batch && items.length) {
      const itemsWithBatch = items.map(item => ({ ...item, batch_id: (batch as Record<string, unknown>).id }))
      // Insert in chunks of 200
      for (let i = 0; i < itemsWithBatch.length; i += 200) {
        await supabase.from('student_import_batch_items').insert(itemsWithBatch.slice(i, i + 200))
      }
    }

    return c.json({
      status: 'preview_ready',
      batch_id: batch ? (batch as Record<string, unknown>).id : null,
      file_name: fileName,
      total_rows_detected: rawRows.length,
      valid_students: validRows.length,
      invalid_rows: invalidRows.length,
      headers_detected: headers,
      class_distribution: classDistribution,
      class_wise_summary: classWiseSummary,
      mapping: mappingPayload,
      errors: invalidRows.map(r => ({ row: r.row, errors: r.errors })),
      preview_records: validRows.slice(0, 20).map(r => r.normalized),
    })
  } catch {
    return c.json({ error: 'Failed to prepare import preview' }, 500)
  }
})

// POST /api/students/import/:batchId/remap
router.post('/import/:batchId/remap', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const batchId = parseInt(c.req.param('batchId'))
    if (!batchId) return c.json({ error: 'Invalid batchId' }, 400)
    const body = await c.req.json()
    if (!body.mapping) return c.json({ error: 'mapping object is required' }, 400)

    const supabase = getSupabase(c.env)
    const { data: batch } = await supabase.from('student_import_batches').select('*').eq('id', batchId).eq('school_id', schoolId).single()
    if (!batch) return c.json({ error: 'Import batch not found' }, 404)
    if ((batch as Record<string, unknown>).status !== 'preview_ready') {
      return c.json({ error: `Batch is in ${(batch as Record<string, unknown>).status} state and cannot be remapped` }, 400)
    }

    const { data: items } = await supabase.from('student_import_batch_items')
      .select('*').eq('batch_id', batchId).eq('school_id', schoolId).order('row_number')
    if (!items?.length) return c.json({ error: 'Batch has no rows to remap' }, 400)

    const userMapping = body.mapping as Record<string, { field: string; confidence?: number }>
    // Reverse: from { header -> { field } } to internal mapping { internalField -> header }
    const fieldToInternal: Record<string, string> = {
      student_name: 'name', class: 'class_name', section: 'section_name',
      father_name: 'father_name', mother_name: 'mother_name', phone: 'phone',
      admission_number: 'admission_number', roll_number: 'roll_number',
      date_of_birth: 'dob', address: 'address', gender: 'gender', email: 'email',
    }
    const headerMap: Record<string, string | null> = {
      name: null, class_name: null, section_name: null, father_name: null, mother_name: null,
      phone: null, admission_number: null, roll_number: null, dob: null, address: null, gender: null, email: null,
    }
    for (const [header, info] of Object.entries(userMapping)) {
      const field = normalizeKey(info?.field || '')
      const internal = fieldToInternal[field] || ''
      if (internal && headerMap[internal] === null) headerMap[internal] = header
    }
    const mappingPayload = buildMappingPayload(headerMap)

    const { data: classes } = await supabase.from('classes').select('*').eq('school_id', schoolId).order('numeric_order')
    const classIds = (classes || []).map((c: Record<string, unknown>) => c.id)
    const { data: sections } = classIds.length
      ? await supabase.from('sections').select('*').in('class_id', classIds)
      : { data: [] }

    const normalizedRows: Array<{ row: number; normalized: Record<string, unknown>; errors: string[]; warnings: string[]; new_class_required: boolean; new_section_required: boolean; source: Record<string, unknown> }> = []
    const admissionSeen = new Set<string>()
    const rowKeySeen = new Set<string>()

    for (const item of (items as Record<string, unknown>[])) {
      const rawPayload = item.raw_payload as Record<string, unknown>
      const raw = rawPayload?.source_row as Record<string, unknown> || {}
      const rowNo = Number(item.row_number)
      const row = remapRow(raw, headerMap)
      const errors: string[] = []
      const warnings: string[] = []

      const student_name = cleanText(row.name || row.student_name || row.full_name)
      const father_name = cleanText(row.father_name || row.guardian || row.guardian_name)
      const mother_name = cleanText(row.mother_name)
      const admission_number = cleanText(row.admission_number || row.admission_no || row.adm_no || row.admno)
      const roll_number = cleanText(row.roll_number || row.roll_no)
      const date_of_birth = parseDateToIso(row.dob || row.date_of_birth)
      const address = cleanText(row.address)
      const gender = normalizeGender(row.gender)
      const email = cleanText(row.email || row.father_email)
      const phone = normalizePhone(row.phone || row.mobile || row.contact || row.father_phone)

      const classInput = row.class_name || row.class || row.std || row.standard || row.grade
      const sectionInput = row.section_name || row.section || row.sec
      const classRec = resolveClass(classes || [], classInput)
      const sectionRec = classRec ? (resolveSection(sections || [], Number(classRec.id), sectionInput) || null) : null

      const classVal = (classRec?.name as string) || normalizeClassDisplay(classInput)
      const sectionVal = (sectionRec?.name as string) || normalizeSection(sectionInput)

      const new_class_required = !classRec
      const new_section_required = !!classRec && !sectionRec

      if (!student_name) errors.push('Missing required field: student_name')
      if (!classVal) errors.push('Missing required field: class')
      if (!sectionVal) errors.push('Missing required field: section')
      if (new_class_required && classVal) errors.push('Class does not exist in ERP (new_class_required=true)')
      if (new_section_required && sectionVal) errors.push('Section does not exist in ERP (new_section_required=true)')
      if ((row.phone || row.mobile || row.contact || row.father_phone) && !phone) errors.push('Invalid phone number')
      if (!father_name) warnings.push('Missing recommended field: father_name')
      if (!phone) warnings.push('Missing recommended field: phone')
      if (!admission_number) warnings.push('Missing recommended field: admission_number')

      const admissionKey = admission_number.toLowerCase()
      if (admissionKey) {
        if (admissionSeen.has(admissionKey)) errors.push('Duplicate admission number in upload')
        admissionSeen.add(admissionKey)
      }
      const duplicateKey = buildDuplicateKey(student_name, father_name, classRec?.id || classVal)
      if (duplicateKey) {
        if (rowKeySeen.has(duplicateKey)) errors.push('Duplicate student record in upload')
        rowKeySeen.add(duplicateKey)
      }

      normalizedRows.push({
        row: rowNo, source: raw,
        normalized: { student_name, class: classVal, section: sectionVal, class_id: classRec?.id || null, section_id: sectionRec?.id || null, father_name, mother_name, phone, admission_number, roll_number, date_of_birth, address, gender, email },
        errors, warnings, new_class_required, new_section_required,
      })
    }

    const admissionNumbers = normalizedRows.map(r => r.normalized.admission_number as string).filter(v => !!v)
    if (admissionNumbers.length) {
      const { data: existingByAdmission } = await supabase.from('students')
        .select('admission_no').eq('school_id', schoolId).is('deleted_at', null).in('admission_no', admissionNumbers)
      const existingAdmissions = new Set((existingByAdmission || []).map((s: Record<string, unknown>) => String(s.admission_no).toLowerCase()))
      normalizedRows.forEach(r => {
        const adm = String(r.normalized.admission_number || '').toLowerCase()
        if (adm && existingAdmissions.has(adm)) r.errors.push('Duplicate admission number in ERP')
      })
    }

    const validRows = normalizedRows.filter(r => r.errors.length === 0)
    const invalidRows = normalizedRows.filter(r => r.errors.length > 0)
    const classDistribution = validRows.reduce((acc, r) => {
      const cls = String(r.normalized.class || 'Unknown')
      acc[cls] = (acc[cls] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const classWiseSummary = Object.entries(classDistribution).map(([class_name, added_count]) => ({ class_name, added_count }))

    // Update each batch item
    const itemByRow = new Map((items as Record<string, unknown>[]).map(item => [Number(item.row_number), item]))
    for (const r of normalizedRows) {
      const item = itemByRow.get(r.row)
      if (!item) continue
      await supabase.from('student_import_batch_items').update({
        class_id: r.normalized.class_id,
        class_name: r.normalized.class,
        student_name: r.normalized.student_name,
        status: r.errors.length ? 'invalid' : 'valid',
        error: r.errors.join('; ') || null,
        raw_payload: { source_row: r.source, normalized: r.normalized, errors: r.errors, warnings: r.warnings, flags: { new_class_required: r.new_class_required, new_section_required: r.new_section_required } },
      }).eq('id', item.id as number)
    }

    await supabase.from('student_import_batches').update({
      failed_count: invalidRows.length,
      detected_header_mapping: { mapping: mappingPayload, headers: Object.keys((items[0] as Record<string, unknown>).raw_payload ? ((items[0] as Record<string, unknown>).raw_payload as Record<string, unknown>).source_row as Record<string, unknown> || {} : {}) },
      class_wise_summary: classWiseSummary,
    }).eq('id', batchId).eq('school_id', schoolId)

    return c.json({
      status: 'preview_ready',
      batch_id: batchId,
      total_rows_detected: normalizedRows.length,
      valid_students: validRows.length,
      invalid_rows: invalidRows.length,
      class_distribution: classDistribution,
      class_wise_summary: classWiseSummary,
      mapping: mappingPayload,
      errors: invalidRows.map(r => ({ row: r.row, errors: r.errors })),
      preview_records: validRows.slice(0, 20).map(r => r.normalized),
    })
  } catch {
    return c.json({ error: 'Failed to remap import preview' }, 500)
  }
})

// POST /api/students/import — legacy alias
router.post('/import', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  return c.json({ error: 'This endpoint now requires preview-confirm flow. Use /api/students/import/preview first.' }, 400)
})

// POST /api/students/import/:batchId/confirm
router.post('/import/:batchId/confirm', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const batchId = parseInt(c.req.param('batchId'))
    const body = await c.req.json().catch(() => ({}))
    const duplicateStrategy = String(body?.duplicate_strategy || 'skip').toLowerCase()
    if (!['skip', 'replace', 'add_both'].includes(duplicateStrategy)) {
      return c.json({ error: 'Invalid duplicate_strategy. Use skip, replace or add_both' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: batch } = await supabase.from('student_import_batches').select('*').eq('id', batchId).eq('school_id', schoolId).single()
    if (!batch) return c.json({ error: 'Import batch not found' }, 404)
    if ((batch as Record<string, unknown>).status !== 'preview_ready') {
      return c.json({ error: `Batch is in "${(batch as Record<string, unknown>).status}" state and cannot be confirmed.` }, 400)
    }

    // CAS: preview_ready → processing
    const { error: casErr } = await supabase.from('student_import_batches')
      .update({ status: 'processing' }).eq('id', batchId).eq('school_id', schoolId).eq('status', 'preview_ready')
    if (casErr) return c.json({ error: 'Batch is already being processed.' }, 409)

    const { data: validItems } = await supabase.from('student_import_batch_items')
      .select('*').eq('batch_id', batchId).eq('school_id', schoolId).eq('status', 'valid').order('row_number')

    if (!validItems?.length) {
      await supabase.from('student_import_batches').update({ status: 'preview_ready' }).eq('id', batchId).eq('school_id', schoolId)
      return c.json({ error: 'No valid rows available for insertion' }, 400)
    }

    const { data: classes } = await supabase.from('classes').select('*').eq('school_id', schoolId).order('numeric_order')
    const classIds = (classes || []).map((c: Record<string, unknown>) => c.id)
    const { data: sections } = classIds.length
      ? await supabase.from('sections').select('*').in('class_id', classIds)
      : { data: [] }
    const { data: academicYear } = await supabase.from('academic_years').select('*').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) {
      await supabase.from('student_import_batches').update({ status: 'preview_ready' }).eq('id', batchId).eq('school_id', schoolId)
      return c.json({ error: 'No active academic year found' }, 400)
    }
    const { data: school } = await supabase.from('schools').select('admission_prefix').eq('id', schoolId).single()
    const admissionPrefix = (school as Record<string, unknown>)?.admission_prefix as string || 'SCH'
    const yearStr = (academicYear as Record<string, unknown>).year as string

    const created: Array<{ row: number; id: number; name: string; class_name: string }> = []
    const skipped: Array<{ row: number; reason: string; name?: string }> = []
    const failed: Array<{ row: number; reason: string; name?: string }> = []

    for (const item of (validItems as Record<string, unknown>[])) {
      const rowNo = Number(item.row_number)
      const payload = item.raw_payload as Record<string, unknown>
      const r = payload?.normalized as Record<string, unknown> || {}

      try {
        const studentName = cleanText(r.student_name)
        const fatherName = cleanText(r.father_name)
        const classRec = resolveClass(classes || [], r.class_id || r.class)
        const sectionRec = classRec ? (resolveSection(sections || [], Number(classRec.id), r.section_id || r.section) || null) : null
        if (!studentName || !classRec || !sectionRec) throw new Error('Missing mapping (name/class/section)')

        const admissionNoCandidate = cleanText(r.admission_number)

        let duplicateStudent: Record<string, unknown> | null = null
        if (admissionNoCandidate) {
          const { data: dup } = await supabase.from('students').select('id').eq('school_id', schoolId).eq('admission_no', admissionNoCandidate).is('deleted_at', null).maybeSingle()
          duplicateStudent = dup as Record<string, unknown> | null
        }
        if (!duplicateStudent) {
          const duplicateKey = buildDuplicateKey(studentName, fatherName, classRec.id)
          if (duplicateKey) {
            const { data: candidates } = await supabase.from('students').select('id, name, father_name').eq('school_id', schoolId).eq('current_class_id', classRec.id as number).is('deleted_at', null)
            duplicateStudent = ((candidates || []) as Record<string, unknown>[]).find(s => buildDuplicateKey(s.name, s.father_name, classRec.id) === duplicateKey) || null
          }
        }

        if (duplicateStudent && duplicateStrategy === 'skip') {
          skipped.push({ row: rowNo, reason: 'Duplicate existing student in ERP', name: studentName })
          await supabase.from('student_import_batch_items').update({ status: 'skipped', error: 'Skipped due to duplicate' }).eq('id', item.id as number)
          continue
        }

        if (duplicateStudent && duplicateStrategy === 'replace') {
          await supabase.from('students').update({ deleted_at: new Date().toISOString(), status: 'inactive' }).eq('id', duplicateStudent.id as number).eq('school_id', schoolId)
        }

        let admissionNo = admissionNoCandidate || await generateAdmissionNo(supabase, yearStr.split('-')[0], admissionPrefix)
        if (duplicateStudent && duplicateStrategy === 'add_both' && admissionNoCandidate) {
          admissionNo = await generateAdmissionNo(supabase, yearStr.split('-')[0], admissionPrefix)
        }

        const rollNo = await generateRollNo(supabase, Number(classRec.numeric_order), Number(classRec.id), Number((academicYear as Record<string, unknown>).id), Number(sectionRec.id), schoolId)
        const studentUid = generateStudentUid()

        const { data: student, error: insertErr } = await supabase.from('students').insert({
          school_id: schoolId,
          upload_batch_id: batchId,
          student_uid: studentUid,
          admission_no: admissionNo,
          sr_no: valueOrNull(r.sr_no),
          name: studentName,
          dob: parseDateToIso(r.date_of_birth) || null,
          gender: normalizeGender(r.gender),
          aadhaar_last4: null,
          category: valueOrNull(r.category) || 'GEN',
          nationality: valueOrNull(r.nationality) || 'Indian',
          address: valueOrNull(r.address),
          father_name: fatherName || 'N/A',
          father_phone: valueOrNull(r.phone || r.father_phone),
          father_email: valueOrNull(r.email || r.father_email),
          mother_name: valueOrNull(r.mother_name),
          current_class_id: Number(classRec.id),
          current_section_id: Number(sectionRec.id),
          current_roll_no: valueOrNull(r.roll_number) || rollNo,
          academic_year_id: (academicYear as Record<string, unknown>).id,
          status: 'active',
          admission_date: parseDateToIso(r.admission_date) || new Date().toISOString().split('T')[0],
        }).select().single()

        if (insertErr || !student) throw new Error(insertErr?.message || 'Insert failed')

        await supabase.from('student_class_history').insert({
          student_id: (student as Record<string, unknown>).id,
          school_id: schoolId,
          class_id: Number(classRec.id),
          section_id: Number(sectionRec.id),
          roll_no: (student as Record<string, unknown>).current_roll_no,
          academic_year_id: (academicYear as Record<string, unknown>).id,
          status: 'admitted',
        })

        created.push({ row: rowNo, id: (student as Record<string, unknown>).id as number, name: studentName, class_name: String(classRec.name) })
        await supabase.from('student_import_batch_items').update({ status: 'created', student_id: (student as Record<string, unknown>).id, class_id: Number(classRec.id), class_name: String(classRec.name), student_name: studentName, error: null }).eq('id', item.id as number)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to insert row'
        failed.push({ row: rowNo, reason: msg, name: r.student_name as string })
        await supabase.from('student_import_batch_items').update({ status: 'failed', error: msg }).eq('id', item.id as number)
      }
    }

    const finalClassDistribution = created.reduce((acc, c) => { acc[c.class_name] = (acc[c.class_name] || 0) + 1; return acc }, {} as Record<string, number>)
    const finalClassSummary = Object.entries(finalClassDistribution).map(([class_name, added_count]) => ({ class_name, added_count }))

    await supabase.from('student_import_batches').update({
      status: 'completed',
      created_count: created.length,
      failed_count: Number((batch as Record<string, unknown>).total_rows) - created.length,
      class_wise_summary: finalClassSummary,
    }).eq('id', batchId).eq('school_id', schoolId)

    return c.json({
      status: 'completed',
      batch_id: batchId,
      students_added: created.length,
      skipped_rows: skipped.length + failed.length,
      class_distribution: finalClassDistribution,
      skipped, failed,
      created_preview: created.slice(0, 20),
    })
  } catch {
    await getSupabase(c.env).from('student_import_batches')
      .update({ status: 'failed' }).eq('id', parseInt(c.req.param('batchId'))).eq('school_id', c.get('user').school_id).eq('status', 'processing')
    return c.json({ error: 'Failed to confirm import batch' }, 500)
  }
})

// POST /api/students/import/:batchId/cancel
router.post('/import/:batchId/cancel', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const batchId = parseInt(c.req.param('batchId'))
    const supabase = getSupabase(c.env)
    const { data: batch } = await supabase.from('student_import_batches').select('status').eq('id', batchId).eq('school_id', schoolId).single()
    if (!batch) return c.json({ error: 'Import batch not found' }, 404)
    if ((batch as Record<string, unknown>).status !== 'preview_ready') return c.json({ error: `Cannot cancel batch in ${(batch as Record<string, unknown>).status} state` }, 400)
    await supabase.from('student_import_batches').update({ status: 'canceled' }).eq('id', batchId).eq('school_id', schoolId)
    return c.json({ status: 'canceled', batch_id: batchId })
  } catch {
    return c.json({ error: 'Failed to cancel import batch' }, 500)
  }
})

// GET /api/students/import/last
router.get('/import/last', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { data: batch } = await supabase.from('student_import_batches').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!batch) return c.json({ error: 'No import batches found' }, 404)
    const { data: items } = await supabase.from('student_import_batch_items')
      .select('row_number, status, student_name, class_name, error')
      .eq('batch_id', (batch as Record<string, unknown>).id as number).eq('school_id', schoolId).order('row_number').limit(50)
    return c.json({ status: 'ok', batch, items_preview: items || [] })
  } catch {
    return c.json({ error: 'Failed to fetch last import batch' }, 500)
  }
})

// POST /api/students/import/last/revert
router.post('/import/last/revert', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { data: batch } = await supabase.from('student_import_batches').select('*').eq('school_id', schoolId).eq('status', 'completed').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!batch) return c.json({ error: 'No completed import batch found to revert' }, 404)
    const batchId = (batch as Record<string, unknown>).id as number

    const { data: createdItems } = await supabase.from('student_import_batch_items')
      .select('student_id').eq('batch_id', batchId).eq('school_id', schoolId).eq('status', 'created').not('student_id', 'is', null)

    const studentIds = (createdItems || []).map((i: Record<string, unknown>) => Number(i.student_id)).filter(id => Number.isFinite(id))
    let revertedCount = 0
    if (studentIds.length) {
      await supabase.from('student_class_history').delete().in('student_id', studentIds).eq('school_id', schoolId)
      const { count } = await supabase.from('students').update({ deleted_at: new Date().toISOString(), status: 'inactive' }).in('id', studentIds).eq('school_id', schoolId).select('id')
      revertedCount = count || studentIds.length
    }

    await supabase.from('student_import_batches').update({ status: 'reverted', reverted_at: new Date().toISOString() }).eq('id', batchId).eq('school_id', schoolId)

    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'bulk_revert',
      entity_type: 'student_import_batch',
      entity_id: batchId,
      new_value: { reverted_count: revertedCount },
      ip_address: getClientIp(c),
      description: 'Last import batch reverted',
    })

    return c.json({ message: 'Last import batch reverted successfully', batch_id: batchId, reverted_count: revertedCount })
  } catch {
    return c.json({ error: 'Failed to revert last import batch' }, 500)
  }
})

// POST /api/students/import/:batchId/revert
router.post('/import/:batchId/revert', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const batchId = parseInt(c.req.param('batchId'))
    const supabase = getSupabase(c.env)
    const { data: batch } = await supabase.from('student_import_batches').select('status').eq('id', batchId).eq('school_id', schoolId).single()
    if (!batch) return c.json({ error: 'Import batch not found' }, 404)
    if ((batch as Record<string, unknown>).status === 'reverted') return c.json({ error: 'Batch is already reverted' }, 400)

    const { data: createdItems } = await supabase.from('student_import_batch_items')
      .select('student_id').eq('batch_id', batchId).eq('school_id', schoolId).eq('status', 'created').not('student_id', 'is', null)
    const studentIds = (createdItems || []).map((i: Record<string, unknown>) => Number(i.student_id)).filter(id => Number.isFinite(id))

    let revertedCount = 0
    if (studentIds.length) {
      await supabase.from('student_class_history').delete().in('student_id', studentIds).eq('school_id', schoolId)
      await supabase.from('students').update({ deleted_at: new Date().toISOString(), status: 'inactive' }).in('id', studentIds).eq('school_id', schoolId)
      revertedCount = studentIds.length
    }

    await supabase.from('student_import_batches').update({ status: 'reverted', reverted_at: new Date().toISOString() }).eq('id', batchId).eq('school_id', schoolId)

    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'bulk_revert',
      entity_type: 'student_import_batch',
      entity_id: batchId,
      new_value: { reverted_count: revertedCount },
      ip_address: getClientIp(c),
      description: 'Import batch reverted',
    })

    return c.json({ message: 'Import batch reverted successfully', batch_id: batchId, reverted_count: revertedCount })
  } catch {
    return c.json({ error: 'Failed to revert import batch' }, 500)
  }
})

// POST /api/students/import/:batchId/delete
router.post('/import/:batchId/delete', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const batchId = parseInt(c.req.param('batchId'))
    const supabase = getSupabase(c.env)
    const { data: batch } = await supabase.from('student_import_batches').select('status').eq('id', batchId).eq('school_id', schoolId).single()
    if (!batch) return c.json({ error: 'Import batch not found' }, 404)
    if ((batch as Record<string, unknown>).status === 'reverted') return c.json({ error: 'Batch is already reverted' }, 400)

    const { data: createdItems } = await supabase.from('student_import_batch_items')
      .select('student_id').eq('batch_id', batchId).eq('school_id', schoolId).eq('status', 'created').not('student_id', 'is', null)
    const studentIds = (createdItems || []).map((i: Record<string, unknown>) => Number(i.student_id)).filter(id => Number.isFinite(id))

    let revertedCount = 0
    if (studentIds.length) {
      await supabase.from('student_class_history').delete().in('student_id', studentIds).eq('school_id', schoolId)
      await supabase.from('students').update({ deleted_at: new Date().toISOString(), status: 'inactive' }).in('id', studentIds).eq('school_id', schoolId)
      revertedCount = studentIds.length
    }

    await supabase.from('student_import_batches').update({ status: 'reverted', reverted_at: new Date().toISOString() }).eq('id', batchId).eq('school_id', schoolId)
    return c.json({ message: 'Upload batch deleted (reverted) successfully', batch_id: batchId, reverted_count: revertedCount })
  } catch {
    return c.json({ error: 'Failed to delete upload batch' }, 500)
  }
})

// POST /api/students/actions/move
router.post('/actions/move', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { student_name, father_name, target_class, target_section } = await c.req.json()
    if (!student_name || !target_class) return c.json({ error: 'student_name and target_class are required' }, 400)

    const supabase = getSupabase(c.env)

    let studentQuery = supabase.from('students').select('*').eq('school_id', schoolId).is('deleted_at', null).ilike('name', student_name).order('id', { ascending: false }).limit(1)
    if (father_name) studentQuery = studentQuery.ilike('father_name', father_name)
    const { data: studentArr } = await studentQuery
    const student = (studentArr || [])[0] as Record<string, unknown>
    if (!student) return c.json({ error: 'Student not found for move action' }, 404)

    const { data: classes } = await supabase.from('classes').select('*').eq('school_id', schoolId)
    const classIds = (classes || []).map((c: Record<string, unknown>) => c.id)
    const { data: sections } = classIds.length ? await supabase.from('sections').select('*').in('class_id', classIds) : { data: [] }

    const classRec = resolveClass(classes || [], target_class)
    if (!classRec) return c.json({ error: 'Target class not found in ERP' }, 400)
    const sectionRec = resolveSection(sections || [], Number(classRec.id), target_section || student.current_section_id)
      || (sections || []).find((s: Record<string, unknown>) => s.class_id === classRec.id)
    if (!sectionRec) return c.json({ error: 'Target section not found in ERP' }, 400)

    const { data: academicYear } = await supabase.from('academic_years').select('id, year').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year found' }, 400)

    const newRollNo = await generateRollNo(supabase, Number(classRec.numeric_order), Number(classRec.id), Number((academicYear as Record<string, unknown>).id), Number(sectionRec.id), schoolId)

    await supabase.from('students').update({ current_class_id: Number(classRec.id), current_section_id: Number(sectionRec.id), current_roll_no: newRollNo }).eq('id', student.id as number).eq('school_id', schoolId)
    await supabase.from('student_class_history').insert({
      student_id: student.id,
      school_id: schoolId,
      class_id: Number(classRec.id),
      section_id: Number(sectionRec.id),
      roll_no: newRollNo,
      academic_year_id: (academicYear as Record<string, unknown>).id,
      status: 'promoted',
    })

    return c.json({ status: 'ok', message: 'Student moved successfully', student_id: student.id, student_name: student.name, moved_to: { class: classRec.name, section: sectionRec.name } })
  } catch {
    return c.json({ error: 'Failed to move student' }, 500)
  }
})

// GET /api/students/:id
router.get('/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students')
      .select('*, classes(name, numeric_order), sections(name), academic_years(year)')
      .eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: classHistory } = await supabase.from('student_class_history')
      .select('*, classes(name), sections(name), academic_years(year)')
      .eq('student_id', id).order('academic_years(year)', { ascending: false })

    const { data: documents } = await supabase.from('student_documents')
      .select('*').eq('student_id', id).order('created_at', { ascending: false })

    const { aadhaar_encrypted: _ae, ...safeStudent } = student as Record<string, unknown>
    return c.json({ ...safeStudent, class_history: classHistory || [], documents: documents || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/students/:id
router.put('/:id', authenticate, authorize('tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: existing } = await supabase.from('students').select('*').eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!existing) return c.json({ error: 'Student not found' }, 404)

    const data = await c.req.json()
    // Handle Aadhaar
    if (data.aadhaar) {
      data.aadhaar_last4 = String(data.aadhaar).slice(-4)
      delete data.aadhaar
    }
    delete data.school_id
    delete data.id

    const { data: updated, error: updateErr } = await supabase.from('students').update({ ...data }).eq('id', id).eq('school_id', schoolId).select().single()
    if (updateErr) return c.json({ error: 'Failed to update student' }, 500)

    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'update',
      entity_type: 'student',
      entity_id: Number(id),
      old_value: { name: (existing as Record<string, unknown>).name },
      new_value: { name: (updated as Record<string, unknown>).name },
      ip_address: getClientIp(c),
      description: 'Student updated',
    })

    const { aadhaar_encrypted: _ae, ...safeUpdated } = updated as Record<string, unknown>
    return c.json(safeUpdated)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/students/:id/promote
router.post('/:id/promote', authenticate, authorize('tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const { new_class_id, new_section_id, new_roll_no, new_academic_year_id } = await c.req.json()
    if (!new_class_id || !new_academic_year_id) return c.json({ error: 'new_class_id and new_academic_year_id are required' }, 400)

    const supabase = getSupabase(c.env)
    const { data: student } = await supabase.from('students').select('*').eq('id', id).eq('school_id', schoolId).eq('status', 'active').is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Active student not found' }, 404)

    const { data: targetClass } = await supabase.from('classes').select('id').eq('id', new_class_id).eq('school_id', schoolId).single()
    if (!targetClass) return c.json({ error: 'Target class is invalid for your school' }, 400)

    if (new_section_id) {
      const { data: targetSection } = await supabase.from('sections').select('id').eq('id', new_section_id).eq('class_id', new_class_id).single()
      if (!targetSection) return c.json({ error: 'Target section is invalid for your school/class' }, 400)
    }

    await supabase.from('student_class_history').update({ status: 'promoted' }).eq('student_id', id).eq('academic_year_id', (student as Record<string, unknown>).academic_year_id as number)
    await supabase.from('student_class_history').insert({
      student_id: Number(id), class_id: new_class_id, section_id: new_section_id,
      roll_no: new_roll_no, academic_year_id: new_academic_year_id, status: 'admitted',
    })
    const { data: updated } = await supabase.from('students').update({
      current_class_id: new_class_id, current_section_id: new_section_id,
      current_roll_no: new_roll_no, academic_year_id: new_academic_year_id,
    }).eq('id', id).eq('school_id', schoolId).select().single()

    await createAuditLog(supabase, {
      user_id: user.id, action: 'promote', entity_type: 'student', entity_id: Number(id),
      old_value: { class_id: (student as Record<string, unknown>).current_class_id, academic_year_id: (student as Record<string, unknown>).academic_year_id },
      new_value: { class_id: new_class_id, academic_year_id: new_academic_year_id },
      ip_address: getClientIp(c), description: 'Student promoted',
    })

    const { aadhaar_encrypted: _ae, ...safePromoted } = updated as Record<string, unknown>
    return c.json({ message: 'Student promoted successfully', student: safePromoted })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/students/:id/tc
router.post('/:id/tc', authenticate, authorize('tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students').select('*').eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const body = await c.req.json().catch(() => ({}))
    const tcNo = await generateTCNo()

    const { data: tc } = await supabase.from('transfer_certificates').insert({
      student_id: Number(id),
      tc_no: tcNo,
      issue_date: new Date().toISOString().split('T')[0],
      reason: body.reason || 'Transfer',
      issued_by: user.id,
      school_id: schoolId,
    }).select().single()

    await supabase.from('students').update({ status: 'tc_issued' }).eq('id', id).eq('school_id', schoolId)
    await supabase.from('student_class_history').update({ status: 'tc_issued' }).eq('student_id', id).eq('academic_year_id', (student as Record<string, unknown>).academic_year_id as number)

    await createAuditLog(supabase, {
      user_id: user.id, action: 'tc_generated', entity_type: 'transfer_certificate',
      entity_id: (tc as Record<string, unknown>)?.id as number,
      new_value: { tc_no: tcNo, student_name: (student as Record<string, unknown>).name },
      ip_address: getClientIp(c), description: 'Transfer certificate generated',
    })

    return c.json(tc, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/students/:id/documents — Upload document to R2
router.post('/:id/documents', authenticate, authorize('tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()

    const supabase = getSupabase(c.env)
    const { data: student } = await supabase.from('students').select('id').eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const formData = await c.req.formData()
    const file = formData.get('document') as File | null
    if (!file) return c.json({ error: 'No file uploaded' }, 400)

    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
    if (!allowedTypes.has(file.type)) return c.json({ error: 'Unsupported file type. Allowed: PDF, JPG, PNG, WEBP' }, 400)
    if (file.size > 5 * 1024 * 1024) return c.json({ error: 'File too large (max 5MB)' }, 400)

    const docType = (formData.get('doc_type') as string) || 'other'
    const key = buildR2Key(schoolId, 'student_docs', `${id}_${Date.now()}_${file.name}`)
    const arrayBuffer = await file.arrayBuffer()
    const fileUrl = await uploadToR2(c.env, key, arrayBuffer, file.type)

    const { data: doc } = await supabase.from('student_documents').insert({
      student_id: Number(id),
      doc_type: docType,
      file_name: file.name,
      file_url: fileUrl,
      mime_type: file.type,
      file_size: file.size,
      school_id: schoolId,
    }).select().single()

    return c.json(doc, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/students/:id/documents
router.get('/:id/documents', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students').select('id').eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: docs } = await supabase.from('student_documents').select('*').eq('student_id', id).order('created_at', { ascending: false })
    return c.json(docs || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/students/:id/documents/:docId
router.delete('/:id/documents/:docId', authenticate, authorize('tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id, docId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students').select('id').eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: doc } = await supabase.from('student_documents').select('id, file_url').eq('id', docId).eq('student_id', id).single()
    if (!doc) return c.json({ error: 'Document not found' }, 404)

    await supabase.from('student_documents').delete().eq('id', docId)

    await createAuditLog(supabase, {
      user_id: user.id, action: 'delete', entity_type: 'student_document', entity_id: Number(docId),
      old_value: { student_id: id, file_url: (doc as Record<string, unknown>).file_url },
      ip_address: getClientIp(c), description: 'Student document deleted',
    })

    return c.json({ message: 'Document deleted' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/students/:id (soft delete)
router.delete('/:id', authenticate, authorize('tenant_admin', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students').select('*').eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    await supabase.from('students').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('school_id', schoolId)

    await createAuditLog(supabase, {
      user_id: user.id, action: 'soft_delete', entity_type: 'student', entity_id: Number(id),
      old_value: { name: (student as Record<string, unknown>).name, status: (student as Record<string, unknown>).status },
      ip_address: getClientIp(c), description: 'Student soft deleted',
    })

    return c.json({ message: 'Student deleted (soft)' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
