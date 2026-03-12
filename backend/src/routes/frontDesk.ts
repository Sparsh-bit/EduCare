import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();

// ─── ADMISSION ENQUIRY ───

// GET /front-desk/enquiries
router.get('/enquiries', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const { status, class_id, source, search, page = '1', limit = '25' } = req.query as any;
        let q = db('admission_enquiries as e')
            .leftJoin('classes as c', 'e.class_applying_for', 'c.id')
            .leftJoin('users as u', 'e.assigned_to', 'u.id')
            .select('e.*', 'c.name as class_name', 'u.name as assigned_to_name')
            .where('e.school_id', req.user!.school_id)
            .orderBy('e.created_at', 'desc');

        if (status) q = q.where('e.status', status);
        if (class_id) q = q.where('e.class_applying_for', class_id);
        if (source) q = q.where('e.source', source);
        if (search) q = q.where(function () {
            this.whereILike('e.student_name', `%${search}%`)
                .orWhereILike('e.contact_phone', `%${search}%`)
                .orWhereILike('e.father_name', `%${search}%`);
        });

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [{ count }] = await q.clone().clearSelect().clearOrder().count('* as count');
        const data = await q.offset(offset).limit(parseInt(limit));

        res.json({ data, pagination: { total: parseInt(count as string), page: parseInt(page), limit: parseInt(limit) } });
    } catch (err: any) {
        logger.error('Fetch enquiries error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /front-desk/enquiries
router.post('/enquiries', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([
    body('student_name').notEmpty(),
    body('father_name').notEmpty(),
    body('contact_phone').notEmpty(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        // Generate enquiry number
        const [last] = await db('admission_enquiries').where('school_id', schoolId).orderBy('id', 'desc').limit(1);
        const seq = last ? parseInt(last.enquiry_number.split('/').pop() || '0') + 1 : 1;
        const enquiry_number = `ENQ/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}`;

        const [enquiry] = await db('admission_enquiries').insert({
            ...req.body,
            enquiry_number,
            school_id: schoolId,
        }).returning('*');

        res.status(201).json({ message: 'Enquiry created', data: enquiry });
    } catch (err: any) {
        logger.error('Create enquiry error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /front-desk/enquiries/:id
router.put('/enquiries/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const [updated] = await db('admission_enquiries')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ ...req.body, updated_at: db.fn.now() })
            .returning('*');
        if (!updated) return res.status(404).json({ error: 'Enquiry not found' });
        res.json({ message: 'Enquiry updated', data: updated });
    } catch (err: any) {
        logger.error('Update enquiry error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /front-desk/enquiries/:id/follow-up
router.post('/enquiries/:id/follow-up', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const { notes, status_changed_to, follow_up_date } = req.body;
        const enquiry = await db('admission_enquiries')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .first();
        if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

        const followUp = await db.transaction(async (trx) => {
            const [createdFollowUp] = await trx('enquiry_follow_ups').insert({
                enquiry_id: req.params.id,
                notes,
                status_changed_to,
                follow_up_date,
                done_by: req.user!.id,
            }).returning('*');

            if (status_changed_to) {
                await trx('admission_enquiries')
                    .where({ id: req.params.id, school_id: req.user!.school_id })
                    .update({ status: status_changed_to, follow_up_date, updated_at: trx.fn.now() });
            }

            return createdFollowUp;
        });

        res.json({ message: 'Follow-up added', data: followUp });
    } catch (err: any) {
        logger.error('Follow-up error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /front-desk/enquiries/:id/follow-ups
router.get('/enquiries/:id/follow-ups', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const enquiry = await db('admission_enquiries')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .first();
        if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

        const data = await db('enquiry_follow_ups as f')
            .leftJoin('users as u', 'f.done_by', 'u.id')
            .select('f.*', 'u.name as done_by_name')
            .where('f.enquiry_id', req.params.id)
            .orderBy('f.created_at', 'desc');
        res.json(data);
    } catch (err: any) {
        logger.error('Fetch follow-ups error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /front-desk/enquiries/:id
router.delete('/enquiries/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        await db('admission_enquiries').where({ id: req.params.id, school_id: req.user!.school_id }).delete();
        res.json({ message: 'Enquiry deleted' });
    } catch (err: any) {
        logger.error('Delete enquiry error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /front-desk/enquiries/stats
router.get('/enquiry-stats', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const total = await db('admission_enquiries').where('school_id', schoolId).count('* as count').first();
        const byStatus = await db('admission_enquiries').where('school_id', schoolId).groupBy('status').select('status').count('* as count');
        const bySource = await db('admission_enquiries').where('school_id', schoolId).groupBy('source').select('source').count('* as count');
        const todayNew = await db('admission_enquiries').where('school_id', schoolId).whereRaw("DATE(created_at) = CURRENT_DATE").count('* as count').first();

        res.json({
            total: parseInt(total?.count as string || '0'),
            today_new: parseInt(todayNew?.count as string || '0'),
            by_status: byStatus,
            by_source: bySource,
        });
    } catch (err: any) {
        logger.error('Enquiry stats error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GATE PASS ───

// GET /front-desk/student-lookup?q=<roll_no or admission_no>
// Used for auto-filling student details when issuing a gate pass
router.get('/student-lookup', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const { q } = req.query as any;
        if (!q || String(q).trim().length < 2) return res.json({ data: null });

        const term = String(q).trim();
        const student = await db('students as s')
            .leftJoin('classes as c', 's.current_class_id', 'c.id')
            .leftJoin('sections as sec', 's.current_section_id', 'sec.id')
            .select('s.id', 's.name', 's.admission_no', 's.current_roll_no', 's.sr_no', 's.student_uid', 's.father_name', 's.father_phone',
                'c.name as class_name', 'sec.name as section_name')
            .where('s.school_id', req.user!.school_id)
            .whereNull('s.deleted_at')
            .where(function () {
                // exact match for roll/SR/UID; partial prefix match for admission_no
                this.where(db.raw('LOWER(s.current_roll_no) = LOWER(?)', [term]))
                    .orWhere(db.raw('LOWER(s.admission_no) LIKE LOWER(?)', [`%${term}%`]))
                    .orWhere(db.raw('LOWER(s.sr_no) = LOWER(?)', [term]))
                    .orWhere(db.raw('LOWER(s.student_uid) = LOWER(?)', [term]));
            })
            .first();

        res.json({ data: student || null });
    } catch (err: any) {
        logger.error('Student lookup error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /front-desk/gate-passes
router.get('/gate-passes', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;

        // Auto-purge records older than 10 days (fire-and-forget, don't block response)
        db('gate_passes')
            .where('school_id', schoolId)
            .where('created_at', '<', db.raw("NOW() - INTERVAL '10 days'"))
            .delete()
            .catch((e: Error) => logger.warn('Gate pass purge failed', e));

        const { status, date, search, page = '1', limit = '25' } = req.query as any;
        let q = db('gate_passes as gp')
            .leftJoin('students as s', 'gp.student_id', 's.id')
            .leftJoin('classes as c', 's.current_class_id', 'c.id')
            .leftJoin('sections as sec', 's.current_section_id', 'sec.id')
            .select('gp.*', 's.name as student_name', 's.admission_no', 'c.name as class_name', 'sec.name as section_name')
            .where('gp.school_id', schoolId)
            .orderBy('gp.created_at', 'desc');

        if (status) q = q.where('gp.status', status);
        if (date) q = q.whereRaw("DATE(gp.out_time) = ?", [date]);
        if (search) q = q.where(function () {
            this.whereILike('s.name', `%${search}%`).orWhereILike('gp.pass_number', `%${search}%`);
        });

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [{ count }] = await q.clone().clearSelect().clearOrder().count('* as count');
        const data = await q.offset(offset).limit(parseInt(limit));

        res.json({ data, pagination: { total: parseInt(count as string), page: parseInt(page), limit: parseInt(limit) } });
    } catch (err: any) {
        logger.error('Fetch gate passes error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /front-desk/gate-passes
router.post('/gate-passes', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([
    body('student_id').isInt(),
    body('reason').notEmpty(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const [last] = await db('gate_passes').where('school_id', req.user!.school_id).whereRaw("DATE(created_at) = CURRENT_DATE").orderBy('id', 'desc').limit(1);
        const seq = last ? parseInt(last.pass_number.split('-').pop() || '0') + 1 : 1;
        const pass_number = `GP-${today}-${String(seq).padStart(3, '0')}`;

        const [gatePass] = await db('gate_passes').insert({
            ...req.body,
            pass_number,
            out_time: req.body.out_time || new Date(),
            issued_by: req.user!.id,
            school_id: req.user!.school_id,
        }).returning('*');

        res.status(201).json({ message: 'Gate pass issued', data: gatePass });
    } catch (err: any) {
        logger.error('Create gate pass error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /front-desk/gate-passes/:id/return
router.put('/gate-passes/:id/return', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const [updated] = await db('gate_passes')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ status: 'returned', actual_return: new Date(), updated_at: db.fn.now() })
            .returning('*');
        if (!updated) return res.status(404).json({ error: 'Gate pass not found' });
        res.json({ message: 'Student returned', data: updated });
    } catch (err: any) {
        logger.error('Gate pass return error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── VISITORS ───

// GET /front-desk/visitors
router.get('/visitors', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk', 'teacher'), async (req: AuthRequest, res: Response) => {
    try {
        const { status, date, purpose, page = '1', limit = '25' } = req.query as any;
        let q = db('visitors')
            .where('school_id', req.user!.school_id)
            .orderBy('in_time', 'desc');

        if (status) q = q.where('status', status);
        if (purpose) q = q.where('purpose', purpose);
        if (date) q = q.whereRaw("DATE(in_time) = ?", [date]);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [{ count }] = await q.clone().clearSelect().clearOrder().count('* as count');
        const data = await q.offset(offset).limit(parseInt(limit));

        res.json({ data, pagination: { total: parseInt(count as string), page: parseInt(page), limit: parseInt(limit) } });
    } catch (err: any) {
        logger.error('Fetch visitors error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /front-desk/visitors
router.post('/visitors', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk', 'teacher'), validate([
    body('visitor_name').notEmpty(),
    body('visitor_phone').notEmpty(),
    body('purpose').notEmpty(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const [visitor] = await db('visitors').insert({
            ...req.body,
            in_time: req.body.in_time || new Date(),
            registered_by: req.user!.id,
            school_id: req.user!.school_id,
        }).returning('*');
        res.status(201).json({ message: 'Visitor logged', data: visitor });
    } catch (err: any) {
        logger.error('Create visitor error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /front-desk/visitors/:id/checkout
router.put('/visitors/:id/checkout', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk', 'teacher'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const [updated] = await db('visitors')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ status: 'out', out_time: new Date(), updated_at: db.fn.now() })
            .returning('*');
        if (!updated) return res.status(404).json({ error: 'Visitor not found' });
        res.json({ message: 'Visitor checked out', data: updated });
    } catch (err: any) {
        logger.error('Visitor checkout error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POSTAL ───

// GET /front-desk/postal
router.get('/postal', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const { type, status, page = '1', limit = '25' } = req.query as any;
        let q = db('postal_records').where('school_id', req.user!.school_id).orderBy('date', 'desc');
        if (type) q = q.where('type', type);
        if (status) q = q.where('status', status);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [{ count }] = await q.clone().clearSelect().clearOrder().count('* as count');
        const data = await q.offset(offset).limit(parseInt(limit));
        res.json({ data, pagination: { total: parseInt(count as string), page: parseInt(page), limit: parseInt(limit) } });
    } catch (err: any) {
        logger.error('Fetch postal error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /front-desk/postal
router.post('/postal', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([
    body('type').isIn(['received', 'dispatched']),
    body('party_name').notEmpty(),
    body('date').notEmpty(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const [record] = await db('postal_records').insert({
            ...req.body,
            logged_by: req.user!.id,
            school_id: req.user!.school_id,
        }).returning('*');
        res.status(201).json({ message: 'Postal record added', data: record });
    } catch (err: any) {
        logger.error('Create postal error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /front-desk/postal/:id
router.put('/postal/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const [updated] = await db('postal_records')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ ...req.body, updated_at: db.fn.now() })
            .returning('*');
        res.json({ message: 'Postal record updated', data: updated });
    } catch (err: any) {
        logger.error('Update postal error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── LOST AND FOUND ───

// GET /front-desk/lost-found
router.get('/lost-found', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const { status, item_type, page = '1', limit = '25' } = req.query as any;
        let q = db('lost_and_found').where('school_id', req.user!.school_id).orderBy('created_at', 'desc');
        if (status) q = q.where('status', status);
        if (item_type) q = q.where('item_type', item_type);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [{ count }] = await q.clone().clearSelect().clearOrder().count('* as count');
        const data = await q.offset(offset).limit(parseInt(limit));
        res.json({ data, pagination: { total: parseInt(count as string), page: parseInt(page), limit: parseInt(limit) } });
    } catch (err: any) {
        logger.error('Fetch lost-found error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /front-desk/lost-found
router.post('/lost-found', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([
    body('item_type').notEmpty(),
    body('description').notEmpty(),
    body('found_date').notEmpty(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const [last] = await db('lost_and_found').where('school_id', schoolId).orderBy('id', 'desc').limit(1);
        const seq = last ? parseInt(last.item_number?.split('/').pop() || '0') + 1 : 1;
        const item_number = `LF/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}`;

        const [item] = await db('lost_and_found').insert({
            ...req.body,
            item_number,
            logged_by: req.user!.id,
            school_id: schoolId,
        }).returning('*');
        res.status(201).json({ message: 'Item recorded', data: item });
    } catch (err: any) {
        logger.error('Create lost-found error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /front-desk/lost-found/:id/claim
router.put('/lost-found/:id/claim', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const [updated] = await db('lost_and_found')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({
                status: 'claimed',
                claimed_by: req.body.claimed_by,
                claimed_date: new Date(),
                verified_by: req.user!.id,
                updated_at: db.fn.now(),
            }).returning('*');
        res.json({ message: 'Item claimed', data: updated });
    } catch (err: any) {
        logger.error('Claim item error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── FRONT DESK DASHBOARD ───
router.get('/dashboard', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const today = new Date().toISOString().split('T')[0];

        const [enquiriesPending] = await db('admission_enquiries').where('school_id', schoolId).whereNotIn('status', ['admitted', 'closed']).count('* as count');
        const [enquiriesToday] = await db('admission_enquiries').where('school_id', schoolId).whereRaw("DATE(created_at) = ?", [today]).count('* as count');
        const [visitorsToday] = await db('visitors').where('school_id', schoolId).whereRaw("DATE(in_time) = ?", [today]).count('* as count');
        const [visitorsIn] = await db('visitors').where({ school_id: schoolId, status: 'in' }).count('* as count');
        const [gatePassesToday] = await db('gate_passes').where('school_id', schoolId).whereRaw("DATE(out_time) = ?", [today]).count('* as count');
        const [postalToday] = await db('postal_records').where('school_id', schoolId).where('date', today).count('* as count');
        const [unclaimedItems] = await db('lost_and_found').where({ school_id: schoolId, status: 'found_unclaimed' }).count('* as count');

        res.json({
            enquiries_pending: parseInt(enquiriesPending.count as string),
            enquiries_today: parseInt(enquiriesToday.count as string),
            visitors_today: parseInt(visitorsToday.count as string),
            visitors_currently_in: parseInt(visitorsIn.count as string),
            gate_passes_today: parseInt(gatePassesToday.count as string),
            postal_today: parseInt(postalToday.count as string),
            unclaimed_items: parseInt(unclaimedItems.count as string),
        });
    } catch (err: any) {
        logger.error('Front desk dashboard error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
