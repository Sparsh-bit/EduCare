import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize, ownerOnly } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

function cbseGrade(percent: number): string {
  if (percent >= 91) return 'A1'
  if (percent >= 81) return 'A2'
  if (percent >= 71) return 'B1'
  if (percent >= 61) return 'B2'
  if (percent >= 51) return 'C1'
  if (percent >= 41) return 'C2'
  if (percent >= 33) return 'D'
  return 'E'
}

// ─── BOARD CONFIG ───

// GET /api/board/config
router.get('/config', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('board_config').select('*').eq('school_id', schoolId).maybeSingle()
    return c.json(data || {})
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/board/config
router.post('/config', authenticate, ownerOnly(), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.board_type || !['CBSE', 'ICSE', 'State'].includes(body.board_type)) {
      return c.json({ error: 'board_type must be CBSE, ICSE, or State' }, 400)
    }
    const supabase = getSupabase(c.env)

    const { board_type, state_board_name, udise_code, pan_number, gstin, cce_enabled, fa_weightage, sa_weightage } = body
    const payload = {
      board_type, state_board_name: state_board_name || null, udise_code: udise_code || null,
      pan_number: pan_number || null, gstin: gstin || null,
      cce_enabled: cce_enabled ?? true,
      fa_weightage: fa_weightage ?? 10,
      sa_weightage: sa_weightage ?? 30,
    }

    const { data: existing } = await supabase.from('board_config').select('id').eq('school_id', schoolId).maybeSingle()
    if (existing) {
      await supabase.from('board_config').update(payload).eq('school_id', schoolId)
    } else {
      await supabase.from('board_config').insert({ ...payload, school_id: schoolId })
    }
    return c.json({ message: 'Board configuration saved' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── EXAM TERMS ───

// GET /api/board/terms
router.get('/terms', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { academic_year_id } = c.req.query()

    let query = supabase.from('exam_terms').select('*').eq('school_id', schoolId).order('id')
    if (academic_year_id) query = query.eq('academic_year_id', academic_year_id)
    const { data } = await query
    return c.json({ data: data || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/board/terms
router.post('/terms', authenticate, authorize('owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.term_type || !body.term_name || !body.academic_year_id) {
      return c.json({ error: 'term_type, term_name, academic_year_id are required' }, 400)
    }
    const supabase = getSupabase(c.env)

    const { data: term } = await supabase.from('exam_terms').insert({
      school_id: schoolId,
      academic_year_id: body.academic_year_id,
      term_type: body.term_type,
      term_name: body.term_name,
      max_marks: body.max_marks ?? 100,
      weightage_percent: body.weightage_percent ?? 10,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
    }).select().single()

    return c.json({ message: 'Term created', data: term }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/board/terms/:id
router.put('/terms/:id', authenticate, authorize('owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const { term_name, max_marks, weightage_percent, start_date, end_date, status } = body
    await supabase.from('exam_terms').update({ term_name, max_marks, weightage_percent, start_date, end_date, status }).eq('id', id).eq('school_id', schoolId)
    return c.json({ message: 'Term updated' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/board/terms/:id
router.delete('/terms/:id', authenticate, ownerOnly(), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    await supabase.from('exam_terms').delete().eq('id', id).eq('school_id', schoolId)
    return c.json({ message: 'Term deleted' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── REPORT CARD CONFIG ───

// GET /api/board/report-card-config
router.get('/report-card-config', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('report_card_config').select('*').eq('school_id', schoolId).maybeSingle()
    return c.json(data || {})
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/board/report-card-config
router.post('/report-card-config', authenticate, ownerOnly(), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const { school_name, school_address, school_phone, principal_name, affiliation_number, show_co_scholastic, show_attendance, show_remarks } = body
    const payload = {
      school_name, school_address, school_phone, principal_name, affiliation_number: affiliation_number || null,
      show_co_scholastic: show_co_scholastic ?? true,
      show_attendance: show_attendance ?? true,
      show_remarks: show_remarks ?? true,
    }

    const { data: existing } = await supabase.from('report_card_config').select('id').eq('school_id', schoolId).maybeSingle()
    if (existing) {
      await supabase.from('report_card_config').update(payload).eq('school_id', schoolId)
    } else {
      await supabase.from('report_card_config').insert({ ...payload, school_id: schoolId })
    }
    return c.json({ message: 'Report card configuration saved' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── CO-SCHOLASTIC (individual) ───

// GET /api/board/co-scholastic/:studentId/:academicYearId/:term
router.get('/co-scholastic/:studentId/:academicYearId/:term', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId, academicYearId, term } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data } = await supabase.from('cce_co_scholastic').select('*')
      .eq('school_id', schoolId).eq('student_id', studentId)
      .eq('academic_year_id', academicYearId).eq('term', term).maybeSingle()
    return c.json(data || {})
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/board/co-scholastic
router.post('/co-scholastic', authenticate, authorize('owner', 'co-owner', 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const {
      student_id, academic_year_id, term,
      art_education, work_education, health_physical_education,
      thinking_skills, social_skills, emotional_skills,
      attitude_towards_school, attitude_towards_teachers, attitude_towards_peers,
      teacher_remarks
    } = body

    const gradeData = {
      art_education, work_education, health_physical_education,
      thinking_skills, social_skills, emotional_skills,
      attitude_towards_school, attitude_towards_teachers, attitude_towards_peers,
      teacher_remarks, entered_by: user.id,
    }

    const { data: existing } = await supabase.from('cce_co_scholastic').select('id')
      .eq('school_id', schoolId).eq('student_id', student_id).eq('academic_year_id', academic_year_id).eq('term', term).maybeSingle()

    if (existing) {
      await supabase.from('cce_co_scholastic').update(gradeData).eq('id', (existing as Record<string, unknown>).id)
    } else {
      await supabase.from('cce_co_scholastic').insert({ school_id: schoolId, student_id, academic_year_id, term, ...gradeData })
    }
    return c.json({ message: 'Co-scholastic grades saved' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── CO-SCHOLASTIC (bulk for a class) ───

// GET /api/board/co-scholastic/bulk/:classId/:academicYearId/:term
router.get('/co-scholastic/bulk/:classId/:academicYearId/:term', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { classId, academicYearId, term } = c.req.param()
    const { section_id } = c.req.query()
    const supabase = getSupabase(c.env)

    let studentQuery = supabase.from('student_class_history')
      .select('student_id, roll_no, students!inner(id, name, admission_no, school_id)')
      .eq('class_id', classId).eq('academic_year_id', academicYearId).eq('status', 'active')
      .eq('students.school_id', schoolId)
    if (section_id) studentQuery = studentQuery.eq('section_id', section_id)

    const { data: historyRows } = await studentQuery
    const students = (historyRows || []).map((h: Record<string, unknown>) => {
      const s = h.students as Record<string, unknown>
      return { id: s.id, name: s.name, admission_no: s.admission_no, roll_no: h.roll_no }
    })

    const { data: grades } = await supabase.from('cce_co_scholastic').select('*')
      .eq('school_id', schoolId).eq('academic_year_id', academicYearId).eq('term', term)

    const gradeMap = new Map((grades || []).map((g: Record<string, unknown>) => [g.student_id, g]))

    const result = students.map((s: Record<string, unknown>) => ({
      student_id: s.id,
      student_name: s.name,
      admission_no: s.admission_no,
      roll_no: s.roll_no,
      grades: gradeMap.get(s.id as number) || {},
    }))

    return c.json({ data: result })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/board/co-scholastic/bulk
router.post('/co-scholastic/bulk', authenticate, authorize('owner', 'co-owner', 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    const { academic_year_id, term, records } = body
    if (!Array.isArray(records)) return c.json({ error: 'records must be an array' }, 400)
    const supabase = getSupabase(c.env)

    for (const r of records) {
      const {
        student_id, art_education, work_education, health_physical_education,
        thinking_skills, social_skills, emotional_skills,
        attitude_towards_school, attitude_towards_teachers, attitude_towards_peers,
        teacher_remarks
      } = r

      const gradeData = {
        art_education, work_education, health_physical_education,
        thinking_skills, social_skills, emotional_skills,
        attitude_towards_school, attitude_towards_teachers, attitude_towards_peers,
        teacher_remarks, entered_by: user.id,
      }

      const { data: existing } = await supabase.from('cce_co_scholastic').select('id')
        .eq('school_id', schoolId).eq('student_id', student_id).eq('academic_year_id', academic_year_id).eq('term', term).maybeSingle()

      if (existing) {
        await supabase.from('cce_co_scholastic').update(gradeData).eq('id', (existing as Record<string, unknown>).id)
      } else {
        await supabase.from('cce_co_scholastic').insert({ school_id: schoolId, student_id, academic_year_id, term, ...gradeData })
      }
    }

    return c.json({ message: `Saved ${records.length} co-scholastic records` })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── REPORT CARD DATA ───

// GET /api/board/report-card/:studentId/:examId
router.get('/report-card/:studentId/:examId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId, examId } = c.req.param()
    const supabase = getSupabase(c.env)

    // Student info from class history
    const { data: historyRow } = await supabase.from('student_class_history')
      .select('roll_no, academic_year_id, students!inner(id, name, admission_no, school_id), classes(name), sections(name)')
      .eq('student_id', studentId).eq('status', 'active').eq('students.school_id', schoolId).single()

    if (!historyRow) return c.json({ error: 'Student not found' }, 404)
    const s = (historyRow as Record<string, unknown>).students as Record<string, unknown>
    const cls = (historyRow as Record<string, unknown>).classes as Record<string, unknown>
    const sec = (historyRow as Record<string, unknown>).sections as Record<string, unknown>

    // Exam info
    const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).eq('school_id', schoolId).single()
    if (!exam) return c.json({ error: 'Exam not found' }, 404)

    // Subject marks
    const { data: marksRows } = await supabase.from('marks')
      .select('marks_obtained, is_absent, oral_marks, practical_marks, exam_subjects!inner(subject_id, max_marks, passing_marks, exam_id, subjects(name))')
      .eq('student_id', studentId)
      .eq('exam_subjects.exam_id', examId)

    const subjectResults = (marksRows || []).map((m: Record<string, unknown>) => {
      const es = m.exam_subjects as Record<string, unknown>
      const sub = es.subjects as Record<string, unknown>
      const total = Number(m.marks_obtained || 0)
      const maxMarks = Number(es.max_marks || 0)
      const passingMarks = Number(es.passing_marks || 0)
      const pct = maxMarks > 0 ? (total / maxMarks) * 100 : 0
      return {
        subject: sub.name,
        max_marks: maxMarks,
        passing_marks: passingMarks,
        marks_obtained: total,
        oral_marks: m.oral_marks,
        practical_marks: m.practical_marks,
        percentage: Math.round(pct * 10) / 10,
        grade: m.is_absent ? 'AB' : cbseGrade(pct),
        passed: !m.is_absent && total >= passingMarks,
        is_absent: m.is_absent,
      }
    })

    const totalObtained = subjectResults.reduce((sum, r) => sum + r.marks_obtained, 0)
    const totalMax = subjectResults.reduce((sum, r) => sum + r.max_marks, 0)
    const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0

    // Co-scholastic
    const examRecord = exam as Record<string, unknown>
    const coScholasticTerm = examRecord.term === '1' ? 'Term1' : examRecord.term === '2' ? 'Term2' : 'Annual'
    const { data: coScholastic } = await supabase.from('cce_co_scholastic').select('*')
      .eq('school_id', schoolId).eq('student_id', studentId)
      .eq('academic_year_id', (historyRow as Record<string, unknown>).academic_year_id)
      .eq('term', coScholasticTerm).maybeSingle()

    // Attendance stats (scoped to school via student already validated above)
    const { data: attendanceRows } = await supabase.from('attendance').select('status').eq('student_id', studentId).eq('school_id', schoolId)
    const totalDays = (attendanceRows || []).length
    const presentDays = (attendanceRows || []).filter((a: Record<string, unknown>) => a.status === 'P' || a.status === 'HD').length

    // Report card config
    const { data: rcConfig } = await supabase.from('report_card_config').select('*').eq('school_id', schoolId).maybeSingle()

    return c.json({
      student: {
        id: s.id, name: s.name, admission_no: s.admission_no,
        roll_no: (historyRow as Record<string, unknown>).roll_no,
        class_name: cls?.name, section_name: sec?.name,
      },
      exam: { id: examRecord.id, name: examRecord.name, term: examRecord.term },
      subjects: subjectResults,
      summary: {
        total_obtained: totalObtained,
        total_max: totalMax,
        overall_percentage: Math.round(overallPct * 10) / 10,
        overall_grade: cbseGrade(overallPct),
        result: subjectResults.every(r => r.passed) ? 'PASS' : 'FAIL',
      },
      co_scholastic: coScholastic || null,
      attendance: {
        total_days: totalDays,
        present_days: presentDays,
        percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      },
      report_card_config: rcConfig || {},
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
