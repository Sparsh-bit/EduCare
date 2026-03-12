import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'
import { createAuditLog, getClientIp } from '../utils/auditLog'
import { getPaginationParams, generateEmployeeId } from '../utils/helpers'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// POST /api/staff
router.post('/', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const data = await c.req.json()
    if (!data.name || !data.designation || data.salary == null) {
      return c.json({ error: 'name, designation, salary are required' }, 400)
    }

    const supabase = getSupabase(c.env)

    let userId: number | null = null
    let tempPassword: string | null = null

    if (data.email) {
      // Generate random temp password
      const randBytes = new Uint8Array(8)
      globalThis.crypto.getRandomValues(randBytes)
      tempPassword = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('')

      // Create user in Supabase Auth
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: data.email.toLowerCase().trim(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: data.name, role: data.is_teacher ? 'teacher' : 'staff' },
      })

      if (authErr && authErr.message !== 'User already registered') {
        return c.json({ error: 'Failed to create auth user: ' + authErr.message }, 500)
      }

      const supabaseAuthId = authUser?.user?.id || null

      const { data: userRecord, error: userErr } = await supabase.from('users').insert({
        email: data.email.toLowerCase().trim(),
        username: data.email.toLowerCase().trim(),
        name: data.name,
        phone: data.phone || null,
        role: data.is_teacher ? 'teacher' : 'staff',
        school_id: schoolId,
        is_active: true,
        supabase_auth_id: supabaseAuthId,
      }).select('id').single()

      if (userErr) {
        if (userErr.code === '23505') return c.json({ error: 'Duplicate employee ID or email' }, 409)
        return c.json({ error: 'Failed to create user record' }, 500)
      }
      userId = (userRecord as Record<string, unknown>).id as number
    }

    const employeeId = data.employee_id || await generateEmployeeId(supabase, schoolId)

    const { data: staff, error: staffErr } = await supabase.from('staff').insert({
      user_id: userId,
      name: data.name,
      employee_id: employeeId,
      designation: data.designation,
      department: data.department || null,
      phone: data.phone || null,
      email: data.email || null,
      salary: data.salary,
      join_date: data.join_date || null,
      qualification: data.qualification || null,
      status: 'active',
      school_id: schoolId,
    }).select().single()

    if (staffErr) {
      if (staffErr.code === '23505') return c.json({ error: 'Duplicate employee ID or email' }, 409)
      return c.json({ error: 'Failed to create staff record' }, 500)
    }

    await createAuditLog(supabase, {
      user_id: user.id, action: 'create', entity_type: 'staff',
      entity_id: (staff as Record<string, unknown>).id as number,
      new_value: { name: data.name, designation: data.designation },
      ip_address: getClientIp(c), description: 'Staff member added',
    })

    const response: Record<string, unknown> = { ...(staff as Record<string, unknown>) }
    if (tempPassword) response.temp_password = tempPassword
    return c.json(response, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/staff
router.get('/', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const q = c.req.query()
    const { limit, offset, page } = getPaginationParams(q)
    const { department, status, search } = q

    const supabase = getSupabase(c.env)
    let query = supabase.from('staff').select('*', { count: 'exact' }).eq('school_id', schoolId).is('deleted_at', null)

    if (department) query = query.eq('department', department)
    if (status) query = query.eq('status', status)
    if (search) query = query.or(`name.ilike.%${search}%,employee_id.ilike.%${search}%`)

    const { data: staff, count } = await query.order('name').range(offset, offset + limit - 1)

    return c.json({ data: staff || [], pagination: { page, limit, total: count || 0 } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/staff/:id
router.put('/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: existing } = await supabase.from('staff').select('*').eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!existing) return c.json({ error: 'Staff not found' }, 404)

    const body = await c.req.json()
    delete body.school_id
    delete body.id

    const { data: updated } = await supabase.from('staff').update(body).eq('id', id).eq('school_id', schoolId).select().single()

    await createAuditLog(supabase, {
      user_id: user.id, action: 'update', entity_type: 'staff',
      entity_id: Number(id),
      old_value: { name: (existing as Record<string, unknown>).name, salary: (existing as Record<string, unknown>).salary },
      new_value: { name: (updated as Record<string, unknown>).name, salary: (updated as Record<string, unknown>).salary },
      ip_address: getClientIp(c), description: 'Staff updated',
    })

    return c.json(updated)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/staff/:id (soft delete)
router.delete('/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: existing } = await supabase.from('staff').select('id').eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!existing) return c.json({ error: 'Staff not found' }, 404)

    await supabase.from('staff').update({ deleted_at: new Date().toISOString(), status: 'inactive' }).eq('id', id).eq('school_id', schoolId)

    await createAuditLog(supabase, {
      user_id: user.id, action: 'soft_delete', entity_type: 'staff', entity_id: Number(id),
      ip_address: getClientIp(c), description: 'Staff member deleted',
    })

    return c.json({ message: 'Staff deleted' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/staff/:id
router.get('/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: staff } = await supabase.from('staff').select('*').eq('id', id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!staff) return c.json({ error: 'Staff not found' }, 404)
    return c.json(staff)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/staff/leave
router.post('/leave', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'staff'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const body = await c.req.json()
    const { leave_type, from_date, to_date, reason } = body
    if (!['casual', 'sick', 'earned', 'unpaid'].includes(leave_type) || !from_date || !to_date || !reason) {
      return c.json({ error: 'leave_type (casual/sick/earned/unpaid), from_date, to_date, reason are required' }, 400)
    }

    const supabase = getSupabase(c.env)

    // Find staff linked to this user
    const { data: staff } = await supabase.from('staff').select('id').eq('user_id', user.id).eq('school_id', schoolId).single()
    const staffId = body.staff_id || (staff as Record<string, unknown>)?.id

    if (!staffId) return c.json({ error: 'Staff record not found' }, 400)

    const { data: targetStaff } = await supabase.from('staff').select('id').eq('id', staffId).eq('school_id', schoolId).single()
    if (!targetStaff) return c.json({ error: 'Invalid staff for your school' }, 403)

    const { data: leave } = await supabase.from('staff_leaves').insert({
      staff_id: staffId,
      leave_type,
      from_date,
      to_date,
      reason,
      status: 'pending',
      school_id: schoolId,
    }).select().single()

    return c.json(leave, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/staff/leave/:id — Approve/reject leave
router.put('/leave/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const { status } = await c.req.json()

    if (!['approved', 'rejected'].includes(status)) {
      return c.json({ error: 'Status must be approved or rejected' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: leaveRecord } = await supabase.from('staff_leaves').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!leaveRecord) return c.json({ error: 'Leave not found' }, 404)

    const { data: updated } = await supabase.from('staff_leaves').update({ status, approved_by: user.id }).eq('id', id).eq('school_id', schoolId).select().single()
    return c.json(updated)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/staff/leaves
router.get('/leaves', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { status } = c.req.query()
    const supabase = getSupabase(c.env)

    let query = supabase.from('staff_leaves').select('*, staff(name, designation)').eq('school_id', schoolId)
    if (status) query = query.eq('status', status)
    const { data: leaves } = await query.order('created_at', { ascending: false })
    return c.json(leaves || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/staff/salary/:staffId
router.get('/salary/:staffId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { staffId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: targetStaff } = await supabase.from('staff').select('id').eq('id', staffId).eq('school_id', schoolId).single()
    if (!targetStaff) return c.json({ error: 'Staff not found' }, 404)

    const { data: records } = await supabase.from('staff_salary_records')
      .select('*').eq('staff_id', staffId).eq('school_id', schoolId)
      .order('year', { ascending: false }).order('month', { ascending: false })
    return c.json(records || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/staff/salary/process
router.post('/salary/process', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const { month, year } = await c.req.json()
    if (!month || !year || month < 1 || month > 12 || year < 2000) {
      return c.json({ error: 'Valid month (1-12) and year are required' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()

    const { data: activeStaff } = await supabase.from('staff').select('id, salary').eq('status', 'active').eq('school_id', schoolId).is('deleted_at', null)

    let processed = 0
    const monthPad = String(month).padStart(2, '0')
    const monthStart = `${year}-${monthPad}-01`
    const monthEnd = `${year}-${monthPad}-31`

    for (const s of (activeStaff || []) as Record<string, unknown>[]) {
      const { data: existing } = await supabase.from('staff_salary_records').select('id').eq('staff_id', s.id as number).eq('month', month).eq('year', year).single()
      if (existing) continue

      const { data: leaves } = await supabase.from('staff_leaves')
        .select('*').eq('staff_id', s.id as number).eq('status', 'approved')
        .gte('from_date', monthStart).lte('to_date', monthEnd)

      const unpaidLeaveDays = ((leaves || []) as Record<string, unknown>[])
        .filter(l => l.leave_type === 'unpaid')
        .reduce((sum: number, l: Record<string, unknown>) => {
          const from = new Date(l.from_date as string)
          const to = new Date(l.to_date as string)
          return sum + Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
        }, 0)

      const dailySalary = parseFloat(s.salary as string) / 30
      const deductions = Math.round(unpaidLeaveDays * dailySalary)
      const netPay = parseFloat(s.salary as string) - deductions

      await supabase.from('staff_salary_records').insert({
        staff_id: s.id,
        month, year,
        academic_year_id: (academicYear as Record<string, unknown>)?.id || -1,
        basic: s.salary,
        deductions,
        net_pay: netPay,
        status: 'pending',
        school_id: schoolId,
      })
      processed++
    }

    await createAuditLog(supabase, {
      user_id: user.id, action: 'salary_process', entity_type: 'staff_salary_records',
      new_value: { month, year, processed }, ip_address: getClientIp(c), description: 'Monthly salary processed',
    })

    return c.json({ message: `Salary processed for ${processed} staff members` })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
