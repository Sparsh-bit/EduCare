import { Router, Response } from 'express';
import { body } from 'express-validator';
import db from '../config/database';
import { authenticate, AuthRequest, authorize, ownerOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();

function cbseGrade(percent: number): string {
    if (percent >= 91) return 'A1';
    if (percent >= 81) return 'A2';
    if (percent >= 71) return 'B1';
    if (percent >= 61) return 'B2';
    if (percent >= 51) return 'C1';
    if (percent >= 41) return 'C2';
    if (percent >= 33) return 'D';
    return 'E';
}

// ─── BOARD CONFIG ───
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const config = await db('board_config').where({ school_id: req.user!.school_id }).first();
        res.json(config || {});
    } catch (error) {
        logger.error('Get board config error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/config', authenticate, ownerOnly(), validate([
    body('board_type').isIn(['CBSE', 'ICSE', 'State']),
]), async (req: AuthRequest, res: Response) => {
    try {
        const { board_type, state_board_name, udise_code, pan_number, gstin, cce_enabled, fa_weightage, sa_weightage } = req.body;
        const existing = await db('board_config').where({ school_id: req.user!.school_id }).first();
        if (existing) {
            await db('board_config').where({ school_id: req.user!.school_id }).update({
                board_type, state_board_name, udise_code, pan_number, gstin,
                cce_enabled: cce_enabled ?? true,
                fa_weightage: fa_weightage ?? 10,
                sa_weightage: sa_weightage ?? 30,
            });
        } else {
            await db('board_config').insert({
                school_id: req.user!.school_id,
                board_type, state_board_name, udise_code, pan_number, gstin,
                cce_enabled: cce_enabled ?? true,
                fa_weightage: fa_weightage ?? 10,
                sa_weightage: sa_weightage ?? 30,
            });
        }
        res.json({ message: 'Board configuration saved' });
    } catch (error) {
        logger.error('Save board config error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── EXAM TERMS ───
router.get('/terms', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { academic_year_id } = req.query;
        let q = db('exam_terms').where({ school_id: req.user!.school_id }).orderBy('id');
        if (academic_year_id) q = q.where({ academic_year_id });
        const terms = await q;
        res.json({ data: terms });
    } catch (error) {
        logger.error('Get exam terms error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/terms', authenticate, authorize('owner', 'co-owner', 'admin'), validate([
    body('term_type').notEmpty(),
    body('term_name').notEmpty(),
    body('academic_year_id').isInt(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const { term_type, term_name, max_marks, weightage_percent, start_date, end_date, academic_year_id } = req.body;
        const [term] = await db('exam_terms').insert({
            school_id: req.user!.school_id,
            academic_year_id, term_type, term_name,
            max_marks: max_marks ?? 100,
            weightage_percent: weightage_percent ?? 10,
            start_date: start_date || null,
            end_date: end_date || null,
        }).returning('*');
        res.status(201).json({ message: 'Term created', data: term });
    } catch (error) {
        logger.error('Create exam term error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/terms/:id', authenticate, authorize('owner', 'co-owner', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const { term_name, max_marks, weightage_percent, start_date, end_date, status } = req.body;
        await db('exam_terms').where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ term_name, max_marks, weightage_percent, start_date, end_date, status });
        res.json({ message: 'Term updated' });
    } catch (error) {
        logger.error('Update exam term error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/terms/:id', authenticate, ownerOnly(), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        await db('exam_terms').where({ id: req.params.id, school_id: req.user!.school_id }).delete();
        res.json({ message: 'Term deleted' });
    } catch (error) {
        logger.error('Delete exam term error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── REPORT CARD CONFIG ───
router.get('/report-card-config', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const config = await db('report_card_config').where({ school_id: req.user!.school_id }).first();
        res.json(config || {});
    } catch (error) {
        logger.error('Get report card config error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/report-card-config', authenticate, ownerOnly(), async (req: AuthRequest, res: Response) => {
    try {
        const { school_name, school_address, school_phone, principal_name, affiliation_number, show_co_scholastic, show_attendance, show_remarks } = req.body;
        const existing = await db('report_card_config').where({ school_id: req.user!.school_id }).first();
        if (existing) {
            await db('report_card_config').where({ school_id: req.user!.school_id }).update({
                school_name, school_address, school_phone, principal_name, affiliation_number,
                show_co_scholastic: show_co_scholastic ?? true,
                show_attendance: show_attendance ?? true,
                show_remarks: show_remarks ?? true,
            });
        } else {
            await db('report_card_config').insert({
                school_id: req.user!.school_id,
                school_name, school_address, school_phone, principal_name, affiliation_number,
                show_co_scholastic: show_co_scholastic ?? true,
                show_attendance: show_attendance ?? true,
                show_remarks: show_remarks ?? true,
            });
        }
        res.json({ message: 'Report card configuration saved' });
    } catch (error) {
        logger.error('Save report card config error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── CO-SCHOLASTIC (individual) ───
router.get('/co-scholastic/:studentId/:academicYearId/:term', authenticate, validate([paramId('studentId'), paramId('academicYearId')]), async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, academicYearId, term } = req.params;
        const record = await db('cce_co_scholastic')
            .where({ school_id: req.user!.school_id, student_id: studentId, academic_year_id: academicYearId, term })
            .first();
        res.json(record || {});
    } catch (error) {
        logger.error('Get co-scholastic error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/co-scholastic', authenticate, authorize('owner', 'co-owner', 'teacher'), async (req: AuthRequest, res: Response) => {
    try {
        const {
            student_id, academic_year_id, term,
            art_education, work_education, health_physical_education,
            thinking_skills, social_skills, emotional_skills,
            attitude_towards_school, attitude_towards_teachers, attitude_towards_peers,
            teacher_remarks
        } = req.body;

        const existing = await db('cce_co_scholastic')
            .where({ school_id: req.user!.school_id, student_id, academic_year_id, term }).first();

        const data = {
            art_education, work_education, health_physical_education,
            thinking_skills, social_skills, emotional_skills,
            attitude_towards_school, attitude_towards_teachers, attitude_towards_peers,
            teacher_remarks, entered_by: req.user!.id,
        };

        if (existing) {
            await db('cce_co_scholastic').where({ id: existing.id }).update(data);
        } else {
            await db('cce_co_scholastic').insert({ school_id: req.user!.school_id, student_id, academic_year_id, term, ...data });
        }
        res.json({ message: 'Co-scholastic grades saved' });
    } catch (error) {
        logger.error('Save co-scholastic error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── CO-SCHOLASTIC (bulk for a class) ───
router.get('/co-scholastic/bulk/:classId/:academicYearId/:term', authenticate, validate([paramId('classId'), paramId('academicYearId')]), async (req: AuthRequest, res: Response) => {
    try {
        const { classId, academicYearId, term } = req.params;
        const { section_id } = req.query;

        let studentQuery = db('students')
            .join('student_class_history', 'students.id', 'student_class_history.student_id')
            .where({
                'student_class_history.class_id': classId,
                'student_class_history.academic_year_id': academicYearId,
                'students.school_id': req.user!.school_id,
                'student_class_history.status': 'active',
            })
            .select('students.id', 'students.name', 'students.admission_no', 'student_class_history.roll_no');

        if (section_id) studentQuery = studentQuery.where('student_class_history.section_id', section_id);
        const students = await studentQuery;

        const grades = await db('cce_co_scholastic')
            .where({ school_id: req.user!.school_id, academic_year_id: academicYearId, term });

        const gradeMap = new Map(grades.map((g: any) => [g.student_id, g]));

        const result = students.map((s: any) => ({
            student_id: s.id,
            student_name: s.name,
            admission_no: s.admission_no,
            roll_no: s.roll_no,
            grades: gradeMap.get(s.id) || {},
        }));

        res.json({ data: result });
    } catch (error) {
        logger.error('Bulk co-scholastic fetch error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/co-scholastic/bulk', authenticate, authorize('owner', 'co-owner', 'teacher'), async (req: AuthRequest, res: Response) => {
    try {
        const { academic_year_id, term, records } = req.body;
        if (!Array.isArray(records)) return res.status(400).json({ error: 'records must be an array' });

        for (const r of records) {
            const { student_id, art_education, work_education, health_physical_education, thinking_skills, social_skills, emotional_skills, attitude_towards_school, attitude_towards_teachers, attitude_towards_peers, teacher_remarks } = r;

            const existing = await db('cce_co_scholastic')
                .where({ school_id: req.user!.school_id, student_id, academic_year_id, term }).first();

            const data = {
                art_education, work_education, health_physical_education,
                thinking_skills, social_skills, emotional_skills,
                attitude_towards_school, attitude_towards_teachers, attitude_towards_peers,
                teacher_remarks, entered_by: req.user!.id,
            };

            if (existing) {
                await db('cce_co_scholastic').where({ id: existing.id }).update(data);
            } else {
                await db('cce_co_scholastic').insert({ school_id: req.user!.school_id, student_id, academic_year_id, term, ...data });
            }
        }

        res.json({ message: `Saved ${records.length} co-scholastic records` });
    } catch (error) {
        logger.error('Bulk co-scholastic save error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GENERATE REPORT CARD DATA ───
router.get('/report-card/:studentId/:examId', authenticate, validate([paramId('studentId'), paramId('examId')]), async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, examId } = req.params;
        const schoolId = req.user!.school_id;

        // Student info
        const student = await db('students')
            .join('student_class_history', 'students.id', 'student_class_history.student_id')
            .join('classes', 'student_class_history.class_id', 'classes.id')
            .join('sections', 'student_class_history.section_id', 'sections.id')
            .where({
                'students.id': studentId,
                'students.school_id': schoolId,
                'student_class_history.status': 'active',
            })
            .select(
                'students.id', 'students.name', 'students.admission_no',
                'student_class_history.roll_no', 'student_class_history.academic_year_id',
                'classes.name as class_name', 'sections.name as section_name'
            )
            .first();

        if (!student) return res.status(404).json({ error: 'Student not found' });

        // Exam info
        const exam = await db('exams').where({ id: examId, school_id: schoolId }).first();
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // Subject marks
        const marks = await db('marks')
            .join('exam_subjects', 'marks.exam_subject_id', 'exam_subjects.id')
            .join('subjects', 'exam_subjects.subject_id', 'subjects.id')
            .where({ 'marks.student_id': studentId, 'exam_subjects.exam_id': examId })
            .select(
                'subjects.name as subject_name',
                'exam_subjects.max_marks',
                'exam_subjects.passing_marks',
                'marks.marks_obtained',
                'marks.is_absent',
                'marks.oral_marks',
                'marks.practical_marks'
            );

        const subjectResults = marks.map((m: any) => {
            const total = Number(m.marks_obtained || 0);
            const pct = m.max_marks > 0 ? (total / m.max_marks) * 100 : 0;
            return {
                subject: m.subject_name,
                max_marks: m.max_marks,
                passing_marks: m.passing_marks,
                marks_obtained: total,
                oral_marks: m.oral_marks,
                practical_marks: m.practical_marks,
                percentage: Math.round(pct * 10) / 10,
                grade: m.is_absent ? 'AB' : cbseGrade(pct),
                passed: !m.is_absent && total >= m.passing_marks,
                is_absent: m.is_absent,
            };
        });

        const totalObtained = subjectResults.reduce((s: number, r: any) => s + r.marks_obtained, 0);
        const totalMax = subjectResults.reduce((s: number, r: any) => s + r.max_marks, 0);
        const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

        // Co-scholastic
        const coScholastic = await db('cce_co_scholastic')
            .where({
                school_id: schoolId,
                student_id: studentId,
                academic_year_id: student.academic_year_id,
                term: exam.term === '1' ? 'Term1' : exam.term === '2' ? 'Term2' : 'Annual',
            }).first();

        // Attendance stats
        const attendanceStats = await db('attendance')
            .join('students', 'attendance.student_id', 'students.id')
            .where({ 'attendance.student_id': studentId, 'students.school_id': schoolId })
            .select(
                db.raw('COUNT(*) as total_days'),
                db.raw("SUM(CASE WHEN attendance.status = 'P' OR attendance.status = 'HD' THEN 1 ELSE 0 END) as present_days")
            )
            .first();

        // Report card config
        const rcConfig = await db('report_card_config').where({ school_id: schoolId }).first();

        res.json({
            student: {
                id: student.id,
                name: student.name,
                admission_no: student.admission_no,
                roll_no: student.roll_no,
                class_name: student.class_name,
                section_name: student.section_name,
            },
            exam: { id: exam.id, name: exam.name, term: exam.term },
            subjects: subjectResults,
            summary: {
                total_obtained: totalObtained,
                total_max: totalMax,
                overall_percentage: Math.round(overallPct * 10) / 10,
                overall_grade: cbseGrade(overallPct),
                result: subjectResults.every((r: any) => r.passed) ? 'PASS' : 'FAIL',
            },
            co_scholastic: coScholastic || null,
            attendance: {
                total_days: Number(attendanceStats?.total_days || 0),
                present_days: Number(attendanceStats?.present_days || 0),
                percentage: attendanceStats?.total_days > 0
                    ? Math.round((Number(attendanceStats.present_days) / Number(attendanceStats.total_days)) * 100)
                    : 0,
            },
            report_card_config: rcConfig || {},
        });
    } catch (error) {
        logger.error('Generate report card error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
