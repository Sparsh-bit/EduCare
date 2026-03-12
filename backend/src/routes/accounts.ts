import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();

// ─── INCOME ───

// GET /accounts/income
router.get('/income', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const { category, payment_mode, from_date, to_date, page = '1', limit = '25' } = req.query as any;
        let q = db('income_entries').where('school_id', req.user!.school_id).orderBy('date', 'desc');
        if (category) q = q.where('category', category);
        if (payment_mode) q = q.where('payment_mode', payment_mode);
        if (from_date) q = q.where('date', '>=', from_date);
        if (to_date) q = q.where('date', '<=', to_date);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [{ count }] = await q.clone().clearSelect().clearOrder().count('* as count');
        const [{ total }] = await q.clone().clearSelect().clearOrder().sum('amount as total');
        const data = await q.offset(offset).limit(parseInt(limit));

        res.json({
            data,
            summary: { total_amount: parseFloat(total as string || '0') },
            pagination: { total: parseInt(count as string), page: parseInt(page), limit: parseInt(limit) },
        });
    } catch (err: any) {
        logger.error('Fetch income error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /accounts/income
router.post('/income', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), validate([
    body('date').isDate(),
    body('category').notEmpty().trim(),
    body('amount').isFloat({ min: 0.01 }),
    body('payment_mode').notEmpty().trim(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const [entry] = await db('income_entries').insert({
            ...req.body,
            created_by: req.user!.id,
            school_id: req.user!.school_id,
        }).returning('*');

        await db('notices').insert({
            title: 'Accounts: New Income Recorded',
            content: `${req.user!.name} recorded an income of ₹${entry.amount} (Category: ${entry.category}).`,
            target_audience: 'staff',
            created_by: req.user!.id,
            school_id: req.user!.school_id,
        });

        res.status(201).json({ message: 'Income recorded', data: entry });
    } catch (err: any) {
        logger.error('Create income error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /accounts/income/:id
router.put('/income/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), validate([
    paramId('id'),
    body('date').optional().isDate(),
    body('category').optional().notEmpty().trim(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('payment_mode').optional().notEmpty().trim(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const [updated] = await db('income_entries')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ ...req.body, updated_at: db.fn.now() })
            .returning('*');
        if (!updated) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Income updated', data: updated });
    } catch (err: any) {
        logger.error('Update income error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /accounts/income/:id
router.delete('/income/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        await db('income_entries').where({ id: req.params.id, school_id: req.user!.school_id }).delete();
        res.json({ message: 'Income entry deleted' });
    } catch (err: any) {
        logger.error('Delete income error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── EXPENSES ───

// GET /accounts/expenses
router.get('/expenses', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const { category, payment_mode, from_date, to_date, page = '1', limit = '25' } = req.query as any;
        let q = db('expense_entries').where('school_id', req.user!.school_id).orderBy('date', 'desc');
        if (category) q = q.where('category', category);
        if (payment_mode) q = q.where('payment_mode', payment_mode);
        if (from_date) q = q.where('date', '>=', from_date);
        if (to_date) q = q.where('date', '<=', to_date);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [{ count }] = await q.clone().clearSelect().clearOrder().count('* as count');
        const [{ total }] = await q.clone().clearSelect().clearOrder().sum('amount as total');
        const data = await q.offset(offset).limit(parseInt(limit));

        res.json({
            data,
            summary: { total_amount: parseFloat(total as string || '0') },
            pagination: { total: parseInt(count as string), page: parseInt(page), limit: parseInt(limit) },
        });
    } catch (err: any) {
        logger.error('Fetch expenses error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /accounts/expenses
router.post('/expenses', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), validate([
    body('date').isDate(),
    body('category').notEmpty().trim(),
    body('amount').isFloat({ min: 0.01 }),
    body('paid_to').notEmpty(),
    body('payment_mode').notEmpty().trim(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const [entry] = await db('expense_entries').insert({
            ...req.body,
            created_by: req.user!.id,
            school_id: req.user!.school_id,
        }).returning('*');

        await db('notices').insert({
            title: 'Accounts: New Expense Recorded',
            content: `${req.user!.name} recorded an expense of ₹${entry.amount} paid to ${entry.paid_to} (Category: ${entry.category}).`,
            target_audience: 'staff',
            created_by: req.user!.id,
            school_id: req.user!.school_id,
        });

        res.status(201).json({ message: 'Expense recorded', data: entry });
    } catch (err: any) {
        logger.error('Create expense error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /accounts/expenses/:id
router.put('/expenses/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), validate([
    paramId('id'),
    body('date').optional().isDate(),
    body('category').optional().notEmpty().trim(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('payment_mode').optional().notEmpty().trim(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const [updated] = await db('expense_entries')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ ...req.body, updated_at: db.fn.now() })
            .returning('*');
        if (!updated) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Expense updated', data: updated });
    } catch (err: any) {
        logger.error('Update expense error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /accounts/expenses/:id
router.delete('/expenses/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        await db('expense_entries').where({ id: req.params.id, school_id: req.user!.school_id }).delete();
        res.json({ message: 'Expense deleted' });
    } catch (err: any) {
        logger.error('Delete expense error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── VENDORS ───

// GET /accounts/vendors
router.get('/vendors', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const vendors = await db('vendors as v')
            .where('v.school_id', req.user!.school_id)
            .select('v.*')
            .select(db.raw('COALESCE((SELECT SUM(total_amount) FROM vendor_bills WHERE vendor_id = v.id), 0) as total_billed'))
            .select(db.raw('COALESCE((SELECT SUM(amount_paid) FROM vendor_bills WHERE vendor_id = v.id), 0) as total_paid'))
            .select(db.raw('COALESCE((SELECT SUM(balance_due) FROM vendor_bills WHERE vendor_id = v.id), 0) as total_outstanding'))
            .orderBy('v.name');
        res.json(vendors);
    } catch (err: any) {
        logger.error('Fetch vendors error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /accounts/vendors
router.post('/vendors', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), validate([
    body('name').notEmpty(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const [vendor] = await db('vendors').insert({ ...req.body, school_id: req.user!.school_id }).returning('*');
        res.status(201).json({ message: 'Vendor added', data: vendor });
    } catch (err: any) {
        logger.error('Create vendor error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── VENDOR BILLS ───

// GET /accounts/vendor-bills
router.get('/vendor-bills', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const { status, vendor_id, page = '1', limit = '25' } = req.query as any;
        let q = db('vendor_bills as vb')
            .leftJoin('vendors as v', 'vb.vendor_id', 'v.id')
            .select('vb.*', 'v.name as vendor_name')
            .where('vb.school_id', req.user!.school_id)
            .orderBy('vb.bill_date', 'desc');

        if (status) q = q.where('vb.status', status);
        if (vendor_id) q = q.where('vb.vendor_id', vendor_id);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [{ count }] = await q.clone().clearSelect().clearOrder().count('* as count');
        const data = await q.offset(offset).limit(parseInt(limit));

        res.json({ data, pagination: { total: parseInt(count as string), page: parseInt(page), limit: parseInt(limit) } });
    } catch (err: any) {
        logger.error('Fetch vendor bills error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /accounts/vendor-bills
router.post('/vendor-bills', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), validate([
    body('vendor_id').isInt(),
    body('bill_number').notEmpty(),
    body('bill_date').isDate(),
    body('due_date').isDate(),
    body('total_amount').isFloat({ min: 0.01 }),
]), async (req: AuthRequest, res: Response) => {
    try {
        // Ensure vendor belongs to the same school — prevents cross-tenant data injection
        const vendor = await db('vendors')
            .where({ id: req.body.vendor_id, school_id: req.user!.school_id })
            .first();
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

        const { items, ...billData } = req.body;

        if (items && Array.isArray(items)) {
            for (const item of items) {
                if (!item.description || item.quantity == null || item.unit_price == null) {
                    return res.status(400).json({ error: 'Each vendor bill item must have description, quantity, and unit_price' });
                }
                if (Number(item.quantity) <= 0 || Number(item.unit_price) < 0) {
                    return res.status(400).json({ error: 'Item quantity must be positive and unit_price must be non-negative' });
                }
            }
        }
        billData.balance_due = billData.total_amount - (billData.amount_paid || 0);
        billData.status = billData.balance_due <= 0 ? 'paid' : billData.amount_paid > 0 ? 'partial' : 'unpaid';

        const bill = await db.transaction(async (trx) => {
            const [b] = await trx('vendor_bills').insert({
                ...billData,
                created_by: req.user!.id,
                school_id: req.user!.school_id,
            }).returning('*');

            if (items && items.length > 0) {
                await trx('vendor_bill_items').insert(items.map((item: any) => ({
                    ...item,
                    vendor_bill_id: b.id,
                    school_id: req.user!.school_id,
                })));
            }

            return b;
        });

        await db('notices').insert({
            title: 'Accounts: New Vendor Bill Created',
            content: `${req.user!.name} created a new vendor bill for ${vendor.name} amounting to ₹${bill.total_amount}.`,
            target_audience: 'staff',
            created_by: req.user!.id,
            school_id: req.user!.school_id,
        });

        res.status(201).json({ message: 'Vendor bill created', data: bill });
    } catch (err: any) {
        logger.error('Create vendor bill error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /accounts/vendor-bills/:id/pay
router.put('/vendor-bills/:id/pay', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), validate([
    body('amount').isFloat({ min: 0.01 }),
]), async (req: AuthRequest, res: Response) => {
    try {
        const bill = await db('vendor_bills').where({ id: req.params.id, school_id: req.user!.school_id }).first();
        if (!bill) return res.status(404).json({ error: 'Bill not found' });

        const newPaid = parseFloat(bill.amount_paid) + parseFloat(req.body.amount);
        const newBalance = parseFloat(bill.total_amount) - newPaid;
        const newStatus = newBalance <= 0 ? 'paid' : 'partial';

        const [updated] = await db('vendor_bills')
            .where('id', req.params.id)
            .update({ amount_paid: newPaid, balance_due: Math.max(0, newBalance), status: newStatus, updated_at: db.fn.now() })
            .returning('*');
        res.json({ message: 'Payment recorded', data: updated });
    } catch (err: any) {
        logger.error('Record payment error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── ACCOUNTS DASHBOARD ───
router.get('/dashboard', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = new Date().toISOString().substring(0, 7);

        const [totalIncome] = await db('income_entries').where('school_id', schoolId).sum('amount as total');
        const [totalExpense] = await db('expense_entries').where('school_id', schoolId).sum('amount as total');
        const [todayIncome] = await db('income_entries').where('school_id', schoolId).where('date', today).sum('amount as total');
        const [todayExpense] = await db('expense_entries').where('school_id', schoolId).where('date', today).sum('amount as total');
        const [monthIncome] = await db('income_entries').where('school_id', schoolId).whereRaw("TO_CHAR(date, 'YYYY-MM') = ?", [thisMonth]).sum('amount as total');
        const [monthExpense] = await db('expense_entries').where('school_id', schoolId).whereRaw("TO_CHAR(date, 'YYYY-MM') = ?", [thisMonth]).sum('amount as total');
        const [vendorOutstanding] = await db('vendor_bills').where('school_id', schoolId).whereNot('status', 'paid').sum('balance_due as total');
        const [feeCollected] = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where('students.school_id', schoolId)
            .sum('fee_payments.amount_paid as total');

        const incomeByCat = await db('income_entries').where('school_id', schoolId).groupBy('category').select('category').sum('amount as total');
        const expenseByCat = await db('expense_entries').where('school_id', schoolId).groupBy('category').select('category').sum('amount as total');

        res.json({
            total_income: parseFloat(totalIncome.total as string || '0'),
            total_expense: parseFloat(totalExpense.total as string || '0'),
            net_position: parseFloat(totalIncome.total as string || '0') - parseFloat(totalExpense.total as string || '0'),
            today_income: parseFloat(todayIncome.total as string || '0'),
            today_expense: parseFloat(todayExpense.total as string || '0'),
            month_income: parseFloat(monthIncome.total as string || '0'),
            month_expense: parseFloat(monthExpense.total as string || '0'),
            vendor_outstanding: parseFloat(vendorOutstanding.total as string || '0'),
            fee_collected: parseFloat(feeCollected.total as string || '0'),
            income_by_category: incomeByCat,
            expense_by_category: expenseByCat,
        });
    } catch (err: any) {
        logger.error('Accounts dashboard error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
