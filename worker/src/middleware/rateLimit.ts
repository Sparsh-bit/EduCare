import { createMiddleware } from 'hono/factory'
import { Env, Variables } from '../types'

interface RateLimitOptions {
  limit: number
  windowSeconds: number
  keyPrefix?: string
}

// KV-based rate limiter.
// KV is eventually consistent — under extreme burst traffic a few extra requests
// may slip through. This is acceptable for a school ERP. For strict enforcement,
// upgrade to Cloudflare's Rate Limiting product (paid) or Durable Objects.
//
// Scalability note: KV write latency ~5-30ms; the limiter adds one KV read + one
// KV write per request. At school-ERP scale (< 500 concurrent users) this is fine.
export function rateLimit(options: RateLimitOptions) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    // Skip rate limiting if KV is not configured (e.g. local dev)
    if (!c.env.RATE_LIMIT_KV) {
      await next()
      return
    }

    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'

    const prefix = options.keyPrefix || 'rl'
    // Sliding fixed-window: bucket by (ip, prefix, windowSlot)
    const windowSlot = Math.floor(Date.now() / (options.windowSeconds * 1000))
    const key = `${prefix}:${ip}:${windowSlot}`

    // Read current count; treat missing as 0
    const current = await c.env.RATE_LIMIT_KV.get(key)
    const count = current ? parseInt(current, 10) : 0

    if (count >= options.limit) {
      c.header('Retry-After', String(options.windowSeconds))
      return c.json({ error: 'Too many requests. Please try again later.' }, 429)
    }

    // Increment and set TTL = windowSeconds + small buffer so KV cleans up old keys
    await c.env.RATE_LIMIT_KV.put(key, String(count + 1), {
      expirationTtl: options.windowSeconds + 60,
    })

    await next()
  })
}

// Pre-configured limiters matching the Express backend
export const generalLimiter = rateLimit({ limit: 200, windowSeconds: 15 * 60, keyPrefix: 'general' })
export const authLimiter = rateLimit({ limit: 20, windowSeconds: 15 * 60, keyPrefix: 'auth' })
export const sensitiveAuthLimiter = rateLimit({ limit: 10, windowSeconds: 15 * 60, keyPrefix: 'sensitive' })
export const mutationsLimiter = rateLimit({ limit: 60, windowSeconds: 15 * 60, keyPrefix: 'mutations' })
export const publicEnquiryLimiter = rateLimit({ limit: 10, windowSeconds: 15 * 60, keyPrefix: 'enquiry' })
