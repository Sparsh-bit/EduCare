import { Router, Response } from 'express';
import db from '../config/database';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();

// GET /api/parent/children — Get linked children
router.get('/children', authenticate, authorize('parent'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const children = await db('student_parents')
            .join('students', 'student_parents.student_id', 'students.id')
            .leftJoin('classes', 'students.current_class_id', 'classes.id')
            .leftJoin('sections', 'students.current_section_id', 'sections.id')
            .where('student_parents.parent_user_id', req.user!.id)
            .andWhere('students.school_id', schoolId)
            .whereNull('students.deleted_at')
            .select(
                'students.id', 'students.name', 'students.admission_no',
                'students.current_roll_no', 'students.photo_url', 'students.status',
                'classes.name as class_name', 'sections.name as section_name',
                'student_parents.relation'
            );

        res.json(children);
    } catch (error) {
        logger.error('Get children error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/parent/attendance/:studentId — Child's attendance
router.get('/attendance/:studentId', authenticate, authorize('parent'), validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        // Verify parent-child link
        const link = await db('student_parents')
            .join('students', 'student_parents.student_id', 'students.id')
            .where({ student_id: req.params.studentId, parent_user_id: req.user!.id })
            .andWhere('students.school_id', schoolId)
            .first();
        if (!link) return res.status(403).json({ error: 'Access denied' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year configured for this school' });

        const records = await db('attendance')
            .join('students', 'attendance.student_id', 'students.id')
            .where({ 'attendance.student_id': req.params.studentId, 'attendance.academic_year_id': academicYear.id })
            .andWhere('students.school_id', schoolId)
            .orderBy('date', 'desc');

        const total = records.length;
        const present = records.filter((r: any) => r.status === 'P').length;
        const halfDay = records.filter((r: any) => r.status === 'HD').length;
        const effectivePresent = present + (halfDay * 0.5);
        const percentage = total > 0 ? Math.round((effectivePresent / total) * 10000) / 100 : 0;

        res.json({
            total_days: total,
            present,
            absent: records.filter((r: any) => r.status === 'A').length,
            leave: records.filter((r: any) => r.status === 'L').length,
            half_day: halfDay,
            percentage,
            eligible_for_exam: percentage >= 75,
            recent_records: records.slice(0, 30),
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/parent/fees/:studentId — Child's fee status
router.get('/fees/:studentId', authenticate, authorize('parent'), validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const link = await db('student_parents')
            .join('students', 'student_parents.student_id', 'students.id')
            .where({ student_id: req.params.studentId, parent_user_id: req.user!.id })
            .andWhere('students.school_id', schoolId)
            .first();
        if (!link) return res.status(403).json({ error: 'Access denied' });

        const student = await db('students').where({ id: req.params.studentId, school_id: schoolId }).first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year configured for this school' });

        const feeStructure = await db('fee_structures')
            .join('classes', 'fee_structures.class_id', 'classes.id')
            .where({ class_id: student.current_class_id, academic_year_id: academicYear.id })
            .andWhere('classes.school_id', schoolId)
            .whereNull('deleted_at')
            .select('fee_structures.*')
            .first();

        if (!feeStructure) return res.json({ message: 'No fee structure found' });

        const installments = await db('fee_installments')
            .where({ fee_structure_id: feeStructure.id })
            .orderBy('installment_no');

        const payments = await db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where({ 'fee_payments.student_id': student.id, 'fee_payments.academic_year_id': academicYear.id })
            .andWhere('students.school_id', schoolId)
            .select('fee_payments.*');

        const paymentMap = new Map(payments.map((p: any) => [p.installment_id, p]));

        const installmentStatus = installments.map((inst: any) => ({
            installment_no: inst.installment_no,
            amount: inst.amount,
            due_date: inst.due_date,
            paid: !!paymentMap.get(inst.id),
            payment_date: paymentMap.get(inst.id)?.payment_date,
            receipt_no: paymentMap.get(inst.id)?.receipt_no,
        }));

        const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount_paid), 0);

        res.json({
            total_fee: parseFloat(feeStructure.total_amount),
            total_paid: totalPaid,
            total_due: Math.max(0, parseFloat(feeStructure.total_amount) - totalPaid),
            installments: installmentStatus,
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/parent/results/:studentId — Child's results
router.get('/results/:studentId', authenticate, authorize('parent'), validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const link = await db('student_parents')
            .join('students', 'student_parents.student_id', 'students.id')
            .where({ student_id: req.params.studentId, parent_user_id: req.user!.id })
            .andWhere('students.school_id', schoolId)
            .first();
        if (!link) return res.status(403).json({ error: 'Access denied' });

        const student = await db('students').where({ id: req.params.studentId, school_id: schoolId }).first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year configured for this school' });

        const exams = await db('exams')
            .where({ class_id: student.current_class_id, academic_year_id: academicYear.id, school_id: schoolId })
            .orderBy('start_date');

        const results = [];
        for (const exam of exams) {
            const examSubjects = await db('exam_subjects')
                .join('subjects', 'exam_subjects.subject_id', 'subjects.id')
                .where('exam_subjects.exam_id', exam.id)
                .select('exam_subjects.*', 'subjects.name as subject_name');

            const marks = await db('marks')
                .join('students', 'marks.student_id', 'students.id')
                .whereIn('exam_subject_id', examSubjects.map((es: any) => es.id))
                .where({ 'marks.student_id': req.params.studentId, 'students.school_id': schoolId })
                .select('marks.*');

            if (marks.length === 0) continue;

            let totalObtained = 0;
            let totalMax = 0;

            const subjectResults = examSubjects.map((es: any) => {
                const mark = marks.find((m: any) => m.exam_subject_id === es.id);
                const obtained = mark ? parseFloat(mark.marks_obtained || '0') : 0;
                totalObtained += obtained;
                totalMax += es.max_marks;

                return {
                    subject: es.subject_name,
                    max_marks: es.max_marks,
                    obtained,
                    passed: obtained >= es.passing_marks,
                };
            });

            results.push({
                exam_id: exam.id,
                exam_name: exam.name,
                term: exam.term,
                subjects: subjectResults,
                total_obtained: totalObtained,
                total_max: totalMax,
                percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0,
            });
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/parent/notices — Notices
router.get('/notices', authenticate, authorize('parent'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const notices = await db('notices')
            .leftJoin('users', 'notices.created_by', 'users.id')
            .where('notices.school_id', schoolId)
            .andWhere('notices.is_active', true)
            .where((qb) => {
                qb.where('notices.target_audience', 'all').orWhere('notices.target_audience', 'parents');
            })
            .select('notices.*', 'users.name as created_by_name')
            .orderBy('notices.created_at', 'desc')
            .limit(20);

        res.json(notices);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/parent/homework/:classId/:sectionId — Homework
router.get('/homework/:classId/:sectionId', authenticate, authorize('parent'), validate([paramId('classId'), paramId('sectionId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        // Ensure the requested class/section actually belongs to one of this parent's children
        const childInClass = await db('student_parents')
            .join('students', 'student_parents.student_id', 'students.id')
            .where({
                parent_user_id: req.user!.id,
                'students.current_class_id': req.params.classId,
                'students.current_section_id': req.params.sectionId,
                'students.school_id': schoolId,
            })
            .whereNull('students.deleted_at')
            .first();
        if (!childInClass) return res.status(403).json({ error: 'Access denied' });

        const homework = await db('homework')
            .join('subjects', 'homework.subject_id', 'subjects.id')
            .leftJoin('users', 'homework.assigned_by', 'users.id')
            .where({ 'homework.class_id': req.params.classId, 'homework.section_id': req.params.sectionId })
            .andWhere('homework.school_id', schoolId)
            .where('homework.due_date', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 7 days
            .select('homework.*', 'subjects.name as subject_name', 'users.name as teacher_name')
            .orderBy('homework.due_date', 'desc');

        res.json(homework);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
