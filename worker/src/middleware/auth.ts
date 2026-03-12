import { createMiddleware } from 'hono/factory'
import { jwtVerify, SignJWT } from 'jose'
import { Env, Variables } from '../types'

export const authenticate = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return c.json({ error: 'Access denied. No token provided.' }, 401)

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    c.set('user', payload as Variables['user'])
    await next()
  } catch {
    return c.json({ error: 'Invalid token.' }, 401)
  }
})

export const requireSchoolId = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const user = c.get('user')
  if (!user?.school_id) {
    return c.json({ error: 'User is not mapped to a school' }, 403)
  }
  await next()
})

export const authorize = (...roles: string[]) => {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Not authenticated.' }, 401)

    const expandedRoles = new Set(roles)
    if (expandedRoles.has('admin')) {
      expandedRoles.add('owner')
      expandedRoles.add('co-owner')
    }

    if (!expandedRoles.has(user.role)) {
      return c.json({ error: 'Access denied. Insufficient permissions.' }, 403)
    }
    await next()
  })
}

export const ownerOnly = () => authorize('owner', 'co-owner')

export async function signToken(payload: Record<string, unknown>, secret: string, expiresIn: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(key)
}
