import { Router, Request, Response } from 'express';
import cors from 'cors';
import { body } from 'express-validator';
import db from '../config/database';
import { config } from '../config';
import { validate } from '../middleware/validate';
import logger from '../config/logger';

const router = Router();

// Allow cross-origin requests so external school websites can POST here
router.use(cors({ origin: '*', methods: ['POST', 'OPTIONS'] }));
router.options('/', cors({ origin: '*', methods: ['POST', 'OPTIONS'] }));

const PHONE_RE = /^[+\d][\d\s\-(). ]{5,19}$/;

/**
 * Resolve which school an inbound enquiry belongs to.
 *
 * Two auth methods are supported:
 *  1. x-api-key header == ERP_API_KEY env var  →  use school_id from request body
 *  2. school_token (UUID) in request body       →  look up school by website_token column
 *
 * Returns the school id, or null if auth fails.
 */
async function resolveSchool(req: Request): Promise<{ schoolId: number } | { error: string; status: number }> {
    const apiKey = req.headers['x-api-key'] as string | undefined;

    // ── Method 1: ERP_API_KEY header ──
    if (apiKey) {
        if (!config.erpApiKey || apiKey !== config.erpApiKey) {
            return { error: 'Invalid API key', status: 401 };
        }
        // school_id must be in the body when using the API key method
        const schoolId = parseInt(String(req.body.school_id ?? ''), 10);
        if (!schoolId || isNaN(schoolId)) {
            return { error: 'school_id is required when using x-api-key authentication', status: 400 };
        }
        const school = await db('schools').where('id', schoolId).select('id').first();
        if (!school) {
            return { error: 'School not found', status: 404 };
        }
        return { schoolId };
    }

    // ── Method 2: per-school website_token in body ──
    const token = req.body.school_token;
    if (!token || typeof token !== 'string') {
        return { error: 'Provide either x-api-key header or school_token in the request body', status: 401 };
    }
    const school = await db('schools')
        .where('website_token', String(token))
        .select('id')
        .first();
    if (!school) {
        return { error: 'Invalid school token', status: 401 };
    }
    return { schoolId: school.id as number };
}

// POST /api/public/enquiry
// Auth: x-api-key header (ERP_API_KEY) OR school_token in body.
// Rate-limited in app.ts (publicEnquiryLimiter: 10 req / 15 min per IP).
router.post('/', validate([
    body('student_name').notEmpty().trim().escape().withMessage('Student name is required'),
    body('father_name').notEmpty().trim().escape().withMessage("Father's name is required"),
    body('contact_phone').notEmpty().trim().matches(PHONE_RE).withMessage('Valid phone number is required'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('mother_name').optional({ checkFalsy: true }).trim().escape(),
    body('address').optional({ checkFalsy: true }).trim().escape(),
    body('notes').optional({ checkFalsy: true }).trim().escape(),
    body('class_applying_for').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
]), async (req: Request, res: Response) => {
    try {
        // ── Authenticate & resolve school ──
        const result = await resolveSchool(req);
        if ('error' in result) {
            return res.status(result.status).json({ error: result.error });
        }
        const { schoolId } = result;

        const {
            student_name,
            father_name,
            contact_phone,
            email,
            mother_name,
            address,
            notes,
            class_applying_for,
        } = req.body as Record<string, unknown>;

        // Validate class belongs to this school (if provided)
        if (class_applying_for) {
            const cls = await db('classes')
                .where({ id: class_applying_for, school_id: schoolId })
                .first();
            if (!cls) {
                return res.status(400).json({ error: 'Invalid class selection' });
            }
        }

        // Generate sequential enquiry number
        const [last] = await db('admission_enquiries')
            .where('school_id', schoolId)
            .orderBy('id', 'desc')
            .limit(1);
        const seq = last
            ? parseInt(last.enquiry_number.split('/').pop() || '0') + 1
            : 1;
        const enquiry_number = `ENQ/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}`;

        const [enquiry] = await db('admission_enquiries').insert({
            enquiry_number,
            student_name,
            father_name,
            mother_name: mother_name || null,
            contact_phone,
            email: email || null,
            address: address || null,
            notes: notes || null,
            class_applying_for: class_applying_for || null,
            source: 'website',
            status: 'new',
            school_id: schoolId,
        }).returning(['id', 'enquiry_number']);

        logger.info('Website enquiry submitted', {
            school_id: schoolId,
            enquiry_number: enquiry.enquiry_number,
        });

        res.status(201).json({
            success: true,
            message: 'Enquiry submitted successfully. Our team will contact you shortly.',
            enquiry_number: enquiry.enquiry_number,
        });
    } catch (err) {
        logger.error('Public enquiry submission error', err);
        res.status(500).json({ error: 'Failed to submit enquiry. Please try again.' });
    }
});

export default router;
