import { Router, Response } from 'express';
import { body } from 'express-validator';
import db from '../config/database';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import { createAuditLog, getClientIp } from '../utils/auditLog';
import { generateReceiptNo, calculateLateFee, getPaginationParams } from '../utils/helpers';
import { sendFeeDueReminder } from '../utils/sms';
import { config } from '../config';
import logger from '../config/logger';

const router = Router();

// POST /api/fees/structure — Create fee structure
router.post(
    '/structure',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin'),
    validate([
        body('class_id').isInt(),
        body('total_amount').isFloat({ min: 0 }),
        body('installments_count').isInt({ min: 1, max: 12 }),
        body('installment_dates').isArray().custom((value, { req }) => {
            if (!Array.isArray(value) || value.length !== Number(req.body.installments_count)) {
                throw new Error(`installment_dates must contain exactly ${req.body.installments_count} entries`);
            }
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (!value.every((d: unknown) => typeof d === 'string' && datePattern.test(d))) {
                throw new Error('All installment_dates must be in YYYY-MM-DD format');
            }
            return true;
        }),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            const { class_id, total_amount, installments_count, installment_dates, description } = req.body;

            const dateSet = new Set(installment_dates);
            if (dateSet.size !== installment_dates.length) {
                return res.status(400).json({ error: 'Installment dates must be unique' });
            }

            const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
            if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

            const schoolClass = await db('classes').where({ id: class_id, school_id: schoolId }).first();
            if (!schoolClass) return res.status(400).json({ error: 'Invalid class for your school' });

            const { structure, installments } = await db.transaction(async (trx) => {
                const [createdStructure] = await trx('fee_structures').insert({
                    class_id,
                    academic_year_id: academicYear.id,
                    school_id: schoolId,
                    total_amount,
                    installments_count,
                    description,
                }).returning('*');

                const installmentAmount = Math.round((total_amount / installments_count) * 100) / 100;
                const createdInstallments = installment_dates.map((date: string, i: number) => ({
                    fee_structure_id: createdStructure.id,
                    school_id: schoolId,
                    installment_no: i + 1,
                    amount: i === installments_count - 1
                        ? total_amount - (installmentAmount * (installments_count - 1))
                        : installmentAmount,
                    due_date: date,
                }));

                await trx('fee_installments').insert(createdInstallments);
                return { structure: createdStructure, installments: createdInstallments };
            });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'create',
                entity_type: 'fee_structure',
                entity_id: structure.id,
                new_value: { class_id, total_amount },
                ip_address: getClientIp(req),
            });

            res.status(201).json({ ...structure, installments });
        } catch (error: any) {
            if (error.code === '23505') return res.status(409).json({ error: 'Fee structure already exists for this class/year' });
            logger.error('Create fee structure error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/fees/structure/:classId — Get fee structure
router.get('/structure/:classId', authenticate, validate([paramId('classId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const schoolClass = await db('classes').where({ id: req.params.classId, school_id: schoolId }).first();
        if (!schoolClass) return res.status(404).json({ error: 'Class not found' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year' });
        const structure = await db('fee_structures')
            .where({ class_id: req.params.classId, academic_year_id: academicYear.id })
            .whereNull('deleted_at')
            .first();

        if (!structure) return res.status(404).json({ error: 'Fee structure not found' });

        const installments = await db('fee_installments')
            .where({ fee_structure_id: structure.id })
            .whereNull('deleted_at')
            .orderBy('installment_no');

        res.json({ ...structure, installments });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/fees/pay/cash — Record cash payment
router.post(
    '/pay/cash',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin'),
    validate([
        body('student_id').isInt(),
        body('installment_id').isInt(),
        body('amount_paid').isFloat({ min: 0 }),
        body('payment_mode').optional().isIn(['cash', 'cheque', 'bank', 'dd']),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            const { student_id, installment_id, amount_paid, notes, payment_mode } = req.body;

            const student = await db('students').where({ id: student_id, school_id: schoolId }).whereNull('deleted_at').first();
            if (!student) return res.status(404).json({ error: 'Student not found' });

            const installment = await db('fee_installments as fi')
                .join('fee_structures as fs', 'fi.fee_structure_id', 'fs.id')
                .join('classes as c', 'fs.class_id', 'c.id')
                .where({ 'fi.id': installment_id, 'c.school_id': schoolId, 'fs.class_id': student.current_class_id })
                .select('fi.*')
                .first();
            if (!installment) return res.status(404).json({ error: 'Installment not found' });

            const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
            if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

            // Calculate late fee
            const lateFee = calculateLateFee(
                new Date(installment.due_date),
                new Date(),
                config.lateFee.perDay,
                config.lateFee.max
            );

            const receiptNo = await generateReceiptNo();

            const payment = await db.transaction(async (trx) => {
                // Duplicate check inside transaction to prevent race conditions
                const existingPayment = await trx('fee_payments')
                    .where({ student_id, installment_id })
                    .first();
                if (existingPayment) {
                    throw new Error('PAYMENT_EXISTS');
                }

                const [created] = await trx('fee_payments').insert({
                    student_id,
                    installment_id,
                    academic_year_id: academicYear.id,
                    school_id: schoolId,
                    amount_paid,
                    late_fee: lateFee,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_mode: payment_mode || 'cash',
                    receipt_no: receiptNo,
                    notes,
                }).returning('*');
                return created;
            });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'fee_payment',
                entity_type: 'fee_payment',
                entity_id: payment.id,
                new_value: { student_id, amount_paid, late_fee: lateFee, mode: 'cash', receipt_no: receiptNo },
                ip_address: getClientIp(req),
            });

            res.status(201).json(payment);
        } catch (error: any) {
            if (error.message === 'PAYMENT_EXISTS') {
                return res.status(409).json({ error: 'Payment already recorded for this installment' });
            }
            logger.error('Cash payment error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// POST /api/fees/pay/initiate — Initiate Razorpay payment
router.post(
    '/pay/initiate',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'parent'),
    validate([
        body('student_id').isInt(),
        body('installment_id').isInt(),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            const { student_id, installment_id } = req.body;

            if (!config.razorpay.keyId || !config.razorpay.keySecret) {
                return res.status(503).json({ error: 'Online payments are not configured' });
            }

            const student = await db('students').where({ id: student_id, school_id: schoolId }).first();
            if (!student) return res.status(404).json({ error: 'Student not found' });

            const installment = await db('fee_installments as fi')
                .join('fee_structures as fs', 'fi.fee_structure_id', 'fs.id')
                .join('classes as c', 'fs.class_id', 'c.id')
                .where({ 'fi.id': installment_id, 'c.school_id': schoolId, 'fs.class_id': student.current_class_id })
                .select('fi.*')
                .first();
            if (!installment) return res.status(404).json({ error: 'Installment not found' });

            const lateFee = calculateLateFee(
                new Date(installment.due_date),
                new Date(),
                config.lateFee.perDay,
                config.lateFee.max
            );

            const totalAmount = parseFloat(installment.amount) + lateFee;

            // Create Razorpay order
            const Razorpay = require('razorpay');
            const razorpay = new Razorpay({
                key_id: config.razorpay.keyId,
                key_secret: config.razorpay.keySecret,
            });

            const order = await razorpay.orders.create({
                amount: Math.round(totalAmount * 100), // Amount in paise
                currency: 'INR',
                receipt: await generateReceiptNo(),
                notes: {
                    student_id: student_id.toString(),
                    installment_id: installment_id.toString(),
                    student_name: student.name,
                },
            });

            res.json({
                order_id: order.id,
                amount: totalAmount,
                currency: 'INR',
                key: config.razorpay.keyId,
                student_name: student.name,
                late_fee: lateFee,
            });
        } catch (error) {
            logger.error('Razorpay initiate error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// POST /api/fees/pay/verify — Verify Razorpay payment
router.post(
    '/pay/verify',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'parent'),
    validate([
        body('razorpay_order_id').notEmpty(),
        body('razorpay_payment_id').notEmpty(),
        body('razorpay_signature').notEmpty(),
        body('student_id').isInt(),
        body('installment_id').isInt(),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, student_id, installment_id } = req.body;

            // Verify signature
            const crypto = require('crypto');
            const generated = crypto
                .createHmac('sha256', config.razorpay.keySecret)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (generated !== razorpay_signature) {
                return res.status(400).json({ error: 'Payment verification failed' });
            }

            const student = await db('students').where({ id: student_id, school_id: schoolId }).whereNull('deleted_at').first();
            if (!student) return res.status(404).json({ error: 'Student not found' });

            const installment = await db('fee_installments as fi')
                .join('fee_structures as fs', 'fi.fee_structure_id', 'fs.id')
                .join('classes as c', 'fs.class_id', 'c.id')
                .where({ 'fi.id': installment_id, 'c.school_id': schoolId, 'fs.class_id': student.current_class_id })
                .select('fi.*')
                .first();
            if (!installment) return res.status(404).json({ error: 'Installment not found' });

            const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
            if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

            const lateFee = calculateLateFee(
                new Date(installment.due_date),
                new Date(),
                config.lateFee.perDay,
                config.lateFee.max
            );

            const receiptNo = await generateReceiptNo();

            const payment = await db.transaction(async (trx) => {
                const existingPayment = await trx('fee_payments')
                    .where({ student_id, installment_id })
                    .first();
                if (existingPayment) {
                    throw new Error('PAYMENT_EXISTS');
                }

                const [created] = await trx('fee_payments').insert({
                    student_id,
                    installment_id,
                    academic_year_id: academicYear.id,
                    school_id: schoolId,
                    amount_paid: parseFloat(installment.amount) + lateFee,
                    late_fee: lateFee,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_mode: 'online',
                    razorpay_payment_id,
                    razorpay_order_id,
                    receipt_no: receiptNo,
                }).returning('*');
                return created;
            });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'fee_payment',
                entity_type: 'fee_payment',
                entity_id: payment.id,
                new_value: { student_id, amount_paid: installment.amount, late_fee: lateFee, mode: 'online', razorpay_id: razorpay_payment_id },
                ip_address: getClientIp(req),
            });

            res.json({ message: 'Payment verified', payment });
        } catch (error: any) {
            if (error.message === 'PAYMENT_EXISTS') {
                return res.status(409).json({ error: 'Payment already recorded for this installment' });
            }
            logger.error('Payment verify error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/fees/student/:studentId — Student fee status
router.get('/student/:studentId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'parent'), validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const student = await db('students')
            .leftJoin('classes', 'students.current_class_id', 'classes.id')
            .where('students.id', req.params.studentId)
            .andWhere('students.school_id', schoolId)
            .select('students.*', 'classes.name as class_name')
            .first();

        if (!student) return res.status(404).json({ error: 'Student not found' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

        const feeStructure = await db('fee_structures')
            .where({ class_id: student.current_class_id, academic_year_id: academicYear.id })
            .whereNull('deleted_at')
            .first();

        if (!feeStructure) return res.json({ student_name: student.name, message: 'No fee structure found' });

        const installments = await db('fee_installments')
            .where({ fee_structure_id: feeStructure.id })
            .orderBy('installment_no');

        const payments = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where({ 'fee_payments.student_id': student.id, 'fee_payments.academic_year_id': academicYear.id })
            .andWhere('students.school_id', schoolId)
            .select('fee_payments.*');

        const paymentMap = new Map(payments.map((p: any) => [p.installment_id, p]));

        const installmentStatus = installments.map((inst: any) => {
            const payment = paymentMap.get(inst.id);
            const isOverdue = !payment && new Date(inst.due_date) < new Date();
            return {
                ...inst,
                paid: !!payment,
                payment: payment || null,
                is_overdue: isOverdue,
                late_fee_estimate: isOverdue
                    ? calculateLateFee(new Date(inst.due_date), new Date(), config.lateFee.perDay, config.lateFee.max)
                    : 0,
            };
        });

        const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount_paid), 0);
        const totalDue = parseFloat(feeStructure.total_amount) - totalPaid;

        res.json({
            student_id: student.id,
            student_name: student.name,
            class_name: student.class_name,
            total_fee: parseFloat(feeStructure.total_amount),
            total_paid: totalPaid,
            total_due: totalDue > 0 ? totalDue : 0,
            installments: installmentStatus,
        });
    } catch (error) {
        logger.error('Student fee status error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/fees/receipt/:paymentId — Download receipt
router.get('/receipt/:paymentId', authenticate, validate([paramId('paymentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const payment = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .join('fee_installments', 'fee_payments.installment_id', 'fee_installments.id')
            .join('fee_structures', 'fee_installments.fee_structure_id', 'fee_structures.id')
            .join('classes', 'fee_structures.class_id', 'classes.id')
            .where('fee_payments.id', req.params.paymentId)
            .andWhere('students.school_id', schoolId)
            .select(
                'fee_payments.*',
                'students.name as student_name',
                'students.admission_no',
                'students.father_name',
                'classes.name as class_name'
            )
            .first();

        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        res.json(payment); // Frontend will render as receipt
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/fees/dues — All pending dues
router.get('/dues', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'hr_manager', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year' });
        const { limit, offset, page } = getPaginationParams(req.query);

        const baseQuery = db('students as s')
            .join('classes as c', 's.current_class_id', 'c.id')
            .join('fee_structures as fs', function () {
                this.on('fs.class_id', '=', 's.current_class_id')
                    .andOnVal('fs.academic_year_id', '=', academicYear.id);
            })
            .leftJoin(
                db('fee_payments as fp')
                    .select('fp.student_id')
                    .sum('fp.amount_paid as total_paid')
                    .where('fp.academic_year_id', academicYear.id)
                    .groupBy('fp.student_id')
                    .as('pay'),
                'pay.student_id',
                's.id'
            )
            .where('s.status', 'active')
            .andWhere('s.school_id', schoolId)
            .whereNull('s.deleted_at')
            .whereNull('fs.deleted_at')
            .whereRaw('COALESCE(pay.total_paid, 0) < fs.total_amount');

        const [{ count }] = await baseQuery.clone().clearSelect().clearOrder().count('* as count');

        const data = await baseQuery
            .select(
                's.id',
                's.name',
                's.admission_no',
                's.father_phone',
                'c.name as class_name',
                db.raw('fs.total_amount::numeric as total_amount'),
                db.raw('COALESCE(pay.total_paid, 0)::numeric as total_paid'),
                db.raw('(fs.total_amount - COALESCE(pay.total_paid, 0))::numeric as due_amount')
            )
            .orderBy('due_amount', 'desc')
            .limit(limit)
            .offset(offset);

        res.json({ data, pagination: { page, limit, total: parseInt(count as string, 10) } });
    } catch (error) {
        logger.error('Fee dues error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/fees/collection-summary — Fee collection summary
router.get('/collection-summary', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'hr_manager', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

        const totalStudents = await db('students')
            .where({ status: 'active', academic_year_id: academicYear.id, school_id: schoolId })
            .whereNull('deleted_at')
            .count('id as count').first();

        const totalCollection = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where({ 'fee_payments.academic_year_id': academicYear.id })
            .andWhere('students.school_id', schoolId)
            .sum('amount_paid as total').first();

        const todayCollection = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where({ 'fee_payments.academic_year_id': academicYear.id, 'fee_payments.payment_date': new Date().toISOString().split('T')[0] })
            .andWhere('students.school_id', schoolId)
            .sum('amount_paid as total').first();

        const onlineCollection = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where({ 'fee_payments.academic_year_id': academicYear.id, 'fee_payments.payment_mode': 'online' })
            .andWhere('students.school_id', schoolId)
            .sum('amount_paid as total').first();

        const cashCollection = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where({ 'fee_payments.academic_year_id': academicYear.id, 'fee_payments.payment_mode': 'cash' })
            .andWhere('students.school_id', schoolId)
            .sum('amount_paid as total').first();

        const totalExpectedRes = await db('fee_structures')
            .join('students', function () {
                this.on('fee_structures.class_id', '=', 'students.current_class_id')
                    .andOn('fee_structures.academic_year_id', '=', 'students.academic_year_id');
            })
            .where({ 'students.status': 'active', 'students.academic_year_id': academicYear.id, 'students.school_id': schoolId })
            .whereNull('students.deleted_at')
            .whereNull('fee_structures.deleted_at')
            .sum('fee_structures.total_amount as total').first();

        const recentPayments = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where({ 'fee_payments.academic_year_id': academicYear.id })
            .andWhere('students.school_id', schoolId)
            .select('fee_payments.*', 'students.name as student_name')
            .orderBy('fee_payments.created_at', 'desc')
            .limit(5);

        const totalExpected = parseFloat((totalExpectedRes as any)?.total || '0');
        const totalCollectedNum = parseFloat((totalCollection as any)?.total || '0');

        res.json({
            academic_year: academicYear?.year,
            total_students: parseInt((totalStudents as any)?.count || '0'),
            total_collected: totalCollectedNum,
            today_collected: parseFloat((todayCollection as any)?.total || '0'),
            online_collected: parseFloat((onlineCollection as any)?.total || '0'),
            cash_collected: parseFloat((cashCollection as any)?.total || '0'),
            total_expected: totalExpected,
            pending_amount: totalExpected - totalCollectedNum,
            recent_payments: recentPayments,
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/fees/send-reminder — Send fee due reminders
router.post('/send-reminder', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const { student_ids } = req.body; // Optional: specific students

        if (student_ids && (!Array.isArray(student_ids) || student_ids.length > 500)) {
            return res.status(400).json({ error: 'student_ids must be an array with max 500 entries' });
        }

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

        let studentsQuery = db('students')
            .join('fee_structures', function () {
                this.on('fee_structures.class_id', '=', 'students.current_class_id')
                    .andOnVal('fee_structures.academic_year_id', '=', academicYear.id);
            })
            .where('students.status', 'active')
            .andWhere('students.school_id', schoolId)
            .whereNull('students.deleted_at');

        if (student_ids?.length) {
            studentsQuery = studentsQuery.whereIn('students.id', student_ids);
        }

        const students = await studentsQuery.select('students.*');
        let sentCount = 0;

        for (const student of students) {
            const payments = await db('fee_payments').where({ student_id: student.id, academic_year_id: academicYear.id });
            const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount_paid), 0);

            const feeStructure = await db('fee_structures')
                .where({ class_id: student.current_class_id, academic_year_id: academicYear.id })
                .whereNull('deleted_at').first();

            if (feeStructure) {
                const due = parseFloat(feeStructure.total_amount) - totalPaid;
                if (due > 0 && student.father_phone) {
                    const nextInstallment = await db('fee_installments')
                        .where({ fee_structure_id: feeStructure.id })
                        .whereNotIn('id', payments.map((p: any) => p.installment_id))
                        .orderBy('installment_no')
                        .first();

                    if (nextInstallment) {
                        await sendFeeDueReminder(student.name, student.father_phone, due, nextInstallment.due_date);
                        sentCount++;
                    }
                }
            }
        }

        res.json({ message: `Fee reminders sent to ${sentCount} parents` });
    } catch (error) {
        logger.error('Send reminder error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/fees/settings — Get global fee settings
router.get('/settings', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year' });
        const settings = await db('fee_settings')
            .where({ academic_year_id: academicYear.id, school_id: schoolId })
            .first();

        if (!settings) {
            // Return defaults if not set
            return res.json({
                late_fine_enabled: false,
                fine_type: 'fixed',
                fine_amount: 0,
                grace_period_days: 7,
                receipt_prefix: 'REC/',
                rounding: 'none',
                allow_partial_payment: true
            });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/fees/settings — Update global fee settings
router.post(
    '/settings',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin'),
    validate([
        body('late_fine_enabled').isBoolean(),
        body('fine_amount').isFloat({ min: 0 }),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
            if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

            const existing = await db('fee_settings')
                .where({ academic_year_id: academicYear.id, school_id: schoolId })
                .first();

            const data = {
                ...req.body,
                school_id: schoolId,
                academic_year_id: academicYear.id,
                updated_at: new Date()
            };

            if (existing) {
                await db('fee_settings').where({ id: existing.id }).update(data);
            } else {
                await db('fee_settings').insert(data);
            }

            await createAuditLog({
                user_id: req.user!.id,
                action: 'update_fee_settings',
                entity_type: 'fee_settings',
                entity_id: existing?.id || 0,
                new_value: data,
                ip_address: getClientIp(req),
            });

            res.json({ message: 'Settings updated successfully' });
        } catch (error) {
            logger.error('Update fee settings error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
