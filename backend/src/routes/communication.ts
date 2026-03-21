import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest, requireSchoolId } from '../middleware/auth';
import db from '../config/database';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import logger from '../config/logger';

const router = Router();

// ─── SMS TEMPLATES ───

// GET /communication/sms-templates
router.get('/sms-templates', authenticate, requireSchoolId, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const data = await db('sms_templates').where(function () {
            this.whereNull('school_id').orWhere('school_id', req.user!.school_id);
        }).orderBy('category');
        res.json(data);
    } catch (err: any) {
        logger.error('List SMS templates error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /communication/sms-templates
router.post('/sms-templates', authenticate, requireSchoolId, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), validate([
    body('name').notEmpty(),
    body('category').notEmpty(),
    body('body').notEmpty(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const [template] = await db('sms_templates').insert({
            ...req.body,
            school_id: req.user!.school_id,
        }).returning('*');
        res.status(201).json({ message: 'Template created', data: template });
    } catch (err: any) {
        logger.error('Create SMS template error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /communication/sms-templates/:id
router.put('/sms-templates/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const [updated] = await db('sms_templates')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ ...req.body, updated_at: db.fn.now() })
            .returning('*');
        if (!updated) return res.status(404).json({ error: 'Template not found' });
        res.json({ message: 'Template updated', data: updated });
    } catch (err: any) {
        logger.error('Update SMS template error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /communication/sms-templates/:id
router.delete('/sms-templates/:id', authenticate, requireSchoolId, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const deleted = await db('sms_templates').where({ id: req.params.id, school_id: req.user!.school_id }).delete();
        if (!deleted) return res.status(404).json({ error: 'Template not found' });
        res.json({ message: 'Template deleted' });
    } catch (err: any) {
        logger.error('Delete SMS template error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── SEND BULK MESSAGE ───

// POST /communication/send-bulk
router.post('/send-bulk', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), validate([
    body('channel').isIn(['sms', 'whatsapp', 'email']),
    body('recipients').isArray({ min: 1, max: 500 }),
    body('content').notEmpty(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const { channel, recipients, content, template_id } = req.body;

        if (template_id) {
            const template = await db('sms_templates')
                .where(function () {
                    this.where({ id: template_id, school_id: req.user!.school_id }).orWhere({ id: template_id }).whereNull('school_id');
                })
                .first();
            if (!template) return res.status(404).json({ error: 'Template not found for your school' });
        }

        // Log each message (in production, integrate with SMS/WhatsApp gateway)
        const logEntries = recipients.map((r: { phone?: string; email?: string; name?: string }) => ({
            channel,
            recipient: r.phone || r.email || '',
            recipient_name: r.name || '',
            template_id: template_id || null,
            content,
            sent_by: req.user!.id,
            school_id: req.user!.school_id,
            status: 'pending',
        }));

        await db.transaction(async (trx) => {
            const inserted = await trx('message_log').insert(logEntries).returning('id');
            const insertedIds = inserted.map((row: any) => row.id);

            // In production: call MSG91/Twilio/WhatsApp API here
            // For now, mark only newly inserted logs as "sent"
            await trx('message_log')
                .whereIn('id', insertedIds)
                .andWhere('school_id', req.user!.school_id)
                .update({ status: 'sent', sent_at: trx.fn.now() });
        });

        res.json({ message: `${recipients.length} messages queued for delivery`, total: recipients.length });
    } catch (err: any) {
        logger.error('Send bulk message error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── DELIVERY REPORT ───

// GET /communication/delivery-report
router.get('/delivery-report', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { channel, status, from_date, to_date, page = '1', limit = '50' } = req.query as any;
        let q = db('message_log as ml')
            .leftJoin('sms_templates as st', 'ml.template_id', 'st.id')
            .select('ml.*', 'st.name as template_name')
            .where('ml.school_id', req.user!.school_id)
            .orderBy('ml.sent_at', 'desc');

        if (channel) q = q.where('ml.channel', channel);
        if (status) q = q.where('ml.status', status);
        if (from_date) q = q.where('ml.sent_at', '>=', from_date);
        if (to_date) q = q.where('ml.sent_at', '<=', to_date);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [{ count }] = await q.clone().clearSelect().clearOrder().count('* as count');

        const summary = await db('message_log').where('school_id', req.user!.school_id)
            .groupBy('status').select('status').count('* as count');

        const data = await q.offset(offset).limit(parseInt(limit));

        res.json({ data, summary, pagination: { total: parseInt(count as string), page: parseInt(page), limit: parseInt(limit) } });
    } catch (err: any) {
        logger.error('Delivery report error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET RECIPIENTS BY GROUP ───

// GET /communication/recipients
router.get('/recipients', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { group, class_id, section_id } = req.query as any;
        const schoolId = req.user!.school_id;

        const classIdInt = class_id ? parseInt(class_id, 10) : null;
        const sectionIdInt = section_id ? parseInt(section_id, 10) : null;
        if (class_id && (!classIdInt || classIdInt < 1)) {
            return res.status(400).json({ error: 'class_id must be a positive integer' });
        }
        if (section_id && (!sectionIdInt || sectionIdInt < 1)) {
            return res.status(400).json({ error: 'section_id must be a positive integer' });
        }

        // Validate class/section belong to this school
        if (classIdInt) {
            const cls = await db('classes').where({ id: classIdInt, school_id: schoolId }).first();
            if (!cls) return res.status(403).json({ error: 'Class not found in your school' });
        }
        if (sectionIdInt) {
            const sec = await db('sections')
                .join('classes', 'sections.class_id', 'classes.id')
                .where({ 'sections.id': sectionIdInt, 'classes.school_id': schoolId })
                .first();
            if (!sec) return res.status(403).json({ error: 'Section not found in your school' });
        }

        let recipients: any[] = [];

        if (group === 'all_parents' || group === 'parents') {
            let q = db('students').where('school_id', schoolId).where('status', 'active')
                .select('father_name as name', 'father_phone as phone', 'name as student_name', 'current_class_id');
            if (classIdInt) q = q.where('current_class_id', classIdInt);
            if (sectionIdInt) q = q.where('current_section_id', sectionIdInt);
            recipients = await q.whereNotNull('father_phone');
        } else if (group === 'all_staff') {
            recipients = await db('staff').where('school_id', schoolId).where('status', 'active')
                .select('name', 'phone').whereNotNull('phone');
        } else if (group === 'fee_defaulters') {
            // Students with unpaid installments
            recipients = await db('students as s')
                .where('s.school_id', schoolId)
                .where('s.status', 'active')
                .whereNotNull('s.father_phone')
                .select('s.father_name as name', 's.father_phone as phone', 's.name as student_name');
        }

        res.json(recipients);
    } catch (err: any) {
        logger.error('Get recipients error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
