import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// POST /api/notices
router.post('/', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const body = await c.req.json()
    if (!body.title || !body.content) return c.json({ error: 'title and content are required' }, 400)

    const supabase = getSupabase(c.env)

    if (body.class_id) {
      const { data: classExists } = await supabase.from('classes').select('id').eq('id', body.class_id).eq('school_id', schoolId).single()
      if (!classExists) return c.json({ error: 'Invalid class for your school' }, 400)
    }

    const { data: notice } = await supabase.from('notices').insert({
      title: body.title,
      content: body.content,
      target_audience: body.target_audience || 'all',
      class_id: body.class_id || null,
      created_by: user.id,
      school_id: schoolId,
    }).select().single()

    return c.json(notice, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/notices
router.get('/', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: notices } = await supabase.from('notices')
      .select('*, users(name)').eq('school_id', schoolId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(50)
    return c.json(notices || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/notices/:id
router.delete('/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: notice } = await supabase.from('notices').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!notice) return c.json({ error: 'Notice not found' }, 404)

    await supabase.from('notices').update({ is_active: false }).eq('id', id).eq('school_id', schoolId)
    return c.json({ message: 'Notice removed' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/notices/homework
router.post('/homework', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const body = await c.req.json()
    const { class_id, section_id, subject_id, description, due_date } = body
    if (!class_id || !section_id || !subject_id || !description || !due_date) {
      return c.json({ error: 'class_id, section_id, subject_id, description, due_date are required' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: classExists } = await supabase.from('classes').select('id').eq('id', class_id).eq('school_id', schoolId).single()
    if (!classExists) return c.json({ error: 'Invalid class for your school' }, 400)

    const { data: sectionExists } = await supabase.from('sections').select('id').eq('id', section_id).eq('class_id', class_id).single()
    if (!sectionExists) return c.json({ error: 'Invalid section for selected class' }, 400)

    const { data: subjectExists } = await supabase.from('subjects').select('id, classes(school_id)').eq('id', subject_id).single()
    if (!subjectExists) return c.json({ error: 'Invalid subject for your school' }, 400)
    const subjectRec = subjectExists as Record<string, unknown>
    const subjectCls = subjectRec?.classes as Record<string, unknown>
    if (Number(subjectCls?.school_id) !== schoolId) {
      return c.json({ error: 'Invalid subject for your school' }, 400)
    }

    const { data: hw } = await supabase.from('homework').insert({
      class_id, section_id, subject_id, description, due_date,
      assigned_by: user.id, school_id: schoolId,
    }).select().single()

    return c.json(hw, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/notices/homework/:classId/:sectionId
router.get('/homework/:classId/:sectionId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { classId, sectionId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: homework } = await supabase.from('homework')
      .select('*, subjects(name), users(name)').eq('class_id', classId).eq('section_id', sectionId).eq('school_id', schoolId)
      .order('due_date', { ascending: false }).limit(30)

    return c.json(homework || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/notices/classes
router.get('/classes', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('classes').select('*').eq('school_id', schoolId).order('numeric_order')
    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/notices/sections/:classId
router.get('/sections/:classId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { classId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: classExists } = await supabase.from('classes').select('id').eq('id', classId).eq('school_id', schoolId).single()
    if (!classExists) return c.json({ error: 'Class not found' }, 404)

    const { data } = await supabase.from('sections').select('*').eq('class_id', classId).order('name')
    return c.json(data || [])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
