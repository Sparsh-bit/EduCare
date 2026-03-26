import { Router, Response } from 'express';
import { body } from 'express-validator';
import db from '../config/database';
import { authenticate, AuthRequest, ownerOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import logger from '../config/logger';

const router = Router();

// Ensure udise_infrastructure table exists (created inline)
async function ensureInfraTable() {
    const exists = await db.schema.hasTable('udise_infrastructure');
    if (!exists) {
        await db.schema.createTable('udise_infrastructure', (t) => {
            t.increments('id').primary();
            t.integer('school_id').unsigned().notNullable().unique();
            t.integer('classrooms').defaultTo(0);
            t.integer('labs').defaultTo(0);
            t.integer('library_books').defaultTo(0);
            t.integer('boys_toilets').defaultTo(0);
            t.integer('girls_toilets').defaultTo(0);
            t.boolean('has_drinking_water').defaultTo(false);
            t.boolean('has_electricity').defaultTo(false);
            t.boolean('has_internet').defaultTo(false);
            t.boolean('has_playground').defaultTo(false);
            t.boolean('has_medical_room').defaultTo(false);
            t.timestamps(true, true);
        });
    }
}

// ─── FULL UDISE+ EXPORT ───
router.get('/export', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        await ensureInfraTable();
        const schoolId = req.user!.school_id;
        const ay = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        const boardConfig = await db('board_config').where({ school_id: schoolId }).first();
        const school = await db('schools').where({ id: schoolId }).first();

        // Enrollment by class and gender
        const enrollment = await db('students')
            .join('student_class_history', function () {
                this.on('students.id', 'student_class_history.student_id')
                    .andOn('student_class_history.academic_year_id', db.raw('?', [ay?.id]));
            })
            .join('classes', 'student_class_history.class_id', 'classes.id')
            .where({ 'students.school_id': schoolId, 'students.status': 'active' })
            .groupBy('classes.name', 'classes.id', 'students.gender')
            .select('classes.id as class_id', 'classes.name as class_name', 'students.gender', db.raw('COUNT(*) as count'))
            .orderBy('classes.name');

        // Teacher stats
        const teacherStats = await db('staff')
            .where({ school_id: schoolId, status: 'active' })
            .select('designation', 'qualification', 'gender')
            .orderBy('name');

        const totalTeachers = teacherStats.length;
        const maleTeachers = teacherStats.filter((t: any) => t.gender === 'male').length;
        const femaleTeachers = teacherStats.filter((t: any) => t.gender === 'female').length;

        // Infrastructure
        const infra = await db('udise_infrastructure').where({ school_id: schoolId }).first();

        // Total students
        const [studentCount] = await db('students').where({ school_id: schoolId, status: 'active' }).count('id as total');
        const [rteCount] = await db('students').where({ school_id: schoolId, is_rte: true, status: 'active' }).count('id as total');

        res.json({
            generated_at: new Date().toISOString(),
            academic_year: ay?.year,
            school_profile: {
                name: school?.name,
                udise_code: boardConfig?.udise_code,
                board_type: boardConfig?.board_type,
                pan_number: boardConfig?.pan_number,
                gstin: boardConfig?.gstin,
                affiliation_number: null,
            },
            enrollment: {
                total_students: Number(studentCount.total),
                rte_students: Number(rteCount.total),
                by_class_gender: enrollment,
            },
            teachers: {
                total: totalTeachers,
                male: maleTeachers,
                female: femaleTeachers,
                by_designation: teacherStats.reduce((acc: any, t: any) => {
                    acc[t.designation || 'Unknown'] = (acc[t.designation || 'Unknown'] || 0) + 1;
                    return acc;
                }, {}),
            },
            infrastructure: infra || {
                classrooms: 0, labs: 0, library_books: 0,
                boys_toilets: 0, girls_toilets: 0,
                has_drinking_water: false, has_electricity: false,
                has_internet: false, has_playground: false, has_medical_room: false,
            },
        });
    } catch (error) {
        logger.error('UDISE export error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── INFRASTRUCTURE ───
router.get('/infrastructure', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        await ensureInfraTable();
        const infra = await db('udise_infrastructure').where({ school_id: req.user!.school_id }).first();
        res.json(infra || {});
    } catch (error) {
        logger.error('Get infrastructure error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/infrastructure', authenticate, ownerOnly(), async (req: AuthRequest, res: Response) => {
    try {
        await ensureInfraTable();
        const { classrooms, labs, library_books, boys_toilets, girls_toilets, has_drinking_water, has_electricity, has_internet, has_playground, has_medical_room } = req.body;
        const data = { classrooms, labs, library_books, boys_toilets, girls_toilets, has_drinking_water, has_electricity, has_internet, has_playground, has_medical_room };

        const existing = await db('udise_infrastructure').where({ school_id: req.user!.school_id }).first();
        if (existing) {
            await db('udise_infrastructure').where({ school_id: req.user!.school_id }).update(data);
        } else {
            await db('udise_infrastructure').insert({ school_id: req.user!.school_id, ...data });
        }
        res.json({ message: 'Infrastructure data saved' });
    } catch (error) {
        logger.error('Save infrastructure error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── ENROLLMENT SUMMARY ───
router.get('/enrollment-summary', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const ay = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();

        const summary = await db('students')
            .join('student_class_history', function () {
                this.on('students.id', 'student_class_history.student_id')
                    .andOn('student_class_history.academic_year_id', db.raw('?', [ay?.id]));
            })
            .join('classes', 'student_class_history.class_id', 'classes.id')
            .where({ 'students.school_id': schoolId, 'students.status': 'active' })
            .groupBy('classes.id', 'classes.name')
            .select(
                'classes.name as class_name',
                db.raw("SUM(CASE WHEN students.gender = 'male' THEN 1 ELSE 0 END) as boys"),
                db.raw("SUM(CASE WHEN students.gender = 'female' THEN 1 ELSE 0 END) as girls"),
                db.raw('COUNT(*) as total'),
                db.raw("SUM(CASE WHEN students.is_rte THEN 1 ELSE 0 END) as rte_students")
            )
            .orderBy('classes.name');

        res.json({ data: summary, academic_year: ay?.year });
    } catch (error) {
        logger.error('Enrollment summary error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── TEACHER SUMMARY ───
router.get('/teacher-summary', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const staffList = await db('staff')
            .where({ school_id: req.user!.school_id, status: 'active' })
            .select('id', 'name', 'designation', 'qualification', 'join_date');

        const total = staffList.length;
        const byDesig: Record<string, number> = {};
        const byQual: Record<string, number> = {};
        staffList.forEach((s: any) => {
            byDesig[s.designation || 'Unknown'] = (byDesig[s.designation || 'Unknown'] || 0) + 1;
            byQual[s.qualification || 'Not Specified'] = (byQual[s.qualification || 'Not Specified'] || 0) + 1;
        });

        res.json({
            total,
            male: 0,
            female: 0,
            by_designation: byDesig,
            by_qualification: byQual,
        });
    } catch (error) {
        logger.error('Teacher summary error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
