import express, { Response } from 'express';
import db from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();

const MASTER_TABLES = [
    'exam_areas', 'subject_groups', 'grade_mappings', 'remarks_bank',
    'fee_categories', 'fee_groups', 'discount_policies'
];

router.get('/:table', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const table = req.params.table as string;
        if (!MASTER_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const query = db(table).where({ school_id: schoolId });

        const data = await query.orderBy('id', 'desc');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:table', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const table = req.params.table as string;
        if (!MASTER_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const payload = { ...req.body, school_id: schoolId };

        const [id] = await db(table).insert(payload).returning('id');
        res.status(201).json({ id });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:table/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const table = req.params.table as string;
        if (!MASTER_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const affected = await db(table).where({ id: req.params.id, school_id: schoolId }).del();
        if (!affected) return res.status(404).json({ error: 'Record not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
