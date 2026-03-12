import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest, requireSchoolId } from '../middleware/auth';
import db from '../config/database';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();

// ─── TEACHER ASSIGNMENTS ───

// GET /hr/teacher-assignments
router.get('/teacher-assignments', authenticate, requireSchoolId, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { class_id, section_id } = req.query as any;
        let q = db('teacher_subject_assignments as tsa')
            .leftJoin('users as u', 'tsa.teacher_id', 'u.id')
            .leftJoin('classes as c', 'tsa.class_id', 'c.id')
            .leftJoin('sections as s', 'tsa.section_id', 's.id')
            .leftJoin('subjects as sub', 'tsa.subject_id', 'sub.id')
            .select('tsa.*', 'u.name as teacher_name', 'c.name as class_name', 's.name as section_name', 'sub.name as subject_name')
            .where('tsa.school_id', schoolId);

        if (class_id) q = q.where('tsa.class_id', class_id);
        if (section_id) q = q.where('tsa.section_id', section_id);

        const data = await q.orderBy(['c.numeric_order', 's.name', 'sub.name']);
        res.json(data);
    } catch (err: any) {
        logger.error('List teacher assignments error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /hr/teacher-assignments
router.post('/teacher-assignments', authenticate, requireSchoolId, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), validate([
    body('teacher_id').isInt(),
    body('class_id').isInt(),
    body('section_id').isInt(),
    body('subject_id').isInt(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;

        // Verify teacher belongs to this school
        const teacher = await db('users').where({ id: req.body.teacher_id, school_id: schoolId, is_active: true }).first();
        if (!teacher) return res.status(400).json({ error: 'Invalid teacher for your school' });

        // Verify class belongs to this school
        const cls = await db('classes').where({ id: req.body.class_id, school_id: schoolId }).first();
        if (!cls) return res.status(400).json({ error: 'Invalid class for your school' });

        // Verify section belongs to the specified class
        const section = await db('sections').where({ id: req.body.section_id, class_id: req.body.class_id }).first();
        if (!section) return res.status(400).json({ error: 'Invalid section for the selected class' });

        // Verify subject belongs to this school (via classes) and matches the specified class
        const subject = await db('subjects')
            .join('classes', 'subjects.class_id', 'classes.id')
            .where({ 'subjects.id': req.body.subject_id, 'classes.school_id': schoolId })
            .select('subjects.id')
            .first();
        if (!subject) return res.status(400).json({ error: 'Invalid subject for your school' });

        const currentYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        const [assignment] = await db('teacher_subject_assignments').insert({
            teacher_id: req.body.teacher_id,
            class_id: req.body.class_id,
            section_id: req.body.section_id,
            subject_id: req.body.subject_id,
            academic_year_id: currentYear?.id,
            school_id: schoolId,
        }).returning('*');
        res.status(201).json({ message: 'Teacher assigned', data: assignment });
    } catch (err: any) {
        if (err.message?.includes('unique') || err.message?.includes('duplicate') || err.code === '23505') {
            return res.status(400).json({ error: 'This assignment already exists' });
        }
        logger.error('Create teacher assignment error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /hr/teacher-assignments/:id
router.delete('/teacher-assignments/:id', authenticate, requireSchoolId, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const deleted = await db('teacher_subject_assignments').where({ id: req.params.id, school_id: req.user!.school_id }).delete();
        if (!deleted) return res.status(404).json({ error: 'Assignment not found' });
        res.json({ message: 'Assignment removed' });
    } catch (err: any) {
        logger.error('Delete teacher assignment error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── CLASS TEACHER ASSIGNMENT ───

// GET /hr/class-teachers
router.get('/class-teachers', authenticate, requireSchoolId, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const data = await db('sections as s')
            .leftJoin('classes as c', 's.class_id', 'c.id')
            .leftJoin('users as u', 's.class_teacher_id', 'u.id')
            .select('s.id as section_id', 'c.id as class_id', 'c.name as class_name', 's.name as section_name', 's.class_teacher_id', 'u.name as teacher_name')
            .where('c.school_id', schoolId)
            .orderBy(['c.numeric_order', 's.name']);
        res.json(data);
    } catch (err: any) {
        logger.error('List class teachers error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /hr/class-teachers/:section_id
router.put('/class-teachers/:section_id', authenticate, requireSchoolId, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), validate([paramId('section_id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;

        // Verify section belongs to a class in this school
        const section = await db('sections as s')
            .join('classes as c', 's.class_id', 'c.id')
            .where('s.id', req.params.section_id)
            .andWhere('c.school_id', schoolId)
            .select('s.id')
            .first();
        if (!section) return res.status(404).json({ error: 'Section not found in your school' });

        // Verify teacher belongs to this school
        if (req.body.teacher_id) {
            const teacher = await db('users').where({ id: req.body.teacher_id, school_id: schoolId, is_active: true }).first();
            if (!teacher) return res.status(400).json({ error: 'Invalid teacher for your school' });
        }

        const [updated] = await db('sections')
            .where('id', req.params.section_id)
            .update({ class_teacher_id: req.body.teacher_id, updated_at: db.fn.now() })
            .returning('*');

        if (req.body.teacher_id && section) {
            const classNameResult = await db('classes').where('id', updated.class_id).select('name').first();
            const teacherRes = await db('users').where('id', req.body.teacher_id).select('name').first();
            if (classNameResult && teacherRes) {
                await db('notices').insert({
                    title: 'Class Teacher Assignment',
                    content: `Teacher ${teacherRes.name} has been assigned as the class teacher for Class ${classNameResult.name} Section ${updated.name}.`,
                    target_audience: 'teachers',
                    created_by: req.user!.id,
                    school_id: schoolId,
                });
            }
        }

        res.json({ message: 'Class teacher assigned', data: updated });
    } catch (err: any) {
        logger.error('Update class teacher error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── LEAVE MANAGEMENT ───

// GET /hr/leave-types
router.get('/leave-types', authenticate, requireSchoolId, async (req: AuthRequest, res: Response) => {
    try {
        const data = await db('leave_types').where(function () {
            this.whereNull('school_id').orWhere('school_id', req.user!.school_id);
        }).where('is_active', true);
        res.json(data);
    } catch (err: any) {
        logger.error('List leave types error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /hr/leave-balances/:staff_id
router.get('/leave-balances/:staff_id', authenticate, requireSchoolId, validate([paramId('staff_id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;

        // Verify staff belongs to this school
        const staff = await db('staff').where({ id: req.params.staff_id, school_id: schoolId }).first();
        if (!staff) return res.status(404).json({ error: 'Staff not found in your school' });

        const data = await db('leave_balances as lb')
            .leftJoin('leave_types as lt', 'lb.leave_type_id', 'lt.id')
            .select('lb.*', 'lt.name as leave_type_name', 'lt.code')
            .where('lb.staff_id', req.params.staff_id);
        res.json(data);
    } catch (err: any) {
        logger.error('List leave balances error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── HR DASHBOARD ───
router.get('/dashboard', authenticate, requireSchoolId, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'hr_manager'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const today = new Date().toISOString().split('T')[0];

        const [totalStaff] = await db('staff').where('school_id', schoolId).where('status', 'active').count('* as count');
        const [teaching] = await db('staff').where('school_id', schoolId).where('status', 'active')
            .whereIn('designation', ['PGT', 'TGT', 'PRT', 'NTT', 'Principal', 'Vice Principal']).count('* as count');
        const [onLeaveToday] = await db('staff_leaves')
            .whereIn('staff_id', db('staff').where('school_id', schoolId).select('id'))
            .where('status', 'approved')
            .where('from_date', '<=', today)
            .where('to_date', '>=', today)
            .count('* as count');
        const [pendingLeaves] = await db('staff_leaves')
            .whereIn('staff_id', db('staff').where('school_id', schoolId).select('id'))
            .where('status', 'pending')
            .count('* as count');

        const deptBreakdown = await db('staff').where('school_id', schoolId).where('status', 'active')
            .groupBy('department').select('department').count('* as count');
        const desigBreakdown = await db('staff').where('school_id', schoolId).where('status', 'active')
            .groupBy('designation').select('designation').count('* as count');

        res.json({
            total_staff: parseInt(totalStaff.count as string),
            teaching_staff: parseInt(teaching.count as string),
            non_teaching_staff: parseInt(totalStaff.count as string) - parseInt(teaching.count as string),
            on_leave_today: parseInt(onLeaveToday.count as string),
            pending_leave_requests: parseInt(pendingLeaves.count as string),
            department_breakdown: deptBreakdown,
            designation_breakdown: desigBreakdown,
        });
    } catch (err: any) {
        logger.error('HR dashboard error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
