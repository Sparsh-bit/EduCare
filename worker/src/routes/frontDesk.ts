import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const fdRoles = ['tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'] as const

// ─── ENQUIRIES ───

// GET /api/front-desk/enquiries
router.get('/enquiries', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const q = c.req.query()
    const { status, class_id, source, search } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(parseInt(q.limit || '25'), 100)
    const offset = (page - 1) * limit

    let query = supabase.from('admission_enquiries')
      .select('*, classes(name), users(name)', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (class_id) query = query.eq('class_applying_for', class_id)
    if (source) query = query.eq('source', source)
    if (search) query = query.or(`student_name.ilike.%${search}%,contact_phone.ilike.%${search}%,father_name.ilike.%${search}%`)

    const { data, count } = await query.range(offset, offset + limit - 1)
    return c.json({ data: data || [], pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/front-desk/enquiries
router.post('/enquiries', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.student_name || !body.father_name || !body.contact_phone) {
      return c.json({ error: 'student_name, father_name, contact_phone are required' }, 400)
    }
    const supabase = getSupabase(c.env)

    // Generate enquiry number
    const { data: last } = await supabase.from('admission_enquiries').select('enquiry_number').eq('school_id', schoolId).order('id', { ascending: false }).limit(1).maybeSingle()
    const seq = last ? (parseInt(String((last as Record<string, unknown>).enquiry_number).split('/').pop() || '0') + 1) : 1
    const enquiry_number = `ENQ/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}`

    const { data: enquiry } = await supabase.from('admission_enquiries').insert({
      ...body,
      enquiry_number,
      school_id: schoolId,
    }).select().single()

    return c.json({ message: 'Enquiry created', data: enquiry }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/front-desk/enquiries/:id
router.put('/enquiries/:id', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const { data: existing } = await supabase.from('admission_enquiries').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!existing) return c.json({ error: 'Enquiry not found' }, 404)

    const { data: updated } = await supabase.from('admission_enquiries').update(body).eq('id', id).eq('school_id', schoolId).select().single()
    return c.json({ message: 'Enquiry updated', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/front-desk/enquiries/:id/follow-up
router.post('/enquiries/:id/follow-up', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const { notes, status_changed_to, follow_up_date } = await c.req.json()
    const supabase = getSupabase(c.env)

    const { data: enquiry } = await supabase.from('admission_enquiries').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!enquiry) return c.json({ error: 'Enquiry not found' }, 404)

    const { data: followUp } = await supabase.from('enquiry_follow_ups').insert({
      enquiry_id: id,
      notes,
      status_changed_to: status_changed_to || null,
      follow_up_date: follow_up_date || null,
      done_by: user.id,
    }).select().single()

    if (status_changed_to) {
      await supabase.from('admission_enquiries').update({
        status: status_changed_to,
        follow_up_date: follow_up_date || null,
      }).eq('id', id).eq('school_id', schoolId)
    }

    return c.json({ message: 'Follow-up added', data: followUp })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/front-desk/enquiries/:id/follow-ups
router.get('/enquiries/:id/follow-ups', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: enquiry } = await supabase.from('admission_enquiries').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!enquiry) return c.json({ error: 'Enquiry not found' }, 404)

    const { data } = await supabase.from('enquiry_follow_ups')
      .select('*, users(name)').eq('enquiry_id', id).order('created_at', { ascending: false })
    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/front-desk/enquiries/:id
router.delete('/enquiries/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    await supabase.from('admission_enquiries').delete().eq('id', id).eq('school_id', schoolId)
    return c.json({ message: 'Enquiry deleted' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/front-desk/enquiry-stats
router.get('/enquiry-stats', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const today = new Date().toISOString().split('T')[0]

    const { data: all } = await supabase.from('admission_enquiries').select('id, status, source, created_at').eq('school_id', schoolId)
    const rows = all || []
    const total = rows.length
    const todayNew = rows.filter((r: Record<string, unknown>) => String(r.created_at).startsWith(today)).length

    const statusMap: Record<string, number> = {}
    const sourceMap: Record<string, number> = {}
    for (const r of rows as Record<string, unknown>[]) {
      const s = String(r.status || 'unknown')
      const src = String(r.source || 'unknown')
      statusMap[s] = (statusMap[s] || 0) + 1
      sourceMap[src] = (sourceMap[src] || 0) + 1
    }

    return c.json({
      total,
      today_new: todayNew,
      by_status: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      by_source: Object.entries(sourceMap).map(([source, count]) => ({ source, count })),
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── STUDENT LOOKUP ───

// GET /api/front-desk/student-lookup?q=<roll_no or admission_no>
router.get('/student-lookup', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const q = c.req.query('q')
    if (!q || q.trim().length < 2) return c.json({ data: null })
    const term = q.trim()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students')
      .select('id, name, admission_no, current_roll_no, sr_no, student_uid, father_name, father_phone, classes(name), sections(name)')
      .eq('school_id', schoolId).is('deleted_at', null)
      .or(`current_roll_no.ilike.${term},admission_no.ilike.%${term}%,sr_no.ilike.${term},student_uid.ilike.${term}`)
      .limit(1).maybeSingle()

    return c.json({ data: student || null })
  } catch {
    return c.json({ data: null })
  }
})

// ─── GATE PASSES ───

// GET /api/front-desk/gate-passes
router.get('/gate-passes', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    // Fire-and-forget purge of old gate passes (>10 days)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    void supabase.from('gate_passes').delete().eq('school_id', schoolId).lt('created_at', tenDaysAgo).then(() => {}, () => {})

    const q = c.req.query()
    const { status, date, search } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(parseInt(q.limit || '25'), 100)
    const offset = (page - 1) * limit

    let query = supabase.from('gate_passes')
      .select('*, students(name, admission_no, classes(name), sections(name))', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (date) query = query.gte('out_time', `${date}T00:00:00`).lte('out_time', `${date}T23:59:59`)
    if (search) query = query.or(`pass_number.ilike.%${search}%`)

    const { data, count } = await query.range(offset, offset + limit - 1)
    return c.json({ data: data || [], pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/front-desk/gate-passes
router.post('/gate-passes', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.student_id || !body.reason) return c.json({ error: 'student_id and reason are required' }, 400)
    const supabase = getSupabase(c.env)

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const { data: last } = await supabase.from('gate_passes').select('pass_number').eq('school_id', schoolId).order('id', { ascending: false }).limit(1).maybeSingle()
    const seq = last ? (parseInt(String((last as Record<string, unknown>).pass_number).split('-').pop() || '0') + 1) : 1
    const pass_number = `GP-${today}-${String(seq).padStart(3, '0')}`

    const { data: gatePass } = await supabase.from('gate_passes').insert({
      ...body,
      pass_number,
      out_time: body.out_time || new Date().toISOString(),
      issued_by: user.id,
      school_id: schoolId,
    }).select().single()

    return c.json({ message: 'Gate pass issued', data: gatePass }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/front-desk/gate-passes/:id/return
router.put('/gate-passes/:id/return', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: existing } = await supabase.from('gate_passes').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!existing) return c.json({ error: 'Gate pass not found' }, 404)

    const { data: updated } = await supabase.from('gate_passes').update({ status: 'returned', actual_return: new Date().toISOString() }).eq('id', id).eq('school_id', schoolId).select().single()
    return c.json({ message: 'Student returned', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── VISITORS ───

// GET /api/front-desk/visitors
router.get('/visitors', authenticate, authorize(...fdRoles, 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const q = c.req.query()
    const { status, date, purpose } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(parseInt(q.limit || '25'), 100)
    const offset = (page - 1) * limit

    let query = supabase.from('visitors')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('in_time', { ascending: false })

    if (status) query = query.eq('status', status)
    if (purpose) query = query.eq('purpose', purpose)
    if (date) query = query.gte('in_time', `${date}T00:00:00`).lte('in_time', `${date}T23:59:59`)

    const { data, count } = await query.range(offset, offset + limit - 1)
    return c.json({ data: data || [], pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/front-desk/visitors
router.post('/visitors', authenticate, authorize(...fdRoles, 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.visitor_name || !body.visitor_phone || !body.purpose) {
      return c.json({ error: 'visitor_name, visitor_phone, purpose are required' }, 400)
    }
    const supabase = getSupabase(c.env)

    const { data: visitor } = await supabase.from('visitors').insert({
      ...body,
      in_time: body.in_time || new Date().toISOString(),
      registered_by: user.id,
      school_id: schoolId,
    }).select().single()

    return c.json({ message: 'Visitor logged', data: visitor }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/front-desk/visitors/:id/checkout
router.put('/visitors/:id/checkout', authenticate, authorize(...fdRoles, 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: existing } = await supabase.from('visitors').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!existing) return c.json({ error: 'Visitor not found' }, 404)

    const { data: updated } = await supabase.from('visitors').update({ status: 'out', out_time: new Date().toISOString() }).eq('id', id).eq('school_id', schoolId).select().single()
    return c.json({ message: 'Visitor checked out', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── POSTAL ───

// GET /api/front-desk/postal
router.get('/postal', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const q = c.req.query()
    const { type, status } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(parseInt(q.limit || '25'), 100)
    const offset = (page - 1) * limit

    let query = supabase.from('postal_records').select('*', { count: 'exact' }).eq('school_id', schoolId).order('date', { ascending: false })
    if (type) query = query.eq('type', type)
    if (status) query = query.eq('status', status)

    const { data, count } = await query.range(offset, offset + limit - 1)
    return c.json({ data: data || [], pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/front-desk/postal
router.post('/postal', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.type || !['received', 'dispatched'].includes(body.type)) return c.json({ error: 'type must be received or dispatched' }, 400)
    if (!body.party_name || !body.date) return c.json({ error: 'party_name and date are required' }, 400)
    const supabase = getSupabase(c.env)

    const { data: record } = await supabase.from('postal_records').insert({
      ...body,
      logged_by: user.id,
      school_id: schoolId,
    }).select().single()

    return c.json({ message: 'Postal record added', data: record }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/front-desk/postal/:id
router.put('/postal/:id', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const { data: updated } = await supabase.from('postal_records').update(body).eq('id', id).eq('school_id', schoolId).select().single()
    return c.json({ message: 'Postal record updated', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── LOST AND FOUND ───

// GET /api/front-desk/lost-found
router.get('/lost-found', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const q = c.req.query()
    const { status, item_type } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(parseInt(q.limit || '25'), 100)
    const offset = (page - 1) * limit

    let query = supabase.from('lost_and_found').select('*', { count: 'exact' }).eq('school_id', schoolId).order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    if (item_type) query = query.eq('item_type', item_type)

    const { data, count } = await query.range(offset, offset + limit - 1)
    return c.json({ data: data || [], pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/front-desk/lost-found
router.post('/lost-found', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.item_type || !body.description || !body.found_date) {
      return c.json({ error: 'item_type, description, found_date are required' }, 400)
    }
    const supabase = getSupabase(c.env)

    const { data: last } = await supabase.from('lost_and_found').select('item_number').eq('school_id', schoolId).order('id', { ascending: false }).limit(1).maybeSingle()
    const seq = last ? (parseInt(String((last as Record<string, unknown>).item_number).split('/').pop() || '0') + 1) : 1
    const item_number = `LF/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}`

    const { data: item } = await supabase.from('lost_and_found').insert({
      ...body,
      item_number,
      logged_by: user.id,
      school_id: schoolId,
    }).select().single()

    return c.json({ message: 'Item recorded', data: item }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/front-desk/lost-found/:id/claim
router.put('/lost-found/:id/claim', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const { data: updated } = await supabase.from('lost_and_found').update({
      status: 'claimed',
      claimed_by: body.claimed_by || null,
      claimed_date: new Date().toISOString().split('T')[0],
      verified_by: user.id,
    }).eq('id', id).eq('school_id', schoolId).select().single()

    return c.json({ message: 'Item claimed', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── FRONT DESK DASHBOARD ───

// GET /api/front-desk/dashboard
router.get('/dashboard', authenticate, authorize(...fdRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const today = new Date().toISOString().split('T')[0]

    const [
      { data: enquiriesAll },
      { data: visitorsAll },
      { data: gatePassesAll },
      { data: postalAll },
      { data: lostFoundAll },
    ] = await Promise.all([
      supabase.from('admission_enquiries').select('id, status, created_at').eq('school_id', schoolId),
      supabase.from('visitors').select('id, status, in_time').eq('school_id', schoolId),
      supabase.from('gate_passes').select('id, out_time').eq('school_id', schoolId),
      supabase.from('postal_records').select('id, date').eq('school_id', schoolId),
      supabase.from('lost_and_found').select('id, status').eq('school_id', schoolId).eq('status', 'found_unclaimed'),
    ])

    const enquiriesPending = (enquiriesAll || []).filter((e: Record<string, unknown>) => !['admitted', 'closed'].includes(e.status as string)).length
    const enquiriesToday = (enquiriesAll || []).filter((e: Record<string, unknown>) => String(e.created_at).startsWith(today)).length
    const visitorsToday = (visitorsAll || []).filter((v: Record<string, unknown>) => String(v.in_time).startsWith(today)).length
    const visitorsIn = (visitorsAll || []).filter((v: Record<string, unknown>) => v.status === 'in').length
    const gatePassesToday = (gatePassesAll || []).filter((g: Record<string, unknown>) => String(g.out_time).startsWith(today)).length
    const postalToday = (postalAll || []).filter((p: Record<string, unknown>) => p.date === today).length
    const unclaimedItems = (lostFoundAll || []).length

    return c.json({
      enquiries_pending: enquiriesPending,
      enquiries_today: enquiriesToday,
      visitors_today: visitorsToday,
      visitors_currently_in: visitorsIn,
      gate_passes_today: gatePassesToday,
      postal_today: postalToday,
      unclaimed_items: unclaimedItems,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
