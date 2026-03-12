import { Router, Response } from 'express';
import db from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();
router.use(authenticate);

// ─── GET /api/payment-instruments ───
router.get('/', authorize('owner', 'co-owner', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { status, instrument_type, from_date, to_date, page = 1, limit = 50 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let query = db('fee_payments as fp')
            .join('students as s', 's.id', 'fp.student_id')
            .select(
                'fp.id', 'fp.amount_paid', 'fp.payment_date',
                'fp.instrument_type', 'fp.instrument_number', 'fp.bank_name',
                'fp.instrument_status', 'fp.bounce_penalty', 'fp.receipt_number',
                's.name as student_name', 's.admission_no'
            )
            .where('s.school_id', schoolId)
            .whereNotNull('fp.instrument_type')
            .orderBy('fp.payment_date', 'desc')
            .limit(Number(limit))
            .offset(offset);

        if (status) query = query.where('fp.instrument_status', status);
        if (instrument_type) query = query.where('fp.instrument_type', instrument_type);
        if (from_date) query = query.where('fp.payment_date', '>=', from_date as string);
        if (to_date) query = query.where('fp.payment_date', '<=', to_date as string);

        const payments = await query;
        res.json({ success: true, data: payments });
    } catch (err: any) {
        logger.error('Fetch payment instruments error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── PUT /api/payment-instruments/:paymentId/instrument ───
router.put('/:paymentId/instrument', authorize('owner', 'co-owner', 'accountant'), validate([paramId('paymentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { paymentId } = req.params;
        const { instrument_type, instrument_number, bank_name, instrument_status } = req.body;

        // Verify payment belongs to this school via student
        const payment = await db('fee_payments as fp')
            .join('students as s', 's.id', 'fp.student_id')
            .where('fp.id', paymentId)
            .andWhere('s.school_id', schoolId)
            .select('fp.*')
            .first();
        if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

        await db('fee_payments').where({ id: paymentId }).update({
            instrument_type,
            instrument_number,
            bank_name,
            instrument_status: instrument_status || 'pending',
            updated_at: new Date(),
        });

        res.json({ success: true, message: 'Instrument details updated' });
    } catch (err: any) {
        logger.error('Update instrument error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── PUT /api/payment-instruments/:paymentId/clearance ───
router.put('/:paymentId/clearance', authorize('owner', 'co-owner', 'accountant'), validate([paramId('paymentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { paymentId } = req.params;
        const { status, bounce_penalty, remarks, clearance_date } = req.body;

        if (!['cleared', 'bounced', 'returned'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status. Use: cleared, bounced, returned' });
        }

        // Verify payment belongs to this school via student
        const payment = await db('fee_payments as fp')
            .join('students as s', 's.id', 'fp.student_id')
            .where('fp.id', paymentId)
            .andWhere('s.school_id', schoolId)
            .select('fp.*')
            .first();
        if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

        const updateData: any = {
            instrument_status: status,
            clearance_date: clearance_date || new Date(),
            updated_at: new Date(),
        };

        if (status === 'bounced' && bounce_penalty) {
            updateData.bounce_penalty = bounce_penalty;
        }

        await db.transaction(async (trx) => {
            await trx('fee_payments').where({ id: paymentId }).update(updateData);

            // If bounced/returned, create a negative adjustment entry for tracking
            if (status === 'bounced' || status === 'returned') {
                await trx('fee_payments').insert({
                    student_id: payment.student_id,
                    installment_id: payment.installment_id,
                    academic_year_id: payment.academic_year_id,
                    amount_paid: -(parseFloat(payment.amount_paid)),
                    payment_date: clearance_date || new Date(),
                    payment_mode: 'adjustment',
                    instrument_type: 'adjustment',
                    instrument_status: 'cleared',
                    notes: `${status === 'bounced' ? 'Cheque/DD bounced' : 'Instrument returned'} - ref: ${paymentId}${remarks ? '. ' + remarks : ''}`,
                    created_at: new Date(),
                    updated_at: new Date(),
                });
            }
        });

        res.json({ success: true, message: `Instrument marked as ${status}` });
    } catch (err: any) {
        logger.error('Clearance update error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── GET /api/payment-instruments/bounced ───
router.get('/bounced', authorize('owner', 'co-owner', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;

        const bounced = await db('fee_payments as fp')
            .join('students as s', 's.id', 'fp.student_id')
            .select(
                'fp.id', 'fp.amount_paid', 'fp.payment_date',
                'fp.instrument_type', 'fp.instrument_number', 'fp.bank_name',
                'fp.instrument_status', 'fp.bounce_penalty', 'fp.notes',
                's.name as student_name', 's.admission_no',
                db.raw("COALESCE(fp.amount_paid + COALESCE(fp.bounce_penalty, 0), fp.amount_paid) as total_recoverable")
            )
            .where('s.school_id', schoolId)
            .whereIn('fp.instrument_status', ['bounced', 'returned'])
            .orderBy('fp.payment_date', 'desc');

        res.json({ success: true, data: bounced });
    } catch (err: any) {
        logger.error('Fetch bounced instruments error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── GET /api/payment-instruments/receipt/:paymentId ───
router.get('/receipt/:paymentId', authorize('owner', 'co-owner', 'accountant', 'front_desk'), validate([paramId('paymentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { paymentId } = req.params;

        const payment = await db('fee_payments as fp')
            .join('students as s', 's.id', 'fp.student_id')
            .leftJoin('classes as c', 'c.id', 's.current_class_id')
            .leftJoin('sections as sec', 'sec.id', 's.current_section_id')
            .select(
                'fp.*',
                's.name as student_name', 's.admission_no', 's.father_phone',
                'c.name as class_name', 'sec.name as section_name'
            )
            .where('fp.id', paymentId)
            .andWhere('s.school_id', schoolId)
            .first();

        if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

        // Get school info (board_config / tax_config for PAN/GST)
        const taxConfig = await db('tax_config').where({ school_id: schoolId }).first();
        const boardConfig = await db('board_config').where({ school_id: schoolId }).first();

        // If no receipt_number, generate and assign one — inside a serialised
        // transaction with FOR UPDATE to prevent duplicate receipt numbers under
        // concurrent requests.
        let receiptNumber = payment.receipt_number;
        if (!receiptNumber) {
            receiptNumber = await db.transaction(async (trx) => {
                const seqRow = await trx('payment_receipt_sequence')
                    .where({ school_id: schoolId })
                    .forUpdate()
                    .first();

                let nextSeq: number;
                let prefix: string;
                if (seqRow) {
                    nextSeq = (seqRow.last_receipt_number || 0) + 1;
                    prefix = seqRow.prefix || 'RCP';
                    await trx('payment_receipt_sequence')
                        .where({ school_id: schoolId })
                        .update({ last_receipt_number: nextSeq, updated_at: new Date() });
                } else {
                    nextSeq = 1;
                    prefix = 'RCP';
                    await trx('payment_receipt_sequence').insert({
                        school_id: schoolId,
                        last_receipt_number: 1,
                        prefix: 'RCP',
                        created_at: new Date(),
                        updated_at: new Date(),
                    });
                }
                const generatedNumber = `${prefix}-${new Date().getFullYear()}-${String(nextSeq).padStart(5, '0')}`;
                await trx('fee_payments').where({ id: paymentId }).update({ receipt_number: generatedNumber });
                return generatedNumber;
            });
            payment.receipt_number = receiptNumber;
        }

        res.json({
            success: true,
            data: {
                receipt_number: receiptNumber,
                payment_date: payment.payment_date,
                student_name: payment.student_name,
                admission_no: payment.admission_no,
                class: `${payment.class_name || ''} ${payment.section_name || ''}`.trim(),
                father_phone: payment.father_phone,
                amount_paid: payment.amount_paid,
                instrument_type: payment.instrument_type,
                instrument_number: payment.instrument_number,
                bank_name: payment.bank_name,
                instrument_status: payment.instrument_status,
                school_pan: taxConfig?.pan_number,
                school_gstin: taxConfig?.gstin,
                board_type: boardConfig?.board_type,
            }
        });
    } catch (err: any) {
        logger.error('Fetch receipt error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── GET /api/payment-instruments/upi-qr/:studentId ───
router.get('/upi-qr/:studentId', authorize('owner', 'co-owner', 'accountant', 'front_desk'), validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { studentId } = req.params;

        const student = await db('students').where({ id: studentId, school_id: schoolId }).first();
        if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

        const qr = await db('upi_qr_codes')
            .where({ school_id: schoolId, student_id: studentId, is_active: true })
            .first();

        if (qr) {
            return res.json({ success: true, data: qr });
        }

        res.json({ success: true, data: null, student_name: student.name });
    } catch (err: any) {
        logger.error('Fetch UPI QR error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── POST /api/payment-instruments/upi-qr/:studentId ───
router.post('/upi-qr/:studentId', authorize('owner', 'co-owner', 'accountant'), validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { studentId } = req.params;
        const { upi_id, school_name } = req.body;

        if (!upi_id || !school_name) {
            return res.status(400).json({ success: false, error: 'upi_id and school_name are required' });
        }

        const student = await db('students').where({ id: studentId, school_id: schoolId }).first();
        if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

        // Deactivate old QR
        await db('upi_qr_codes').where({ school_id: schoolId, student_id: studentId }).update({ is_active: false, updated_at: new Date() });

        const upiDeeplink = `upi://pay?pa=${encodeURIComponent(upi_id)}&pn=${encodeURIComponent(school_name)}&tn=${encodeURIComponent(student.name + ' Fee')}&cu=INR`;

        const [qr] = await db('upi_qr_codes').insert({
            school_id: schoolId,
            student_id: studentId,
            upi_id,
            qr_data: upiDeeplink,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        }).returning('*');

        res.json({ success: true, data: qr, upi_deeplink: upiDeeplink });
    } catch (err: any) {
        logger.error('Create UPI QR error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── GET /api/payment-instruments/bank-statements ───
router.get('/bank-statements', authorize('owner', 'co-owner', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { reconciled, from_date, to_date } = req.query;

        let query = db('bank_statements').where({ school_id: schoolId }).orderBy('transaction_date', 'desc');

        if (reconciled !== undefined) query = query.where('reconciled', reconciled === 'true');
        if (from_date) query = query.where('transaction_date', '>=', from_date as string);
        if (to_date) query = query.where('transaction_date', '<=', to_date as string);

        const statements = await query;
        res.json({ success: true, data: statements });
    } catch (err: any) {
        logger.error('Fetch bank statements error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── POST /api/payment-instruments/bank-statements ───
router.post('/bank-statements', authorize('owner', 'co-owner', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { entries } = req.body;

        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ success: false, error: 'entries array is required' });
        }

        if (entries.length > 500) {
            return res.status(400).json({ success: false, error: 'Max 500 entries per import' });
        }

        const rows = entries.map((e: any) => ({
            school_id: schoolId,
            account_number: e.account_number || null,
            bank_name: e.bank_name || null,
            transaction_date: e.transaction_date,
            description: e.description || null,
            credit: e.credit || 0,
            debit: e.debit || 0,
            balance: e.balance || null,
            reference: e.reference || null,
            reconciled: false,
            created_at: new Date(),
            updated_at: new Date(),
        }));

        await db('bank_statements').insert(rows);
        res.json({ success: true, message: `${rows.length} entries imported` });
    } catch (err: any) {
        logger.error('Import bank statements error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── PUT /api/payment-instruments/bank-statements/:id/reconcile ───
router.put('/bank-statements/:id/reconcile', authorize('owner', 'co-owner', 'accountant'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { id } = req.params;
        const { fee_payment_id } = req.body;

        const entry = await db('bank_statements').where({ id, school_id: schoolId }).first();
        if (!entry) return res.status(404).json({ success: false, error: 'Bank statement entry not found' });

        if (fee_payment_id) {
            // Verify payment belongs to this school via student join
            const payment = await db('fee_payments as fp')
                .join('students as s', 's.id', 'fp.student_id')
                .where('fp.id', fee_payment_id)
                .andWhere('s.school_id', schoolId)
                .select('fp.id')
                .first();
            if (!payment) return res.status(404).json({ success: false, error: 'Fee payment not found' });
        }

        await db('bank_statements').where({ id }).update({
            reconciled: true,
            fee_payment_id: fee_payment_id || null,
            updated_at: new Date(),
        });

        res.json({ success: true, message: 'Entry reconciled' });
    } catch (err: any) {
        logger.error('Reconcile statement error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── GET /api/payment-instruments/bank-statements/unreconciled ───
router.get('/bank-statements/unreconciled', authorize('owner', 'co-owner', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;

        const entries = await db('bank_statements')
            .where({ school_id: schoolId, reconciled: false })
            .orderBy('transaction_date', 'desc');

        const total = entries.reduce((sum: number, e: any) => sum + Number(e.credit || 0), 0);

        res.json({ success: true, data: entries, total_unreconciled: total });
    } catch (err: any) {
        logger.error('Fetch unreconciled error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ─── GET /api/payment-instruments/collection-summary ───
router.get('/collection-summary', authorize('owner', 'co-owner', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { from_date, to_date } = req.query;

        let query = db('fee_payments as fp')
            .join('students as s', 's.id', 'fp.student_id')
            .where('s.school_id', schoolId)
            .where('fp.amount_paid', '>', 0);

        if (from_date) query = query.where('fp.payment_date', '>=', from_date as string);
        if (to_date) query = query.where('fp.payment_date', '<=', to_date as string);

        const summary = await query
            .select('fp.instrument_type')
            .sum('fp.amount_paid as total')
            .count('fp.id as count')
            .groupBy('fp.instrument_type');

        const bouncedSummary = await db('fee_payments as fp')
            .join('students as s', 's.id', 'fp.student_id')
            .where('s.school_id', schoolId)
            .whereIn('fp.instrument_status', ['bounced', 'returned'])
            .sum('fp.amount_paid as total_bounced')
            .sum('fp.bounce_penalty as total_penalty')
            .first();

        const grandTotal = summary.reduce((sum: number, row: any) => sum + Number(row.total || 0), 0);

        res.json({
            success: true,
            data: {
                by_instrument: summary,
                bounced: {
                    total_bounced: bouncedSummary?.total_bounced || 0,
                    total_penalty: bouncedSummary?.total_penalty || 0,
                },
                grand_total: grandTotal,
            }
        });
    } catch (err: any) {
        logger.error('Collection summary error', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
