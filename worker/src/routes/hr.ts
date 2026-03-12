import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize, ownerOnly } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── TEACHER ASSIGNMENTS ───

// GET /api/hr/teacher-assignments
router.get('/teacher-assignments', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { class_id, section_id } = c.req.query()

    let query = supabase.from('teacher_subject_assignments')
      .select('*, users(name), classes(name, numeric_order), sections(name), subjects(name)')
      .eq('school_id', schoolId)

    if (class_id) query = query.eq('class_id', class_id)
    if (section_id) query = query.eq('section_id', section_id)

    const { data } = await query.order('school_id')
    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/hr/teacher-assignments
router.post('/teacher-assignments', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    const { teacher_id, class_id, section_id, subject_id } = body
    if (!teacher_id || !class_id || !section_id || !subject_id) {
      return c.json({ error: 'teacher_id, class_id, section_id, subject_id are required' }, 400)
    }
    const supabase = getSupabase(c.env)

    // Verify teacher belongs to this school
    const { data: teacher } = await supabase.from('users').select('id').eq('id', teacher_id).eq('school_id', schoolId).eq('is_active', true).single()
    if (!teacher) return c.json({ error: 'Invalid teacher for your school' }, 400)

    // Verify class belongs to this school
    const { data: cls } = await supabase.from('classes').select('id').eq('id', class_id).eq('school_id', schoolId).single()
    if (!cls) return c.json({ error: 'Invalid class for your school' }, 400)

    // Verify section belongs to the specified class
    const { data: section } = await supabase.from('sections').select('id').eq('id', section_id).eq('class_id', class_id).single()
    if (!section) return c.json({ error: 'Invalid section for the selected class' }, 400)

    // Verify subject belongs to this school via classes FK
    const { data: subjectExists } = await supabase.from('subjects').select('id, classes(school_id)').eq('id', subject_id).single()
    if (!subjectExists) return c.json({ error: 'Invalid subject for your school' }, 400)
    const subjCls = (subjectExists as Record<string, unknown>).classes as Record<string, unknown>
    if (Number(subjCls?.school_id) !== schoolId) return c.json({ error: 'Invalid subject for your school' }, 400)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()

    const { data: assignment, error } = await supabase.from('teacher_subject_assignments').insert({
      teacher_id, class_id, section_id, subject_id,
      academic_year_id: (academicYear as Record<string, unknown>)?.id || null,
      school_id: schoolId,
    }).select().single()

    if (error) {
      if (error.code === '23505') return c.json({ error: 'This assignment already exists' }, 400)
      throw error
    }

    return c.json({ message: 'Teacher assigned', data: assignment }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/hr/teacher-assignments/:id
router.delete('/teacher-assignments/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: existing } = await supabase.from('teacher_subject_assignments').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!existing) return c.json({ error: 'Assignment not found' }, 404)

    await supabase.from('teacher_subject_assignments').delete().eq('id', id).eq('school_id', schoolId)
    return c.json({ message: 'Assignment removed' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── CLASS TEACHERS ───

// GET /api/hr/class-teachers
router.get('/class-teachers', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: sections } = await supabase.from('sections')
      .select('id, name, class_teacher_id, classes!inner(id, name, numeric_order, school_id), users(name)')
      .eq('classes.school_id', schoolId)
      .order('classes(numeric_order)')

    return c.json((sections || []).map((s: Record<string, unknown>) => {
      const cls = s.classes as Record<string, unknown>
      const teacher = s.users as Record<string, unknown>
      return {
        section_id: s.id,
        class_id: cls?.id,
        class_name: cls?.name,
        section_name: s.name,
        class_teacher_id: s.class_teacher_id,
        teacher_name: teacher?.name || null,
      }
    }))
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/hr/class-teachers/:section_id
router.put('/class-teachers/:section_id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { section_id } = c.req.param()
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    // Verify section belongs to a class in this school
    const { data: section } = await supabase.from('sections')
      .select('id, name, class_id, classes!inner(name, school_id)')
      .eq('id', section_id)
      .eq('classes.school_id', schoolId)
      .single()
    if (!section) return c.json({ error: 'Section not found in your school' }, 404)

    if (body.teacher_id) {
      const { data: teacher } = await supabase.from('users').select('id, name').eq('id', body.teacher_id).eq('school_id', schoolId).eq('is_active', true).single()
      if (!teacher) return c.json({ error: 'Invalid teacher for your school' }, 400)

      // Create notice
      const cls = (section as Record<string, unknown>).classes as Record<string, unknown>
      const sectionName = (section as Record<string, unknown>).name
      await supabase.from('notices').insert({
        title: 'Class Teacher Assignment',
        content: `Teacher ${(teacher as Record<string, unknown>).name} has been assigned as the class teacher for Class ${cls?.name} Section ${sectionName}.`,
        target_audience: 'teachers',
        created_by: user.id,
        school_id: schoolId,
      })
    }

    const { data: updated } = await supabase.from('sections')
      .update({ class_teacher_id: body.teacher_id || null })
      .eq('id', section_id)
      .select().single()

    return c.json({ message: 'Class teacher assigned', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── LEAVE TYPES ───

// GET /api/hr/leave-types
router.get('/leave-types', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    // Get both global (null school_id) and school-specific leave types
    const { data: globalTypes } = await supabase.from('leave_types').select('*').is('school_id', null).eq('is_active', true)
    const { data: schoolTypes } = await supabase.from('leave_types').select('*').eq('school_id', schoolId).eq('is_active', true)
    return c.json([...(globalTypes || []), ...(schoolTypes || [])])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/hr/leave-balances/:staff_id
router.get('/leave-balances/:staff_id', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { staff_id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: staff } = await supabase.from('staff').select('id').eq('id', staff_id).eq('school_id', schoolId).single()
    if (!staff) return c.json({ error: 'Staff not found in your school' }, 404)

    const { data } = await supabase.from('leave_balances')
      .select('*, leave_types(name, code)')
      .eq('staff_id', staff_id)

    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── HR DASHBOARD ───

// GET /api/hr/dashboard
router.get('/dashboard', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const today = new Date().toISOString().split('T')[0]

    const { data: allStaff } = await supabase.from('staff').select('id, designation, department').eq('school_id', schoolId).eq('status', 'active').is('deleted_at', null)
    const staffList = allStaff || []
    const staffIds = staffList.map((s: Record<string, unknown>) => s.id as number)
    const totalStaff = staffList.length

    const teachingDesignations = ['PGT', 'TGT', 'PRT', 'NTT', 'Principal', 'Vice Principal']
    const teachingStaff = staffList.filter((s: Record<string, unknown>) => teachingDesignations.includes(s.designation as string)).length

    // Staff currently on approved leave
    let onLeaveToday = 0
    let pendingLeaves = 0
    if (staffIds.length > 0) {
      const { data: leavesToday } = await supabase.from('staff_leaves')
        .select('id').in('staff_id', staffIds).eq('status', 'approved')
        .lte('from_date', today).gte('to_date', today)
      onLeaveToday = (leavesToday || []).length

      const { data: pending } = await supabase.from('staff_leaves')
        .select('id').in('staff_id', staffIds).eq('status', 'pending')
      pendingLeaves = (pending || []).length
    }

    // Department and designation breakdowns
    const deptMap: Record<string, number> = {}
    const desigMap: Record<string, number> = {}
    for (const s of staffList as Record<string, unknown>[]) {
      const dept = String(s.department || 'Unknown')
      const desig = String(s.designation || 'Unknown')
      deptMap[dept] = (deptMap[dept] || 0) + 1
      desigMap[desig] = (desigMap[desig] || 0) + 1
    }

    return c.json({
      total_staff: totalStaff,
      teaching_staff: teachingStaff,
      non_teaching_staff: totalStaff - teachingStaff,
      on_leave_today: onLeaveToday,
      pending_leave_requests: pendingLeaves,
      department_breakdown: Object.entries(deptMap).map(([department, count]) => ({ department, count })),
      designation_breakdown: Object.entries(desigMap).map(([designation, count]) => ({ designation, count })),
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
