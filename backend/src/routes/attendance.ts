import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import db from '../config/database';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId, paramDate } from '../middleware/paramValidation';
import { createAuditLog, getClientIp } from '../utils/auditLog';
import { sendAbsentAlert } from '../utils/sms';
import logger from '../config/logger';

const router = Router();

// POST /api/attendance/mark — Bulk mark attendance for a class/section
router.post(
    '/mark',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'),
    validate([
        body('date').isDate(),
        body('class_id').isInt(),
        body('section_id').isInt(),
        body('records').isArray({ min: 1, max: 200 }),
        body('records.*.student_id').isInt(),
        body('records.*.status').isIn(['P', 'A', 'L', 'HD']),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { date, class_id, section_id, records } = req.body;
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            const classExists = await db('classes').where({ id: class_id, school_id: schoolId }).first();
            if (!classExists) return res.status(400).json({ error: 'Invalid class for your school' });

            const sectionExists = await db('sections').where({ id: section_id, class_id }).first();
            if (!sectionExists) return res.status(400).json({ error: 'Invalid section for selected class' });

            if (req.user?.role === 'teacher') {
                if (sectionExists.class_teacher_id !== req.user.id) {
                    return res.status(403).json({ error: 'Access denied: Only the assigned class teacher can mark attendance for this section.' });
                }
            }

            const studentIds = records.map((record: any) => Number(record.student_id));
            const validStudents = await db('students')
                .whereIn('id', studentIds)
                .where({ school_id: schoolId, current_class_id: class_id, current_section_id: section_id, status: 'active' })
                .whereNull('deleted_at')
                .select('id', 'name', 'father_phone');

            const validSet = new Set(validStudents.map((student: any) => Number(student.id)));
            const invalid = studentIds.filter((studentId: number) => !validSet.has(studentId));
            if (invalid.length > 0) {
                return res.status(400).json({ error: 'Some students are invalid or outside your school/class/section', invalid_student_ids: invalid });
            }

            const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
            if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

            await db.transaction(async (trx) => {
                const inserts = records.map((record: any) => ({
                    student_id: record.student_id,
                    school_id: schoolId,
                    date,
                    status: record.status,
                    class_id,
                    section_id,
                    marked_by: req.user!.id,
                    academic_year_id: academicYear.id,
                }));

                await trx('attendance').insert(inserts).onConflict(['school_id', 'student_id', 'date']).merge({
                    status: trx.raw('EXCLUDED.status'),
                    class_id: trx.raw('EXCLUDED.class_id'),
                    section_id: trx.raw('EXCLUDED.section_id'),
                    marked_by: trx.raw('EXCLUDED.marked_by'),
                    academic_year_id: trx.raw('EXCLUDED.academic_year_id'),
                    updated_at: trx.fn.now(),
                });
            });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'update',
                entity_type: 'attendance',
                new_value: { date, class_id, section_id, count: records.length },
                ip_address: getClientIp(req),
                description: 'Attendance marked/updated',
            });

            // Send SMS for absent students
            const absentRecords = records.filter((r: any) => r.status === 'A');
            const studentMap = new Map(validStudents.map((student: any) => [Number(student.id), student]));
            for (const absent of absentRecords) {
                const student = studentMap.get(Number(absent.student_id));
                if (student?.father_phone) {
                    sendAbsentAlert(student.name, student.father_phone, date).catch(() => { });
                }
            }

            res.json({ message: `Attendance marked for ${records.length} students`, absent_count: absentRecords.length });
        } catch (error) {
            logger.error('Mark attendance error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/attendance/class/:classId/section/:sectionId/date/:date
router.get(
    '/class/:classId/section/:sectionId/date/:date',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'),
    validate([paramId('classId'), paramId('sectionId'), paramDate('date')]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { classId, sectionId, date } = req.params;
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            // Get all students in this class/section
            const students = await db('students')
                .where({ current_class_id: classId, current_section_id: sectionId, status: 'active', school_id: schoolId })
                .whereNull('deleted_at')
                .orderBy('current_roll_no')
                .select('id', 'name', 'admission_no', 'current_roll_no');

            // Get attendance records for the date
            const attendanceRecords = await db('attendance')
                .join('students', 'attendance.student_id', 'students.id')
                .where({ 'attendance.date': date, 'attendance.class_id': classId, 'attendance.section_id': sectionId })
                .andWhere('attendance.school_id', schoolId)
                .andWhere('students.school_id', schoolId)
                .select('attendance.student_id as student_id', 'attendance.status as status');

            const attendanceMap = new Map(attendanceRecords.map((r: any) => [r.student_id, r.status]));

            const result = students.map((s: any) => ({
                ...s,
                status: attendanceMap.get(s.id) || null,
            }));

            res.json({
                date,
                class_id: parseInt(String(classId)),
                section_id: parseInt(String(sectionId)),
                total: students.length,
                marked: attendanceRecords.length,
                students: result,
            });
        } catch (error) {
            logger.error('Get attendance error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/attendance/student/:studentId — Student attendance summary
router.get('/student/:studentId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'parent'), validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const { academic_year_id } = req.query as any;
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const student = await db('students').where({ id: studentId, school_id: schoolId }).whereNull('deleted_at').first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        let query = db('attendance')
            .join('students', 'attendance.student_id', 'students.id')
            .where({ 'attendance.student_id': studentId, 'attendance.school_id': schoolId, 'students.school_id': schoolId });
        if (academic_year_id) query = query.where({ academic_year_id });

        const records = await query.orderBy('attendance.date', 'desc').select('attendance.*');

        const total = records.length;
        const present = records.filter((r: any) => r.status === 'P').length;
        const absent = records.filter((r: any) => r.status === 'A').length;
        const leave = records.filter((r: any) => r.status === 'L').length;
        const halfDay = records.filter((r: any) => r.status === 'HD').length;
        const effectivePresent = present + (halfDay * 0.5);
        const percentage = total > 0 ? Math.round((effectivePresent / total) * 10000) / 100 : 0;

        res.json({
            student_id: parseInt(String(studentId)),
            total_days: total,
            present,
            absent,
            leave,
            half_day: halfDay,
            percentage,
            eligible_for_exam: percentage >= 75,
            records: records.slice(0, 30), // Last 30 records
        });
    } catch (error) {
        logger.error('Student attendance error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/attendance/student/:studentId/eligibility — 75% exam eligibility check
router.get('/student/:studentId/eligibility', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'parent'), validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const student = await db('students').where({ id: studentId, school_id: schoolId }).whereNull('deleted_at').first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();

        const records = await db('attendance')
            .join('students', 'attendance.student_id', 'students.id')
            .where({ 'attendance.student_id': studentId, 'attendance.academic_year_id': academicYear?.id || -1, 'attendance.school_id': schoolId })
            .andWhere('students.school_id', schoolId)
            .select('attendance.status as status');

        const total = records.length;
        const present = records.filter((r: any) => r.status === 'P').length;
        const halfDay = records.filter((r: any) => r.status === 'HD').length;
        const effectivePresent = present + (halfDay * 0.5);
        const percentage = total > 0 ? Math.round((effectivePresent / total) * 10000) / 100 : 0;

        res.json({
            student_id: parseInt(String(studentId)),
            total_days: total,
            effective_present: effectivePresent,
            percentage,
            threshold: 75,
            eligible: percentage >= 75,
            shortfall: percentage < 75 ? Math.ceil((0.75 * total) - effectivePresent) : 0,
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/attendance/monthly-report/:classId/:sectionId/:month
router.get(
    '/monthly-report/:classId/:sectionId/:month',
    authenticate,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'),
    validate([
        param('classId').isInt({ min: 1 }).withMessage('classId must be a positive integer'),
        param('sectionId').isInt({ min: 1 }).withMessage('sectionId must be a positive integer'),
        param('month').matches(/^\d{4}-\d{2}$/).withMessage('month must be in YYYY-MM format'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { classId, sectionId, month } = req.params; // month format: 2025-09
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            const students = await db('students')
                .where({ current_class_id: classId, current_section_id: sectionId, status: 'active', school_id: schoolId })
                .whereNull('deleted_at')
                .orderBy('current_roll_no')
                .select('id', 'name', 'admission_no', 'current_roll_no');

            const attendanceRecords = await db('attendance')
                .join('students', 'attendance.student_id', 'students.id')
                .where({ class_id: classId, section_id: sectionId })
                .andWhere('attendance.school_id', schoolId)
                .andWhere('students.school_id', schoolId)
                .whereRaw("TO_CHAR(date, 'YYYY-MM') = ?", [month])
                .select(
                    'attendance.student_id as student_id',
                    'attendance.date as date',
                    'attendance.status as status',
                    'students.name as student_name',
                    'students.current_roll_no as roll_no',
                );

            const report = students.map((s: any) => {
                const studentRecords = attendanceRecords.filter((r: any) => r.student_id === s.id);
                const total = studentRecords.length;
                const present = studentRecords.filter((r: any) => r.status === 'P').length;
                const absent = studentRecords.filter((r: any) => r.status === 'A').length;

                return {
                    ...s,
                    total_days: total,
                    present,
                    absent,
                    leave: studentRecords.filter((r: any) => r.status === 'L').length,
                    percentage: total > 0 ? Math.round((present / total) * 100) : 0,
                };
            });

            res.json({ month, class_id: parseInt(String(classId)), section_id: parseInt(String(sectionId)), report, records: attendanceRecords });
        } catch (error) {
            logger.error('Monthly report error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
