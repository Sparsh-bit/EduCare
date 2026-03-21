import { Router, Response } from 'express';
import { body } from 'express-validator';
import db from '../config/database';
import { authenticate, AuthRequest, authorize, requireSchoolId } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import { createAuditLog, getClientIp } from '../utils/auditLog';
import { calculatePercentage } from '../utils/helpers';
import logger from '../config/logger';

const router = Router();

// POST /api/exams/request-access — Request exam creation access
router.post('/request-access', authenticate, requireSchoolId, authorize('teacher'), async (req: AuthRequest, res: Response) => {
    try {
        await db('notices').insert({
            title: 'Exam Creation Access Request',
            content: `${req.user!.name} has requested permission to create a new examination.`,
            target_audience: 'staff',
            created_by: req.user!.id,
            school_id: req.user!.school_id,
        });
        res.status(200).json({ message: 'Request sent successfully' });
    } catch (error) {
        logger.error('Request exam access error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/exams — Create exam
router.post(
    '/',
    authenticate,
    requireSchoolId,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin'),
    validate([
        body('name').notEmpty().trim(),
        body('term').isIn(['1', '2']),
        body('class_id').isInt(),
        body('subjects').isArray({ min: 1, max: 50 }),
        body('subjects.*.subject_id').isInt(),
        body('subjects.*.max_marks').isInt({ min: 1 }),
        body('subjects.*.passing_marks').isInt({ min: 1 }),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user!.school_id;
            const { name, term, class_id, subjects, start_date, end_date } = req.body;

            const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
            if (!academicYear) return res.status(400).json({ error: 'No active academic year' });

            // Verify class belongs to school
            const schoolClass = await db('classes').where({ id: class_id, school_id: schoolId }).first();
            if (!schoolClass) return res.status(400).json({ error: 'Invalid class for your school' });

            // Verify all subjects belong to the class/school
            const subjectIds = subjects.map((s: any) => s.subject_id);
            const validSubjects = await db('subjects')
                .join('classes', 'subjects.class_id', 'classes.id')
                .whereIn('subjects.id', subjectIds)
                .andWhere('classes.school_id', schoolId)
                .select('subjects.id');
            const validSubjectIds = new Set(validSubjects.map((s: any) => s.id));
            const invalidSubjects = subjectIds.filter((id: number) => !validSubjectIds.has(id));
            if (invalidSubjects.length > 0) {
                return res.status(400).json({ error: 'Some subjects are invalid for your school', invalid_subject_ids: invalidSubjects });
            }

            const { exam, examSubjects } = await db.transaction(async (trx) => {
                const [createdExam] = await trx('exams').insert({
                    name,
                    term,
                    class_id,
                    academic_year_id: academicYear.id,
                    school_id: schoolId,
                    start_date,
                    end_date,
                    status: 'upcoming',
                }).returning('*');

                const examSubjectInserts = subjects.map((s: any) => ({
                    exam_id: createdExam.id,
                    school_id: schoolId,
                    subject_id: s.subject_id,
                    max_marks: s.max_marks || 100,
                    passing_marks: s.passing_marks || 33,
                    exam_date: s.exam_date,
                }));

                const insertedSubjects = await trx('exam_subjects').insert(examSubjectInserts).returning('*');
                return { exam: createdExam, examSubjects: insertedSubjects };
            });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'create',
                entity_type: 'exam',
                entity_id: exam.id,
                new_value: { name, term, class_id },
                ip_address: getClientIp(req),
            });

            res.status(201).json({ ...exam, subjects: examSubjects });
        } catch (error) {
            logger.error('Create exam error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/exams — List exams
router.get('/', authenticate, requireSchoolId, async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { class_id, term, academic_year_id, status } = req.query as any;
        const academicYear = academic_year_id
            ? await db('academic_years').where({ id: academic_year_id, school_id: schoolId }).first()
            : await db('academic_years').where({ is_current: true, school_id: schoolId }).first();

        let query = db('exams')
            .join('classes', 'exams.class_id', 'classes.id')
            .where('exams.academic_year_id', academicYear?.id || -1)
            .andWhere('exams.school_id', schoolId)
            .select('exams.*', 'classes.name as class_name');

        if (class_id) query = query.where('exams.class_id', class_id);
        if (term) query = query.where('exams.term', term);
        if (status) query = query.where('exams.status', status);

        const exams = await query.orderBy('exams.start_date', 'desc');
        res.json(exams);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/exams/:examId — Get exam with subjects
router.get('/:examId', authenticate, requireSchoolId, validate([paramId('examId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;

        const exam = await db('exams')
            .join('classes', 'exams.class_id', 'classes.id')
            .where('exams.id', req.params.examId)
            .andWhere('exams.school_id', schoolId)
            .select('exams.*', 'classes.name as class_name')
            .first();

        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const subjects = await db('exam_subjects')
            .join('subjects', 'exam_subjects.subject_id', 'subjects.id')
            .where('exam_subjects.exam_id', exam.id)
            .select('exam_subjects.*', 'subjects.name as subject_name');

        res.json({ ...exam, subjects });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/exams/:examId/marks — Enter marks (bulk)
router.post(
    '/:examId/marks',
    authenticate,
    requireSchoolId,
    authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'),
    validate([
        paramId('examId'),
        body('exam_subject_id').isInt(),
        body('marks').isArray({ min: 1, max: 200 }),
        body('marks.*.student_id').isInt(),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user!.school_id;
            const { exam_subject_id, marks: marksData } = req.body;

            // Verify exam belongs to this school
            const exam = await db('exams').where({ id: req.params.examId, school_id: schoolId }).first();
            if (!exam) return res.status(404).json({ error: 'Exam not found' });

            const examSubject = await db('exam_subjects').where({ id: exam_subject_id, exam_id: exam.id }).first();
            if (!examSubject) return res.status(404).json({ error: 'Exam subject not found' });

            // Verify all students belong to this school + exam class
            const studentIds = marksData.map((m: any) => Number(m.student_id));
            const validStudents = await db('students')
                .whereIn('id', studentIds)
                .where({ school_id: schoolId, current_class_id: exam.class_id, status: 'active' })
                .whereNull('deleted_at')
                .select('id');
            const validSet = new Set(validStudents.map((s: any) => s.id));
            const invalidStudents = studentIds.filter((id: number) => !validSet.has(id));
            if (invalidStudents.length > 0) {
                return res.status(400).json({ error: 'Some students are invalid for this exam', invalid_student_ids: invalidStudents });
            }

            const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();

            await db.transaction(async (trx) => {
                const inserts = marksData.map((m: any) => ({
                    student_id: m.student_id,
                    exam_subject_id,
                    school_id: schoolId,
                    academic_year_id: academicYear?.id || -1,
                    marks_obtained: m.is_absent ? null : m.marks_obtained,
                    is_absent: m.is_absent || false,
                    entered_by: req.user!.id,
                }));

                await trx('marks').insert(inserts).onConflict(['student_id', 'exam_subject_id']).merge();

                await trx('exams').where({ id: req.params.examId, status: 'upcoming', school_id: schoolId }).update({ status: 'ongoing' });
            });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'marks_entry',
                entity_type: 'marks',
                new_value: { exam_subject_id, count: marksData.length },
                ip_address: getClientIp(req),
                description: `Marks entered for ${marksData.length} students`,
            });

            res.json({ message: `Marks entered for ${marksData.length} students` });
        } catch (error) {
            logger.error('Enter marks error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/exams/:examId/results/:classId — Class results
router.get('/:examId/results/:classId', authenticate, requireSchoolId, validate([paramId('examId'), paramId('classId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { examId, classId } = req.params;
        const { section_id } = req.query as any;

        const exam = await db('exams').where({ id: examId, school_id: schoolId }).first();
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const schoolClass = await db('classes').where({ id: classId, school_id: schoolId }).first();
        if (!schoolClass) return res.status(404).json({ error: 'Class not found' });

        const examSubjects = await db('exam_subjects')
            .join('subjects', 'exam_subjects.subject_id', 'subjects.id')
            .where('exam_subjects.exam_id', examId)
            .select('exam_subjects.*', 'subjects.name as subject_name');

        let studentsQuery = db('students')
            .where({ current_class_id: classId, status: 'active', school_id: schoolId })
            .whereNull('deleted_at')
            .orderBy('current_roll_no');

        if (section_id) studentsQuery = studentsQuery.where({ current_section_id: section_id });

        const students = await studentsQuery.select('id', 'name', 'admission_no', 'current_roll_no', 'current_section_id');

        const results = [];
        for (const student of students) {
            const studentMarks = await db('marks')
                .whereIn('exam_subject_id', examSubjects.map((es: any) => es.id))
                .where({ student_id: student.id })
                .select('exam_subject_id', 'marks_obtained', 'is_absent');

            let totalObtained = 0;
            let totalMax = 0;
            let allPassed = true;

            const subjectResults = examSubjects.map((es: any) => {
                const mark = studentMarks.find((m: any) => m.exam_subject_id === es.id);
                const obtained = mark?.is_absent ? 0 : parseFloat(mark?.marks_obtained || '0');
                const passed = obtained >= es.passing_marks;
                if (!passed && !mark?.is_absent) allPassed = false;

                totalObtained += obtained;
                totalMax += es.max_marks;

                return {
                    subject: es.subject_name,
                    max_marks: es.max_marks,
                    passing_marks: es.passing_marks,
                    obtained,
                    is_absent: mark?.is_absent || false,
                    passed,
                };
            });

            results.push({
                student_id: student.id,
                name: student.name,
                admission_no: student.admission_no,
                roll_no: student.current_roll_no,
                subjects: subjectResults,
                total_obtained: totalObtained,
                total_max: totalMax,
                percentage: calculatePercentage(totalObtained, totalMax),
                result: allPassed ? 'PASS' : 'FAIL',
            });
        }

        results.sort((a, b) => b.percentage - a.percentage);
        results.forEach((r, i) => (r as any).rank = i + 1);

        res.json({ exam, subjects: examSubjects, results });
    } catch (error) {
        logger.error('Get results error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/exams/student/:studentId/report-card/:examId — Report card data
router.get('/student/:studentId/report-card/:examId', authenticate, requireSchoolId, validate([paramId('studentId'), paramId('examId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const { studentId, examId } = req.params;

        const student = await db('students')
            .leftJoin('classes', 'students.current_class_id', 'classes.id')
            .leftJoin('sections', 'students.current_section_id', 'sections.id')
            .where('students.id', studentId)
            .andWhere('students.school_id', schoolId)
            .select('students.*', 'classes.name as class_name', 'sections.name as section_name')
            .first();

        if (!student) return res.status(404).json({ error: 'Student not found' });

        const exam = await db('exams').where({ id: examId, school_id: schoolId }).first();
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const schoolSettings = await db('school_settings').where({ school_id: schoolId }).first();
        const schoolName = schoolSettings?.school_name || 'School';

        const examSubjects = await db('exam_subjects')
            .join('subjects', 'exam_subjects.subject_id', 'subjects.id')
            .where('exam_subjects.exam_id', examId)
            .select('exam_subjects.*', 'subjects.name as subject_name');

        const marks = await db('marks')
            .whereIn('exam_subject_id', examSubjects.map((es: any) => es.id))
            .where({ student_id: studentId });

        let totalObtained = 0;
        let totalMax = 0;
        let allPassed = true;

        const subjectResults = examSubjects.map((es: any) => {
            const mark = marks.find((m: any) => m.exam_subject_id === es.id);
            const obtained = mark?.is_absent ? 0 : parseFloat(mark?.marks_obtained || '0');
            const passed = obtained >= es.passing_marks;
            if (!passed) allPassed = false;

            totalObtained += obtained;
            totalMax += es.max_marks;

            return {
                subject: es.subject_name,
                max_marks: es.max_marks,
                passing_marks: es.passing_marks,
                obtained,
                is_absent: mark?.is_absent || false,
                passed,
                grade: getGrade(calculatePercentage(obtained, es.max_marks)),
            };
        });

        // Attendance for the year — scoped to school
        const attendanceSummary = await db('attendance')
            .where({ student_id: studentId, academic_year_id: exam.academic_year_id, school_id: schoolId })
            .select(db.raw("COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'P') as present"));

        const attData = attendanceSummary[0] || { total: 0, present: 0 };

        const { aadhaar_encrypted: _ae, ...safeStudent } = student;

        res.json({
            school_name: schoolName,
            student: {
                name: safeStudent.name,
                admission_no: safeStudent.admission_no,
                class: safeStudent.class_name,
                section: safeStudent.section_name,
                roll_no: safeStudent.current_roll_no,
                father_name: safeStudent.father_name,
                dob: safeStudent.dob,
            },
            exam: { name: exam.name, term: exam.term },
            subjects: subjectResults,
            total_obtained: totalObtained,
            total_max: totalMax,
            percentage: calculatePercentage(totalObtained, totalMax),
            result: allPassed ? 'PASS' : 'FAIL',
            grade: getGrade(calculatePercentage(totalObtained, totalMax)),
            attendance: {
                total_days: parseInt(attData.total),
                present: parseInt(attData.present),
                percentage: attData.total > 0 ? calculatePercentage(parseInt(attData.present), parseInt(attData.total)) : 0,
            },
        });
    } catch (error) {
        logger.error('Report card error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function getGrade(percentage: number): string {
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    return 'E (Fail)';
}

export default router;
