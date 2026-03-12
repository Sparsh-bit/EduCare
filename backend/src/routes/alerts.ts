import { Router, Response } from 'express';
import db from '../config/database';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import { calculatePercentage } from '../utils/helpers';
import logger from '../config/logger';

const router = Router();

// GET /api/alerts/weak-subjects/:studentId — Rule-based weak subject detection
router.get('/weak-subjects/:studentId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();

        const student = await db('students').where({ id: studentId, school_id: schoolId }).first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        // Get all exams for this student's class this year
        const exams = await db('exams')
            .where({ class_id: student.current_class_id, academic_year_id: academicYear?.id || -1 })
            .select('id');

        if (exams.length === 0) return res.json({ alerts: [], message: 'No exams found' });

        const examSubjects = await db('exam_subjects')
            .join('subjects', 'exam_subjects.subject_id', 'subjects.id')
            .join('classes', 'subjects.class_id', 'classes.id')
            .whereIn('exam_subjects.exam_id', exams.map((e: any) => e.id))
            .where('classes.school_id', schoolId)
            .select('exam_subjects.*', 'subjects.name as subject_name');

        const weakSubjects = [];

        // Group by subject
        const subjectMap = new Map<number, any[]>();
        for (const es of examSubjects) {
            if (!subjectMap.has(es.subject_id)) subjectMap.set(es.subject_id, []);
            subjectMap.get(es.subject_id)!.push(es);
        }

        for (const [subjectId, subExams] of subjectMap) {
            const marks = await db('marks')
                .join('students', 'marks.student_id', 'students.id')
                .whereIn('exam_subject_id', subExams.map((se: any) => se.id))
                .where({ 'marks.student_id': studentId, 'students.school_id': schoolId })
                .select('marks.*');

            if (marks.length === 0) continue;

            const avgPercentage = marks.reduce((sum: number, m: any) => {
                const es = subExams.find((se: any) => se.id === m.exam_subject_id);
                return sum + calculatePercentage(parseFloat(m.marks_obtained || '0'), es?.max_marks || 100);
            }, 0) / marks.length;

            // Rule: if average < 50%, mark as weak
            if (avgPercentage < 50) {
                weakSubjects.push({
                    subject: subExams[0].subject_name,
                    subject_id: subjectId,
                    avg_percentage: Math.round(avgPercentage * 100) / 100,
                    severity: avgPercentage < 33 ? 'critical' : 'warning',
                    message: avgPercentage < 33
                        ? `Failing in ${subExams[0].subject_name} (${avgPercentage.toFixed(1)}%)`
                        : `Below average in ${subExams[0].subject_name} (${avgPercentage.toFixed(1)}%)`,
                });
            }
        }

        res.json({
            student_id: parseInt(String(studentId)),
            student_name: student.name,
            weak_subjects: weakSubjects,
            total_alerts: weakSubjects.length,
        });
    } catch (error) {
        logger.error('Weak subjects error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/alerts/attendance-risk/:classId — Students below 75%
router.get('/attendance-risk/:classId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), validate([paramId('classId')]), async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.params;
        const { section_id } = req.query as any;
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();

        let studentsQuery = db('students')
            .where({ current_class_id: classId, status: 'active', school_id: schoolId })
            .whereNull('deleted_at');

        if (section_id) studentsQuery = studentsQuery.where({ current_section_id: section_id });

        const students = await studentsQuery.select('id', 'name', 'admission_no', 'current_roll_no', 'father_phone');

        const riskStudents = [];

        for (const student of students) {
            const records = await db('attendance')
                .join('students', 'attendance.student_id', 'students.id')
                .where({ student_id: student.id, academic_year_id: academicYear?.id || -1 })
                .andWhere('students.school_id', schoolId)
                .select('attendance.status');

            const total = records.length;
            if (total === 0) continue;

            const present = records.filter((r: any) => r.status === 'P').length;
            const halfDay = records.filter((r: any) => r.status === 'HD').length;
            const effectivePresent = present + (halfDay * 0.5);
            const percentage = Math.round((effectivePresent / total) * 10000) / 100;

            if (percentage < 85) { // Alert threshold at 85%, block at 75%
                riskStudents.push({
                    ...student,
                    total_days: total,
                    present: effectivePresent,
                    percentage,
                    status: percentage < 75 ? 'BLOCKED' : 'AT_RISK',
                    shortfall: percentage < 75 ? Math.ceil((0.75 * total) - effectivePresent) : 0,
                    message: percentage < 75
                        ? `BLOCKED from exam — ${percentage}% attendance (need 75%)`
                        : `AT RISK — ${percentage}% attendance, needs improvement`,
                });
            }
        }

        riskStudents.sort((a, b) => a.percentage - b.percentage);

        // Paginate
        const page = parseInt(req.query.page as string || '1');
        const limit = Math.min(parseInt(req.query.limit as string || '50'), 100);
        const offset = (page - 1) * limit;
        const paged = riskStudents.slice(offset, offset + limit);

        res.json({
            class_id: parseInt(String(classId)),
            threshold: 75,
            total_students: students.length,
            at_risk: riskStudents.filter(s => s.status === 'AT_RISK').length,
            blocked: riskStudents.filter(s => s.status === 'BLOCKED').length,
            students: paged,
            pagination: { total: riskStudents.length, page, limit },
        });
    } catch (error) {
        logger.error('Attendance risk error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/alerts/fee-delay — Overdue fee list
router.get('/fee-delay', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        const today = new Date();

        // Get all installments that are past due
        const overdueInstallments = await db('fee_installments')
            .join('fee_structures', 'fee_installments.fee_structure_id', 'fee_structures.id')
            .join('classes', 'fee_structures.class_id', 'classes.id')
            .where('classes.school_id', schoolId)
            .where('fee_structures.academic_year_id', academicYear?.id || -1)
            .where('fee_installments.due_date', '<', today.toISOString().split('T')[0])
            .whereNull('fee_structures.deleted_at')
            .select(
                'fee_installments.*',
                'fee_structures.class_id',
                'classes.name as class_name'
            );

        const alerts = [];

        for (const inst of overdueInstallments) {
            // Get students in this class without payment for this installment
            const studentsWithoutPayment = await db('students')
                .leftJoin('fee_payments', function () {
                    this.on('fee_payments.student_id', '=', 'students.id')
                        .andOnVal('fee_payments.installment_id', '=', inst.id);
                })
                .where({ 'students.current_class_id': inst.class_id, 'students.status': 'active', 'students.school_id': schoolId })
                .whereNull('students.deleted_at')
                .whereNull('fee_payments.id')
                .select('students.id', 'students.name', 'students.admission_no', 'students.father_phone');

            for (const student of studentsWithoutPayment) {
                const daysOverdue = Math.floor((today.getTime() - new Date(inst.due_date).getTime()) / (1000 * 60 * 60 * 24));

                alerts.push({
                    student_id: student.id,
                    student_name: student.name,
                    admission_no: student.admission_no,
                    class_name: inst.class_name,
                    installment_no: inst.installment_no,
                    amount: inst.amount,
                    due_date: inst.due_date,
                    days_overdue: daysOverdue,
                    severity: daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium',
                    father_phone: student.father_phone,
                });
            }
        }

        alerts.sort((a, b) => b.days_overdue - a.days_overdue);

        // Paginate
        const page = parseInt(req.query.page as string || '1');
        const limit = Math.min(parseInt(req.query.limit as string || '50'), 100);
        const offset = (page - 1) * limit;
        const paged = alerts.slice(offset, offset + limit);

        res.json({
            total_alerts: alerts.length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            alerts: paged,
            pagination: { total: alerts.length, page, limit },
        });
    } catch (error) {
        logger.error('Fee delay alerts error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
