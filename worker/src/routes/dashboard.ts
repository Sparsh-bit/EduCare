import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const dashboardRoles = ['tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'accountant', 'hr_manager', 'front_desk']

// GET /api/admin/dashboard/stats
router.get('/stats', authenticate, authorize(...dashboardRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const supabase = getSupabase(c.env)
    const { data: academicYear } = await supabase.from('academic_years').select('id, year').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)
    const ayId = (academicYear as Record<string, unknown>).id as number

    // Student counts
    const { count: totalStudents } = await supabase.from('students')
      .select('id', { count: 'exact', head: true }).eq('status', 'active').eq('academic_year_id', ayId).eq('school_id', schoolId).is('deleted_at', null)

    // Class distribution
    const { data: classCounts } = await supabase.from('students')
      .select('current_class_id, classes(name, numeric_order)')
      .eq('status', 'active').eq('academic_year_id', ayId).eq('school_id', schoolId).is('deleted_at', null)

    const classMap: Record<string, { class_name: string; count: number; order: number }> = {}
    for (const s of (classCounts || []) as Record<string, unknown>[]) {
      const cls = s.classes as Record<string, unknown>
      const name = String(cls?.name || 'Unknown')
      if (!classMap[name]) classMap[name] = { class_name: name, count: 0, order: Number(cls?.numeric_order || 0) }
      classMap[name].count++
    }
    const byClass = Object.values(classMap).sort((a, b) => a.order - b.order)

    // Today's attendance
    const today = new Date().toISOString().split('T')[0]
    const { data: todayAttendance } = await supabase.from('attendance')
      .select('status, students!inner(school_id)').eq('date', today).eq('students.school_id', schoolId)

    const attTotal = (todayAttendance || []).length
    const attPresent = (todayAttendance || []).filter((r: Record<string, unknown>) => r.status === 'P').length
    const attAbsent = (todayAttendance || []).filter((r: Record<string, unknown>) => r.status === 'A').length
    const todayPercentage = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0

    // Fee collection
    const { data: payments } = await supabase.from('fee_payments')
      .select('amount_paid, students!inner(school_id)').eq('academic_year_id', ayId).eq('students.school_id', schoolId)
    const totalCollected = (payments || []).reduce((s: number, p: Record<string, unknown>) => s + parseFloat(p.amount_paid as string), 0)

    // Staff count
    const { count: totalStaff } = await supabase.from('staff')
      .select('id', { count: 'exact', head: true }).eq('status', 'active').eq('school_id', schoolId).is('deleted_at', null)

    return c.json({
      academic_year: (academicYear as Record<string, unknown>).year,
      students: { total: totalStudents || 0, by_class: byClass },
      attendance: {
        today_date: today,
        total_marked: attTotal, present: attPresent, absent: attAbsent,
        percentage: todayPercentage,
      },
      fees: {
        total_expected: 0, // Complex join not feasible without raw SQL
        total_collected: totalCollected,
        collection_percentage: 0,
      },
      staff: { total: totalStaff || 0 },
      pending_dues_count: 0,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/admin/dashboard/upcoming-exams
router.get('/upcoming-exams', authenticate, authorize(...dashboardRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: exams } = await supabase.from('exams')
      .select('*, classes(name)').eq('school_id', schoolId)
      .in('status', ['upcoming', 'ongoing']).order('start_date').limit(10)

    return c.json(exams || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/admin/dashboard/recent-activity
router.get('/recent-activity', authenticate, authorize(...dashboardRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: logs } = await supabase.from('audit_logs')
      .select('*, users(name)').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(20)

    return c.json(logs || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
