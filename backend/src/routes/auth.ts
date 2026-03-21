import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import db from '../config/database';
import { config } from '../config';
import { authenticate, AuthRequest, authorize, ownerOnly, invalidateUserCache } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import { createAuditLog, getClientIp } from '../utils/auditLog';
import logger from '../config/logger';
import { sendEmail, passwordResetEmailHtml, welcomeEmailHtml, employeeCredentialsEmailHtml, otpEmailHtml } from '../utils/email';
import { getLockoutSeconds, recordFailure, recordSuccess, remainingAttempts } from '../middleware/loginLockout';

const router = Router();

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Whether the users.refresh_token_hash column exists.
 * Cached after first check so we only hit the DB once per startup.
 */
let _hasRefreshHashCol: boolean | null = null;
async function hasRefreshTokenHashColumn(): Promise<boolean> {
    if (_hasRefreshHashCol !== null) return _hasRefreshHashCol;
    try {
        const result = await db.raw(
            `SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'refresh_token_hash' LIMIT 1`
        );
        _hasRefreshHashCol = (result.rows?.length ?? 0) > 0;
    } catch {
        _hasRefreshHashCol = false;
    }
    return _hasRefreshHashCol;
}

const isDatabaseUnavailableError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const maybeError = error as { name?: string; code?: string };
    return maybeError.name === 'KnexTimeoutError'
        || maybeError.code === 'ECONNREFUSED'
        || maybeError.code === 'ENOTFOUND'
        || maybeError.code === 'ETIMEDOUT'
        || maybeError.code === 'EHOSTUNREACH'
        || maybeError.code === '57P01';
};

// ─── ENQUIRY (public – for leads) ───
router.post(
    '/enquire',
    validate([
        body('schoolName').notEmpty().trim().escape().withMessage('School Name is required'),
        body('ownerName').notEmpty().trim().escape().withMessage('Owner Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('phone').notEmpty().trim().withMessage('Phone number is required'),
        body('students').isInt({ min: 1 }).withMessage('Expected students must be a positive number'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { schoolName, ownerName, email, phone, students } = req.body;
            const [enquiry] = await db('enquiries').insert({
                school_name: schoolName,
                owner_name: ownerName,
                contact_email: email,
                contact_phone: phone,
                expected_students: students,
                status: 'pending',
            }).returning('*');

            res.status(201).json({
                message: 'Enquiry submitted successfully',
                enquiryId: enquiry.id,
            });
        } catch (error) {
            logger.error('School enquiry error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── REGISTER SCHOOL (public – for paid customers) ───
router.post(
    '/register-school',
    validate([
        body('schoolName').notEmpty().trim().escape().withMessage('School Name is required'),
        body('ownerName').notEmpty().trim().escape().withMessage('Owner Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('phone').optional().trim(),
        body('address').optional().trim(),
        body('board').optional().trim(),
        body('numClasses').optional().isInt({ min: 1, max: 12 }),
        body('includePrePrimary').optional().isBoolean(),
        body('sectionsPerClass').optional().isInt({ min: 1, max: 8 }),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const {
                schoolName, ownerName, email, password,
                phone, address, board,
                numClasses = 10, includePrePrimary = false, sectionsPerClass = 1,
            } = req.body;

            const schoolCode = crypto.randomBytes(4).toString('hex').substring(0, 6).toUpperCase();
            const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, Number(sectionsPerClass));

            // Determine current academic year string e.g. "2025-26"
            const now = new Date();
            const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
            const academicYearStr = `${startYear}-${String(startYear + 1).slice(2)}`;
            const academicStart = `${startYear}-04-01`;
            const academicEnd = `${startYear + 1}-03-31`;

            await db.transaction(async (trx) => {
                // Create school
                const [school] = await trx('schools').insert({
                    school_code: schoolCode,
                    name: schoolName,
                    owner_name: ownerName,
                    phone: phone || null,
                    address: address || null,
                    board: board || 'CBSE',
                    principal_name: ownerName,
                }).returning('*');

                // Create owner user
                const password_hash = await bcrypt.hash(password, 12);
                await trx('users').insert({
                    username: email,
                    email,
                    password_hash,
                    name: ownerName,
                    role: 'owner',
                    school_id: school.id,
                    is_active: true,
                });

                // Create academic year (tenant-scoped since migration 020)
                await trx('academic_years').insert({
                    year: academicYearStr,
                    is_current: true,
                    start_date: academicStart,
                    end_date: academicEnd,
                    school_id: school.id,
                });

                // Build class list
                const classRows: { name: string; numeric_order: number; school_id: number }[] = [];
                let order = 0;
                if (includePrePrimary) {
                    classRows.push({ name: 'Nursery', numeric_order: order++, school_id: school.id });
                    classRows.push({ name: 'LKG', numeric_order: order++, school_id: school.id });
                    classRows.push({ name: 'UKG', numeric_order: order++, school_id: school.id });
                }
                for (let c = 1; c <= Number(numClasses); c++) {
                    classRows.push({ name: `Class ${c}`, numeric_order: order++, school_id: school.id });
                }

                // Insert classes and their sections
                for (const classRow of classRows) {
                    const [cls] = await trx('classes').insert(classRow).returning('*');
                    if (sectionLetters.length > 0) {
                        await trx('sections').insert(
                            sectionLetters.map(letter => ({ class_id: cls.id, name: letter, school_id: school.id }))
                        );
                    }
                }
            });

            // Send welcome email (non-blocking — registration succeeds even if email fails)
            const loginUrl = `${config.frontendUrl}/login`;
            sendEmail(
                email,
                `Welcome to EduCare ERP — ${schoolName}`,
                welcomeEmailHtml(schoolName, ownerName, schoolCode, email, password, loginUrl)
            ).catch(() => {});

            res.status(201).json({
                message: 'School registered successfully',
                schoolCode,
            });
        } catch (error: unknown) {
            const maybeError = error as { code?: string };
            if (maybeError.code === '23505') {
                return res.status(400).json({ error: 'Email already exists' });
            }
            logger.error('School registration error', error);
            const status = isDatabaseUnavailableError(error) ? 503 : 500;
            const message = status === 503
                ? 'Registration service temporarily unavailable. Please try again in a moment.'
                : 'Internal server error';
            res.status(status).json({ error: message });
        }
    }
);

// ─── ONE-TIME SETUP (creates the first admin — only works when no users exist) ───
router.post(
    '/setup',
    validate([
        body('name').notEmpty().withMessage('Name is required'),
        body('username').notEmpty().withMessage('Username is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            // Use a transaction with advisory lock to prevent race conditions
            const result = await db.transaction(async (trx) => {
                // Acquire advisory lock (key = hash of 'setup')
                await trx.raw('SELECT pg_advisory_xact_lock(42)');

                const count = await trx('users').count('id as total').first();
                if (count && Number(count.total) > 0) {
                    return { locked: true };
                }

                const { name, username, password } = req.body;

                // Ensure default school exists
                let school = await trx('schools').first();
                if (!school) {
                    [school] = await trx('schools').insert({
                        school_code: 'DEFAULT',
                        name: 'Default Organisation',
                        owner_name: name,
                    }).returning('*');
                }

                const password_hash = await bcrypt.hash(password, 12);
                const [newUser] = await trx('users').insert({
                    username,
                    email: username,
                    password_hash,
                    name,
                    role: 'owner',
                    school_id: school.id,
                    is_active: true,
                }).returning('*');

                logger.info(`Admin user created: ${username}`);
                return { locked: false, username: newUser.username };
            });

            if (result.locked) {
                return res.status(403).json({ error: 'Setup already completed. Admin already exists.' });
            }

            res.status(201).json({
                message: 'Admin account created successfully. You can now log in.',
                username: result.username,
            });
        } catch (error: any) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Username already exists' });
            }
            logger.error('Setup error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── LOGIN (school_code + username + password) ───
router.post(
    '/login',
    validate([
        body('schoolCode').notEmpty().trim().withMessage('School code is required'),
        body('username').notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { schoolCode, username, password } = req.body;

            // ── Lockout check (before any DB work to save resources) ──
            const lockedSecs = getLockoutSeconds(schoolCode, username);
            if (lockedSecs > 0) {
                return res.status(429).json({
                    error: `Account temporarily locked due to too many failed attempts. Try again in ${lockedSecs} seconds.`,
                    retry_after: lockedSecs,
                });
            }

            // Look up the school first to enforce tenant isolation
            const school = await db('schools')
                .whereRaw('UPPER(school_code) = ?', [schoolCode.toUpperCase().trim()])
                .first();
            if (!school) {
                await bcrypt.compare(password, '$2a$12$000000000000000000000uGSHMuhzfMJOuQNbniLCPOCr6M.s/jHO');
                recordFailure(schoolCode, username);
                return res.status(401).json({ error: 'Invalid school code, username, or password' });
            }

            const user = await db('users')
                .where(function () {
                    this.where({ username, is_active: true, school_id: school.id })
                        .orWhere({ email: username, is_active: true, school_id: school.id });
                })
                .first();
            if (!user) {
                // Constant-time: perform dummy compare to prevent timing-based user enumeration
                await bcrypt.compare(password, '$2a$12$000000000000000000000uGSHMuhzfMJOuQNbniLCPOCr6M.s/jHO');
                recordFailure(schoolCode, username);
                return res.status(401).json({ error: 'Invalid school code, username, or password' });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                const lockSecs = recordFailure(schoolCode, username);
                const remaining = remainingAttempts(schoolCode, username);
                const extra = lockSecs > 0
                    ? ` Account locked for ${lockSecs} seconds.`
                    : remaining > 0
                        ? ` ${remaining} attempt(s) remaining before lockout.`
                        : '';
                return res.status(401).json({ error: `Invalid school code, username, or password.${extra}` });
            }

            // ── Successful login — clear any failure counter ──
            recordSuccess(schoolCode, username);

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, school_id: user.school_id },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn as any }
            );

            const refreshToken = jwt.sign(
                { id: user.id },
                config.jwt.refreshSecret,
                { expiresIn: config.jwt.refreshExpiresIn as any }
            );

            // Store refresh token hash for validation on refresh/logout
            if (await hasRefreshTokenHashColumn()) {
                await db('users').where({ id: user.id }).update({ refresh_token_hash: hashToken(refreshToken) });
            }

            await createAuditLog({
                user_id: user.id,
                school_id: user.school_id,
                action: 'login',
                entity_type: 'user',
                entity_id: user.id,
                ip_address: getClientIp(req),
                description: `User ${user.username} logged in`,
            });

            const isProduction = process.env.NODE_ENV === 'production';
            res.cookie('auth_token', token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000, // 1 day
                path: '/',
            });
            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/api/auth/refresh',
            });

            res.json({
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
            });
        } catch (error: unknown) {
            logger.error('Login error', error);
            if (isDatabaseUnavailableError(error)) {
                return res.status(503).json({ error: 'Sign-in service temporarily unavailable. Please try again in a moment.' });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── REFRESH TOKEN ───
router.post('/refresh', async (req: AuthRequest, res: Response) => {
    try {
        const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
        if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: number };
        const user = await db('users').where({ id: decoded.id, is_active: true }).first();
        if (!user) return res.status(401).json({ error: 'Invalid refresh token' });

        // Validate refresh token against stored hash (prevents reuse after logout)
        if (await hasRefreshTokenHashColumn()) {
            if (!user.refresh_token_hash || user.refresh_token_hash !== hashToken(refreshToken)) {
                return res.status(401).json({ error: 'Refresh token has been revoked' });
            }
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, school_id: user.school_id },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn as any }
        );

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
        });

        res.json({ token });
    } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// ─── GET ME ───
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await db('users as u')
            .leftJoin('schools as s', 'u.school_id', 's.id')
            .select(
                'u.id', 'u.username', 'u.email', 'u.name', 'u.phone',
                'u.role', 'u.preferred_language', 'u.school_id',
                'u.email_verified', 'u.created_at',
                's.name as school_name',
            )
            .where({ 'u.id': req.user!.id })
            .first();
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── LOGOUT (clear HttpOnly cookies) ───
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        // Invalidate refresh token in DB (if column exists)
        if (await hasRefreshTokenHashColumn()) {
            await db('users').where({ id: req.user!.id }).update({ refresh_token_hash: null });
        }

        await createAuditLog({
            user_id: req.user!.id,
            school_id: req.user!.school_id,
            action: 'logout',
            entity_type: 'user',
            entity_id: req.user!.id,
            ip_address: getClientIp(req),
            description: `User ${req.user!.email} logged out`,
        });

        res.clearCookie('auth_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.clearCookie('auth_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
        res.json({ message: 'Logged out' });
    }
});

// ─── CHANGE PASSWORD ───
router.post(
    '/change-password',
    authenticate,
    validate([
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const user = await db('users').where({ id: req.user!.id }).first();

            const valid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

            const hash = await bcrypt.hash(newPassword, 12);
            await db('users').where({ id: req.user!.id }).update({ password_hash: hash, refresh_token_hash: null });
            invalidateUserCache(req.user!.id);

            await createAuditLog({
                user_id: req.user!.id,
                school_id: req.user!.school_id,
                action: 'password_change',
                entity_type: 'user',
                entity_id: req.user!.id,
                ip_address: getClientIp(req),
            });

            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── CREATE EMPLOYEE (Admin/Owner only) ───
router.post(
    '/create-user',
    authenticate,
    ownerOnly(),
    validate([
        body('name').notEmpty().withMessage('Name is required'),
        body('username').notEmpty().withMessage('Username is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('role').isIn(['teacher', 'co-owner', 'accountant', 'front_desk', 'hr_manager']).withMessage('Invalid role'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { name, username, password, role, phone, designation, department } = req.body;

            const password_hash = await bcrypt.hash(password, 12);

            const newUser = await db.transaction(async (trx) => {
                const [user] = await trx('users').insert({
                    username,
                    email: username,
                    password_hash,
                    name,
                    phone: phone || null,
                    role,
                    school_id: req.user!.school_id,
                    is_active: true,
                }).returning('*');

                // Create a staff record for the employee
                const employeeId = `EMP${String(user.id).padStart(4, '0')}`;
                await trx('staff').insert({
                    user_id: user.id,
                    name,
                    employee_id: employeeId,
                    designation: designation || role,
                    department: department || 'General',
                    phone: phone || null,
                    email: username,
                    salary: 0,
                    join_date: new Date().toISOString().split('T')[0],
                    status: 'active',
                    school_id: req.user!.school_id,
                });

                return user;
            });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'create_user',
                entity_type: 'user',
                entity_id: newUser.id,
                new_value: { name, username, role },
                ip_address: getClientIp(req),
                description: `Admin created ${role} account for ${name} (username: ${username})`,
            });

            // Send credentials email to the new employee (non-blocking)
            const school = await db('schools').where({ id: req.user!.school_id }).first();
            if (school) {
                const loginUrl = `${config.frontendUrl}/login?username=${encodeURIComponent(username)}`;
                sendEmail(
                    username, // username is email
                    `Welcome to ${school.name} — Your EduCare ERP Credentials`,
                    employeeCredentialsEmailHtml(school.name, name, school.school_code, username, password, role, loginUrl)
                ).catch(() => {});

                // Create a notice for the team
                await db('notices').insert({
                    title: 'New Team Member Joined',
                    content: `${name} has joined the ${department} department as ${designation || role}.`,
                    target_audience: 'admin',
                    created_by: req.user!.id,
                    school_id: req.user!.school_id,
                });
            }

            res.status(201).json({
                message: `Employee account created successfully`,
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    name: newUser.name,
                    role: newUser.role,
                },
            });
        } catch (error: any) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Username already exists' });
            }
            logger.error('Create user error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── LIST USERS (Admin/Owner only) ───
router.get(
    '/users',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin'),
    async (req: AuthRequest, res: Response) => {
        try {
            const users = await db('users')
                .select('id', 'username', 'name', 'role', 'phone', 'is_active', 'created_at')
                .where({ school_id: req.user!.school_id })
                .orderBy('created_at', 'desc');

            res.json({ data: users });
        } catch (error) {
            logger.error('List users error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── UPDATE USER ROLE (Admin only) ───
router.put(
    '/users/:userId/role',
    authenticate,
    ownerOnly(),
    validate([
        paramId('userId'),
        body('role').isIn(['teacher', 'co-owner', 'accountant', 'front_desk', 'hr_manager']).withMessage('Invalid role'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const targetUser = await db('users')
                .where({ id: req.params.userId, school_id: req.user!.school_id })
                .first();

            if (!targetUser) return res.status(404).json({ error: 'User not found' });
            if (targetUser.role === 'owner') return res.status(403).json({ error: 'Cannot change admin role' });

            const [updated] = await db('users')
                .where({ id: req.params.userId })
                .update({ role: req.body.role })
                .returning('*');
            invalidateUserCache(Number(req.params.userId));

            await createAuditLog({
                user_id: req.user!.id,
                action: 'update_role',
                entity_type: 'user',
                entity_id: updated.id,
                old_value: { role: targetUser.role },
                new_value: { role: updated.role },
                ip_address: getClientIp(req),
                description: `Role changed for ${updated.name}: ${targetUser.role} → ${updated.role}`,
            });

            // Notify the team about role change
            await db('notices').insert({
                title: 'Role Authorization Update',
                content: `Account role for ${updated.name} has been updated to ${updated.role}.`,
                target_audience: 'admin',
                created_by: req.user!.id,
                school_id: req.user!.school_id,
            });

            res.json({ message: 'Role updated', user: { id: updated.id, name: updated.name, role: updated.role } });
        } catch (error) {
            logger.error('Update role error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── DEACTIVATE USER (Admin only) ───
router.put(
    '/users/:userId/deactivate',
    authenticate,
    ownerOnly(),
    validate([paramId('userId')]),
    async (req: AuthRequest, res: Response) => {
        try {
            const targetUser = await db('users')
                .where({ id: req.params.userId, school_id: req.user!.school_id })
                .first();

            if (!targetUser) return res.status(404).json({ error: 'User not found' });
            if (targetUser.role === 'owner') return res.status(403).json({ error: 'Cannot deactivate admin' });

            await db('users').where({ id: req.params.userId }).update({ is_active: false });
            invalidateUserCache(Number(req.params.userId));

            await createAuditLog({
                user_id: req.user!.id,
                action: 'deactivate_user',
                entity_type: 'user',
                entity_id: targetUser.id,
                ip_address: getClientIp(req),
                description: `Deactivated user ${targetUser.name}`,
            });

            // Create notice for security awareness
            await db('notices').insert({
                title: 'Security Alert: Account Deactivated',
                content: `The account for ${targetUser.name} has been deactivated by the administrator.`,
                target_audience: 'admin',
                created_by: req.user!.id,
                school_id: req.user!.school_id,
            });

            res.json({ message: `User ${targetUser.name} has been deactivated` });
        } catch (error) {
            logger.error('Deactivate user error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── REACTIVATE USER (Admin only) ───
router.put(
    '/users/:userId/reactivate',
    authenticate,
    ownerOnly(),
    validate([paramId('userId')]),
    async (req: AuthRequest, res: Response) => {
        try {
            const targetUser = await db('users')
                .where({ id: req.params.userId, school_id: req.user!.school_id })
                .first();

            if (!targetUser) return res.status(404).json({ error: 'User not found' });

            await db('users').where({ id: req.params.userId }).update({ is_active: true });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'reactivate_user',
                entity_type: 'user',
                entity_id: targetUser.id,
                ip_address: getClientIp(req),
                description: `Reactivated user ${targetUser.name}`,
            });

            // Create notice for reactivation
            await db('notices').insert({
                title: 'Account Reactivated',
                content: `The account for ${targetUser.name} has been reactivated.`,
                target_audience: 'admin',
                created_by: req.user!.id,
                school_id: req.user!.school_id,
            });

            res.json({ message: `User ${targetUser.name} has been reactivated` });
        } catch (error) {
            logger.error('Reactivate user error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── RESET USER PASSWORD (Admin only) ───
router.put(
    '/users/:userId/reset-password',
    authenticate,
    ownerOnly(),
    validate([
        paramId('userId'),
        body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const targetUser = await db('users')
                .where({ id: req.params.userId, school_id: req.user!.school_id })
                .first();

            if (!targetUser) return res.status(404).json({ error: 'User not found' });
            if (targetUser.role === 'owner') return res.status(403).json({ error: 'Use change-password for your own account' });

            const hash = await bcrypt.hash(req.body.newPassword, 12);
            await db('users').where({ id: req.params.userId }).update({ password_hash: hash });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'reset_password',
                entity_type: 'user',
                entity_id: targetUser.id,
                ip_address: getClientIp(req),
                description: `Password reset for ${targetUser.name}`,
            });

            res.json({ message: `Password reset for ${targetUser.name}` });
        } catch (error) {
            logger.error('Reset password error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── FORGOT PASSWORD (public — rate limited by app-level limiter) ───
router.post(
    '/forgot-password',
    validate([
        body('username').notEmpty().trim().withMessage('Username is required'),
    ]),
    async (req: AuthRequest, res: Response) => {
        // Always return 200 to prevent email enumeration
        const ok = () => res.json({ message: 'If that email is registered, a reset link has been sent.' });
        try {
            const user = await db('users').where({ username: req.body.username, is_active: true }).first();
            if (!user) return ok();

            const school = await db('schools').where({ id: user.school_id }).first();

            // Invalidate any existing unused tokens for this user
            await db('password_reset_tokens')
                .where({ user_id: user.id })
                .whereNull('used_at')
                .delete();

            // Generate secure random token (store only its hash)
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await db('password_reset_tokens').insert({
                user_id: user.id,
                token_hash: tokenHash,
                expires_at: expiresAt,
            });

            const resetUrl = `${config.frontendUrl}/reset-password?token=${rawToken}`;
            await sendEmail(
                user.email,
                'Reset your EduCare ERP password',
                passwordResetEmailHtml(school?.name || 'your school', user.name, resetUrl)
            );

            return ok();
        } catch (error) {
            logger.error('Forgot password error', error);
            return ok(); // Never reveal errors to prevent enumeration
        }
    }
);

// ─── RESET PASSWORD (public — uses one-time token from email) ───
router.post(
    '/reset-password',
    validate([
        body('token').notEmpty().withMessage('Token is required'),
        body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { token, newPassword } = req.body;
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            const record = await db('password_reset_tokens')
                .where({ token_hash: tokenHash })
                .whereNull('used_at')
                .first();

            if (!record) {
                return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
            }

            if (new Date(record.expires_at) < new Date()) {
                return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
            }

            const password_hash = await bcrypt.hash(newPassword, 12);

            const resetUser = await db('users').where({ id: record.user_id }).select('school_id').first();

            await db.transaction(async (trx) => {
                await trx('users').where({ id: record.user_id }).update({ password_hash });
                await trx('password_reset_tokens').where({ id: record.id }).update({ used_at: new Date() });
                // Invalidate all active sessions (clear refresh token)
                await trx('users').where({ id: record.user_id }).update({ refresh_token_hash: null });
            });

            await createAuditLog({
                user_id: record.user_id,
                school_id: resetUser?.school_id,
                action: 'password_reset',
                entity_type: 'user',
                entity_id: record.user_id,
                ip_address: getClientIp(req),
                description: 'Password reset via email link',
            });

            res.json({ message: 'Password reset successfully. You can now sign in.' });
        } catch (error) {
            logger.error('Reset password error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── SEND EMAIL VERIFICATION OTP ───
router.post(
    '/send-verification-otp',
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const user = await db('users').where({ id: req.user!.id }).first();
            if (!user) return res.status(404).json({ error: 'User not found' });
            if (user.email_verified) return res.status(400).json({ error: 'Email is already verified' });

            // Invalidate any existing unused OTPs for this user
            await db('email_otp_tokens')
                .where({ user_id: user.id })
                .whereNull('used_at')
                .delete();

            // Generate 6-digit OTP and store its hash
            const otp = String(crypto.randomInt(100000, 1000000));
            const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            await db('email_otp_tokens').insert({
                user_id: user.id,
                otp_hash: otpHash,
                expires_at: expiresAt,
            });

            const school = await db('schools').where({ id: user.school_id }).first();
            const emailSent = await sendEmail(
                user.email,
                'Verify your EduCare ERP email',
                otpEmailHtml(user.name, otp, school?.name || 'your school')
            );

            // In development, print OTP to console as fallback when email cannot be delivered
            if (!emailSent && process.env.NODE_ENV !== 'production') {
                logger.info(`[DEV] Email OTP for ${user.email} → ${otp}`);
            }

            res.json({ message: 'Verification code sent to your email.' });
        } catch (error) {
            logger.error('Send OTP error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── VERIFY EMAIL OTP ───
router.post(
    '/verify-email',
    authenticate,
    validate([
        body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit number'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const user = await db('users').where({ id: req.user!.id }).first();
            if (!user) return res.status(404).json({ error: 'User not found' });
            if (user.email_verified) return res.status(400).json({ error: 'Email is already verified' });

            const otpHash = crypto.createHash('sha256').update(req.body.otp).digest('hex');

            const record = await db('email_otp_tokens')
                .where({ user_id: user.id, otp_hash: otpHash })
                .whereNull('used_at')
                .first();

            if (!record) {
                return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
            }

            if (new Date(record.expires_at) < new Date()) {
                return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
            }

            await db.transaction(async (trx) => {
                await trx('users').where({ id: user.id }).update({ email_verified: true });
                await trx('email_otp_tokens').where({ id: record.id }).update({ used_at: new Date() });
            });

            await createAuditLog({
                user_id: user.id,
                action: 'email_verified',
                entity_type: 'user',
                entity_id: user.id,
                ip_address: getClientIp(req),
                description: `Email verified for ${user.email}`,
            });

            res.json({ message: 'Email verified successfully.' });
        } catch (error) {
            logger.error('Verify email error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─── WEBSITE INTEGRATION TOKEN ───

// GET /api/auth/school/website-token — returns the school's current website token
router.get(
    '/school/website-token',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin'),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user!.school_id;
            const school = await db('schools')
                .where('id', schoolId)
                .select('id', 'name', 'website_token')
                .first();
            if (!school) return res.status(404).json({ error: 'School not found' });

            // Auto-generate if token was never set (e.g. pre-migration school)
            if (!school.website_token) {
                const token = crypto.randomUUID();
                await db('schools').where('id', schoolId).update({ website_token: token });
                school.website_token = token;
            }

            res.json({ website_token: school.website_token, school_name: school.name });
        } catch (error) {
            logger.error('Get website token error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// POST /api/auth/school/website-token/regenerate — rotates the token
router.post(
    '/school/website-token/regenerate',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner'),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user!.school_id;
            const newToken = crypto.randomUUID();
            await db('schools').where('id', schoolId).update({ website_token: newToken });
            await createAuditLog({
                school_id: schoolId,
                user_id: req.user!.id,
                action: 'REGENERATE_WEBSITE_TOKEN',
                entity_type: 'schools',
                entity_id: schoolId,
                ip_address: getClientIp(req),
            });
            res.json({ website_token: newToken, message: 'Token regenerated successfully' });
        } catch (error) {
            logger.error('Regenerate website token error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
