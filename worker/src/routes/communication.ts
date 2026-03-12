import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── SMS TEMPLATES ───

// GET /api/communication/sms-templates
router.get('/sms-templates', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    // Get global (null school_id) and school-specific templates
    const { data: global } = await supabase.from('sms_templates').select('*').is('school_id', null).order('category')
    const { data: schoolSpecific } = await supabase.from('sms_templates').select('*').eq('school_id', schoolId).order('category')
    return c.json([...(global || []), ...(schoolSpecific || [])])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/communication/sms-templates
router.post('/sms-templates', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.name || !body.category || !body.body) {
      return c.json({ error: 'name, category, body are required' }, 400)
    }
    const supabase = getSupabase(c.env)

    const { data: template } = await supabase.from('sms_templates').insert({
      ...body,
      school_id: schoolId,
    }).select().single()

    return c.json({ message: 'Template created', data: template }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/communication/sms-templates/:id
router.put('/sms-templates/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const { data: existing } = await supabase.from('sms_templates').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!existing) return c.json({ error: 'Template not found' }, 404)

    const { data: updated } = await supabase.from('sms_templates').update(body).eq('id', id).eq('school_id', schoolId).select().single()
    return c.json({ message: 'Template updated', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/communication/sms-templates/:id
router.delete('/sms-templates/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: existing } = await supabase.from('sms_templates').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!existing) return c.json({ error: 'Template not found' }, 404)

    await supabase.from('sms_templates').delete().eq('id', id).eq('school_id', schoolId)
    return c.json({ message: 'Template deleted' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── SEND BULK MESSAGE ───

// POST /api/communication/send-bulk
router.post('/send-bulk', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    const { channel, recipients, content, template_id } = body

    if (!channel || !['sms', 'whatsapp', 'email'].includes(channel)) {
      return c.json({ error: 'channel must be sms, whatsapp, or email' }, 400)
    }
    if (!Array.isArray(recipients) || recipients.length === 0 || recipients.length > 500) {
      return c.json({ error: 'recipients must be a non-empty array of max 500' }, 400)
    }
    if (!content) return c.json({ error: 'content is required' }, 400)

    const supabase = getSupabase(c.env)

    if (template_id) {
      // Check global or school-specific template
      const { data: globalT } = await supabase.from('sms_templates').select('id').eq('id', template_id).is('school_id', null).single()
      const { data: schoolT } = await supabase.from('sms_templates').select('id').eq('id', template_id).eq('school_id', schoolId).single()
      if (!globalT && !schoolT) return c.json({ error: 'Template not found for your school' }, 404)
    }

    // Insert log entries and immediately mark as sent (no actual gateway in this plan)
    const logEntries = recipients.map((r: Record<string, string>) => ({
      channel,
      recipient: r.phone || r.email || '',
      recipient_name: r.name || '',
      template_id: template_id || null,
      content,
      sent_by: user.id,
      school_id: schoolId,
      status: 'sent',
      sent_at: new Date().toISOString(),
    }))

    await supabase.from('message_log').insert(logEntries)

    return c.json({ message: `${recipients.length} messages queued for delivery`, total: recipients.length })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── DELIVERY REPORT ───

// GET /api/communication/delivery-report
router.get('/delivery-report', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const q = c.req.query()
    const { channel, status, from_date, to_date } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(parseInt(q.limit || '50'), 200)
    const offset = (page - 1) * limit

    let query = supabase.from('message_log')
      .select('*, sms_templates(name)', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('sent_at', { ascending: false })

    if (channel) query = query.eq('channel', channel)
    if (status) query = query.eq('status', status)
    if (from_date) query = query.gte('sent_at', from_date)
    if (to_date) query = query.lte('sent_at', to_date)

    const { data: allLogs } = await supabase.from('message_log').select('status').eq('school_id', schoolId)
    const statusMap: Record<string, number> = {}
    for (const row of (allLogs || []) as Record<string, unknown>[]) {
      const s = String(row.status || 'unknown')
      statusMap[s] = (statusMap[s] || 0) + 1
    }
    const summary = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

    const { data, count } = await query.range(offset, offset + limit - 1)
    return c.json({ data: data || [], summary, pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── RECIPIENTS ───

// GET /api/communication/recipients
router.get('/recipients', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { group, class_id, section_id } = c.req.query()

    const classIdInt = class_id ? parseInt(class_id, 10) : null
    const sectionIdInt = section_id ? parseInt(section_id, 10) : null
    if (class_id && (!classIdInt || classIdInt < 1)) return c.json({ error: 'class_id must be a positive integer' }, 400)
    if (section_id && (!sectionIdInt || sectionIdInt < 1)) return c.json({ error: 'section_id must be a positive integer' }, 400)

    let recipients: unknown[] = []

    if (group === 'all_parents' || group === 'parents') {
      let query = supabase.from('students')
        .select('father_name, father_phone, name, current_class_id')
        .eq('school_id', schoolId).eq('status', 'active').not('father_phone', 'is', null)
      if (classIdInt) query = query.eq('current_class_id', classIdInt)
      if (sectionIdInt) query = query.eq('current_section_id', sectionIdInt)
      const { data } = await query
      recipients = (data || []).map((s: Record<string, unknown>) => ({ name: s.father_name, phone: s.father_phone, student_name: s.name }))
    } else if (group === 'all_staff') {
      const { data } = await supabase.from('staff').select('name, phone').eq('school_id', schoolId).eq('status', 'active').not('phone', 'is', null)
      recipients = data || []
    } else if (group === 'fee_defaulters') {
      const { data } = await supabase.from('students').select('father_name, father_phone, name')
        .eq('school_id', schoolId).eq('status', 'active').not('father_phone', 'is', null)
      recipients = (data || []).map((s: Record<string, unknown>) => ({ name: s.father_name, phone: s.father_phone, student_name: s.name }))
    }

    return c.json(recipients)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
