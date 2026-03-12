import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'
import { createAuditLog, getClientIp } from '../utils/auditLog'
import { sendAbsentAlert } from '../utils/sms'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// POST /api/attendance/mark
router.post('/mark', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), async (c) => {
  try {
    const body = await c.req.json()
    const { date, class_id, section_id, records } = body
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    if (!date || !class_id || !section_id || !Array.isArray(records) || records.length === 0) {
      return c.json({ error: 'date, class_id, section_id, and records are required' }, 400)
    }

    const supabase = getSupabase(c.env)

    const { data: classExists } = await supabase.from('classes')
      .select('id').eq('id', class_id).eq('school_id', schoolId).single()
    if (!classExists) return c.json({ error: 'Invalid class for your school' }, 400)

    const { data: sectionExists } = await supabase.from('sections')
      .select('*').eq('id', section_id).eq('class_id', class_id).single()
    if (!sectionExists) return c.json({ error: 'Invalid section for selected class' }, 400)

    if (user.role === 'teacher' && sectionExists.class_teacher_id !== user.id) {
      return c.json({ error: 'Access denied: Only the assigned class teacher can mark attendance for this section.' }, 403)
    }

    const studentIds = records.map((record: Record<string, unknown>) => Number(record.student_id))
    const { data: validStudents } = await supabase.from('students')
      .select('id, name, father_phone')
      .in('id', studentIds)
      .eq('school_id', schoolId)
      .eq('current_class_id', class_id)
      .eq('current_section_id', section_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    const validSet = new Set((validStudents || []).map((s: Record<string, unknown>) => Number(s.id)))
    const invalid = studentIds.filter((id: number) => !validSet.has(id))
    if (invalid.length > 0) {
      return c.json({ error: 'Some students are invalid or outside your school/class/section', invalid_student_ids: invalid }, 400)
    }

    const { data: academicYear } = await supabase.from('academic_years')
      .select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)

    const inserts = records.map((record: Record<string, unknown>) => ({
      student_id: record.student_id,
      school_id: schoolId,
      date,
      status: record.status,
      class_id,
      section_id,
      marked_by: user.id,
      academic_year_id: academicYear.id,
    }))

    // Upsert attendance
    await supabase.from('attendance').upsert(inserts, {
      onConflict: 'school_id,student_id,date',
      ignoreDuplicates: false,
    })

    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'update',
      entity_type: 'attendance',
      new_value: { date, class_id, section_id, count: records.length },
      ip_address: getClientIp(c),
      description: 'Attendance marked/updated',
    })

    // SMS for absent students
    const absentRecords = records.filter((r: Record<string, unknown>) => r.status === 'A')
    const studentMap = new Map((validStudents || []).map((s: Record<string, unknown>) => [Number(s.id), s]))
    for (const absent of absentRecords) {
      const student = studentMap.get(Number(absent.student_id)) as Record<string, unknown>
      if (student?.father_phone) {
        sendAbsentAlert(c.env, student.name as string, student.father_phone as string, date).catch(() => {})
      }
    }

    return c.json({ message: `Attendance marked for ${records.length} students`, absent_count: absentRecords.length })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/attendance/class/:classId/section/:sectionId/date/:date
router.get('/class/:classId/section/:sectionId/date/:date', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), async (c) => {
  try {
    const { classId, sectionId, date } = c.req.param()
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const supabase = getSupabase(c.env)

    const { data: students } = await supabase.from('students')
      .select('id, name, admission_no, current_roll_no')
      .eq('current_class_id', classId)
      .eq('current_section_id', sectionId)
      .eq('status', 'active')
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .order('current_roll_no')

    const { data: attendanceRecords } = await supabase.from('attendance')
      .select('student_id, status')
      .eq('date', date)
      .eq('class_id', classId)
      .eq('section_id', sectionId)
      .eq('school_id', schoolId)

    const attendanceMap = new Map((attendanceRecords || []).map((r: Record<string, unknown>) => [r.student_id, r.status]))
    const result = (students || []).map((s: Record<string, unknown>) => ({
      ...s,
      status: attendanceMap.get(s.id) || null,
    }))

    return c.json({
      date,
      class_id: parseInt(classId),
      section_id: parseInt(sectionId),
      total: (students || []).length,
      marked: (attendanceRecords || []).length,
      students: result,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/attendance/student/:studentId
router.get('/student/:studentId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'parent'), async (c) => {
  try {
    const { studentId } = c.req.param()
    const { academic_year_id } = c.req.query()
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students')
      .select('id').eq('id', studentId).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    let query = supabase.from('attendance').select('*')
      .eq('student_id', studentId).eq('school_id', schoolId)
    if (academic_year_id) query = query.eq('academic_year_id', academic_year_id)

    const { data: records } = await query.order('date', { ascending: false })
    const recs = records || []

    const total = recs.length
    const present = recs.filter((r: Record<string, unknown>) => r.status === 'P').length
    const absent = recs.filter((r: Record<string, unknown>) => r.status === 'A').length
    const leave = recs.filter((r: Record<string, unknown>) => r.status === 'L').length
    const halfDay = recs.filter((r: Record<string, unknown>) => r.status === 'HD').length
    const effectivePresent = present + halfDay * 0.5
    const percentage = total > 0 ? Math.round((effectivePresent / total) * 10000) / 100 : 0

    return c.json({
      student_id: parseInt(studentId),
      total_days: total,
      present, absent, leave,
      half_day: halfDay,
      percentage,
      eligible_for_exam: percentage >= 75,
      records: recs.slice(0, 30),
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/attendance/student/:studentId/eligibility
router.get('/student/:studentId/eligibility', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'parent'), async (c) => {
  try {
    const { studentId } = c.req.param()
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students')
      .select('id').eq('id', studentId).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: academicYear } = await supabase.from('academic_years')
      .select('id').eq('is_current', true).eq('school_id', schoolId).single()

    const { data: records } = await supabase.from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYear?.id || -1)
      .eq('school_id', schoolId)

    const recs = records || []
    const total = recs.length
    const present = recs.filter((r: Record<string, unknown>) => r.status === 'P').length
    const halfDay = recs.filter((r: Record<string, unknown>) => r.status === 'HD').length
    const effectivePresent = present + halfDay * 0.5
    const percentage = total > 0 ? Math.round((effectivePresent / total) * 10000) / 100 : 0

    return c.json({
      student_id: parseInt(studentId),
      total_days: total,
      effective_present: effectivePresent,
      percentage,
      threshold: 75,
      eligible: percentage >= 75,
      shortfall: percentage < 75 ? Math.ceil(0.75 * total - effectivePresent) : 0,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/attendance/monthly-report/:classId/:sectionId/:month
router.get('/monthly-report/:classId/:sectionId/:month', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), async (c) => {
  try {
    const { classId, sectionId, month } = c.req.param()
    if (!/^\d{4}-\d{2}$/.test(month)) return c.json({ error: 'month must be in YYYY-MM format' }, 400)

    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const supabase = getSupabase(c.env)

    const { data: students } = await supabase.from('students')
      .select('id, name, admission_no, current_roll_no')
      .eq('current_class_id', classId)
      .eq('current_section_id', sectionId)
      .eq('status', 'active')
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .order('current_roll_no')

    // Fetch attendance for the month using gte/lte
    const monthStart = `${month}-01`
    const [y, m] = month.split('-').map(Number)
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

    const { data: attendanceRecords } = await supabase.from('attendance')
      .select('student_id, date, status')
      .eq('class_id', classId)
      .eq('section_id', sectionId)
      .eq('school_id', schoolId)
      .gte('date', monthStart)
      .lt('date', nextMonth)

    const report = (students || []).map((s: Record<string, unknown>) => {
      const studentRecs = (attendanceRecords || []).filter((r: Record<string, unknown>) => r.student_id === s.id)
      const total = studentRecs.length
      const present = studentRecs.filter((r: Record<string, unknown>) => r.status === 'P').length
      const absent = studentRecs.filter((r: Record<string, unknown>) => r.status === 'A').length
      return {
        ...s,
        total_days: total,
        present,
        absent,
        leave: studentRecs.filter((r: Record<string, unknown>) => r.status === 'L').length,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      }
    })

    return c.json({ month, class_id: parseInt(classId), section_id: parseInt(sectionId), report })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
