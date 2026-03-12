import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize, ownerOnly } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── RTE STUDENTS LIST ───

// GET /api/rte/students
router.get('/students', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data } = await supabase.from('students')
      .select('id, name, admission_no, rte_category, rte_admission_number, rte_admission_date, status, classes(name)')
      .eq('school_id', schoolId).eq('is_rte', true).order('name')

    return c.json({ data: data || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── TAG STUDENT AS RTE ───

// PUT /api/rte/students/:studentId/tag
router.put('/students/:studentId/tag', authenticate, authorize('owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId } = c.req.param()
    const body = await c.req.json()

    if (body.rte_category && !['EWS', 'DG', 'CWSN'].includes(body.rte_category)) {
      return c.json({ error: 'rte_category must be EWS, DG, or CWSN' }, 400)
    }
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students').select('id').eq('id', studentId).eq('school_id', schoolId).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    await supabase.from('students').update({
      is_rte: body.is_rte ?? true,
      rte_category: body.rte_category || null,
      rte_admission_number: body.rte_admission_number || null,
      rte_admission_date: body.rte_admission_date || null,
    }).eq('id', studentId).eq('school_id', schoolId)

    return c.json({ message: 'RTE status updated for student' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── RTE QUOTA CONFIG ───

// GET /api/rte/quota
router.get('/quota', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    let { academic_year_id } = c.req.query()

    if (!academic_year_id) {
      const { data: ay } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
      academic_year_id = String((ay as Record<string, unknown>)?.id || '')
    }

    const { data: quotas } = await supabase.from('rte_quota_config')
      .select('*, classes(name)')
      .eq('school_id', schoolId).eq('academic_year_id', academic_year_id)
      .order('class_id')

    // Count actual RTE students per class for current academic year
    const { data: historyRows } = await supabase.from('student_class_history')
      .select('class_id, students!inner(is_rte, school_id)')
      .eq('academic_year_id', academic_year_id)
      .eq('students.school_id', schoolId)
      .eq('students.is_rte', true)

    const countMap: Record<number, number> = {}
    for (const h of (historyRows || []) as Record<string, unknown>[]) {
      const cid = h.class_id as number
      countMap[cid] = (countMap[cid] || 0) + 1
    }

    const enriched = (quotas || []).map((q: Record<string, unknown>) => ({
      ...q, rte_filled: countMap[q.class_id as number] || 0
    }))

    return c.json({ data: enriched })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/rte/quota
router.post('/quota', authenticate, authorize('owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.class_id || !body.total_seats || body.total_seats < 1) {
      return c.json({ error: 'class_id and total_seats (min 1) are required' }, 400)
    }
    const supabase = getSupabase(c.env)

    let ayId = body.academic_year_id
    if (!ayId) {
      const { data: ay } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
      ayId = (ay as Record<string, unknown>)?.id
    }

    const computedRteSeats = body.rte_seats ?? Math.ceil(body.total_seats * 0.25)

    await supabase.from('rte_quota_config').upsert({
      school_id: schoolId,
      class_id: body.class_id,
      academic_year_id: ayId,
      total_seats: body.total_seats,
      rte_seats: computedRteSeats,
    }, { onConflict: 'school_id,class_id,academic_year_id' })

    return c.json({ message: 'Quota configuration saved' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── ENTITLEMENT RECORDS ───

// GET /api/rte/entitlements
router.get('/entitlements', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { academic_year_id, student_id } = c.req.query()

    let query = supabase.from('rte_entitlement_records')
      .select('*, students(name, admission_no)')
      .eq('school_id', schoolId)
      .order('student_id')

    if (academic_year_id) query = query.eq('academic_year_id', academic_year_id)
    if (student_id) query = query.eq('student_id', student_id)

    const { data } = await query
    return c.json({ data: data || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/rte/entitlements
router.post('/entitlements', authenticate, authorize('owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()

    const validTypes = ['uniform', 'books', 'mid_day_meal', 'stationery', 'bag']
    if (!body.student_id || !body.entitlement_type || !validTypes.includes(body.entitlement_type)) {
      return c.json({ error: 'student_id and valid entitlement_type are required' }, 400)
    }
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students').select('id').eq('id', body.student_id).eq('school_id', schoolId).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    let ayId = body.academic_year_id
    if (!ayId) {
      const { data: ay } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
      ayId = (ay as Record<string, unknown>)?.id
    }

    const { data: record } = await supabase.from('rte_entitlement_records').insert({
      school_id: schoolId,
      student_id: body.student_id,
      academic_year_id: ayId,
      entitlement_type: body.entitlement_type,
      provided: body.provided ?? false,
      provided_date: body.provided_date || null,
      cost: body.cost || null,
      remarks: body.remarks || null,
    }).select().single()

    return c.json({ message: 'Entitlement recorded', data: record }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/rte/entitlements/:id
router.put('/entitlements/:id', authenticate, authorize('owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const { provided, provided_date, cost, remarks } = await c.req.json()
    const supabase = getSupabase(c.env)

    await supabase.from('rte_entitlement_records')
      .update({ provided, provided_date, cost, remarks })
      .eq('id', id).eq('school_id', schoolId)

    return c.json({ message: 'Entitlement updated' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── REIMBURSEMENT CLAIMS ───

// GET /api/rte/claims
router.get('/claims', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data } = await supabase.from('rte_reimbursement_claims').select('*').eq('school_id', schoolId).order('claim_date', { ascending: false })
    return c.json({ data: data || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/rte/claims
router.post('/claims', authenticate, authorize('owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.claim_date) return c.json({ error: 'claim_date is required' }, 400)
    const supabase = getSupabase(c.env)

    let ayId = body.academic_year_id
    if (!ayId) {
      const { data: ay } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
      ayId = (ay as Record<string, unknown>)?.id
    }

    const { data: claim } = await supabase.from('rte_reimbursement_claims').insert({
      school_id: schoolId,
      academic_year_id: ayId,
      claim_date: body.claim_date,
      claim_number: body.claim_number || null,
      student_count: body.student_count || 0,
      total_amount: body.total_amount || 0,
      remarks: body.remarks || null,
    }).select().single()

    return c.json({ message: 'Claim created', data: claim }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/rte/claims/:id
router.put('/claims/:id', authenticate, authorize('owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const { status, submission_date, payment_date, amount_received, remarks } = await c.req.json()
    const supabase = getSupabase(c.env)

    await supabase.from('rte_reimbursement_claims')
      .update({ status, submission_date, payment_date, amount_received, remarks })
      .eq('id', id).eq('school_id', schoolId)

    return c.json({ message: 'Claim updated' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── SUMMARY REPORT ───

// GET /api/rte/report
router.get('/report', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: ay } = await supabase.from('academic_years').select('id, year').eq('is_current', true).eq('school_id', schoolId).single()
    const ayId = (ay as Record<string, unknown>)?.id

    const { data: rteStudents } = await supabase.from('students').select('id, rte_category').eq('school_id', schoolId).eq('is_rte', true)
    const totalRte = (rteStudents || []).length

    const catMap: Record<string, number> = {}
    for (const s of (rteStudents || []) as Record<string, unknown>[]) {
      const cat = String(s.rte_category || 'Unknown')
      catMap[cat] = (catMap[cat] || 0) + 1
    }

    const { data: quotaRows } = await supabase.from('rte_quota_config')
      .select('class_id, total_seats, rte_seats, classes(name)')
      .eq('school_id', schoolId).eq('academic_year_id', ayId)

    const { data: historyRows } = await supabase.from('student_class_history')
      .select('class_id, students!inner(is_rte, school_id)')
      .eq('academic_year_id', ayId)
      .eq('students.school_id', schoolId)
      .eq('students.is_rte', true)

    const rteCountMap: Record<number, number> = {}
    for (const h of (historyRows || []) as Record<string, unknown>[]) {
      const cid = h.class_id as number
      rteCountMap[cid] = (rteCountMap[cid] || 0) + 1
    }

    const quotas = (quotaRows || []).map((q: Record<string, unknown>) => ({
      class_name: (q.classes as Record<string, unknown>)?.name,
      total_seats: q.total_seats,
      rte_seats: q.rte_seats,
      rte_filled: rteCountMap[q.class_id as number] || 0,
    }))

    const { data: entitlements } = await supabase.from('rte_entitlement_records')
      .select('id').eq('school_id', schoolId).eq('academic_year_id', ayId).eq('provided', true)

    const { data: claims } = await supabase.from('rte_reimbursement_claims').select('total_amount, amount_received').eq('school_id', schoolId)
    const totalClaimed = (claims || []).reduce((s, r: Record<string, unknown>) => s + Number(r.total_amount || 0), 0)
    const totalReceived = (claims || []).reduce((s, r: Record<string, unknown>) => s + Number(r.amount_received || 0), 0)

    return c.json({
      total_rte_students: totalRte,
      by_category: Object.entries(catMap).map(([rte_category, count]) => ({ rte_category, count })),
      quota_utilization: quotas,
      entitlements_provided: (entitlements || []).length,
      total_claimed: totalClaimed,
      total_received: totalReceived,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── AGE VALIDATION ───

// POST /api/rte/validate-age/:studentId
router.post('/validate-age/:studentId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students').select('id, dob').eq('id', studentId).eq('school_id', schoolId).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const s = student as Record<string, unknown>
    if (!s.dob) return c.json({ error: 'Date of birth not set for student' }, 400)

    const dob = new Date(s.dob as string)
    const now = new Date()
    const ageYears = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    const eligible = ageYears >= 6 && ageYears <= 14

    return c.json({
      age_years: Math.floor(ageYears),
      rte_eligible: eligible,
      message: eligible
        ? 'Student is within RTE eligible age range (6-14 years)'
        : `Student age (${Math.floor(ageYears)} years) is outside RTE eligible range (6-14 years)`,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── UDISE EXPORT FORMAT ───

// GET /api/rte/udise-export
router.get('/udise-export', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: ay } = await supabase.from('academic_years').select('id, year').eq('is_current', true).eq('school_id', schoolId).single()
    const ayId = (ay as Record<string, unknown>)?.id

    const { data: historyRows } = await supabase.from('student_class_history')
      .select('class_id, students!inner(gender, rte_category, is_rte, school_id), classes(name)')
      .eq('academic_year_id', ayId)
      .eq('students.school_id', schoolId)
      .eq('students.is_rte', true)

    // Group by class, gender, rte_category
    const grouped: Record<string, Record<string, unknown>> = {}
    for (const h of (historyRows || []) as Record<string, unknown>[]) {
      const s = h.students as Record<string, unknown>
      const cls = h.classes as Record<string, unknown>
      const key = `${cls?.name}|${s.gender}|${s.rte_category}`
      if (!grouped[key]) {
        grouped[key] = { class_name: cls?.name, gender: s.gender, rte_category: s.rte_category, count: 0 }
      }
      ;(grouped[key].count as number)
      grouped[key].count = (grouped[key].count as number) + 1
    }

    return c.json({ data: Object.values(grouped), academic_year: (ay as Record<string, unknown>)?.year })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
