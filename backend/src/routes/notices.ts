import { Router, Response } from 'express';
import { body } from 'express-validator';
import db from '../config/database';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();

// POST /api/notices — Create notice
router.post(
    '/',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'),
    validate([
        body('title').notEmpty().trim(),
        body('content').notEmpty(),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            if (req.body.class_id) {
                const classExists = await db('classes').where({ id: req.body.class_id, school_id: schoolId }).first();
                if (!classExists) return res.status(400).json({ error: 'Invalid class for your school' });
            }

            const [notice] = await db('notices').insert({
                title: req.body.title,
                content: req.body.content,
                target_audience: req.body.target_audience || 'all',
                class_id: req.body.class_id || null,
                created_by: req.user!.id,
                school_id: schoolId,
            }).returning('*');

            res.status(201).json(notice);
        } catch (error) {
            logger.error('Create notice error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/notices — List notices
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const notices = await db('notices')
            .leftJoin('users', 'notices.created_by', 'users.id')
            .where('notices.school_id', schoolId)
            .andWhere('notices.is_active', true)
            .select('notices.*', 'users.name as created_by_name')
            .orderBy('notices.created_at', 'desc')
            .limit(50);

        res.json(notices);
    } catch (error) {
        logger.error('List notices error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/notices/:id
router.delete('/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const notice = await db('notices as n')
            .where('n.id', req.params.id)
            .andWhere('n.school_id', schoolId)
            .select('n.id', 'n.created_by')
            .first();
        if (!notice) return res.status(404).json({ error: 'Notice not found' });

        const updated = await db('notices')
            .where({ id: req.params.id, school_id: schoolId })
            .update({ is_active: false, updated_at: db.fn.now() });

        if (!updated) return res.status(404).json({ error: 'Notice not found' });
        res.json({ message: 'Notice removed' });
    } catch (error) {
        logger.error('Delete notice error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── HOMEWORK ───

// POST /api/notices/homework — Create homework
router.post(
    '/homework',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'),
    validate([
        body('class_id').isInt(),
        body('section_id').isInt(),
        body('subject_id').isInt(),
        body('description').notEmpty(),
        body('due_date').isDate(),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            const classExists = await db('classes').where({ id: req.body.class_id, school_id: schoolId }).first();
            if (!classExists) return res.status(400).json({ error: 'Invalid class for your school' });

            const sectionExists = await db('sections').where({ id: req.body.section_id, class_id: req.body.class_id, school_id: schoolId }).first();
            if (!sectionExists) return res.status(400).json({ error: 'Invalid section for selected class' });

            // Validate subject belongs to this school (subjects link to classes which link to schools)
            const subjectExists = await db('subjects')
                .join('classes', 'subjects.class_id', 'classes.id')
                .where({ 'subjects.id': req.body.subject_id, 'classes.school_id': schoolId })
                .first();
            if (!subjectExists) return res.status(400).json({ error: 'Invalid subject for your school' });

            const [hw] = await db('homework').insert({
                class_id: req.body.class_id,
                section_id: req.body.section_id,
                subject_id: req.body.subject_id,
                description: req.body.description,
                due_date: req.body.due_date,
                assigned_by: req.user!.id,
                school_id: schoolId,
            }).returning('*');

            res.status(201).json(hw);
        } catch (error) {
            logger.error('Create homework error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/notices/homework/:classId/:sectionId
router.get('/homework/:classId/:sectionId', authenticate, validate([paramId('classId'), paramId('sectionId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const homework = await db('homework')
            .join('subjects', 'homework.subject_id', 'subjects.id')
            .leftJoin('users', 'homework.assigned_by', 'users.id')
            .where({ 'homework.class_id': req.params.classId, 'homework.section_id': req.params.sectionId })
            .andWhere('homework.school_id', schoolId)
            .select('homework.*', 'subjects.name as subject_name', 'users.name as teacher_name')
            .orderBy('homework.due_date', 'desc')
            .limit(30);

        res.json(homework);
    } catch (error) {
        logger.error('List homework error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── CLASSES & SECTIONS (utility routes) ───

// GET /api/notices/classes
router.get('/classes', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const classes = await db('classes').where({ school_id: schoolId }).orderBy('numeric_order');
        res.json(classes);
    } catch (error) {
        logger.error('List classes error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/notices/sections/:classId
router.get('/sections/:classId', authenticate, validate([paramId('classId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const classExists = await db('classes').where({ id: req.params.classId, school_id: schoolId }).first();
        if (!classExists) return res.status(404).json({ error: 'Class not found' });

        const sections = await db('sections').where({ class_id: req.params.classId, school_id: schoolId }).orderBy('name');
        res.json(sections);
    } catch (error) {
        logger.error('List sections error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
