import { Router, Response } from 'express';
import { body } from 'express-validator';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAuditLog, getClientIp } from '../utils/auditLog';
import { getPaginationParams } from '../utils/helpers';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();

// POST /api/staff — Add staff
router.post(
    '/',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin'),
    validate([
        body('name').notEmpty().trim(),
        body('designation').notEmpty(),
        body('salary').isFloat({ min: 0 }),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const data = req.body;

            // Generate temp password outside the transaction so it is accessible after commit
            let tempPassword: string | null = null;
            if (data.email) {
                tempPassword = randomBytes(8).toString('hex'); // 16-char hex random temp password
            }

            const staff = await db.transaction(async (trx) => {
                let userId = null;
                if (data.email) {
                    const passwordHash = await bcrypt.hash(tempPassword!, 12);
                    const [user] = await trx('users').insert({
                        email: data.email,
                        username: data.email,
                        password_hash: passwordHash,
                        name: data.name,
                        phone: data.phone,
                        role: data.is_teacher ? 'teacher' : 'staff',
                        school_id: req.user!.school_id,
                        is_active: true,
                    }).returning('*');
                    userId = user.id;
                }

                const [created] = await trx('staff').insert({
                    user_id: userId,
                    name: data.name,
                    employee_id: data.employee_id,
                    designation: data.designation,
                    department: data.department,
                    phone: data.phone,
                    email: data.email,
                    salary: data.salary,
                    join_date: data.join_date,
                    qualification: data.qualification,
                    status: 'active',
                    school_id: req.user!.school_id,
                }).returning('*');

                return created;
            });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'create',
                entity_type: 'staff',
                entity_id: staff.id,
                new_value: { name: data.name, designation: data.designation },
                ip_address: getClientIp(req),
            });

            // Return temp_password only when a user account was created so admin can share it
            const response: Record<string, unknown> = { ...staff };
            if (tempPassword) response.temp_password = tempPassword;
            res.status(201).json(response);
        } catch (error: any) {
            if (error.code === '23505') return res.status(409).json({ error: 'Duplicate employee ID or email' });
            logger.error('Create staff error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/staff — List staff
router.get('/', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { limit, offset, page } = getPaginationParams(req.query);
        const { department, status, search } = req.query as any;

        let query = db('staff').where({ school_id: req.user!.school_id }).whereNull('deleted_at');

        if (department) query = query.where({ department });
        if (status) query = query.where({ status });
        if (search) {
            query = query.where((qb) => {
                qb.whereILike('name', `%${search}%`)
                    .orWhereILike('employee_id', `%${search}%`);
            });
        }

        const countResult = await query.clone().clearSelect().clearOrder().count('id as total').first();
        const staff = await query.orderBy('name').limit(limit).offset(offset);

        res.json({
            data: staff,
            pagination: { page, limit, total: parseInt((countResult as any)?.total || '0') },
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/staff/:id — Update staff
router.put('/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const existing = await db('staff').where({ id: req.params.id, school_id: req.user!.school_id }).whereNull('deleted_at').first();
        if (!existing) return res.status(404).json({ error: 'Staff not found' });

        const [updated] = await db('staff')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ ...req.body, updated_at: new Date() })
            .returning('*');

        await createAuditLog({
            user_id: req.user!.id,
            action: 'update',
            entity_type: 'staff',
            entity_id: updated.id,
            old_value: { name: existing.name, salary: existing.salary },
            new_value: { name: updated.name, salary: updated.salary },
            ip_address: getClientIp(req),
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/staff/leave — Apply leave
router.post(
    '/leave',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'staff'),
    validate([
        body('leave_type').isIn(['casual', 'sick', 'earned', 'unpaid']),
        body('from_date').isDate(),
        body('to_date').isDate(),
        body('reason').notEmpty(),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            // Find staff linked to this user
            const staff = await db('staff').where({ user_id: req.user!.id, school_id: req.user!.school_id }).first();
            const staffId = req.body.staff_id || staff?.id;

            if (!staffId) return res.status(400).json({ error: 'Staff record not found' });

            const targetStaff = await db('staff').where({ id: staffId, school_id: req.user!.school_id }).first();
            if (!targetStaff) return res.status(403).json({ error: 'Invalid staff for your school' });

            const [leave] = await db('staff_leaves').insert({
                staff_id: staffId,
                leave_type: req.body.leave_type,
                from_date: req.body.from_date,
                to_date: req.body.to_date,
                reason: req.body.reason,
                status: 'pending',
                school_id: req.user!.school_id,
            }).returning('*');

            res.status(201).json(leave);
        } catch (error) {
            logger.error('Apply leave error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// PUT /api/staff/leave/:id — Approve/reject leave
router.put('/leave/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const { status, rejection_reason } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved or rejected' });
        }

        const leaveRecord = await db('staff_leaves')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .first();
        if (!leaveRecord) return res.status(404).json({ error: 'Leave not found' });
        if (leaveRecord.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending leaves can be updated' });
        }

        const updateData: Record<string, unknown> = {
            status,
            approved_by: req.user!.id,
            updated_at: new Date(),
        };
        if (status === 'rejected' && rejection_reason) {
            updateData.rejection_reason = rejection_reason;
        }

        const [leave] = await db('staff_leaves')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update(updateData)
            .returning('*');

        // On approval: deduct from leave_balances
        if (status === 'approved') {
            const d1 = new Date(leaveRecord.from_date);
            const d2 = new Date(leaveRecord.to_date);
            const days = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);

            // Find the matching leave_type row for this school
            const lt = await db('leave_types')
                .where({ school_id: req.user!.school_id })
                .whereRaw('LOWER(name) = ? OR LOWER(code) = ?', [
                    leaveRecord.leave_type.toLowerCase(),
                    leaveRecord.leave_type.toLowerCase(),
                ])
                .first();

            if (lt) {
                await db('leave_balances')
                    .where({ staff_id: leaveRecord.staff_id, leave_type_id: lt.id })
                    .update(db.raw(`
                        used = LEAST(used + ?, allocated),
                        remaining = GREATEST(remaining - ?, 0)
                    `, [days, days]));
            }
        }

        res.json(leave);
    } catch (error) {
        logger.error('Update leave error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/staff/leaves — List leaves
router.get('/leaves', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'staff'), async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.query as any;
        let query = db('staff_leaves')
            .join('staff', 'staff_leaves.staff_id', 'staff.id')
            .where('staff.school_id', req.user!.school_id)
            .select('staff_leaves.*', 'staff.name as staff_name', 'staff.designation');

        // If the user is just a teacher/staff, only show their own leaves
        if (req.user!.role === 'teacher' || req.user!.role === 'staff') {
            query = query.where('staff.user_id', req.user!.id);
        }

        if (status) query = query.where('staff_leaves.status', status);

        const leaves = await query.orderBy('staff_leaves.created_at', 'desc');
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/staff/my/leave-balances — Get current logged-in user's leave balances
router.get('/my/leave-balances', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'staff'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const staff = await db('staff').where({ user_id: req.user!.id, school_id: schoolId }).first();
        if (!staff) return res.status(404).json({ error: 'Staff profile not found' });

        const data = await db('leave_balances as lb')
            .leftJoin('leave_types as lt', 'lb.leave_type_id', 'lt.id')
            .select('lb.*', 'lt.name as leave_type_name', 'lt.code')
            .where('lb.staff_id', staff.id);
        res.json(data);
    } catch (error) {
        logger.error('List leave balances error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/staff/all-leave-balances — Admin: all staff leave balances
router.get('/all-leave-balances', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const rows = await db('staff as s')
            .leftJoin('leave_balances as lb', 's.id', 'lb.staff_id')
            .leftJoin('leave_types as lt', 'lb.leave_type_id', 'lt.id')
            .where({ 's.school_id': schoolId, 's.status': 'active' })
            .whereNull('s.deleted_at')
            .select(
                's.id as staff_id', 's.name as staff_name', 's.designation', 's.department',
                'lb.id as balance_id', 'lb.allocated', 'lb.used', 'lb.remaining',
                'lt.id as leave_type_id', 'lt.name as leave_type_name', 'lt.code'
            )
            .orderBy(['s.name', 'lt.name']);

        // Group by staff
        const staffMap = new Map<number, { staff_id: number; staff_name: string; designation: string; department: string; balances: object[] }>();
        for (const row of rows) {
            if (!staffMap.has(row.staff_id)) {
                staffMap.set(row.staff_id, { staff_id: row.staff_id, staff_name: row.staff_name, designation: row.designation, department: row.department, balances: [] });
            }
            if (row.balance_id) {
                staffMap.get(row.staff_id)!.balances.push({
                    leave_type_id: row.leave_type_id, leave_type_name: row.leave_type_name, code: row.code,
                    allocated: row.allocated, used: row.used, remaining: row.remaining,
                });
            }
        }
        res.json(Array.from(staffMap.values()));
    } catch (error) {
        logger.error('All leave balances error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/staff/salary/:staffId — Salary history
router.get('/salary/:staffId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), validate([paramId('staffId')]), async (req: AuthRequest, res: Response) => {
    try {
        const targetStaff = await db('staff').where({ id: req.params.staffId, school_id: req.user!.school_id }).first();
        if (!targetStaff) return res.status(404).json({ error: 'Staff not found' });

        const records = await db('staff_salary_records')
            .where({ staff_id: req.params.staffId, school_id: req.user!.school_id })
            .orderBy([{ column: 'year', order: 'desc' }, { column: 'month', order: 'desc' }]);

        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/staff/salary/process — Process monthly salary
router.post(
    '/salary/process',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin'),
    validate([
        body('month').isInt({ min: 1, max: 12 }),
        body('year').isInt({ min: 2000, max: 2099 }),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { month, year } = req.body;
            const academicYear = await db('academic_years').where({ is_current: true, school_id: req.user!.school_id }).first();

            const activeStaff = await db('staff').where({ status: 'active', school_id: req.user!.school_id }).whereNull('deleted_at');

            let processed = 0;
            for (const s of activeStaff) {
                // Check if already processed
                const existing = await db('staff_salary_records').where({ staff_id: s.id, month, year }).first();
                if (existing) continue;

                // Calculate deductions based on leaves
                const leaves = await db('staff_leaves')
                    .where({ staff_id: s.id, status: 'approved' })
                    .where('from_date', '>=', `${year}-${String(month).padStart(2, '0')}-01`)
                    .where('to_date', '<=', `${year}-${String(month).padStart(2, '0')}-31`);

                const unpaidLeaveDays = leaves
                    .filter((l: any) => l.leave_type === 'unpaid')
                    .reduce((sum: number, l: any) => {
                        const from = new Date(l.from_date);
                        const to = new Date(l.to_date);
                        return sum + Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    }, 0);

                const dailySalary = parseFloat(s.salary) / 30;
                const deductions = Math.round(unpaidLeaveDays * dailySalary);
                const netPay = parseFloat(s.salary) - deductions;

                await db('staff_salary_records').insert({
                    staff_id: s.id,
                    month,
                    year,
                    academic_year_id: academicYear?.id || -1,
                    basic: s.salary,
                    deductions,
                    net_pay: netPay,
                    status: 'pending',
                    school_id: req.user!.school_id,
                });

                processed++;
            }

            await createAuditLog({
                user_id: req.user!.id,
                action: 'salary_process',
                entity_type: 'staff_salary_records',
                new_value: { month, year, processed },
                ip_address: getClientIp(req),
            });

            res.json({ message: `Salary processed for ${processed} staff members` });
        } catch (error) {
            logger.error('Process salary error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
