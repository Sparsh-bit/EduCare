import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, ownerOnly } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── FULL UDISE+ EXPORT ───

// GET /api/udise/export
router.get('/export', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const [
      { data: ay },
      { data: boardConfig },
      { data: school },
    ] = await Promise.all([
      supabase.from('academic_years').select('id, year').eq('is_current', true).eq('school_id', schoolId).single(),
      supabase.from('board_config').select('*').eq('school_id', schoolId).single(),
      supabase.from('schools').select('name').eq('id', schoolId).single(),
    ])

    const ayId = (ay as Record<string, unknown>)?.id

    // Enrollment by class and gender
    const { data: historyRows } = await supabase.from('student_class_history')
      .select('class_id, students!inner(gender, status, school_id), classes(name)')
      .eq('academic_year_id', ayId)
      .eq('students.school_id', schoolId)
      .eq('students.status', 'active')

    const enrollmentMap: Record<string, Record<string, unknown>> = {}
    for (const h of (historyRows || []) as Record<string, unknown>[]) {
      const s = h.students as Record<string, unknown>
      const cls = h.classes as Record<string, unknown>
      const key = `${h.class_id}|${s.gender}`
      if (!enrollmentMap[key]) {
        enrollmentMap[key] = { class_id: h.class_id, class_name: cls?.name, gender: s.gender, count: 0 }
      }
      enrollmentMap[key].count = (enrollmentMap[key].count as number) + 1
    }
    const enrollment = Object.values(enrollmentMap)

    // Teacher stats
    const { data: staffList } = await supabase.from('staff')
      .select('id, designation, qualification').eq('school_id', schoolId).eq('status', 'active').is('deleted_at', null)

    const byDesig: Record<string, number> = {}
    for (const s of (staffList || []) as Record<string, unknown>[]) {
      const d = String(s.designation || 'Unknown')
      byDesig[d] = (byDesig[d] || 0) + 1
    }

    // Infrastructure
    const { data: infra } = await supabase.from('udise_infrastructure').select('*').eq('school_id', schoolId).maybeSingle()

    // Totals
    const { data: allStudents } = await supabase.from('students').select('id, is_rte').eq('school_id', schoolId).eq('status', 'active')
    const totalStudents = (allStudents || []).length
    const rteStudents = (allStudents || []).filter((s: Record<string, unknown>) => s.is_rte).length

    const bc = boardConfig as Record<string, unknown>
    const sc = school as Record<string, unknown>

    return c.json({
      generated_at: new Date().toISOString(),
      academic_year: (ay as Record<string, unknown>)?.year,
      school_profile: {
        name: sc?.name,
        udise_code: bc?.udise_code,
        board_type: bc?.board_type,
        pan_number: bc?.pan_number,
        gstin: bc?.gstin,
        affiliation_number: null,
      },
      enrollment: {
        total_students: totalStudents,
        rte_students: rteStudents,
        by_class_gender: enrollment,
      },
      teachers: {
        total: (staffList || []).length,
        male: 0,
        female: 0,
        by_designation: byDesig,
      },
      infrastructure: infra || {
        classrooms: 0, labs: 0, library_books: 0,
        boys_toilets: 0, girls_toilets: 0,
        has_drinking_water: false, has_electricity: false,
        has_internet: false, has_playground: false, has_medical_room: false,
      },
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── INFRASTRUCTURE ───

// GET /api/udise/infrastructure
router.get('/infrastructure', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data } = await supabase.from('udise_infrastructure').select('*').eq('school_id', schoolId).maybeSingle()
    return c.json(data || {})
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/udise/infrastructure
router.post('/infrastructure', authenticate, ownerOnly(), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const { classrooms, labs, library_books, boys_toilets, girls_toilets, has_drinking_water, has_electricity, has_internet, has_playground, has_medical_room } = body
    const infraData = { classrooms, labs, library_books, boys_toilets, girls_toilets, has_drinking_water, has_electricity, has_internet, has_playground, has_medical_room }

    const { data: existing } = await supabase.from('udise_infrastructure').select('id').eq('school_id', schoolId).maybeSingle()
    if (existing) {
      await supabase.from('udise_infrastructure').update(infraData).eq('school_id', schoolId)
    } else {
      await supabase.from('udise_infrastructure').insert({ school_id: schoolId, ...infraData })
    }
    return c.json({ message: 'Infrastructure data saved' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── ENROLLMENT SUMMARY ───

// GET /api/udise/enrollment-summary
router.get('/enrollment-summary', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: ay } = await supabase.from('academic_years').select('id, year').eq('is_current', true).eq('school_id', schoolId).single()
    const ayId = (ay as Record<string, unknown>)?.id

    const { data: historyRows } = await supabase.from('student_class_history')
      .select('class_id, students!inner(gender, status, is_rte, school_id), classes(name)')
      .eq('academic_year_id', ayId)
      .eq('students.school_id', schoolId)
      .eq('students.status', 'active')

    // Group by class
    const classMap: Record<number, { class_name: string; boys: number; girls: number; total: number; rte_students: number }> = {}
    for (const h of (historyRows || []) as Record<string, unknown>[]) {
      const s = h.students as Record<string, unknown>
      const cls = h.classes as Record<string, unknown>
      const cid = h.class_id as number
      if (!classMap[cid]) classMap[cid] = { class_name: cls?.name as string, boys: 0, girls: 0, total: 0, rte_students: 0 }
      classMap[cid].total++
      if (s.gender === 'male') classMap[cid].boys++
      else if (s.gender === 'female') classMap[cid].girls++
      if (s.is_rte) classMap[cid].rte_students++
    }

    return c.json({ data: Object.values(classMap), academic_year: (ay as Record<string, unknown>)?.year })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── TEACHER SUMMARY ───

// GET /api/udise/teacher-summary
router.get('/teacher-summary', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: staffList } = await supabase.from('staff')
      .select('id, name, designation, qualification, join_date')
      .eq('school_id', schoolId).eq('status', 'active').is('deleted_at', null)

    const total = (staffList || []).length
    const byDesig: Record<string, number> = {}
    const byQual: Record<string, number> = {}

    for (const s of (staffList || []) as Record<string, unknown>[]) {
      const d = String(s.designation || 'Unknown')
      const q = String(s.qualification || 'Not Specified')
      byDesig[d] = (byDesig[d] || 0) + 1
      byQual[q] = (byQual[q] || 0) + 1
    }

    return c.json({ total, male: 0, female: 0, by_designation: byDesig, by_qualification: byQual })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
