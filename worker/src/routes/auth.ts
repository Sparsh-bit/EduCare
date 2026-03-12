import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize, ownerOnly, signToken } from '../middleware/auth'
import { sensitiveAuthLimiter } from '../middleware/rateLimit'
import { getSupabase } from '../utils/supabase'
import { createAuditLog, getClientIp } from '../utils/auditLog'
import { sha256 } from '../utils/helpers'
import {
  sendEmail, passwordResetEmailHtml, welcomeEmailHtml,
  employeeCredentialsEmailHtml, otpEmailHtml
} from '../utils/email'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── ENQUIRY (public) ───
router.post('/enquire', async (c) => {
  try {
    const body = await c.req.json()
    const { schoolName, ownerName, email, phone, students } = body
    if (!schoolName || !ownerName || !email || !phone || !students) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    const supabase = getSupabase(c.env)
    const { data, error } = await supabase.from('enquiries').insert({
      school_name: schoolName,
      owner_name: ownerName,
      contact_email: email,
      contact_phone: phone,
      expected_students: Number(students),
      status: 'pending',
    }).select().single()

    if (error) return c.json({ error: 'Internal server error' }, 500)
    return c.json({ message: 'Enquiry submitted successfully', enquiryId: data.id }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── REGISTER SCHOOL (public) ───
router.post('/register-school', sensitiveAuthLimiter, async (c) => {
  try {
    const body = await c.req.json()
    const {
      schoolName, ownerName, email, password,
      phone, address, board,
      numClasses = 10, includePrePrimary = false, sectionsPerClass = 1,
    } = body

    if (!schoolName || !ownerName || !email || !password) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }

    const normalizedEmail = email.toLowerCase().trim()
    const supabase = getSupabase(c.env)

    // Generate school code
    const schoolCode = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(3)))
      .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()

    const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, Number(sectionsPerClass))
    const now = new Date()
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const academicYearStr = `${startYear}-${String(startYear + 1).slice(2)}`
    const academicStart = `${startYear}-04-01`
    const academicEnd = `${startYear + 1}-03-31`

    // Create school
    const { data: school, error: schoolErr } = await supabase.from('schools').insert({
      school_code: schoolCode,
      name: schoolName,
      owner_name: ownerName,
      phone: phone || null,
      address: address || null,
      board: board || 'CBSE',
      principal_name: ownerName,
    }).select().single()
    if (schoolErr) {
      if (schoolErr.code === '23505') return c.json({ error: 'Email already exists' }, 400)
      return c.json({ error: 'Internal server error' }, 500)
    }

    // Create Supabase Auth user
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    })
    if (authErr) {
      if (authErr.message?.includes('already')) return c.json({ error: 'Email already exists' }, 400)
      return c.json({ error: 'Internal server error' }, 500)
    }

    // Insert user record
    await supabase.from('users').insert({
      username: normalizedEmail,
      email: normalizedEmail,
      name: ownerName,
      role: 'owner',
      school_id: school.id,
      is_active: true,
      supabase_auth_id: authUser.user.id,
    })

    // Create academic year
    await supabase.from('academic_years').insert({
      year: academicYearStr,
      is_current: true,
      start_date: academicStart,
      end_date: academicEnd,
      school_id: school.id,
    })

    // Build class list
    const classRows: { name: string; numeric_order: number; school_id: number }[] = []
    let order = 0
    if (includePrePrimary) {
      classRows.push({ name: 'Nursery', numeric_order: order++, school_id: school.id })
      classRows.push({ name: 'LKG', numeric_order: order++, school_id: school.id })
      classRows.push({ name: 'UKG', numeric_order: order++, school_id: school.id })
    }
    for (let c2 = 1; c2 <= Number(numClasses); c2++) {
      classRows.push({ name: `Class ${c2}`, numeric_order: order++, school_id: school.id })
    }

    for (const classRow of classRows) {
      const { data: cls } = await supabase.from('classes').insert(classRow).select().single()
      if (cls && sectionLetters.length > 0) {
        await supabase.from('sections').insert(
          sectionLetters.map(letter => ({ class_id: cls.id, name: letter, school_id: school.id }))
        )
      }
    }

    const loginUrl = `${c.env.FRONTEND_URL}/login`
    sendEmail(c.env, normalizedEmail, `Welcome to EduCare ERP — ${schoolName}`,
      welcomeEmailHtml(schoolName, ownerName, schoolCode, normalizedEmail, password, loginUrl)
    ).catch(() => {})

    return c.json({ message: 'School registered successfully', schoolCode }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── LOGIN ───
router.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { schoolCode, username, password } = body
    if (!schoolCode || !username || !password) {
      return c.json({ error: 'School code, username, and password are required' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: school } = await supabase
      .from('schools')
      .select('*')
      .ilike('school_code', schoolCode.trim())
      .single()

    if (!school) {
      return c.json({ error: 'Invalid school code, username, or password' }, 401)
    }

    // Use Supabase Auth for bcrypt (offloads CPU-intensive work to Supabase servers)
    const normalizedUsername = username.toLowerCase().trim()
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedUsername,
      password,
    })

    if (authError || !authData.user) {
      return c.json({ error: 'Invalid school code, username, or password' }, 401)
    }

    // Look up user in our users table
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('school_id', school.id)
      .eq('is_active', true)
      .or(`username.eq.${normalizedUsername},email.eq.${normalizedUsername}`)
      .single()

    if (!user) {
      return c.json({ error: 'Invalid school code, username, or password' }, 401)
    }

    const token = await signToken(
      { id: user.id, email: user.email, role: user.role, school_id: user.school_id, name: user.name },
      c.env.JWT_SECRET,
      '24h'
    )

    const refreshToken = await signToken(
      { id: user.id },
      c.env.JWT_REFRESH_SECRET,
      '7d'
    )

    // Store refresh token hash
    const rtHash = await sha256(refreshToken)
    await supabase.from('users').update({ refresh_token_hash: rtHash }).eq('id', user.id)

    await createAuditLog(supabase, {
      user_id: user.id,
      school_id: user.school_id,
      action: 'login',
      entity_type: 'user',
      entity_id: user.id,
      ip_address: getClientIp(c),
      description: `User ${user.username} logged in`,
    })

    return c.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        school_id: user.school_id,
        preferred_language: user.preferred_language,
      },
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── REFRESH TOKEN ───
router.post('/refresh', async (c) => {
  try {
    const body = await c.req.json()
    const refreshToken = body.refreshToken
    if (!refreshToken) return c.json({ error: 'Refresh token required' }, 400)

    const { jwtVerify } = await import('jose')
    const secret = new TextEncoder().encode(c.env.JWT_REFRESH_SECRET)
    const { payload } = await jwtVerify(refreshToken, secret)

    const supabase = getSupabase(c.env)
    const { data: user } = await supabase.from('users')
      .select('*').eq('id', payload.id as number).eq('is_active', true).single()
    if (!user) return c.json({ error: 'Invalid refresh token' }, 401)

    const rtHash = await sha256(refreshToken)
    if (user.refresh_token_hash && user.refresh_token_hash !== rtHash) {
      return c.json({ error: 'Refresh token has been revoked' }, 401)
    }

    const token = await signToken(
      { id: user.id, email: user.email, role: user.role, school_id: user.school_id, name: user.name },
      c.env.JWT_SECRET,
      '24h'
    )
    return c.json({ token })
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401)
  }
})

// ─── GET ME ───
router.get('/me', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('users')
      .select('id, username, email, name, phone, role, preferred_language, school_id, email_verified, created_at')
      .eq('id', user.id).single()
    return c.json(data)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── LOGOUT ───
router.post('/logout', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const supabase = getSupabase(c.env)
    await supabase.from('users').update({ refresh_token_hash: null }).eq('id', user.id)
    await createAuditLog(supabase, {
      user_id: user.id,
      school_id: user.school_id,
      action: 'logout',
      entity_type: 'user',
      entity_id: user.id,
      ip_address: getClientIp(c),
      description: `User ${user.email} logged out`,
    })
    return c.json({ message: 'Logged out successfully' })
  } catch {
    return c.json({ message: 'Logged out' })
  }
})

// ─── CHANGE PASSWORD ───
router.post('/change-password', authenticate, async (c) => {
  try {
    const body = await c.req.json()
    const { currentPassword, newPassword } = body
    if (!currentPassword || !newPassword) return c.json({ error: 'Missing fields' }, 400)
    if (newPassword.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)

    const user = c.get('user')
    const supabase = getSupabase(c.env)

    // Verify current password via Supabase Auth
    const { data: userRecord } = await supabase.from('users').select('email').eq('id', user.id).single()
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: userRecord?.email || user.email,
      password: currentPassword,
    })
    if (verifyErr) return c.json({ error: 'Current password is incorrect' }, 400)

    // Get supabase_auth_id or find user by email
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === (userRecord?.email || user.email).toLowerCase())
    if (authUser) {
      await supabase.auth.admin.updateUserById(authUser.id, { password: newPassword })
    }

    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'password_change',
      entity_type: 'user',
      entity_id: user.id,
      ip_address: getClientIp(c),
    })
    return c.json({ message: 'Password changed successfully' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── CREATE USER (Owner only) ───
router.post('/create-user', authenticate, ownerOnly(), async (c) => {
  try {
    const body = await c.req.json()
    const { name, username, password, role, phone, designation, department } = body
    if (!name || !username || !password || !role) return c.json({ error: 'Missing required fields' }, 400)
    if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)
    const validRoles = ['teacher', 'co-owner', 'accountant', 'front_desk', 'hr_manager']
    if (!validRoles.includes(role)) return c.json({ error: 'Invalid role' }, 400)

    const user = c.get('user')
    const supabase = getSupabase(c.env)
    const normalizedUsername = username.toLowerCase().trim()

    // Create Supabase Auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: normalizedUsername,
      password,
      email_confirm: true,
    })
    if (authErr) {
      if (authErr.message?.includes('already')) return c.json({ error: 'Username already exists' }, 400)
      return c.json({ error: 'Internal server error' }, 500)
    }

    const { data: newUser, error: userErr } = await supabase.from('users').insert({
      username: normalizedUsername,
      email: normalizedUsername,
      name,
      phone: phone || null,
      role,
      school_id: user.school_id,
      is_active: true,
      supabase_auth_id: authData.user.id,
    }).select().single()
    if (userErr) {
      if (userErr.code === '23505') return c.json({ error: 'Username already exists' }, 400)
      return c.json({ error: 'Internal server error' }, 500)
    }

    // Create staff record
    const employeeId = `EMP${String(newUser.id).padStart(4, '0')}`
    await supabase.from('staff').insert({
      user_id: newUser.id,
      name,
      employee_id: employeeId,
      designation: designation || role,
      department: department || 'General',
      phone: phone || null,
      email: normalizedUsername,
      salary: 0,
      join_date: new Date().toISOString().split('T')[0],
      status: 'active',
      school_id: user.school_id,
    })

    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'create_user',
      entity_type: 'user',
      entity_id: newUser.id,
      new_value: { name, username: normalizedUsername, role },
      ip_address: getClientIp(c),
      description: `Admin created ${role} account for ${name}`,
    })

    const { data: school } = await supabase.from('schools').select('name, school_code').eq('id', user.school_id).single()
    if (school) {
      const loginUrl = `${c.env.FRONTEND_URL}/login?username=${encodeURIComponent(normalizedUsername)}`
      sendEmail(c.env, normalizedUsername, `Welcome to ${school.name} — Your EduCare ERP Credentials`,
        employeeCredentialsEmailHtml(school.name, name, school.school_code, normalizedUsername, password, role, loginUrl)
      ).catch(() => {})
    }

    return c.json({ message: 'Employee account created successfully', user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role } }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── LIST USERS ───
router.get('/users', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('users')
      .select('id, username, name, role, phone, is_active, created_at')
      .eq('school_id', user.school_id)
      .order('created_at', { ascending: false })
    return c.json({ data })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── UPDATE ROLE ───
router.put('/users/:userId/role', authenticate, ownerOnly(), async (c) => {
  try {
    const body = await c.req.json()
    const { role } = body
    const validRoles = ['teacher', 'co-owner', 'accountant', 'front_desk', 'hr_manager']
    if (!validRoles.includes(role)) return c.json({ error: 'Invalid role' }, 400)

    const user = c.get('user')
    const supabase = getSupabase(c.env)
    const userId = parseInt(c.req.param('userId'))

    const { data: targetUser } = await supabase.from('users')
      .select('*').eq('id', userId).eq('school_id', user.school_id).single()
    if (!targetUser) return c.json({ error: 'User not found' }, 404)
    if (targetUser.role === 'owner') return c.json({ error: 'Cannot change admin role' }, 403)

    await supabase.from('users').update({ role }).eq('id', userId)

    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'update_role',
      entity_type: 'user',
      entity_id: userId,
      old_value: { role: targetUser.role },
      new_value: { role },
      ip_address: getClientIp(c),
    })
    return c.json({ message: 'Role updated', user: { id: userId, name: targetUser.name, role } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── DEACTIVATE USER ───
router.put('/users/:userId/deactivate', authenticate, ownerOnly(), async (c) => {
  try {
    const user = c.get('user')
    const supabase = getSupabase(c.env)
    const userId = parseInt(c.req.param('userId'))

    const { data: targetUser } = await supabase.from('users')
      .select('*').eq('id', userId).eq('school_id', user.school_id).single()
    if (!targetUser) return c.json({ error: 'User not found' }, 404)
    if (targetUser.role === 'owner') return c.json({ error: 'Cannot deactivate admin' }, 403)

    await supabase.from('users').update({ is_active: false }).eq('id', userId)
    return c.json({ message: `User ${targetUser.name} has been deactivated` })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── REACTIVATE USER ───
router.put('/users/:userId/reactivate', authenticate, ownerOnly(), async (c) => {
  try {
    const user = c.get('user')
    const supabase = getSupabase(c.env)
    const userId = parseInt(c.req.param('userId'))

    const { data: targetUser } = await supabase.from('users')
      .select('*').eq('id', userId).eq('school_id', user.school_id).single()
    if (!targetUser) return c.json({ error: 'User not found' }, 404)

    await supabase.from('users').update({ is_active: true }).eq('id', userId)
    return c.json({ message: `User ${targetUser.name} has been reactivated` })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── RESET USER PASSWORD ───
router.put('/users/:userId/reset-password', authenticate, ownerOnly(), async (c) => {
  try {
    const body = await c.req.json()
    const { newPassword } = body
    if (!newPassword || newPassword.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)

    const user = c.get('user')
    const supabase = getSupabase(c.env)
    const userId = parseInt(c.req.param('userId'))

    const { data: targetUser } = await supabase.from('users')
      .select('*').eq('id', userId).eq('school_id', user.school_id).single()
    if (!targetUser) return c.json({ error: 'User not found' }, 404)
    if (targetUser.role === 'owner') return c.json({ error: 'Use change-password for your own account' }, 403)

    // Reset via Supabase Auth
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === targetUser.email?.toLowerCase())
    if (authUser) {
      await supabase.auth.admin.updateUserById(authUser.id, { password: newPassword })
    }

    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'reset_password',
      entity_type: 'user',
      entity_id: userId,
      ip_address: getClientIp(c),
      description: `Password reset for ${targetUser.name}`,
    })
    return c.json({ message: `Password reset for ${targetUser.name}` })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── FORGOT PASSWORD ───
router.post('/forgot-password', async (c) => {
  const ok = () => c.json({ message: 'If that email is registered, a reset link has been sent.' })
  try {
    const body = await c.req.json()
    const { username } = body
    if (!username) return ok()

    const supabase = getSupabase(c.env)
    const { data: user } = await supabase.from('users')
      .select('*').eq('username', username.trim()).eq('is_active', true).single()
    if (!user) return ok()

    const { data: school } = await supabase.from('schools').select('name').eq('id', user.school_id).single()

    // Delete existing unused tokens
    await supabase.from('password_reset_tokens')
      .delete().eq('user_id', user.id).is('used_at', null)

    // Generate token
    const rawToken = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    const tokenHash = await sha256(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await supabase.from('password_reset_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })

    const resetUrl = `${c.env.FRONTEND_URL}/reset-password?token=${rawToken}`
    await sendEmail(c.env, user.email, 'Reset your EduCare ERP password',
      passwordResetEmailHtml(school?.name || 'your school', user.name, resetUrl))

    return ok()
  } catch {
    return ok()
  }
})

// ─── RESET PASSWORD ───
router.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json()
    const { token, newPassword } = body
    if (!token || !newPassword) return c.json({ error: 'Token and new password are required' }, 400)
    if (newPassword.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)

    const supabase = getSupabase(c.env)
    const tokenHash = await sha256(token)

    const { data: record } = await supabase.from('password_reset_tokens')
      .select('*').eq('token_hash', tokenHash).is('used_at', null).single()
    if (!record) return c.json({ error: 'Invalid or expired reset link. Please request a new one.' }, 400)
    if (new Date(record.expires_at) < new Date()) {
      return c.json({ error: 'This reset link has expired. Please request a new one.' }, 400)
    }

    const { data: resetUser } = await supabase.from('users').select('email, school_id').eq('id', record.user_id).single()

    // Update password via Supabase Auth
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === resetUser?.email?.toLowerCase())
    if (authUser) {
      await supabase.auth.admin.updateUserById(authUser.id, { password: newPassword })
    }

    await supabase.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq('id', record.id)
    await supabase.from('users').update({ refresh_token_hash: null }).eq('id', record.user_id)

    await createAuditLog(supabase, {
      user_id: record.user_id,
      school_id: resetUser?.school_id,
      action: 'password_reset',
      entity_type: 'user',
      entity_id: record.user_id,
      ip_address: getClientIp(c),
      description: 'Password reset via email link',
    })
    return c.json({ message: 'Password reset successfully. You can now sign in.' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── SEND OTP ───
router.post('/send-verification-otp', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const supabase = getSupabase(c.env)

    const { data: userRecord } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (!userRecord) return c.json({ error: 'User not found' }, 404)
    if (userRecord.email_verified) return c.json({ error: 'Email is already verified' }, 400)

    await supabase.from('email_otp_tokens').delete().eq('user_id', user.id).is('used_at', null)

    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const otpHash = await sha256(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await supabase.from('email_otp_tokens').insert({
      user_id: user.id,
      otp_hash: otpHash,
      expires_at: expiresAt.toISOString(),
    })

    const { data: school } = await supabase.from('schools').select('name').eq('id', userRecord.school_id).single()
    await sendEmail(c.env, userRecord.email, 'Verify your EduCare ERP email',
      otpEmailHtml(userRecord.name, otp, school?.name || 'your school'))

    return c.json({ message: 'Verification code sent to your email.' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── VERIFY EMAIL ───
router.post('/verify-email', authenticate, async (c) => {
  try {
    const body = await c.req.json()
    const { otp } = body
    if (!otp || String(otp).length !== 6) return c.json({ error: 'OTP must be a 6-digit number' }, 400)

    const user = c.get('user')
    const supabase = getSupabase(c.env)

    const { data: userRecord } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (!userRecord) return c.json({ error: 'User not found' }, 404)
    if (userRecord.email_verified) return c.json({ error: 'Email is already verified' }, 400)

    const otpHash = await sha256(String(otp))
    const { data: record } = await supabase.from('email_otp_tokens')
      .select('*').eq('user_id', user.id).eq('otp_hash', otpHash).is('used_at', null).single()
    if (!record) return c.json({ error: 'Invalid verification code. Please try again.' }, 400)
    if (new Date(record.expires_at) < new Date()) {
      return c.json({ error: 'Verification code has expired. Please request a new one.' }, 400)
    }

    await supabase.from('users').update({ email_verified: true }).eq('id', user.id)
    await supabase.from('email_otp_tokens').update({ used_at: new Date().toISOString() }).eq('id', record.id)

    return c.json({ message: 'Email verified successfully.' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── WEBSITE TOKEN ───
router.get('/school/website-token', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const supabase = getSupabase(c.env)
    const { data: school } = await supabase.from('schools')
      .select('id, name, website_token').eq('id', user.school_id).single()
    if (!school) return c.json({ error: 'School not found' }, 404)

    if (!school.website_token) {
      const token = globalThis.crypto.randomUUID()
      await supabase.from('schools').update({ website_token: token }).eq('id', user.school_id)
      school.website_token = token
    }
    return c.json({ website_token: school.website_token, school_name: school.name })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

router.post('/school/website-token/regenerate', authenticate, authorize('tenant_admin', 'owner', 'co-owner'), async (c) => {
  try {
    const user = c.get('user')
    const supabase = getSupabase(c.env)
    const newToken = globalThis.crypto.randomUUID()
    await supabase.from('schools').update({ website_token: newToken }).eq('id', user.school_id)
    await createAuditLog(supabase, {
      school_id: user.school_id,
      user_id: user.id,
      action: 'REGENERATE_WEBSITE_TOKEN',
      entity_type: 'schools',
      entity_id: user.school_id,
      ip_address: getClientIp(c),
    })
    return c.json({ website_token: newToken, message: 'Token regenerated successfully' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
