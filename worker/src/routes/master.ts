import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const MASTER_TABLES = [
  'exam_areas', 'subject_groups', 'grade_mappings', 'remarks_bank',
  'fee_categories', 'fee_groups', 'discount_policies',
]

// GET /api/master/:table
router.get('/:table', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const { table } = c.req.param()
    if (!MASTER_TABLES.includes(table)) return c.json({ error: 'Invalid table' }, 400)

    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const supabase = getSupabase(c.env)
    const { data } = await supabase.from(table).select('*').eq('school_id', schoolId).order('id', { ascending: false })
    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/master/:table
router.post('/:table', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const { table } = c.req.param()
    if (!MASTER_TABLES.includes(table)) return c.json({ error: 'Invalid table' }, 400)

    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const { data, error } = await supabase.from(table).insert({ ...body, school_id: schoolId }).select('id').single()
    if (error) throw error
    return c.json({ id: (data as Record<string, unknown>).id }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/master/:table/:id
router.delete('/:table/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const { table, id } = c.req.param()
    if (!MASTER_TABLES.includes(table)) return c.json({ error: 'Invalid table' }, 400)

    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const supabase = getSupabase(c.env)
    const { data: existing } = await supabase.from(table).select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!existing) return c.json({ error: 'Record not found' }, 404)

    await supabase.from(table).delete().eq('id', id).eq('school_id', schoolId)
    return c.json({ success: true })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
