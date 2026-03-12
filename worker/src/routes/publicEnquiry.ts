import { Hono, Context } from 'hono'
import { Env, Variables } from '../types'
import { getSupabase } from '../utils/supabase'
import { publicEnquiryLimiter } from '../middleware/rateLimit'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const PHONE_RE = /^[+\d][\d\s\-(). ]{5,19}$/

/**
 * Resolve which school an inbound enquiry belongs to.
 *
 * Two auth methods:
 *  1. x-api-key header == ERP_API_KEY env var  → use school_id from request body
 *  2. school_token (UUID) in request body       → look up school by website_token column
 */
async function resolveSchool(
  c: AppContext,
  body: Record<string, unknown>
): Promise<{ schoolId: number } | { error: string; status: number }> {
  const apiKey = c.req.header('x-api-key')
  const supabase = getSupabase(c.env)

  // Method 1: ERP_API_KEY header
  if (apiKey) {
    if (!c.env.ERP_API_KEY || apiKey !== c.env.ERP_API_KEY) {
      return { error: 'Invalid API key', status: 401 }
    }
    const schoolId = parseInt(String(body.school_id ?? ''), 10)
    if (!schoolId || isNaN(schoolId)) {
      return { error: 'school_id is required when using x-api-key authentication', status: 400 }
    }
    const { data: school } = await supabase.from('schools').select('id').eq('id', schoolId).single()
    if (!school) return { error: 'School not found', status: 404 }
    return { schoolId }
  }

  // Method 2: per-school website_token in body
  const token = body.school_token
  if (!token || typeof token !== 'string') {
    return { error: 'Provide either x-api-key header or school_token in the request body', status: 401 }
  }
  const { data: school } = await supabase.from('schools').select('id').eq('website_token', token).single()
  if (!school) return { error: 'Invalid school token', status: 401 }
  return { schoolId: (school as Record<string, unknown>).id as number }
}

// POST /api/public/enquiry
// Auth: x-api-key header (ERP_API_KEY) OR school_token in body.
// Rate-limited: 10 req / 15 min per IP (publicEnquiryLimiter).
router.post('/', publicEnquiryLimiter, async (c) => {
  try {
    const body = await c.req.json()

    // Input validation
    if (!body.student_name || !String(body.student_name).trim()) {
      return c.json({ error: 'Student name is required' }, 400)
    }
    if (!body.father_name || !String(body.father_name).trim()) {
      return c.json({ error: "Father's name is required" }, 400)
    }
    if (!body.contact_phone || !PHONE_RE.test(String(body.contact_phone).trim())) {
      return c.json({ error: 'Valid phone number is required' }, 400)
    }
    if (body.email && !String(body.email).includes('@')) {
      return c.json({ error: 'Valid email address is required' }, 400)
    }
    if (body.class_applying_for && isNaN(parseInt(String(body.class_applying_for)))) {
      return c.json({ error: 'class_applying_for must be a valid integer' }, 400)
    }

    // Sanitize fields (basic escape)
    const escape = (val: unknown) => String(val || '').replace(/[<>"']/g, '')
    const student_name = escape(body.student_name).trim()
    const father_name = escape(body.father_name).trim()
    const contact_phone = String(body.contact_phone).trim()
    const email = body.email ? String(body.email).toLowerCase().trim() : null
    const mother_name = body.mother_name ? escape(body.mother_name).trim() : null
    const address = body.address ? escape(body.address).trim() : null
    const notes = body.notes ? escape(body.notes).trim() : null
    const class_applying_for = body.class_applying_for ? parseInt(String(body.class_applying_for)) : null

    // Authenticate & resolve school
    const result = await resolveSchool(c as AppContext, body)
    if ('error' in result) {
      return c.json({ error: result.error }, result.status as 400 | 401 | 404)
    }
    const { schoolId } = result

    const supabase = getSupabase(c.env)

    // Validate class belongs to this school (if provided)
    if (class_applying_for) {
      const { data: cls } = await supabase.from('classes').select('id').eq('id', class_applying_for).eq('school_id', schoolId).single()
      if (!cls) return c.json({ error: 'Invalid class selection' }, 400)
    }

    // Generate sequential enquiry number
    const { data: last } = await supabase.from('admission_enquiries')
      .select('enquiry_number').eq('school_id', schoolId)
      .order('id', { ascending: false }).limit(1).single()

    const seq = last ? (parseInt(String((last as Record<string, unknown>).enquiry_number).split('/').pop() || '0') + 1) : 1
    const enquiry_number = `ENQ/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}`

    const { data: enquiry } = await supabase.from('admission_enquiries').insert({
      enquiry_number,
      student_name,
      father_name,
      mother_name,
      contact_phone,
      email,
      address,
      notes,
      class_applying_for,
      source: 'website',
      status: 'new',
      school_id: schoolId,
    }).select('id, enquiry_number').single()

    const e = enquiry as Record<string, unknown>
    console.log(`Website enquiry submitted: school_id=${schoolId}, enquiry_number=${e.enquiry_number}`)

    return c.json({
      success: true,
      message: 'Enquiry submitted successfully. Our team will contact you shortly.',
      enquiry_number: e.enquiry_number,
    }, 201)
  } catch (err) {
    console.error('Public enquiry submission error', err)
    return c.json({ error: 'Failed to submit enquiry. Please try again.' }, 500)
  }
})

export default router
