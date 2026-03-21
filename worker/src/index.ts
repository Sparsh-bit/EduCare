import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Env, Variables } from './types'
import { authenticate } from './middleware/auth'
import { getFromR2 } from './utils/r2'

// Routes
import authRoutes from './routes/auth'
import studentRoutes from './routes/students'
import attendanceRoutes from './routes/attendance'
import feeRoutes from './routes/fees'
import examRoutes from './routes/exams'
import staffRoutes from './routes/staff'
import parentRoutes from './routes/parent'
import dashboardRoutes from './routes/dashboard'
import alertRoutes from './routes/alerts'
import noticeRoutes from './routes/notices'
import frontDeskRoutes from './routes/frontDesk'
import accountRoutes from './routes/accounts'
import hrRoutes from './routes/hr'
import communicationRoutes from './routes/communication'
import masterRoutes from './routes/master'
import boardRoutes from './routes/board'
import rteRoutes from './routes/rte'
import udiseRoutes from './routes/udise'
import taxRoutes from './routes/tax'
import paymentInstrumentRoutes from './routes/paymentInstruments'
import publicEnquiryRoutes from './routes/publicEnquiry'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── CORS ───
// Supports comma-separated FRONTEND_URL env var (e.g. "https://ndps-erp.pages.dev,https://www.ndps.edu.in")
app.use('*', async (c, next) => {
  const frontendUrl = c.env.FRONTEND_URL || ''
  const allowedOrigins = frontendUrl
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const origin = c.req.header('origin')

  // Allow all origins for public enquiry endpoint
  if (c.req.path === '/api/public/enquiry') {
    return cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'x-api-key'] })(c, next)
  }

  // For all other routes, allow only whitelisted origins.
  // Non-browser requests (no Origin header) are passed through without CORS headers — they don't need them.
  if (!origin) {
    // No Origin header — direct server-to-server or same-origin request; skip CORS middleware.
    return next()
  }
  if (allowedOrigins.includes(origin)) {
    return cors({
      origin,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })(c, next)
  }

  return c.json({ error: 'Not allowed by CORS policy' }, 403)
})

// ─── STARTUP ENV VALIDATION ───
// Fail fast on missing required secrets so misconfigured deploys are obvious.
const REQUIRED_ENV: (keyof Env)[] = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
]
app.use('*', async (c, next) => {
  for (const key of REQUIRED_ENV) {
    if (!c.env[key]) {
      console.error(`Missing required environment variable: ${key}`)
      return c.json({ error: 'Server misconfiguration. Contact support.' }, 500)
    }
  }
  await next()
})

// ─── HEALTH CHECK ───
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'EduCare ERP API by Concilio (Workers)',
    timestamp: new Date().toISOString(),
    environment: 'cloudflare-workers',
  })
})

// Supabase health check — tests that SUPABASE_URL is reachable
app.get('/api/health/db', async (c) => {
  try {
    const res = await fetch(`${c.env.SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: c.env.SUPABASE_SERVICE_ROLE_KEY },
    })
    if (res.ok || res.status === 400) {
      return c.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() })
    }
    throw new Error(`Supabase returned ${res.status}`)
  } catch (err) {
    console.error('DB health check failed', err)
    return c.json({ status: 'error', database: 'unavailable', timestamp: new Date().toISOString() }, 503)
  }
})

// ─── R2 FILE SERVING (authenticated) ───
// R2 buckets are private. All file access goes through this route which
// enforces JWT auth and school_id scoping before streaming from R2.
// Scalability: R2 reads are free within Cloudflare — no egress cost.
app.get('/api/files/:key{.+}', authenticate, async (c) => {
  const user = c.get('user')
  const key = c.req.param('key')

  // Enforce that the file belongs to this user's school
  const expectedPrefix = `schools/${user.school_id}/`
  if (!key.startsWith(expectedPrefix)) {
    return c.json({ error: 'Access denied' }, 403)
  }

  const object = await getFromR2(c.env, key)
  if (!object) return c.json({ error: 'File not found' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Cache-Control', 'private, max-age=3600')
  headers.set('X-Content-Type-Options', 'nosniff')

  return new Response(object.body, { headers })
})

// ─── API ROUTES ───
app.route('/api/auth', authRoutes)
app.route('/api/students', studentRoutes)
app.route('/api/attendance', attendanceRoutes)
app.route('/api/fees', feeRoutes)
app.route('/api/exams', examRoutes)
app.route('/api/staff', staffRoutes)
app.route('/api/parent', parentRoutes)
app.route('/api/admin/dashboard', dashboardRoutes)
app.route('/api/alerts', alertRoutes)
app.route('/api/notices', noticeRoutes)
app.route('/api/front-desk', frontDeskRoutes)
app.route('/api/accounts', accountRoutes)
app.route('/api/hr', hrRoutes)
app.route('/api/communication', communicationRoutes)
app.route('/api/master', masterRoutes)
app.route('/api/board', boardRoutes)
app.route('/api/rte', rteRoutes)
app.route('/api/udise', udiseRoutes)
app.route('/api/tax', taxRoutes)
app.route('/api/payment-instruments', paymentInstrumentRoutes)
app.route('/api/public/enquiry', publicEnquiryRoutes)

// ─── 404 ───
app.notFound((c) => {
  return c.json({ error: `Route ${c.req.method} ${c.req.path} not found` }, 404)
})

// ─── GLOBAL ERROR HANDLER ───
app.onError((err, c) => {
  console.error('Unhandled error', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
