import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/parent/children
router.get('/children', authenticate, authorize('parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: children } = await supabase.from('student_parents')
      .select('relation, students!inner(id, name, admission_no, current_roll_no, photo_url, status, school_id, classes(name), sections(name))')
      .eq('parent_user_id', user.id).eq('students.school_id', schoolId).is('students.deleted_at', null)

    return c.json((children || []).map((row: Record<string, unknown>) => {
      const s = row.students as Record<string, unknown>
      return {
        id: s.id, name: s.name, admission_no: s.admission_no, current_roll_no: s.current_roll_no,
        photo_url: s.photo_url, status: s.status,
        class_name: (s.classes as Record<string, unknown>)?.name,
        section_name: (s.sections as Record<string, unknown>)?.name,
        relation: row.relation,
      }
    }))
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/parent/attendance/:studentId
router.get('/attendance/:studentId', authenticate, authorize('parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId } = c.req.param()
    const supabase = getSupabase(c.env)

    // Verify parent-child link
    const { data: link } = await supabase.from('student_parents')
      .select('student_id, students!inner(school_id)').eq('student_id', studentId).eq('parent_user_id', user.id).eq('students.school_id', schoolId).single()
    if (!link) return c.json({ error: 'Access denied' }, 403)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year configured for this school' }, 400)

    const { data: records } = await supabase.from('attendance')
      .select('status, date').eq('student_id', studentId).eq('academic_year_id', (academicYear as Record<string, unknown>).id as number).eq('school_id', schoolId).order('date', { ascending: false })

    const recs = records || []
    const total = recs.length
    const present = recs.filter((r: Record<string, unknown>) => r.status === 'P').length
    const absent = recs.filter((r: Record<string, unknown>) => r.status === 'A').length
    const leave = recs.filter((r: Record<string, unknown>) => r.status === 'L').length
    const halfDay = recs.filter((r: Record<string, unknown>) => r.status === 'HD').length
    const effectivePresent = present + (halfDay * 0.5)
    const percentage = total > 0 ? Math.round((effectivePresent / total) * 10000) / 100 : 0

    return c.json({
      total_days: total, present, absent, leave, half_day: halfDay,
      percentage, eligible_for_exam: percentage >= 75,
      recent_records: recs.slice(0, 30),
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/parent/fees/:studentId
router.get('/fees/:studentId', authenticate, authorize('parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: link } = await supabase.from('student_parents')
      .select('student_id, students!inner(school_id)').eq('student_id', studentId).eq('parent_user_id', user.id).eq('students.school_id', schoolId).single()
    if (!link) return c.json({ error: 'Access denied' }, 403)

    const { data: student } = await supabase.from('students').select('id, current_class_id').eq('id', studentId).eq('school_id', schoolId).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year configured for this school' }, 400)
    const ayId = (academicYear as Record<string, unknown>).id as number

    const { data: feeStructure } = await supabase.from('fee_structures')
      .select('*').eq('class_id', (student as Record<string, unknown>).current_class_id as number).eq('academic_year_id', ayId).is('deleted_at', null).single()
    if (!feeStructure) return c.json({ message: 'No fee structure found' })

    const { data: installments } = await supabase.from('fee_installments')
      .select('*').eq('fee_structure_id', (feeStructure as Record<string, unknown>).id as number).order('installment_no')

    const { data: payments } = await supabase.from('fee_payments')
      .select('*').eq('student_id', (student as Record<string, unknown>).id as number).eq('academic_year_id', ayId)

    const paymentMap = new Map((payments || []).map((p: Record<string, unknown>) => [p.installment_id, p]))
    const installmentStatus = (installments || []).map((inst: Record<string, unknown>) => {
      const pay = paymentMap.get(inst.id)
      return {
        installment_no: inst.installment_no, amount: inst.amount, due_date: inst.due_date,
        paid: !!pay,
        payment_date: (pay as Record<string, unknown>)?.payment_date,
        receipt_no: (pay as Record<string, unknown>)?.receipt_no,
      }
    })

    const totalPaid = (payments || []).reduce((s: number, p: Record<string, unknown>) => s + parseFloat(p.amount_paid as string), 0)

    return c.json({
      total_fee: parseFloat((feeStructure as Record<string, unknown>).total_amount as string),
      total_paid: totalPaid,
      total_due: Math.max(0, parseFloat((feeStructure as Record<string, unknown>).total_amount as string) - totalPaid),
      installments: installmentStatus,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/parent/results/:studentId
router.get('/results/:studentId', authenticate, authorize('parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: link } = await supabase.from('student_parents')
      .select('student_id, students!inner(school_id)').eq('student_id', studentId).eq('parent_user_id', user.id).eq('students.school_id', schoolId).single()
    if (!link) return c.json({ error: 'Access denied' }, 403)

    const { data: student } = await supabase.from('students').select('id, current_class_id').eq('id', studentId).eq('school_id', schoolId).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year configured for this school' }, 400)

    const { data: exams } = await supabase.from('exams')
      .select('id, name, term, start_date')
      .eq('class_id', (student as Record<string, unknown>).current_class_id as number)
      .eq('academic_year_id', (academicYear as Record<string, unknown>).id as number)
      .eq('school_id', schoolId).order('start_date')

    const results = []
    for (const exam of (exams || []) as Record<string, unknown>[]) {
      const { data: examSubjects } = await supabase.from('exam_subjects').select('*, subjects(name)').eq('exam_id', exam.id as number)
      const esIds = (examSubjects || []).map((es: Record<string, unknown>) => es.id as number)
      const { data: marks } = esIds.length
        ? await supabase.from('marks').select('*').in('exam_subject_id', esIds).eq('student_id', studentId)
        : { data: [] }

      if (!marks?.length) continue

      let totalObtained = 0
      let totalMax = 0
      const subjectResults = (examSubjects || []).map((es: Record<string, unknown>) => {
        const subj = es.subjects as Record<string, unknown>
        const mark = (marks || []).find((m: Record<string, unknown>) => Number(m.exam_subject_id) === Number(es.id)) as Record<string, unknown>
        const obtained = mark ? parseFloat((mark.marks_obtained as string) || '0') : 0
        totalObtained += obtained
        totalMax += es.max_marks as number
        return { subject: subj?.name, max_marks: es.max_marks, obtained, passed: obtained >= (es.passing_marks as number) }
      })

      results.push({
        exam_id: exam.id, exam_name: exam.name, term: exam.term, subjects: subjectResults,
        total_obtained: totalObtained, total_max: totalMax,
        percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0,
      })
    }

    return c.json(results)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/parent/notices
router.get('/notices', authenticate, authorize('parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: notices } = await supabase.from('notices')
      .select('*, users(name)').eq('school_id', schoolId).eq('is_active', true)
      .in('target_audience', ['all', 'parents'])
      .order('created_at', { ascending: false }).limit(20)

    return c.json(notices || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/parent/homework/:classId/:sectionId
router.get('/homework/:classId/:sectionId', authenticate, authorize('parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { classId, sectionId } = c.req.param()
    const supabase = getSupabase(c.env)

    // Verify parent's child is in this class/section
    const { data: childInClass } = await supabase.from('student_parents')
      .select('student_id, students!inner(current_class_id, current_section_id, school_id, deleted_at)')
      .eq('parent_user_id', user.id)
      .eq('students.current_class_id', classId)
      .eq('students.current_section_id', sectionId)
      .eq('students.school_id', schoolId)
      .is('students.deleted_at', null).single()
    if (!childInClass) return c.json({ error: 'Access denied' }, 403)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: homework } = await supabase.from('homework')
      .select('*, subjects(name), users(name)')
      .eq('class_id', classId).eq('section_id', sectionId).eq('school_id', schoolId)
      .gte('due_date', sevenDaysAgo).order('due_date', { ascending: false })

    return c.json(homework || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
