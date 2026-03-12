import { Router, Response } from 'express';
import db from '../config/database';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// GET /api/admin/dashboard/stats
router.get('/stats', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'accountant', 'hr_manager', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

        // Student counts
        const totalStudents = await db('students')
            .where({ status: 'active', academic_year_id: academicYear.id, school_id: schoolId })
            .whereNull('deleted_at')
            .count('id as count').first();

        const classCounts = await db('students')
            .join('classes', 'students.current_class_id', 'classes.id')
            .where({ 'students.status': 'active', 'students.academic_year_id': academicYear.id, 'students.school_id': schoolId })
            .whereNull('students.deleted_at')
            .groupBy('classes.name', 'classes.numeric_order')
            .select('classes.name as class_name', db.raw('COUNT(*) as count'))
            .orderBy('classes.numeric_order');

        // Today's attendance
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = await db('attendance')
            .join('students', 'attendance.student_id', 'students.id')
            .where({ date: today, 'students.school_id': schoolId })
            .select(db.raw("COUNT(*) as total, COUNT(*) FILTER (WHERE attendance.status = 'P') as present, COUNT(*) FILTER (WHERE attendance.status = 'A') as absent"));

        const attData = todayAttendance[0] || { total: 0, present: 0, absent: 0 };
        const todayPercentage = attData.total > 0
            ? Math.round((parseInt(attData.present) / parseInt(attData.total)) * 100)
            : 0;

        // Fee collection summary
        const totalFeeExpected = await db('fee_structures')
            .join('students', function () {
                this.on('fee_structures.class_id', '=', 'students.current_class_id')
                    .andOn('fee_structures.academic_year_id', '=', 'students.academic_year_id');
            })
            .where({ 'students.status': 'active', 'students.academic_year_id': academicYear?.id || -1, 'students.school_id': schoolId })
            .whereNull('students.deleted_at')
            .whereNull('fee_structures.deleted_at')
            .sum('fee_structures.total_amount as total').first();

        const totalCollected = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where({ 'fee_payments.academic_year_id': academicYear.id })
            .andWhere('students.school_id', schoolId)
            .sum('amount_paid as total').first();

        // Staff count
        const totalStaff = await db('staff').where({ status: 'active', school_id: schoolId }).whereNull('deleted_at').count('id as count').first();

        // Pending dues count
        const pendingDuesCount = await db.raw(`
      SELECT COUNT(DISTINCT s.id) as count
      FROM students s
      JOIN fee_structures fs ON fs.class_id = s.current_class_id AND fs.academic_year_id = s.academic_year_id
      LEFT JOIN (
        SELECT student_id, SUM(amount_paid) as total_paid
        FROM fee_payments WHERE academic_year_id = ?
        GROUP BY student_id
      ) fp ON fp.student_id = s.id
      WHERE s.status = 'active' AND s.deleted_at IS NULL
                AND s.school_id = ?
        AND s.academic_year_id = ?
        AND (COALESCE(fp.total_paid, 0) < fs.total_amount)
        `, [academicYear.id, schoolId, academicYear.id]);

        res.json({
            academic_year: academicYear?.year,
            students: {
                total: parseInt((totalStudents as any)?.count || '0'),
                by_class: classCounts,
            },
            attendance: {
                today_date: today,
                total_marked: parseInt(attData.total),
                present: parseInt(attData.present),
                absent: parseInt(attData.absent),
                percentage: todayPercentage,
            },
            fees: {
                total_expected: parseFloat((totalFeeExpected as any)?.total || '0'),
                total_collected: parseFloat((totalCollected as any)?.total || '0'),
                collection_percentage: (totalFeeExpected as any)?.total > 0
                    ? Math.round((parseFloat((totalCollected as any)?.total || '0') / parseFloat((totalFeeExpected as any).total)) * 100)
                    : 0,
            },
            staff: {
                total: parseInt((totalStaff as any)?.count || '0'),
            },
            pending_dues_count: parseInt(pendingDuesCount?.rows?.[0]?.count || '0'),
        });
    } catch (error) {
        logger.error('Dashboard stats error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/dashboard/upcoming-exams
router.get('/upcoming-exams', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'accountant', 'hr_manager', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const exams = await db('exams')
            .join('classes', 'exams.class_id', 'classes.id')
            .where('exams.school_id', schoolId)
            .whereIn('exams.status', ['upcoming', 'ongoing'])
            .select('exams.*', 'classes.name as class_name')
            .orderBy('exams.start_date')
            .limit(10);

        res.json(exams);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/dashboard/recent-activity
router.get('/recent-activity', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'accountant', 'hr_manager', 'front_desk'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const logs = await db('audit_logs')
            .leftJoin('users', 'audit_logs.user_id', 'users.id')
            .where('audit_logs.school_id', schoolId)
            .select('audit_logs.*', 'users.name as user_name')
            .orderBy('audit_logs.created_at', 'desc')
            .limit(20);

        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
