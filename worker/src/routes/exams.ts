import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'
import { createAuditLog, getClientIp } from '../utils/auditLog'
import { calculatePercentage } from '../utils/helpers'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

function getGrade(percentage: number): string {
  if (percentage >= 91) return 'A1'
  if (percentage >= 81) return 'A2'
  if (percentage >= 71) return 'B1'
  if (percentage >= 61) return 'B2'
  if (percentage >= 51) return 'C1'
  if (percentage >= 41) return 'C2'
  if (percentage >= 33) return 'D'
  return 'E (Fail)'
}

// POST /api/exams/request-access
router.post('/request-access', authenticate, authorize('teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    await supabase.from('notices').insert({
      title: 'Exam Creation Access Request',
      content: `${user.name} has requested permission to create a new examination.`,
      target_audience: 'staff',
      created_by: user.id,
      school_id: schoolId,
    })
    return c.json({ message: 'Request sent successfully' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/exams
router.post('/', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const { name, term, class_id, subjects, start_date, end_date } = await c.req.json()
    if (!name || !term || !class_id || !Array.isArray(subjects) || subjects.length === 0) {
      return c.json({ error: 'name, term, class_id, subjects[] are required' }, 400)
    }
    if (!['1', '2'].includes(String(term))) return c.json({ error: 'term must be 1 or 2' }, 400)

    const supabase = getSupabase(c.env)
    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)

    const { data: schoolClass } = await supabase.from('classes').select('id').eq('id', class_id).eq('school_id', schoolId).single()
    if (!schoolClass) return c.json({ error: 'Invalid class for your school' }, 400)

    // Validate subjects
    const subjectIds = subjects.map((s: Record<string, unknown>) => Number(s.subject_id))
    const { data: validSubjects } = await supabase.from('subjects')
      .select('id, classes(school_id)').in('id', subjectIds)
    const validSet = new Set((validSubjects || []).filter((s: Record<string, unknown>) => {
      const cls = s.classes as Record<string, unknown>
      return Number(cls?.school_id) === schoolId
    }).map((s: Record<string, unknown>) => Number(s.id)))
    const invalidSubjects = subjectIds.filter((id: number) => !validSet.has(id))
    if (invalidSubjects.length > 0) return c.json({ error: 'Some subjects are invalid', invalid_subject_ids: invalidSubjects }, 400)

    const { data: exam, error: examErr } = await supabase.from('exams').insert({
      name, term: String(term), class_id,
      academic_year_id: (academicYear as Record<string, unknown>).id,
      school_id: schoolId, start_date, end_date, status: 'upcoming',
    }).select().single()
    if (examErr) return c.json({ error: 'Failed to create exam' }, 500)

    const examSubjectInserts = subjects.map((s: Record<string, unknown>) => ({
      exam_id: (exam as Record<string, unknown>).id,
      subject_id: s.subject_id,
      max_marks: s.max_marks || 100,
      passing_marks: s.passing_marks || 33,
      exam_date: s.exam_date || null,
    }))
    const { data: examSubjects } = await supabase.from('exam_subjects').insert(examSubjectInserts).select()

    await createAuditLog(supabase, {
      user_id: user.id, action: 'create', entity_type: 'exam',
      entity_id: (exam as Record<string, unknown>).id as number,
      new_value: { name, term, class_id }, ip_address: getClientIp(c), description: 'Exam created',
    })

    return c.json({ ...(exam as Record<string, unknown>), subjects: examSubjects || [] }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/exams
router.get('/', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const q = c.req.query()
    const { class_id, term, academic_year_id, status } = q
    const supabase = getSupabase(c.env)

    let ayId: number
    if (academic_year_id) {
      const { data: ay } = await supabase.from('academic_years').select('id').eq('id', academic_year_id).eq('school_id', schoolId).single()
      ayId = (ay as Record<string, unknown>)?.id as number || -1
    } else {
      const { data: ay } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
      ayId = (ay as Record<string, unknown>)?.id as number || -1
    }

    let query = supabase.from('exams').select('*, classes(name)').eq('academic_year_id', ayId).eq('school_id', schoolId)
    if (class_id) query = query.eq('class_id', class_id)
    if (term) query = query.eq('term', term)
    if (status) query = query.eq('status', status)

    const { data: exams } = await query.order('start_date', { ascending: false })
    return c.json(exams || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/exams/:examId
router.get('/:examId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { examId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: exam } = await supabase.from('exams').select('*, classes(name)').eq('id', examId).eq('school_id', schoolId).single()
    if (!exam) return c.json({ error: 'Exam not found' }, 404)

    const { data: subjects } = await supabase.from('exam_subjects').select('*, subjects(name)').eq('exam_id', examId)
    return c.json({ ...(exam as Record<string, unknown>), subjects: subjects || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/exams/:examId/marks — Enter marks (bulk)
router.post('/:examId/marks', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { examId } = c.req.param()

    const { exam_subject_id, marks: marksData } = await c.req.json()
    if (!exam_subject_id || !Array.isArray(marksData) || marksData.length === 0) {
      return c.json({ error: 'exam_subject_id and marks[] are required' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: exam } = await supabase.from('exams').select('id, class_id').eq('id', examId).eq('school_id', schoolId).single()
    if (!exam) return c.json({ error: 'Exam not found' }, 404)

    const { data: examSubject } = await supabase.from('exam_subjects').select('id').eq('id', exam_subject_id).eq('exam_id', examId).single()
    if (!examSubject) return c.json({ error: 'Exam subject not found' }, 404)

    const studentIds = marksData.map((m: Record<string, unknown>) => Number(m.student_id))
    const { data: validStudents } = await supabase.from('students')
      .select('id').in('id', studentIds).eq('school_id', schoolId)
      .eq('current_class_id', (exam as Record<string, unknown>).class_id as number).eq('status', 'active').is('deleted_at', null)
    const validSet = new Set((validStudents || []).map((s: Record<string, unknown>) => Number(s.id)))
    const invalidStudents = studentIds.filter((id: number) => !validSet.has(id))
    if (invalidStudents.length > 0) return c.json({ error: 'Some students are invalid', invalid_student_ids: invalidStudents }, 400)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()

    const inserts = marksData.map((m: Record<string, unknown>) => ({
      student_id: m.student_id,
      exam_subject_id,
      academic_year_id: (academicYear as Record<string, unknown>)?.id || -1,
      marks_obtained: m.is_absent ? null : m.marks_obtained,
      is_absent: m.is_absent || false,
      entered_by: user.id,
    }))

    await supabase.from('marks').upsert(inserts, { onConflict: 'student_id,exam_subject_id', ignoreDuplicates: false })

    // Update exam status if it was upcoming
    await supabase.from('exams').update({ status: 'ongoing' }).eq('id', examId).eq('status', 'upcoming').eq('school_id', schoolId)

    await createAuditLog(supabase, {
      user_id: user.id, action: 'marks_entry', entity_type: 'marks',
      new_value: { exam_subject_id, count: marksData.length },
      ip_address: getClientIp(c), description: `Marks entered for ${marksData.length} students`,
    })

    return c.json({ message: `Marks entered for ${marksData.length} students` })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/exams/:examId/results/:classId
router.get('/:examId/results/:classId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { examId, classId } = c.req.param()
    const { section_id } = c.req.query()
    const supabase = getSupabase(c.env)

    const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).eq('school_id', schoolId).single()
    if (!exam) return c.json({ error: 'Exam not found' }, 404)

    const { data: schoolClass } = await supabase.from('classes').select('id').eq('id', classId).eq('school_id', schoolId).single()
    if (!schoolClass) return c.json({ error: 'Class not found' }, 404)

    const { data: examSubjects } = await supabase.from('exam_subjects').select('*, subjects(name)').eq('exam_id', examId)

    let studentsQuery = supabase.from('students').select('id, name, admission_no, current_roll_no, current_section_id')
      .eq('current_class_id', classId).eq('status', 'active').eq('school_id', schoolId).is('deleted_at', null)
    if (section_id) studentsQuery = studentsQuery.eq('current_section_id', section_id)
    const { data: students } = await studentsQuery.order('current_roll_no')

    const esIds = (examSubjects || []).map((es: Record<string, unknown>) => es.id as number)
    const { data: allMarks } = esIds.length
      ? await supabase.from('marks').select('*').in('exam_subject_id', esIds)
      : { data: [] }

    const results = []
    for (const student of (students || []) as Record<string, unknown>[]) {
      const studentMarks = (allMarks || []).filter((m: Record<string, unknown>) => Number(m.student_id) === Number(student.id))
      let totalObtained = 0
      let totalMax = 0
      let allPassed = true

      const subjectResults = (examSubjects || []).map((es: Record<string, unknown>) => {
        const subj = es.subjects as Record<string, unknown>
        const mark = studentMarks.find((m: Record<string, unknown>) => Number(m.exam_subject_id) === Number(es.id))
        const obtained = (mark as Record<string, unknown>)?.is_absent ? 0 : parseFloat(((mark as Record<string, unknown>)?.marks_obtained as string) || '0')
        const passed = obtained >= (es.passing_marks as number)
        if (!passed && !(mark as Record<string, unknown>)?.is_absent) allPassed = false
        totalObtained += obtained
        totalMax += es.max_marks as number
        return {
          subject: subj?.name, max_marks: es.max_marks, passing_marks: es.passing_marks,
          obtained, is_absent: (mark as Record<string, unknown>)?.is_absent || false, passed,
        }
      })

      results.push({
        student_id: student.id, name: student.name, admission_no: student.admission_no,
        roll_no: student.current_roll_no, subjects: subjectResults, total_obtained: totalObtained,
        total_max: totalMax, percentage: calculatePercentage(totalObtained, totalMax),
        result: allPassed ? 'PASS' : 'FAIL',
      })
    }

    results.sort((a, b) => b.percentage - a.percentage)
    results.forEach((r, i) => (r as Record<string, unknown>).rank = i + 1)

    return c.json({ exam, subjects: examSubjects, results })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/exams/student/:studentId/report-card/:examId
router.get('/student/:studentId/report-card/:examId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId, examId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students')
      .select('*, classes(name), sections(name)').eq('id', studentId).eq('school_id', schoolId).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).eq('school_id', schoolId).single()
    if (!exam) return c.json({ error: 'Exam not found' }, 404)

    const { data: schoolSettings } = await supabase.from('school_settings').select('school_name').eq('school_id', schoolId).single()
    const schoolName = (schoolSettings as Record<string, unknown>)?.school_name as string || 'School'

    const { data: examSubjects } = await supabase.from('exam_subjects').select('*, subjects(name)').eq('exam_id', examId)
    const esIds = (examSubjects || []).map((es: Record<string, unknown>) => es.id as number)
    const { data: marks } = esIds.length
      ? await supabase.from('marks').select('*').in('exam_subject_id', esIds).eq('student_id', studentId)
      : { data: [] }

    let totalObtained = 0
    let totalMax = 0
    let allPassed = true

    const subjectResults = (examSubjects || []).map((es: Record<string, unknown>) => {
      const subj = es.subjects as Record<string, unknown>
      const mark = (marks || []).find((m: Record<string, unknown>) => Number(m.exam_subject_id) === Number(es.id)) as Record<string, unknown>
      const obtained = mark?.is_absent ? 0 : parseFloat((mark?.marks_obtained as string) || '0')
      const passed = obtained >= (es.passing_marks as number)
      if (!passed) allPassed = false
      totalObtained += obtained
      totalMax += es.max_marks as number
      return {
        subject: subj?.name, max_marks: es.max_marks, passing_marks: es.passing_marks,
        obtained, is_absent: mark?.is_absent || false, passed,
        grade: getGrade(calculatePercentage(obtained, es.max_marks as number)),
      }
    })

    const { data: attendanceRecords } = await supabase.from('attendance')
      .select('status').eq('student_id', studentId).eq('academic_year_id', (exam as Record<string, unknown>).academic_year_id as number).eq('school_id', schoolId)
    const attTotal = (attendanceRecords || []).length
    const attPresent = (attendanceRecords || []).filter((r: Record<string, unknown>) => r.status === 'P').length

    const { aadhaar_encrypted: _ae, ...safeStudent } = student as Record<string, unknown>

    return c.json({
      school_name: schoolName,
      student: {
        name: safeStudent.name, admission_no: safeStudent.admission_no,
        class: (safeStudent.classes as Record<string, unknown>)?.name,
        section: (safeStudent.sections as Record<string, unknown>)?.name,
        roll_no: safeStudent.current_roll_no, father_name: safeStudent.father_name, dob: safeStudent.dob,
      },
      exam: { name: (exam as Record<string, unknown>).name, term: (exam as Record<string, unknown>).term },
      subjects: subjectResults,
      total_obtained: totalObtained, total_max: totalMax,
      percentage: calculatePercentage(totalObtained, totalMax),
      result: allPassed ? 'PASS' : 'FAIL',
      grade: getGrade(calculatePercentage(totalObtained, totalMax)),
      attendance: {
        total_days: attTotal, present: attPresent,
        percentage: attTotal > 0 ? calculatePercentage(attPresent, attTotal) : 0,
      },
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
