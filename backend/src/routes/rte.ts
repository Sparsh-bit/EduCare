import { Router, Response } from 'express';
import { body } from 'express-validator';
import db from '../config/database';
import { authenticate, AuthRequest, authorize, ownerOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();

// ─── RTE STUDENTS LIST ───
router.get('/students', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const students = await db('students')
            .leftJoin('classes', 'students.current_class_id', 'classes.id')
            .where({ 'students.school_id': req.user!.school_id, 'students.is_rte': true })
            .select(
                'students.id', 'students.name', 'students.admission_no',
                'students.rte_category', 'students.rte_admission_number',
                'students.rte_admission_date', 'students.status',
                'classes.name as class_name'
            )
            .orderBy('students.name');

        res.json({ data: students });
    } catch (error) {
        logger.error('Get RTE students error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── TAG STUDENT AS RTE ───
router.put('/students/:studentId/tag', authenticate, authorize('owner', 'co-owner', 'admin'), validate([
    paramId('studentId'),
    body('rte_category').isIn(['EWS', 'DG', 'CWSN']),
]), async (req: AuthRequest, res: Response) => {
    try {
        const { is_rte, rte_category, rte_admission_number, rte_admission_date } = req.body;
        const student = await db('students').where({ id: req.params.studentId, school_id: req.user!.school_id }).first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        await db('students').where({ id: req.params.studentId, school_id: req.user!.school_id }).update({
            is_rte: is_rte ?? true,
            rte_category: rte_category || null,
            rte_admission_number: rte_admission_number || null,
            rte_admission_date: rte_admission_date || null,
        });

        res.json({ message: 'RTE status updated for student' });
    } catch (error) {
        logger.error('Tag RTE student error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── RTE QUOTA CONFIG ───
router.get('/quota', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { academic_year_id } = req.query;
        let ayId = academic_year_id;
        if (!ayId) {
            const ay = await db('academic_years').where({ is_current: true, school_id: req.user!.school_id }).first();
            ayId = ay?.id;
        }

        const quotas = await db('rte_quota_config')
            .join('classes', 'rte_quota_config.class_id', 'classes.id')
            .where({ 'rte_quota_config.school_id': req.user!.school_id, 'rte_quota_config.academic_year_id': ayId })
            .select('rte_quota_config.*', 'classes.name as class_name')
            .orderBy('classes.name');

        // Count actual RTE students per class
        const rteCounts = await db('students')
            .join('student_class_history', function () {
                this.on('students.id', 'student_class_history.student_id')
                    .andOn('student_class_history.academic_year_id', db.raw('?', [ayId]));
            })
            .where({ 'students.school_id': req.user!.school_id, 'students.is_rte': true })
            .groupBy('student_class_history.class_id')
            .select('student_class_history.class_id', db.raw('COUNT(*) as count'));

        const countMap = new Map(rteCounts.map((r: any) => [r.class_id, Number(r.count)]));
        const enriched = quotas.map((q: any) => ({ ...q, rte_filled: countMap.get(q.class_id) || 0 }));

        res.json({ data: enriched });
    } catch (error) {
        logger.error('Get RTE quota error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/quota', authenticate, authorize('owner', 'co-owner', 'admin'), validate([
    body('class_id').isInt(),
    body('total_seats').isInt({ min: 1 }),
]), async (req: AuthRequest, res: Response) => {
    try {
        const { class_id, academic_year_id, total_seats, rte_seats } = req.body;
        const ay_id = academic_year_id || (await db('academic_years').where({ is_current: true, school_id: req.user!.school_id }).first())?.id;

        const computed_rte_seats = rte_seats ?? Math.ceil(total_seats * 0.25);

        await db('rte_quota_config')
            .insert({ school_id: req.user!.school_id, class_id, academic_year_id: ay_id, total_seats, rte_seats: computed_rte_seats })
            .onConflict(['school_id', 'class_id', 'academic_year_id'])
            .merge({ total_seats, rte_seats: computed_rte_seats });

        res.json({ message: 'Quota configuration saved' });
    } catch (error) {
        logger.error('Save RTE quota error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── ENTITLEMENT RECORDS ───
router.get('/entitlements', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { academic_year_id, student_id } = req.query;
        let q = db('rte_entitlement_records')
            .join('students', 'rte_entitlement_records.student_id', 'students.id')
            .where({ 'rte_entitlement_records.school_id': req.user!.school_id })
            .select('rte_entitlement_records.*', 'students.name as student_name', 'students.admission_no');
        if (academic_year_id) q = q.where('rte_entitlement_records.academic_year_id', academic_year_id);
        if (student_id) q = q.where('rte_entitlement_records.student_id', student_id);
        const records = await q.orderBy('students.name');
        res.json({ data: records });
    } catch (error) {
        logger.error('Get entitlements error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/entitlements', authenticate, authorize('owner', 'co-owner', 'admin'), validate([
    body('student_id').isInt(),
    body('entitlement_type').isIn(['uniform', 'books', 'mid_day_meal', 'stationery', 'bag']),
]), async (req: AuthRequest, res: Response) => {
    try {
        const { student_id, academic_year_id, entitlement_type, provided, provided_date, cost, remarks } = req.body;
        const student = await db('students').where({ id: student_id, school_id: req.user!.school_id }).first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const ay_id = academic_year_id || (await db('academic_years').where({ is_current: true, school_id: req.user!.school_id }).first())?.id;

        const [record] = await db('rte_entitlement_records').insert({
            school_id: req.user!.school_id,
            student_id, academic_year_id: ay_id, entitlement_type,
            provided: provided ?? false,
            provided_date: provided_date || null,
            cost: cost || null,
            remarks: remarks || null,
        }).returning('*');

        res.status(201).json({ message: 'Entitlement recorded', data: record });
    } catch (error) {
        logger.error('Record entitlement error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/entitlements/:id', authenticate, authorize('owner', 'co-owner', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const { provided, provided_date, cost, remarks } = req.body;
        await db('rte_entitlement_records')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ provided, provided_date, cost, remarks });
        res.json({ message: 'Entitlement updated' });
    } catch (error) {
        logger.error('Update entitlement error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── REIMBURSEMENT CLAIMS ───
router.get('/claims', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const claims = await db('rte_reimbursement_claims')
            .where({ school_id: req.user!.school_id })
            .orderBy('claim_date', 'desc');
        res.json({ data: claims });
    } catch (error) {
        logger.error('Get RTE claims error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/claims', authenticate, authorize('owner', 'co-owner', 'admin'), validate([
    body('claim_date').isDate(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const { academic_year_id, claim_date, claim_number, student_count, total_amount, remarks } = req.body;
        const ay_id = academic_year_id || (await db('academic_years').where({ is_current: true, school_id: req.user!.school_id }).first())?.id;

        const [claim] = await db('rte_reimbursement_claims').insert({
            school_id: req.user!.school_id,
            academic_year_id: ay_id, claim_date,
            claim_number: claim_number || null,
            student_count: student_count || 0,
            total_amount: total_amount || 0,
            remarks: remarks || null,
        }).returning('*');

        res.status(201).json({ message: 'Claim created', data: claim });
    } catch (error) {
        logger.error('Create RTE claim error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/claims/:id', authenticate, authorize('owner', 'co-owner', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const { status, submission_date, payment_date, amount_received, remarks } = req.body;
        await db('rte_reimbursement_claims')
            .where({ id: req.params.id, school_id: req.user!.school_id })
            .update({ status, submission_date, payment_date, amount_received, remarks });
        res.json({ message: 'Claim updated' });
    } catch (error) {
        logger.error('Update RTE claim error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── SUMMARY REPORT ───
router.get('/report', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const ay = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();

        const [totalRte] = await db('students').where({ school_id: schoolId, is_rte: true }).count('id as total');
        const byCat = await db('students').where({ school_id: schoolId, is_rte: true })
            .groupBy('rte_category').select('rte_category', db.raw('COUNT(*) as count'));

        const quotaRows = await db('rte_quota_config')
            .join('classes', 'rte_quota_config.class_id', 'classes.id')
            .where({ 'rte_quota_config.school_id': schoolId, 'rte_quota_config.academic_year_id': ay?.id })
            .select('classes.name as class_name', 'rte_quota_config.class_id', 'rte_quota_config.total_seats', 'rte_quota_config.rte_seats');

        const rteCounts = await db('students')
            .join('student_class_history', function () {
                this.on('students.id', 'student_class_history.student_id')
                    .andOn('student_class_history.academic_year_id', db.raw('?', [ay?.id]));
            })
            .where({ 'students.school_id': schoolId, 'students.is_rte': true })
            .groupBy('student_class_history.class_id')
            .select('student_class_history.class_id', db.raw('COUNT(*) as count'));

        const rteCountMap = new Map(rteCounts.map((r: any) => [r.class_id, Number(r.count)]));
        const quotas = quotaRows.map((q: any) => ({ ...q, rte_filled: rteCountMap.get(q.class_id) || 0 }));

        const [entitlements] = await db('rte_entitlement_records')
            .where({ school_id: schoolId, academic_year_id: ay?.id, provided: true })
            .count('id as provided_count');

        const [claimSummary] = await db('rte_reimbursement_claims')
            .where({ school_id: schoolId })
            .sum('total_amount as total_claimed')
            .sum('amount_received as total_received');

        res.json({
            total_rte_students: Number(totalRte.total),
            by_category: byCat,
            quota_utilization: quotas,
            entitlements_provided: Number(entitlements.provided_count),
            total_claimed: Number(claimSummary.total_claimed || 0),
            total_received: Number(claimSummary.total_received || 0),
        });
    } catch (error) {
        logger.error('RTE report error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── AGE VALIDATION ───
router.post('/validate-age/:studentId', authenticate, validate([paramId('studentId')]), async (req: AuthRequest, res: Response) => {
    try {
        const student = await db('students').where({ id: req.params.studentId, school_id: req.user!.school_id }).first();
        if (!student) return res.status(404).json({ error: 'Student not found' });
        if (!student.dob) return res.status(400).json({ error: 'Date of birth not set for student' });

        const dob = new Date(student.dob);
        const now = new Date();
        const ageYears = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

        const eligible = ageYears >= 6 && ageYears <= 14;
        res.json({
            age_years: Math.floor(ageYears),
            rte_eligible: eligible,
            message: eligible
                ? 'Student is within RTE eligible age range (6-14 years)'
                : `Student age (${Math.floor(ageYears)} years) is outside RTE eligible range (6-14 years)`,
        });
    } catch (error) {
        logger.error('RTE age validation error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── UDISE EXPORT FORMAT ───
router.get('/udise-export', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        const ay = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();

        const byCategory = await db('students')
            .join('student_class_history', function () {
                this.on('students.id', 'student_class_history.student_id')
                    .andOn('student_class_history.academic_year_id', db.raw('?', [ay?.id]));
            })
            .join('classes', 'student_class_history.class_id', 'classes.id')
            .where({ 'students.school_id': schoolId, 'students.is_rte': true })
            .groupBy('classes.name', 'students.gender', 'students.rte_category')
            .select('classes.name as class_name', 'students.gender', 'students.rte_category', db.raw('COUNT(*) as count'));

        res.json({ data: byCategory, academic_year: ay?.year });
    } catch (error) {
        logger.error('RTE UDISE export error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
