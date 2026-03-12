import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'
import { calculatePercentage } from '../utils/helpers'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/alerts/weak-subjects/:studentId
router.get('/weak-subjects/:studentId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    const { data: student } = await supabase.from('students').select('id, name, current_class_id').eq('id', studentId).eq('school_id', schoolId).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: exams } = await supabase.from('exams')
      .select('id').eq('class_id', (student as Record<string, unknown>).current_class_id as number)
      .eq('academic_year_id', (academicYear as Record<string, unknown>)?.id || -1)
    if (!exams?.length) return c.json({ alerts: [], message: 'No exams found' })

    const examIds = exams.map((e: Record<string, unknown>) => e.id as number)
    const { data: examSubjects } = await supabase.from('exam_subjects')
      .select('*, subjects(name, class_id, classes(school_id))').in('exam_id', examIds)

    // Filter to school's subjects
    const validExamSubjects = (examSubjects || []).filter((es: Record<string, unknown>) => {
      const subj = es.subjects as Record<string, unknown>
      const cls = subj?.classes as Record<string, unknown>
      return Number(cls?.school_id) === schoolId
    })

    // Group by subject
    const subjectMap = new Map<number, Record<string, unknown>[]>()
    for (const es of validExamSubjects as Record<string, unknown>[]) {
      const subjId = Number((es.subjects as Record<string, unknown>)?.id || es.subject_id)
      if (!subjectMap.has(subjId)) subjectMap.set(subjId, [])
      subjectMap.get(subjId)!.push(es)
    }

    const weakSubjects = []
    for (const [, subExams] of subjectMap) {
      const esIds = subExams.map(se => se.id as number)
      const { data: marks } = await supabase.from('marks').select('marks_obtained, exam_subject_id').in('exam_subject_id', esIds).eq('student_id', studentId)
      if (!marks?.length) continue

      const avgPercentage = (marks as Record<string, unknown>[]).reduce((sum: number, m: Record<string, unknown>) => {
        const es = subExams.find(se => Number(se.id) === Number(m.exam_subject_id))
        return sum + calculatePercentage(parseFloat((m.marks_obtained as string) || '0'), (es?.max_marks as number) || 100)
      }, 0) / marks.length

      if (avgPercentage < 50) {
        const subjectName = (subExams[0].subjects as Record<string, unknown>)?.name
        weakSubjects.push({
          subject: subjectName,
          subject_id: (subExams[0].subjects as Record<string, unknown>)?.id,
          avg_percentage: Math.round(avgPercentage * 100) / 100,
          severity: avgPercentage < 33 ? 'critical' : 'warning',
          message: avgPercentage < 33
            ? `Failing in ${subjectName} (${avgPercentage.toFixed(1)}%)`
            : `Below average in ${subjectName} (${avgPercentage.toFixed(1)}%)`,
        })
      }
    }

    return c.json({
      student_id: parseInt(studentId),
      student_name: (student as Record<string, unknown>).name,
      weak_subjects: weakSubjects,
      total_alerts: weakSubjects.length,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/alerts/attendance-risk/:classId
router.get('/attendance-risk/:classId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { classId } = c.req.param()
    const { section_id } = c.req.query()
    const supabase = getSupabase(c.env)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()

    let studentsQuery = supabase.from('students').select('id, name, admission_no, current_roll_no, father_phone')
      .eq('current_class_id', classId).eq('status', 'active').eq('school_id', schoolId).is('deleted_at', null)
    if (section_id) studentsQuery = studentsQuery.eq('current_section_id', section_id)
    const { data: students } = await studentsQuery

    const riskStudents: Record<string, unknown>[] = []

    for (const student of (students || []) as Record<string, unknown>[]) {
      const { data: records } = await supabase.from('attendance')
        .select('status').eq('student_id', student.id as number)
        .eq('academic_year_id', (academicYear as Record<string, unknown>)?.id || -1).eq('school_id', schoolId)

      const total = (records || []).length
      if (total === 0) continue

      const present = (records || []).filter((r: Record<string, unknown>) => r.status === 'P').length
      const halfDay = (records || []).filter((r: Record<string, unknown>) => r.status === 'HD').length
      const effectivePresent = present + (halfDay * 0.5)
      const percentage = Math.round((effectivePresent / total) * 10000) / 100

      if (percentage < 85) {
        riskStudents.push({
          ...student, total_days: total, present: effectivePresent, percentage,
          status: percentage < 75 ? 'BLOCKED' : 'AT_RISK',
          shortfall: percentage < 75 ? Math.ceil((0.75 * total) - effectivePresent) : 0,
          message: percentage < 75
            ? `BLOCKED from exam — ${percentage}% attendance (need 75%)`
            : `AT RISK — ${percentage}% attendance, needs improvement`,
        })
      }
    }

    riskStudents.sort((a, b) => (a.percentage as number) - (b.percentage as number))

    const q = c.req.query()
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(parseInt(q.limit || '50'), 100)
    const offset = (page - 1) * limit
    const paged = riskStudents.slice(offset, offset + limit)

    return c.json({
      class_id: parseInt(classId),
      threshold: 75,
      total_students: (students || []).length,
      at_risk: riskStudents.filter(s => s.status === 'AT_RISK').length,
      blocked: riskStudents.filter(s => s.status === 'BLOCKED').length,
      students: paged,
      pagination: { total: riskStudents.length, page, limit },
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/alerts/fee-delay
router.get('/fee-delay', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    const today = new Date().toISOString().split('T')[0]

    // Get overdue installments
    const { data: overdueInstallments } = await supabase.from('fee_installments')
      .select('*, fee_structures!inner(class_id, academic_year_id, deleted_at, classes!inner(name, school_id))')
      .lt('due_date', today)
      .eq('fee_structures.academic_year_id', (academicYear as Record<string, unknown>)?.id || -1)
      .eq('fee_structures.classes.school_id', schoolId)
      .is('fee_structures.deleted_at', null)

    const alerts: Record<string, unknown>[] = []

    for (const inst of (overdueInstallments || []) as Record<string, unknown>[]) {
      const feeStruct = inst.fee_structures as Record<string, unknown>
      const cls = feeStruct.classes as Record<string, unknown>

      // Students in this class without payment
      const { data: students } = await supabase.from('students')
        .select('id, name, admission_no, father_phone')
        .eq('current_class_id', feeStruct.class_id as number).eq('status', 'active').eq('school_id', schoolId).is('deleted_at', null)

      const { data: payments } = await supabase.from('fee_payments')
        .select('student_id').eq('installment_id', inst.id as number)

      const paidStudentIds = new Set((payments || []).map((p: Record<string, unknown>) => Number(p.student_id)))

      for (const student of (students || []) as Record<string, unknown>[]) {
        if (paidStudentIds.has(Number(student.id))) continue
        const daysOverdue = Math.floor((new Date().getTime() - new Date(inst.due_date as string).getTime()) / (1000 * 60 * 60 * 24))
        alerts.push({
          student_id: student.id, student_name: student.name, admission_no: student.admission_no,
          class_name: cls.name, installment_no: inst.installment_no, amount: inst.amount,
          due_date: inst.due_date, days_overdue: daysOverdue,
          severity: daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium',
          father_phone: student.father_phone,
        })
      }
    }

    alerts.sort((a, b) => (b.days_overdue as number) - (a.days_overdue as number))

    const q = c.req.query()
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(parseInt(q.limit || '50'), 100)
    const offset = (page - 1) * limit
    const paged = alerts.slice(offset, offset + limit)

    return c.json({
      total_alerts: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      alerts: paged,
      pagination: { total: alerts.length, page, limit },
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
