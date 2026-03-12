import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import db from '../config/database';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import { createAuditLog, getClientIp } from '../utils/auditLog';
import { encryptAadhaar, getAadhaarLast4 } from '../utils/encryption';
import { generateAdmissionNo, generateRollNo, generateStudentUid, generateTCNo, getPaginationParams } from '../utils/helpers';
import logger from '../config/logger';
import { transliterateToHindi, suggestClass, mapStudentImportHeaders } from '../services/gemini';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';

const router = Router();

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

// File upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, config.uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: config.maxFileSize },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const mime = (file.mimetype || '').toLowerCase();

        if (!ALLOWED_DOCUMENT_EXTENSIONS.has(ext) || !ALLOWED_DOCUMENT_MIME_TYPES.has(mime)) {
            return cb(new Error('Unsupported file type. Allowed formats: PDF, JPG, JPEG, PNG, WEBP'));
        }

        cb(null, true);
    },
});

const IMPORT_ALLOWED_MIME_TYPES = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
    'application/octet-stream',
]);

const IMPORT_ALLOWED_EXTENSIONS = new Set(['.xlsx', '.csv']);

const importUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.importMaxFileSize },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const mime = (file.mimetype || '').toLowerCase();
        const extensionAllowed = IMPORT_ALLOWED_EXTENSIONS.has(ext);
        const mimeAllowed = IMPORT_ALLOWED_MIME_TYPES.has(mime);

        // Browsers and OSes sometimes send generic/incorrect MIME types for spreadsheets.
        // Accept when either extension OR MIME indicates a supported file.
        if (!extensionAllowed && !mimeAllowed) {
            return cb(new Error('Unsupported file type. Allowed formats: XLSX, CSV'));
        }
        cb(null, true);
    },
});

// POST /api/students — Create admission
router.post(
    '/',
    authenticate,
    authorize('tenant_admin', 'admin'),
    validate([
        body('name').notEmpty().trim(),
        body('dob').isDate(),
        body('gender').isIn(['male', 'female', 'other']),
        body('father_name').notEmpty().trim(),
        body('current_class_id').isInt(),
        body('current_section_id').isInt(),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const schoolId = req.user?.school_id;
            if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

            const data = req.body;

            // Get current academic year
            const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
            if (!academicYear) return res.status(400).json({ error: 'No active academic year found' });

            const targetClass = await db('classes').where({ id: data.current_class_id, school_id: schoolId }).first();
            if (!targetClass) return res.status(400).json({ error: 'Selected class is invalid for your school' });

            const targetSection = await db('sections')
                .join('classes', 'sections.class_id', 'classes.id')
                .where('sections.id', data.current_section_id)
                .andWhere('sections.class_id', data.current_class_id)
                .andWhere('classes.school_id', schoolId)
                .select('sections.id')
                .first();
            if (!targetSection) return res.status(400).json({ error: 'Selected section is invalid for your school/class' });

            // Handle Aadhaar encryption
            let aadhaarEncrypted = null;
            let aadhaarLast4 = null;
            if (data.aadhaar) {
                aadhaarEncrypted = encryptAadhaar(data.aadhaar);
                aadhaarLast4 = getAadhaarLast4(data.aadhaar);
            }

            // Fetch school for admission prefix
            const school = await db('schools').where('id', schoolId).select('admission_prefix').first();
            const admissionPrefix = school?.admission_prefix || 'SCH';

            // Generate admission number, roll number, and student UID
            const admissionNo = data.admission_no || await generateAdmissionNo(academicYear.year.split('-')[0], admissionPrefix);
            const rollNo = await generateRollNo(
                academicYear.year.split('-')[0],
                targetClass.numeric_order,
                data.current_class_id,
                academicYear.id,
                data.current_section_id,
                schoolId,
            );
            const studentUid = generateStudentUid();

            const student = await db.transaction(async (trx) => {
                const [createdStudent] = await trx('students').insert({
                    school_id: schoolId,
                    student_uid: studentUid,
                    admission_no: admissionNo,
                    sr_no: data.sr_no || null,
                    name: data.name,
                    name_hi: data.name_hi,
                    dob: data.dob,
                    gender: data.gender,
                    aadhaar_encrypted: aadhaarEncrypted,
                    aadhaar_last4: aadhaarLast4,
                    category: data.category || 'GEN',
                    religion: data.religion,
                    nationality: data.nationality || 'Indian',
                    blood_group: data.blood_group,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    pincode: data.pincode,
                    father_name: data.father_name,
                    father_phone: data.father_phone,
                    father_occupation: data.father_occupation,
                    father_email: data.father_email,
                    mother_name: data.mother_name,
                    mother_phone: data.mother_phone,
                    mother_occupation: data.mother_occupation,
                    guardian_name: data.guardian_name,
                    guardian_phone: data.guardian_phone,
                    guardian_relation: data.guardian_relation,
                    current_class_id: data.current_class_id,
                    current_section_id: data.current_section_id,
                    current_roll_no: rollNo,
                    academic_year_id: academicYear.id,
                    status: 'active',
                    admission_date: data.admission_date || new Date().toISOString().split('T')[0],
                    previous_school: data.previous_school,
                }).returning('*');

                await trx('student_class_history').insert({
                    student_id: createdStudent.id,
                    school_id: schoolId,
                    class_id: data.current_class_id,
                    section_id: data.current_section_id,
                    roll_no: createdStudent.current_roll_no,
                    academic_year_id: academicYear.id,
                    status: 'admitted',
                });

                return createdStudent;
            });

            await createAuditLog({
                user_id: req.user!.id,
                action: 'create',
                entity_type: 'student',
                entity_id: student.id,
                new_value: { admission_no: admissionNo, name: data.name },
                ip_address: getClientIp(req),
            });

            const { aadhaar_encrypted: _ae, ...safeStudent } = student;
            res.status(201).json(safeStudent);
        } catch (error: any) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Admission number already exists' });
            }
            logger.error('Create student error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/students — List students
router.get('/', authenticate, authorize('tenant_admin', 'admin', 'teacher'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const { limit, offset, page } = getPaginationParams(req.query);
        const { class_id, section_id, status, search, academic_year_id } = req.query as any;

        let query = db('students')
            .leftJoin('classes', 'students.current_class_id', 'classes.id')
            .leftJoin('sections', 'students.current_section_id', 'sections.id')
            .where('students.school_id', schoolId)
            .whereNull('students.deleted_at')
            .select(
                'students.*',
                'classes.name as class_name',
                'classes.numeric_order',
                'sections.name as section_name'
            );

        if (class_id) query = query.where('students.current_class_id', class_id);
        if (section_id) query = query.where('students.current_section_id', section_id);
        if (status) query = query.where('students.status', status);
        if (academic_year_id) query = query.where('students.academic_year_id', academic_year_id);
        if (search) {
            query = query.where((qb) => {
                qb.whereILike('students.name', `%${search}%`)
                    .orWhereILike('students.admission_no', `%${search}%`)
                    .orWhereILike('students.father_name', `%${search}%`)
                    .orWhereILike('students.current_roll_no', `%${search}%`)
                    .orWhereILike('students.sr_no', `%${search}%`);
            });
        }

        const countQuery = query.clone().clearSelect().clearOrder().count('students.id as total').first();
        const [students, countResult] = await Promise.all([
            query.orderBy('classes.numeric_order').orderBy('students.current_roll_no').limit(limit).offset(offset),
            countQuery,
        ]);

        // Strip encrypted Aadhaar — only last4 digit hint is safe to transmit
        const safeStudents = students.map(({ aadhaar_encrypted: _ae, ...s }: any) => s);
        res.json({
            data: safeStudents,
            pagination: { page, limit, total: parseInt((countResult as any)?.total || '0') },
        });
    } catch (error) {
        logger.error('List students error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── UTILITY: Classes & Sections for dropdowns ───
// IMPORTANT: These must be defined BEFORE /:id routes to avoid matching "classes" as an ID

// GET /api/students/classes — All classes for this school
router.get('/classes', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const classes = await db('classes')
            .where({ school_id: schoolId })
            .orderBy('numeric_order');
        res.json(classes);
    } catch (error) {
        logger.error('Get classes error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/students/sections/:classId — Sections for a class
router.get('/sections/:classId', authenticate, validate([paramId('classId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const classExists = await db('classes').where({ id: req.params.classId, school_id: schoolId }).first();
        if (!classExists) return res.status(404).json({ error: 'Class not found' });

        const sections = await db('sections')
            .where({ class_id: req.params.classId })
            .orderBy('name');
        res.json(sections);
    } catch (error) {
        logger.error('Get sections error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/students/academic-years — Academic years for this school
router.get('/academic-years', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });
        const years = await db('academic_years').where({ school_id: schoolId }).orderBy('start_date', 'desc');
        res.json(years);
    } catch (error) {
        logger.error('Get academic years error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/students/subjects/:classId — Subjects for a class (school-scoped via class ownership)
router.get('/subjects/:classId', authenticate, validate([paramId('classId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const classExists = await db('classes').where({ id: req.params.classId, school_id: schoolId }).first();
        if (!classExists) return res.status(404).json({ error: 'Class not found' });

        const subjects = await db('subjects')
            .where({ class_id: req.params.classId })
            .orderBy('name');
        res.json(subjects);
    } catch (error) {
        logger.error('Get subjects error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── AI-POWERED ENDPOINTS ───

// POST /api/students/ai/hindi-name — Transliterate name to Hindi
router.post('/ai/hindi-name', authenticate, validate([
    body('name').notEmpty().trim(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const hindiName = await transliterateToHindi(req.body.name);
        res.json({ hindi_name: hindiName });
    } catch (error) {
        logger.error('Hindi transliteration error', error);
        res.status(502).json({ error: 'AI service temporarily unavailable' });
    }
});

// POST /api/students/ai/suggest-class — AI-based class suggestion
router.post('/ai/suggest-class', authenticate, validate([
    body('name').notEmpty().trim(),
    body('dob').isDate(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const classes = await db('classes')
            .where({ school_id: schoolId })
            .orderBy('numeric_order');
        const classNames = classes.map((c: any) => c.name);

        const suggestion = await suggestClass(
            req.body.name,
            req.body.dob,
            req.body.previous_school,
            req.body.previous_class,
            classNames
        );

        const matchedClass = classes.find((c: any) =>
            c.name.toLowerCase() === suggestion.suggested_class.toLowerCase()
            || c.name.toLowerCase().includes(suggestion.suggested_class.toLowerCase())
            || suggestion.suggested_class.toLowerCase().includes(c.name.toLowerCase())
        );

        res.json({
            suggested_class: suggestion.suggested_class,
            suggested_class_id: matchedClass?.id || null,
            reason: suggestion.reason,
            available_classes: classes,
        });
    } catch (error) {
        logger.error('AI class suggestion error', error);
        res.status(502).json({ error: 'AI service temporarily unavailable' });
    }
});

// POST /api/students/import/preview — Analyze file and prepare preview batch (no DB inserts)
router.post('/import/preview', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), importUpload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });
        if (!req.file) return res.status(400).json({ error: 'File is required' });

        const rawRows = await parseImportFileRows(req.file);
        if (!rawRows.length) return res.status(400).json({ error: 'File has no data rows' });
        if (rawRows.length > 5000) {
            return res.status(400).json({ error: 'File exceeds maximum import limit of 5,000 rows. Split into multiple files and upload separately.' });
        }

        const headers = Object.keys(rawRows[0] || {});
        const headerMap = await mapStudentImportHeaders(headers, rawRows.slice(0, 3));
        const mappingPayload = buildMappingPayload(headerMap);

        const classes = await db('classes').where({ school_id: schoolId }).orderBy('numeric_order');
        const sections = await db('sections').whereIn('class_id', classes.map((c: any) => c.id));

        const normalizedRows: Array<{ row: number; normalized: any; errors: string[]; warnings: string[]; new_class_required: boolean; new_section_required: boolean }> = [];
        const admissionSeen = new Set<string>();
        const rowKeySeen = new Set<string>();

        for (let i = 0; i < rawRows.length; i++) {
            const rowNo = i + 2;
            const raw = rawRows[i] || {};
            const row = remapRow(raw, headerMap);
            const errors: string[] = [];
            const warnings: string[] = [];

            const student_name = cleanText(row.name || row.student_name || row.full_name);
            const father_name = cleanText(row.father_name || row.guardian || row.guardian_name);
            const mother_name = cleanText(row.mother_name);
            const admission_number = cleanText(row.admission_number || row.admission_no || row.adm_no || row.admno);
            const roll_number = cleanText(row.roll_number || row.roll_no);
            const date_of_birth = parseDateToIso(row.dob || row.date_of_birth);
            const address = cleanText(row.address);
            const gender = normalizeGender(row.gender);
            const email = cleanText(row.email || row.father_email);
            const phone = normalizePhone(row.phone || row.mobile || row.contact || row.father_phone);

            const classInput = row.class_name || row.class || row.std || row.standard || row.grade;
            const sectionInput = row.section_name || row.section || row.sec;
            const classRec = resolveClass(classes, classInput);
            const sectionRec = classRec ? (resolveSection(sections, classRec.id, sectionInput) || null) : null;

            const classVal = classRec?.name || normalizeClassDisplay(classInput);
            const sectionVal = sectionRec?.name || normalizeSection(sectionInput);

            const new_class_required = !classRec;
            const new_section_required = !!classRec && !sectionRec;

            if (!student_name) errors.push('Missing required field: student_name');
            if (!classVal) errors.push('Missing required field: class');
            if (!sectionVal) errors.push('Missing required field: section');
            if (new_class_required && classVal) errors.push('Class does not exist in ERP (new_class_required=true)');
            if (new_section_required && sectionVal) errors.push('Section does not exist in ERP (new_class_required=true)');
            if ((row.phone || row.mobile || row.contact || row.father_phone) && !phone) errors.push('Invalid phone number');

            if (!father_name) warnings.push('Missing recommended field: father_name');
            if (!phone) warnings.push('Missing recommended field: phone');
            if (!admission_number) warnings.push('Missing recommended field: admission_number');

            const admissionKey = admission_number.toLowerCase();
            if (admissionKey) {
                if (admissionSeen.has(admissionKey)) errors.push('Duplicate admission number in upload');
                admissionSeen.add(admissionKey);
            }

            const duplicateKey = buildDuplicateKey(student_name, father_name, classRec?.id || classVal);
            if (duplicateKey) {
                if (rowKeySeen.has(duplicateKey)) errors.push('Duplicate student record in upload');
                rowKeySeen.add(duplicateKey);
            }

            normalizedRows.push({
                row: rowNo,
                normalized: {
                    student_name,
                    class: classVal,
                    section: sectionVal,
                    class_id: classRec?.id || null,
                    section_id: sectionRec?.id || null,
                    father_name,
                    mother_name,
                    phone,
                    admission_number,
                    roll_number,
                    date_of_birth,
                    address,
                    gender,
                    email,
                },
                errors,
                warnings,
                new_class_required,
                new_section_required,
            });
        }

        const admissionNumbers = normalizedRows
            .map((r) => r.normalized.admission_number)
            .filter((v) => !!v);
        if (admissionNumbers.length) {
            const existingByAdmission = await db('students')
                .where({ school_id: schoolId })
                .whereNull('deleted_at')
                .whereIn('admission_no', admissionNumbers)
                .select('admission_no');
            const existingAdmissions = new Set(existingByAdmission.map((s: any) => String(s.admission_no).toLowerCase()));
            normalizedRows.forEach((r) => {
                const adm = String(r.normalized.admission_number || '').toLowerCase();
                if (adm && existingAdmissions.has(adm)) r.errors.push('Duplicate admission number in ERP');
            });
        }

        const classIds = Array.from(new Set(normalizedRows.map((r) => r.normalized.class_id).filter(Boolean)));
        if (classIds.length) {
            const existingStudents = await db('students')
                .where({ school_id: schoolId })
                .whereNull('deleted_at')
                .whereIn('current_class_id', classIds as number[])
                .select('name', 'father_name', 'current_class_id');
            const existingKeySet = new Set(existingStudents.map((s: any) => buildDuplicateKey(s.name, s.father_name, s.current_class_id)).filter(Boolean));
            normalizedRows.forEach((r) => {
                const key = buildDuplicateKey(r.normalized.student_name, r.normalized.father_name, r.normalized.class_id);
                if (key && existingKeySet.has(key)) r.errors.push('Duplicate student record already exists in ERP');
            });
        }

        const validRows = normalizedRows.filter((r) => r.errors.length === 0);
        const invalidRows = normalizedRows.filter((r) => r.errors.length > 0);

        const classDistribution = validRows.reduce((acc, r) => {
            const cls = String(r.normalized.class || 'Unknown');
            acc[cls] = (acc[cls] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const classWiseSummary = Object.entries(classDistribution).map(([class_name, added_count]) => ({ class_name, added_count }));

        const items = normalizedRows.map((r, idx) => ({
            school_id: schoolId,
            row_number: r.row,
            class_id: r.normalized.class_id,
            class_name: r.normalized.class,
            student_name: r.normalized.student_name,
            status: r.errors.length ? 'invalid' : 'valid',
            error: r.errors.join('; ') || null,
            raw_payload: {
                source_row: rawRows[idx],
                normalized: r.normalized,
                errors: r.errors,
                warnings: r.warnings,
                flags: { new_class_required: r.new_class_required, new_section_required: r.new_section_required },
            },
        }));

        // Atomic: batch header + all items in one transaction to prevent orphan batches
        const originalFileName = req.file.originalname;
        let batch: any;
        await db.transaction(async (trx) => {
            [batch] = await trx('student_import_batches').insert({
                school_id: schoolId,
                uploaded_by: req.user?.id || null,
                original_file_name: originalFileName,
                total_rows: rawRows.length,
                created_count: 0,
                failed_count: invalidRows.length,
                status: 'preview_ready',
                detected_header_mapping: toJsonb({ mapping: mappingPayload, headers }),
                class_wise_summary: toJsonb(classWiseSummary),
            }).returning('*');

            const itemsWithBatch = items.map((item) => ({ ...item, batch_id: batch.id }));
            if (itemsWithBatch.length) await trx.batchInsert('student_import_batch_items', itemsWithBatch, 200);
        });

        return res.json({
            status: 'preview_ready',
            batch_id: batch.id,
            file_name: req.file.originalname,
            total_rows_detected: rawRows.length,
            valid_students: validRows.length,
            invalid_rows: invalidRows.length,
            headers_detected: headers,
            class_distribution: classDistribution,
            class_wise_summary: classWiseSummary,
            mapping: mappingPayload,
            errors: invalidRows.map((r) => ({ row: r.row, errors: r.errors })),
            preview_records: validRows.slice(0, 20).map((r) => r.normalized),
        });

    } catch (error) {
        const err = error as Error;
        logger.error('Student import preview error', {
            message: err?.message,
            stack: err?.stack,
            name: err?.name,
        });
        res.status(500).json({
            error: 'Failed to prepare import preview',
            ...(process.env.NODE_ENV !== 'production' ? { detail: err?.message } : {}),
        });
    }
});

// POST /api/students/import/:batchId/remap — Re-run preview analysis with manually adjusted header mapping
router.post('/import/:batchId/remap', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), validate([
    param('batchId').isInt({ min: 1 }),
    body('mapping').isObject().withMessage('mapping object is required'),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const batchId = Number(req.params.batchId);
        const batch = await db('student_import_batches').where({ id: batchId, school_id: schoolId }).first();
        if (!batch) return res.status(404).json({ error: 'Import batch not found' });
        if (batch.status !== 'preview_ready') {
            return res.status(400).json({ error: `Batch is in ${batch.status} state and cannot be remapped` });
        }

        const items = await db('student_import_batch_items')
            .where({ batch_id: batchId, school_id: schoolId })
            .orderBy('row_number');
        if (!items.length) return res.status(400).json({ error: 'Batch has no rows to remap' });

        const sourceRows = items.map((item: any) => ({
            row: Number(item.row_number),
            raw: (item.raw_payload?.source_row || null) as Record<string, any> | null,
        }));
        if (sourceRows.some((r) => !r.raw)) {
            return res.status(400).json({ error: 'Batch cannot be remapped because source rows are missing' });
        }

        const headersDetected = Array.from(new Set(sourceRows.flatMap((r) => Object.keys(r.raw || {}))));
        const userMapping = req.body.mapping as Record<string, { field: string; confidence?: number }>;
        const headerMap = parseMappingPayload(userMapping, headersDetected);
        const mappingPayload = buildMappingPayload(headerMap);

        const classes = await db('classes').where({ school_id: schoolId }).orderBy('numeric_order');
        const sections = await db('sections').whereIn('class_id', classes.map((c: any) => c.id));

        const normalizedRows: Array<{ row: number; normalized: any; errors: string[]; warnings: string[]; new_class_required: boolean; new_section_required: boolean; source: Record<string, any> }> = [];
        const admissionSeen = new Set<string>();
        const rowKeySeen = new Set<string>();

        for (const src of sourceRows) {
            const rowNo = src.row;
            const raw = src.raw || {};
            const row = remapRow(raw, headerMap);
            const errors: string[] = [];
            const warnings: string[] = [];

            const student_name = cleanText(row.name || row.student_name || row.full_name);
            const father_name = cleanText(row.father_name || row.guardian || row.guardian_name);
            const mother_name = cleanText(row.mother_name);
            const admission_number = cleanText(row.admission_number || row.admission_no || row.adm_no || row.admno);
            const roll_number = cleanText(row.roll_number || row.roll_no);
            const date_of_birth = parseDateToIso(row.dob || row.date_of_birth);
            const address = cleanText(row.address);
            const gender = normalizeGender(row.gender);
            const email = cleanText(row.email || row.father_email);
            const phone = normalizePhone(row.phone || row.mobile || row.contact || row.father_phone);

            const classInput = row.class_name || row.class || row.std || row.standard || row.grade;
            const sectionInput = row.section_name || row.section || row.sec;
            const classRec = resolveClass(classes, classInput);
            const sectionRec = classRec ? (resolveSection(sections, classRec.id, sectionInput) || null) : null;

            const classVal = classRec?.name || normalizeClassDisplay(classInput);
            const sectionVal = sectionRec?.name || normalizeSection(sectionInput);

            const new_class_required = !classRec;
            const new_section_required = !!classRec && !sectionRec;

            if (!student_name) errors.push('Missing required field: student_name');
            if (!classVal) errors.push('Missing required field: class');
            if (!sectionVal) errors.push('Missing required field: section');
            if (new_class_required && classVal) errors.push('Class does not exist in ERP (new_class_required=true)');
            if (new_section_required && sectionVal) errors.push('Section does not exist in ERP (new_class_required=true)');
            if ((row.phone || row.mobile || row.contact || row.father_phone) && !phone) errors.push('Invalid phone number');

            if (!father_name) warnings.push('Missing recommended field: father_name');
            if (!phone) warnings.push('Missing recommended field: phone');
            if (!admission_number) warnings.push('Missing recommended field: admission_number');

            const admissionKey = admission_number.toLowerCase();
            if (admissionKey) {
                if (admissionSeen.has(admissionKey)) errors.push('Duplicate admission number in upload');
                admissionSeen.add(admissionKey);
            }

            const duplicateKey = buildDuplicateKey(student_name, father_name, classRec?.id || classVal);
            if (duplicateKey) {
                if (rowKeySeen.has(duplicateKey)) errors.push('Duplicate student record in upload');
                rowKeySeen.add(duplicateKey);
            }

            normalizedRows.push({
                row: rowNo,
                source: raw,
                normalized: {
                    student_name,
                    class: classVal,
                    section: sectionVal,
                    class_id: classRec?.id || null,
                    section_id: sectionRec?.id || null,
                    father_name,
                    mother_name,
                    phone,
                    admission_number,
                    roll_number,
                    date_of_birth,
                    address,
                    gender,
                    email,
                },
                errors,
                warnings,
                new_class_required,
                new_section_required,
            });
        }

        const admissionNumbers = normalizedRows.map((r) => r.normalized.admission_number).filter((v) => !!v);
        if (admissionNumbers.length) {
            const existingByAdmission = await db('students')
                .where({ school_id: schoolId })
                .whereNull('deleted_at')
                .whereIn('admission_no', admissionNumbers)
                .select('admission_no');
            const existingAdmissions = new Set(existingByAdmission.map((s: any) => String(s.admission_no).toLowerCase()));
            normalizedRows.forEach((r) => {
                const adm = String(r.normalized.admission_number || '').toLowerCase();
                if (adm && existingAdmissions.has(adm)) r.errors.push('Duplicate admission number in ERP');
            });
        }

        const classIds = Array.from(new Set(normalizedRows.map((r) => r.normalized.class_id).filter(Boolean)));
        if (classIds.length) {
            const existingStudents = await db('students')
                .where({ school_id: schoolId })
                .whereNull('deleted_at')
                .whereIn('current_class_id', classIds as number[])
                .select('name', 'father_name', 'current_class_id');
            const existingKeySet = new Set(existingStudents.map((s: any) => buildDuplicateKey(s.name, s.father_name, s.current_class_id)).filter(Boolean));
            normalizedRows.forEach((r) => {
                const key = buildDuplicateKey(r.normalized.student_name, r.normalized.father_name, r.normalized.class_id);
                if (key && existingKeySet.has(key)) r.errors.push('Duplicate student record already exists in ERP');
            });
        }

        const validRows = normalizedRows.filter((r) => r.errors.length === 0);
        const invalidRows = normalizedRows.filter((r) => r.errors.length > 0);
        const classDistribution = validRows.reduce((acc, r) => {
            const cls = String(r.normalized.class || 'Unknown');
            acc[cls] = (acc[cls] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const classWiseSummary = Object.entries(classDistribution).map(([class_name, added_count]) => ({ class_name, added_count }));

        const itemByRow = new Map(items.map((item: any) => [Number(item.row_number), item]));
        for (const r of normalizedRows) {
            const item = itemByRow.get(r.row);
            if (!item) continue;
            await db('student_import_batch_items').where({ id: item.id }).update({
                class_id: r.normalized.class_id,
                class_name: r.normalized.class,
                student_name: r.normalized.student_name,
                status: r.errors.length ? 'invalid' : 'valid',
                error: r.errors.join('; ') || null,
                raw_payload: {
                    source_row: r.source,
                    normalized: r.normalized,
                    errors: r.errors,
                    warnings: r.warnings,
                    flags: { new_class_required: r.new_class_required, new_section_required: r.new_section_required },
                },
                updated_at: new Date(),
            });
        }

        await db('student_import_batches').where({ id: batchId, school_id: schoolId }).update({
            failed_count: invalidRows.length,
            detected_header_mapping: toJsonb({ mapping: mappingPayload, headers: headersDetected }),
            class_wise_summary: toJsonb(classWiseSummary),
            updated_at: new Date(),
        });

        return res.json({
            status: 'preview_ready',
            batch_id: batchId,
            file_name: batch.original_file_name,
            total_rows_detected: normalizedRows.length,
            valid_students: validRows.length,
            invalid_rows: invalidRows.length,
            headers_detected: headersDetected,
            class_distribution: classDistribution,
            class_wise_summary: classWiseSummary,
            mapping: mappingPayload,
            errors: invalidRows.map((r) => ({ row: r.row, errors: r.errors })),
            preview_records: validRows.slice(0, 20).map((r) => r.normalized),
        });
    } catch (error) {
        const err = error as Error;
        logger.error('Remap student import batch error', {
            message: err?.message,
            stack: err?.stack,
            name: err?.name,
        });
        res.status(500).json({
            error: 'Failed to remap import preview',
            ...(process.env.NODE_ENV !== 'production' ? { detail: err?.message } : {}),
        });
    }
});

// Backward-compatible alias: /import now behaves as preview only
router.post('/import', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), importUpload.single('file'), async (req: AuthRequest, res: Response) => {
    return res.status(400).json({
        error: 'This endpoint now requires preview-confirm flow. Use /api/students/import/preview first.',
    });
});

// POST /api/students/import/:batchId/confirm — Insert previewed rows into students table
router.post('/import/:batchId/confirm', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), validate([
    param('batchId').isInt({ min: 1 }),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const batchId = Number(req.params.batchId);
        const duplicateStrategy = String(req.body?.duplicate_strategy || 'skip').toLowerCase(); // skip | replace | add_both
        if (!['skip', 'replace', 'add_both'].includes(duplicateStrategy)) {
            return res.status(400).json({ error: 'Invalid duplicate_strategy. Use skip, replace or add_both' });
        }

        const batch = await db('student_import_batches').where({ id: batchId, school_id: schoolId }).first();
        if (!batch) return res.status(404).json({ error: 'Import batch not found' });
        if (batch.status !== 'preview_ready') {
            return res.status(400).json({ error: `Batch is in "${batch.status}" state and cannot be confirmed. Only preview_ready batches can be confirmed.` });
        }

        // Atomic compare-and-swap: preview_ready → processing (prevents race condition + crash recovery)
        const transitioned = await db('student_import_batches')
            .where({ id: batchId, school_id: schoolId, status: 'preview_ready' })
            .update({ status: 'processing', updated_at: new Date() });
        if (transitioned === 0) {
            return res.status(409).json({ error: 'Batch is already being processed. Concurrent confirmation rejected.' });
        }

        const validItems = await db('student_import_batch_items')
            .where({ batch_id: batchId, school_id: schoolId, status: 'valid' })
            .orderBy('row_number');

        if (!validItems.length) {
            await db('student_import_batches')
                .where({ id: batchId, school_id: schoolId })
                .update({ status: 'preview_ready', updated_at: new Date() });
            return res.status(400).json({ error: 'No valid rows available for insertion' });
        }

        const classes = await db('classes').where({ school_id: schoolId }).orderBy('numeric_order');
        const sections = await db('sections').whereIn('class_id', classes.map((c: any) => c.id));
        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) {
            await db('student_import_batches')
                .where({ id: batchId, school_id: schoolId })
                .update({ status: 'preview_ready', updated_at: new Date() });
            return res.status(400).json({ error: 'No active academic year found' });
        }
        const school = await db('schools').where('id', schoolId).select('admission_prefix').first();
        const admissionPrefix = school?.admission_prefix || 'SCH';

        const created: Array<{ row: number; id: number; name: string; class_name: string }> = [];
        const skipped: Array<{ row: number; reason: string; name?: string }> = [];
        const failed: Array<{ row: number; reason: string; name?: string }> = [];

        for (const item of validItems) {
            const rowNo = Number(item.row_number);
            const payload = (item.raw_payload || {}) as any;
            const r = payload.normalized || {};

            try {
                const studentName = cleanText(r.student_name);
                const fatherName = cleanText(r.father_name);
                const classRec = resolveClass(classes, r.class_id || r.class);
                const sectionRec = classRec ? (resolveSection(sections, classRec.id, r.section_id || r.section) || sections.find((s: any) => s.class_id === classRec.id && s.name === r.section)) : null;
                if (!studentName || !classRec || !sectionRec) {
                    throw new Error('Normalized row is missing required mapping (name/class/section)');
                }

                const duplicateKey = buildDuplicateKey(studentName, fatherName, classRec.id);
                const admissionNoCandidate = cleanText(r.admission_number);

                let duplicateStudent: any = null;
                if (admissionNoCandidate) {
                    duplicateStudent = await db('students')
                        .where({ school_id: schoolId, admission_no: admissionNoCandidate })
                        .whereNull('deleted_at')
                        .first();
                }
                if (!duplicateStudent && duplicateKey) {
                    const candidates = await db('students')
                        .where({ school_id: schoolId, current_class_id: classRec.id })
                        .whereNull('deleted_at')
                        .select('id', 'name', 'father_name');
                    duplicateStudent = candidates.find((s: any) => buildDuplicateKey(s.name, s.father_name, classRec.id) === duplicateKey) || null;
                }

                if (duplicateStudent && duplicateStrategy === 'skip') {
                    skipped.push({ row: rowNo, reason: 'Duplicate existing student in ERP', name: studentName });
                    await db('student_import_batch_items').where({ id: item.id }).update({ status: 'skipped', error: 'Skipped due to duplicate existing student', updated_at: new Date() });
                    continue;
                }

                if (duplicateStudent && duplicateStrategy === 'replace') {
                    await db('students').where({ id: duplicateStudent.id, school_id: schoolId }).update({ deleted_at: new Date(), status: 'inactive', updated_at: new Date() });
                }

                // In add_both mode, keep both records; if admission no collides, generate a fresh one.
                let admissionNo = admissionNoCandidate || await generateAdmissionNo(academicYear.year.split('-')[0], admissionPrefix);
                if (duplicateStudent && duplicateStrategy === 'add_both' && admissionNoCandidate) {
                    admissionNo = await generateAdmissionNo(academicYear.year.split('-')[0], admissionPrefix);
                }
                const rollNo = await generateRollNo(
                    academicYear.year.split('-')[0],
                    classRec.numeric_order,
                    classRec.id,
                    academicYear.id,
                    sectionRec.id,
                    schoolId,
                );
                const studentUid = generateStudentUid();

                const aadhaarRaw = cleanText(r.aadhaar);
                const aadhaarEncrypted = aadhaarRaw ? encryptAadhaar(aadhaarRaw) : null;
                const aadhaarLast4 = aadhaarRaw ? getAadhaarLast4(aadhaarRaw) : null;

                const student = await db.transaction(async (trx) => {
                    const [createdStudent] = await trx('students').insert({
                        school_id: schoolId,
                        upload_batch_id: batchId,
                        student_uid: studentUid,
                        admission_no: admissionNo,
                        sr_no: valueOrNull(r.sr_no),
                        name: studentName,
                        name_hi: valueOrNull(r.name_hi),
                        dob: parseDateToIso(r.date_of_birth) || null,
                        gender: normalizeGender(r.gender),
                        aadhaar_encrypted: aadhaarEncrypted,
                        aadhaar_last4: aadhaarLast4,
                        category: valueOrNull(r.category) || 'GEN',
                        religion: valueOrNull(r.religion),
                        nationality: valueOrNull(r.nationality) || 'Indian',
                        blood_group: valueOrNull(r.blood_group),
                        address: valueOrNull(r.address),
                        city: valueOrNull(r.city),
                        state: valueOrNull(r.state),
                        pincode: valueOrNull(r.pincode),
                        father_name: fatherName || 'N/A',
                        father_phone: valueOrNull(r.phone || r.father_phone),
                        father_occupation: valueOrNull(r.father_occupation),
                        father_email: valueOrNull(r.email || r.father_email),
                        mother_name: valueOrNull(r.mother_name),
                        mother_phone: valueOrNull(r.mother_phone),
                        mother_occupation: valueOrNull(r.mother_occupation),
                        guardian_name: valueOrNull(r.guardian_name),
                        guardian_phone: valueOrNull(r.guardian_phone),
                        guardian_relation: valueOrNull(r.guardian_relation),
                        current_class_id: classRec.id,
                        current_section_id: sectionRec.id,
                        current_roll_no: valueOrNull(r.roll_number) || rollNo,
                        academic_year_id: academicYear.id,
                        status: 'active',
                        admission_date: parseDateToIso(r.admission_date) || new Date().toISOString().split('T')[0],
                        previous_school: valueOrNull(r.previous_school),
                    }).returning('*');

                    await trx('student_class_history').insert({
                        student_id: createdStudent.id,
                        school_id: schoolId,
                        class_id: classRec.id,
                        section_id: sectionRec.id,
                        roll_no: createdStudent.current_roll_no,
                        academic_year_id: academicYear.id,
                        status: 'admitted',
                    });

                    return createdStudent;
                });

                created.push({ row: rowNo, id: student.id, name: student.name, class_name: classRec.name });
                await db('student_import_batch_items').where({ id: item.id }).update({
                    status: 'created',
                    student_id: student.id,
                    class_id: classRec.id,
                    class_name: classRec.name,
                    student_name: student.name,
                    error: null,
                    updated_at: new Date(),
                });
            } catch (e: any) {
                failed.push({ row: rowNo, reason: e?.message || 'Failed to insert row', name: r.student_name });
                await db('student_import_batch_items').where({ id: item.id }).update({ status: 'failed', error: e?.message || 'Failed to insert row', updated_at: new Date() });
            }
        }

        const finalClassDistribution = created.reduce((acc, c) => {
            acc[c.class_name] = (acc[c.class_name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const finalClassSummary = Object.entries(finalClassDistribution).map(([class_name, added_count]) => ({ class_name, added_count }));

        await db('student_import_batches').where({ id: batchId, school_id: schoolId }).update({
            status: 'completed',
            created_count: created.length,
            failed_count: Number(batch.total_rows) - created.length,
            class_wise_summary: toJsonb(finalClassSummary),
            updated_at: new Date(),
        });

        return res.json({
            status: 'completed',
            batch_id: batchId,
            students_added: created.length,
            skipped_rows: skipped.length + failed.length,
            class_distribution: finalClassDistribution,
            skipped,
            failed,
            created_preview: created.slice(0, 20),
        });
    } catch (error) {
        const err = error as Error;
        logger.error('Confirm student import batch error', {
            message: err?.message,
            stack: err?.stack,
            name: err?.name,
        });
        // Mark batch as failed so it's not stuck in 'processing' state indefinitely
        try {
            await db('student_import_batches')
                .where({ id: Number(req.params.batchId), school_id: req.user?.school_id })
                .where('status', 'processing')
                .update({ status: 'failed', updated_at: new Date() });
        } catch (_markErr) { /* best-effort — don't mask original error */ }
        res.status(500).json({
            error: 'Failed to confirm import batch',
            ...(process.env.NODE_ENV !== 'production' ? { detail: err?.message } : {}),
        });
    }
});

// POST /api/students/import/:batchId/cancel — Cancel preview batch without insertion
router.post('/import/:batchId/cancel', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), validate([
    param('batchId').isInt({ min: 1 }),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });
        const batchId = Number(req.params.batchId);

        const batch = await db('student_import_batches').where({ id: batchId, school_id: schoolId }).first();
        if (!batch) return res.status(404).json({ error: 'Import batch not found' });
        if (batch.status !== 'preview_ready') return res.status(400).json({ error: `Cannot cancel batch in ${batch.status} state` });

        await db('student_import_batches').where({ id: batchId, school_id: schoolId }).update({ status: 'canceled', updated_at: new Date() });
        res.json({ status: 'canceled', batch_id: batchId });
    } catch (error) {
        logger.error('Cancel student import batch error', error);
        res.status(500).json({ error: 'Failed to cancel import batch' });
    }
});

// GET /api/students/import/last — Last batch summary for chatbot control
router.get('/import/last', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const batch = await db('student_import_batches')
            .where({ school_id: schoolId })
            .orderBy('created_at', 'desc')
            .first();
        if (!batch) return res.status(404).json({ error: 'No import batches found' });

        const items = await db('student_import_batch_items')
            .where({ batch_id: batch.id, school_id: schoolId })
            .select('row_number', 'status', 'student_name', 'class_name', 'error')
            .orderBy('row_number')
            .limit(50);

        res.json({
            status: 'ok',
            batch,
            items_preview: items,
        });
    } catch (error) {
        logger.error('Get last import batch error', error);
        res.status(500).json({ error: 'Failed to fetch last import batch' });
    }
});

// POST /api/students/import/last/revert — Undo last completed upload
router.post('/import/last/revert', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const batch = await db('student_import_batches')
            .where({ school_id: schoolId, status: 'completed' })
            .orderBy('created_at', 'desc')
            .first();
        if (!batch) return res.status(404).json({ error: 'No completed import batch found to revert' });

        const createdItems = await db('student_import_batch_items')
            .where({ batch_id: batch.id, school_id: schoolId, status: 'created' })
            .whereNotNull('student_id')
            .select('student_id');

        const studentIds = createdItems
            .map((i: any) => Number(i.student_id))
            .filter((id: number) => Number.isFinite(id));

        let revertedCount = 0;
        if (studentIds.length) {
            await db.transaction(async (trx) => {
                await trx('student_class_history').whereIn('student_id', studentIds).andWhere({ school_id: schoolId }).del();
                const result = await trx('students').whereIn('id', studentIds).andWhere({ school_id: schoolId }).update({ deleted_at: new Date(), status: 'inactive', updated_at: new Date() });
                revertedCount = Number(result || 0);
            });
        }

        await db('student_import_batches').where({ id: batch.id, school_id: schoolId }).update({
            status: 'reverted',
            reverted_at: new Date(),
            updated_at: new Date(),
        });

        await createAuditLog({
            user_id: req.user!.id,
            action: 'bulk_revert',
            entity_type: 'student_import_batch',
            entity_id: batch.id,
            new_value: { reverted_count: revertedCount },
            ip_address: getClientIp(req),
        });

        return res.json({
            message: 'Last import batch reverted successfully',
            batch_id: batch.id,
            reverted_count: revertedCount,
        });
    } catch (error) {
        logger.error('Revert last import batch error', error);
        res.status(500).json({ error: 'Failed to revert last import batch' });
    }
});

// POST /api/students/import/:batchId/delete — Alias for revert batch by id
router.post('/import/:batchId/delete', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), validate([
    param('batchId').isInt({ min: 1 }),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });
        const batchId = Number(req.params.batchId);

        const batch = await db('student_import_batches').where({ id: batchId, school_id: schoolId }).first();
        if (!batch) return res.status(404).json({ error: 'Import batch not found' });
        if (batch.status === 'reverted') return res.status(400).json({ error: 'Batch is already reverted' });

        const createdItems = await db('student_import_batch_items')
            .where({ batch_id: batchId, school_id: schoolId, status: 'created' })
            .whereNotNull('student_id')
            .select('student_id');

        const studentIds = createdItems
            .map((i: any) => Number(i.student_id))
            .filter((id: number) => Number.isFinite(id));

        let revertedCount = 0;
        if (studentIds.length) {
            await db.transaction(async (trx) => {
                await trx('student_class_history').whereIn('student_id', studentIds).andWhere({ school_id: schoolId }).del();
                const result = await trx('students').whereIn('id', studentIds).andWhere({ school_id: schoolId }).update({ deleted_at: new Date(), status: 'inactive', updated_at: new Date() });
                revertedCount = Number(result || 0);
            });
        }

        await db('student_import_batches').where({ id: batchId, school_id: schoolId }).update({
            status: 'reverted',
            reverted_at: new Date(),
            updated_at: new Date(),
        });

        return res.json({ message: 'Upload batch deleted (reverted) successfully', batch_id: batchId, reverted_count: revertedCount });
    } catch (error) {
        logger.error('Delete import batch error', error);
        res.status(500).json({ error: 'Failed to delete upload batch' });
    }
});

// POST /api/students/actions/move — Move student by name to another class/section
router.post('/actions/move', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), validate([
    body('student_name').notEmpty().trim(),
    body('target_class').notEmpty().trim(),
    body('target_section').optional().trim(),
    body('father_name').optional().trim(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const { student_name, father_name, target_class, target_section } = req.body;
        let studentQuery = db('students')
            .where({ school_id: schoolId })
            .whereNull('deleted_at')
            .whereILike('name', student_name)
            .orderBy('id', 'desc');
        if (father_name) studentQuery = studentQuery.andWhereILike('father_name', father_name);

        const student = await studentQuery.first();
        if (!student) return res.status(404).json({ error: 'Student not found for move action' });

        const classes = await db('classes').where({ school_id: schoolId });
        const sections = await db('sections').whereIn('class_id', classes.map((c: any) => c.id));
        const classRec = resolveClass(classes, target_class);
        if (!classRec) return res.status(400).json({ error: 'Target class not found in ERP' });
        const sectionRec = resolveSection(sections, classRec.id, target_section || student.current_section_id) || sections.find((s: any) => s.class_id === classRec.id);
        if (!sectionRec) return res.status(400).json({ error: 'Target section not found in ERP' });

        const academicYear = await db('academic_years').where({ is_current: true, school_id: schoolId }).first();
        if (!academicYear) return res.status(400).json({ error: 'No active academic year found' });

        const newRollNo = await generateRollNo(
            academicYear.year.split('-')[0],
            classRec.numeric_order,
            classRec.id,
            academicYear.id,
            sectionRec.id,
            schoolId,
        );

        await db.transaction(async (trx) => {
            await trx('students').where({ id: student.id, school_id: schoolId }).update({
                current_class_id: classRec.id,
                current_section_id: sectionRec.id,
                current_roll_no: newRollNo,
                updated_at: new Date(),
            });

            await trx('student_class_history').insert({
                student_id: student.id,
                school_id: schoolId,
                class_id: classRec.id,
                section_id: sectionRec.id,
                roll_no: newRollNo,
                academic_year_id: academicYear.id,
                status: 'promoted',
            });
        });

        res.json({
            status: 'ok',
            message: 'Student moved successfully',
            student_id: student.id,
            student_name: student.name,
            moved_to: { class: classRec.name, section: sectionRec.name },
        });
    } catch (error) {
        logger.error('Move student action error', error);
        res.status(500).json({ error: 'Failed to move student' });
    }
});

// POST /api/students/import/:batchId/revert — Revert a previously imported student batch
router.post('/import/:batchId/revert', authenticate, authorize('owner', 'co-owner', 'tenant_admin', 'admin'), validate([
    param('batchId').isInt({ min: 1 }),
]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const batchId = Number(req.params.batchId);
        const batch = await db('student_import_batches').where({ id: batchId, school_id: schoolId }).first();
        if (!batch) return res.status(404).json({ error: 'Import batch not found' });
        if (batch.status === 'reverted') return res.status(400).json({ error: 'Batch is already reverted' });

        const createdItems = await db('student_import_batch_items')
            .where({ batch_id: batchId, school_id: schoolId, status: 'created' })
            .whereNotNull('student_id')
            .select('student_id');

        const studentIds = createdItems
            .map((i: any) => Number(i.student_id))
            .filter((id: number) => Number.isFinite(id));

        let revertedCount = 0;
        if (studentIds.length) {
            await db.transaction(async (trx) => {
                await trx('student_class_history').whereIn('student_id', studentIds).andWhere({ school_id: schoolId }).del();
                const result = await trx('students').whereIn('id', studentIds).andWhere({ school_id: schoolId }).update({ deleted_at: new Date(), status: 'inactive', updated_at: new Date() });
                revertedCount = Number(result || 0);
            });
        }

        await db('student_import_batches').where({ id: batchId, school_id: schoolId }).update({
            status: 'reverted',
            reverted_at: new Date(),
            updated_at: new Date(),
        });

        await createAuditLog({
            user_id: req.user!.id,
            action: 'bulk_revert',
            entity_type: 'student_import_batch',
            entity_id: batchId,
            new_value: { reverted_count: revertedCount },
            ip_address: getClientIp(req),
        });

        res.json({
            message: 'Import batch reverted successfully',
            batch_id: batchId,
            reverted_count: revertedCount,
        });
    } catch (error) {
        logger.error('Revert student import batch error', error);
        res.status(500).json({ error: 'Failed to revert import batch' });
    }
});

function remapRow(raw: Record<string, any>, mapping: Record<string, string | null>): Record<string, any> {
    const out: Record<string, any> = { ...raw };
    for (const [target, source] of Object.entries(mapping)) {
        if (source && source in raw) out[target] = raw[source];
    }
    return out;
}

function buildMappingPayload(mapping: Record<string, string | null>) {
    const fieldLabels: Record<string, string> = {
        name: 'student_name',
        class_name: 'class',
        section_name: 'section',
        father_name: 'father_name',
        mother_name: 'mother_name',
        phone: 'phone',
        admission_number: 'admission_number',
        roll_number: 'roll_number',
        dob: 'date_of_birth',
        address: 'address',
        gender: 'gender',
        email: 'email',
    };

    const out: Record<string, { field: string; confidence: number }> = {};
    for (const [target, source] of Object.entries(mapping)) {
        if (!source) continue;
        const field = fieldLabels[target] || target;
        out[source] = { field, confidence: estimateMappingConfidence(source, field) };
    }
    return out;
}

function parseMappingPayload(
    payload: Record<string, { field: string; confidence?: number }>,
    headersDetected: string[]
): Record<string, string | null> {
    const fieldToInternal: Record<string, string> = {
        student_name: 'name',
        class: 'class_name',
        section: 'section_name',
        father_name: 'father_name',
        mother_name: 'mother_name',
        phone: 'phone',
        admission_number: 'admission_number',
        roll_number: 'roll_number',
        date_of_birth: 'dob',
        address: 'address',
        gender: 'gender',
        email: 'email',
    };

    const out: Record<string, string | null> = {
        name: null,
        class_name: null,
        section_name: null,
        father_name: null,
        mother_name: null,
        phone: null,
        admission_number: null,
        roll_number: null,
        dob: null,
        address: null,
        gender: null,
        email: null,
    };

    const headerSet = new Set(headersDetected);
    for (const [header, info] of Object.entries(payload || {})) {
        if (!headerSet.has(header)) continue;
        const field = normalizeKey(info?.field || '');
        const internal = fieldToInternal[field] || fieldToInternal[(info?.field || '').trim().toLowerCase()] || '';
        if (internal && out[internal] === null) out[internal] = header;
    }

    return out;
}

function estimateMappingConfidence(header: string, field: string): number {
    const h = normalizeKey(header);
    const f = normalizeKey(field);
    if (h === f) return 98;
    if (h.includes(f) || f.includes(h)) return 90;
    return 84;
}

function cleanText(value: any): string {
    return String(value ?? '').trim();
}

function normalizePhone(value: any): string | null {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return null;
}

function normalizeClassDisplay(value: any): string {
    const parsed = parseClassNumeric(value);
    if (parsed !== null) return String(parsed);
    const v = cleanText(value);
    if (!v) return '';
    const lv = v.toLowerCase();
    if (lv.includes('nursery')) return 'Nursery';
    if (lv.includes('lkg') || lv.includes('lower kg')) return 'LKG';
    if (lv.includes('ukg') || lv.includes('upper kg')) return 'UKG';
    return v;
}

function normalizeSection(value: any): string {
    const v = cleanText(value);
    if (!v) return '';
    const m = v.match(/[a-z]/i);
    if (m) return m[0].toUpperCase();
    return v.toUpperCase();
}

function parseClassNumeric(value: any): number | null {
    const v = cleanText(value).toLowerCase();
    if (!v) return null;
    const num = v.match(/\d+/);
    if (num) {
        const n = Number(num[0]);
        if (n >= 1 && n <= 12) return n;
    }
    const roman: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
    return roman[v] ?? null;
}

function buildDuplicateKey(studentName: any, fatherName: any, classRef: any): string {
    const name = normalizeKey(String(studentName || ''));
    const father = normalizeKey(String(fatherName || ''));
    const cls = normalizeKey(String(classRef || ''));
    if (!name || !cls) return '';
    return `${name}|${father}|${cls}`;
}

function normalizeKey(v: string): string {
    return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveClass(classes: any[], input: any): any | null {
    const val = String(input || '').trim();
    if (!val) return null;

    // 1. Normalised name match — highest-confidence path (e.g. "Class 6", "VI", "class6")
    const key = normalizeKey(val);
    const byName = classes.find((c: any) => {
        const cKey = normalizeKey(c.name);
        return cKey === key || `class${cKey}` === key || cKey === key.replace('class', '');
    });
    if (byName) return byName;

    // 2. Match by grade number embedded in class name — "6", "Std-6", "Grade VI" all map
    //    to the class whose name contains the same grade number (e.g. "Class 6", "VI").
    //    This is the correct semantic match for Excel imports; numeric_order is NOT the grade.
    const numericInput = parseClassNumeric(val);
    if (numericInput !== null) {
        const byGrade = classes.find((c: any) => parseClassNumeric(c.name) === numericInput);
        if (byGrade) return byGrade;
    }

    // 3. Last resort: pure integer DB id (for internal tool calls that pass id directly)
    const numericId = Number(val);
    if (Number.isFinite(numericId) && Number.isInteger(numericId) && numericId > 0) {
        const byId = classes.find((c: any) => Number(c.id) === numericId);
        if (byId) return byId;
    }

    return null;
}

function resolveSection(sections: any[], classId: number, input: any): any | null {
    const val = String(input || '').trim();
    if (!val) return null;

    const numericId = Number(val);
    if (Number.isFinite(numericId) && numericId > 0) {
        const byId = sections.find((s: any) => Number(s.id) === numericId && Number(s.class_id) === Number(classId));
        if (byId) return byId;
    }

    const key = normalizeKey(val);
    return sections.find((s: any) => s.class_id === classId && normalizeKey(s.name) === key) || null;
}

function parseDateToIso(value: any): string | null {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().split('T')[0];
    }

    if (typeof value === 'number') {
        return excelSerialToIso(value);
    }

    const asString = String(value).trim();
    if (!asString) return null;

    const direct = new Date(asString);
    if (!Number.isNaN(direct.getTime())) {
        return direct.toISOString().split('T')[0];
    }

    const parts = asString.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (parts) {
        const d = parseInt(parts[1], 10);
        const m = parseInt(parts[2], 10);
        let y = parseInt(parts[3], 10);
        if (y < 100) y += 2000;
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
    }

    return null;
}

async function parseImportFileRows(file: Express.Multer.File): Promise<Array<Record<string, any>>> {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.csv') {
        return parseCsvRows(file.buffer);
    }
    if (ext === '.xlsx') {
        return parseXlsxRows(file.buffer);
    }
    throw new Error('Unsupported file type. Allowed formats: XLSX, CSV');
}

function parseCsvRows(buffer: Buffer): Array<Record<string, any>> {
    const rows = parseCsv(buffer, {
        columns: true,
        bom: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
    }) as Array<Record<string, unknown>>;

    return rows.map((row) => {
        const out: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
            out[String(key || '').trim()] = value ?? '';
        }
        return out;
    });
}

async function parseXlsxRows(buffer: Buffer): Promise<Array<Record<string, any>>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        throw new Error('No worksheet found in file');
    }

    const headerRow = worksheet.getRow(1);
    const headerValues = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
    const headers = headerValues.map((h: unknown) => String(excelCellToPlainValue(h) || '').trim());

    const dataRows: Array<Record<string, any>> = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const record: Record<string, any> = {};
        let hasAnyValue = false;

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i] || `column_${i + 1}`;
            const cell = row.getCell(i + 1);
            const value = excelCellToPlainValue(cell.value);
            if (value !== '' && value !== null && value !== undefined) hasAnyValue = true;
            record[header] = value ?? '';
        }

        if (hasAnyValue) dataRows.push(record);
    }

    return dataRows;
}

function excelCellToPlainValue(value: unknown): unknown {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value;
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;

    if (typeof value === 'object') {
        const candidate = value as any;
        if (candidate.text && typeof candidate.text === 'string') return candidate.text;
        if (candidate.result !== undefined) return candidate.result;
        if (Array.isArray(candidate.richText)) {
            return candidate.richText.map((p: any) => p?.text || '').join('');
        }
        if (candidate.hyperlink && candidate.text) return candidate.text;
    }

    return String(value);
}

function excelSerialToIso(serial: number): string | null {
    if (!Number.isFinite(serial) || serial <= 0) return null;
    const excelEpochUtcMs = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpochUtcMs + Math.round(serial * 86400000));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
}

function normalizeGender(value: any): 'male' | 'female' | 'other' {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'male' || v === 'm' || v === 'boy') return 'male';
    if (v === 'female' || v === 'f' || v === 'girl') return 'female';
    return 'other';
}

function valueOrNull(value: any): string | null {
    const v = String(value ?? '').trim();
    return v ? v : null;
}

function toJsonb(value: any) {
    // Force valid JSON casting for Postgres json/jsonb columns.
    return db.raw('?::jsonb', [JSON.stringify(value ?? null)]);
}

// GET /api/students/:id — Get student details
router.get('/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher', 'parent'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const student = await db('students')
            .leftJoin('classes', 'students.current_class_id', 'classes.id')
            .leftJoin('sections', 'students.current_section_id', 'sections.id')
            .leftJoin('academic_years', 'students.academic_year_id', 'academic_years.id')
            .whereNull('students.deleted_at')
            .where('students.id', req.params.id)
            .andWhere('students.school_id', schoolId)
            .select(
                'students.*',
                'classes.name as class_name',
                'sections.name as section_name',
                'academic_years.year as academic_year'
            )
            .first();

        if (!student) return res.status(404).json({ error: 'Student not found' });

        // Get class history
        const classHistory = await db('student_class_history')
            .join('classes', 'student_class_history.class_id', 'classes.id')
            .leftJoin('sections', 'student_class_history.section_id', 'sections.id')
            .join('academic_years', 'student_class_history.academic_year_id', 'academic_years.id')
            .where('student_class_history.student_id', req.params.id)
            .andWhere('classes.school_id', schoolId)
            .select(
                'student_class_history.*',
                'classes.name as class_name',
                'sections.name as section_name',
                'academic_years.year as academic_year'
            )
            .orderBy('academic_years.year', 'desc');

        // Get documents
        const documents = await db('student_documents as sd')
            .join('students as s', 'sd.student_id', 's.id')
            .where('sd.student_id', req.params.id)
            .andWhere('s.school_id', schoolId)
            .select('sd.*')
            .orderBy('sd.created_at', 'desc');

        const { aadhaar_encrypted: _ae, ...safeStudent } = student;
        res.json({ ...safeStudent, class_history: classHistory, documents });
    } catch (error) {
        logger.error('Get student error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/students/:id — Update student
router.put('/:id', authenticate, authorize('tenant_admin', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const existing = await db('students')
            .where({ id: req.params.id, school_id: schoolId })
            .whereNull('deleted_at')
            .first();
        if (!existing) return res.status(404).json({ error: 'Student not found' });

        const data = req.body;

        // Handle Aadhaar update
        if (data.aadhaar) {
            data.aadhaar_encrypted = encryptAadhaar(data.aadhaar);
            data.aadhaar_last4 = getAadhaarLast4(data.aadhaar);
            delete data.aadhaar;
        }

        delete data.school_id;
        delete data.id;

        const [updated] = await db('students')
            .where({ id: req.params.id, school_id: schoolId })
            .update({ ...data, updated_at: new Date() })
            .returning('*');

        await createAuditLog({
            user_id: req.user!.id,
            action: 'update',
            entity_type: 'student',
            entity_id: updated.id,
            old_value: { name: existing.name },
            new_value: { name: updated.name },
            ip_address: getClientIp(req),
        });

        const { aadhaar_encrypted: _ae, ...safeUpdated } = updated;
        res.json(safeUpdated);
    } catch (error) {
        logger.error('Update student error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/students/:id/promote — Promote student
router.post('/:id/promote', authenticate, authorize('tenant_admin', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const student = await db('students')
            .where({ id: req.params.id, status: 'active', school_id: schoolId })
            .whereNull('deleted_at')
            .first();
        if (!student) return res.status(404).json({ error: 'Active student not found' });

        const { new_class_id, new_section_id, new_roll_no, new_academic_year_id } = req.body;

        if (!new_class_id || !new_academic_year_id) {
            return res.status(400).json({ error: 'new_class_id and new_academic_year_id are required' });
        }

        const targetClass = await db('classes').where({ id: new_class_id, school_id: schoolId }).first();
        if (!targetClass) return res.status(400).json({ error: 'Target class is invalid for your school' });

        if (new_section_id) {
            const targetSection = await db('sections')
                .join('classes', 'sections.class_id', 'classes.id')
                .where('sections.id', new_section_id)
                .andWhere('sections.class_id', new_class_id)
                .andWhere('classes.school_id', schoolId)
                .select('sections.id')
                .first();
            if (!targetSection) return res.status(400).json({ error: 'Target section is invalid for your school/class' });
        }

        const updated = await db.transaction(async (trx) => {
            await trx('student_class_history')
                .where({ student_id: student.id, academic_year_id: student.academic_year_id })
                .update({ status: 'promoted' });

            await trx('student_class_history').insert({
                student_id: student.id,
                class_id: new_class_id,
                section_id: new_section_id,
                roll_no: new_roll_no,
                academic_year_id: new_academic_year_id,
                status: 'admitted',
            });

            const [nextStudent] = await trx('students').where({ id: student.id, school_id: schoolId }).update({
                current_class_id: new_class_id,
                current_section_id: new_section_id,
                current_roll_no: new_roll_no,
                academic_year_id: new_academic_year_id,
                updated_at: new Date(),
            }).returning('*');

            return nextStudent;
        });

        await createAuditLog({
            user_id: req.user!.id,
            action: 'promote',
            entity_type: 'student',
            entity_id: student.id,
            old_value: { class_id: student.current_class_id, academic_year_id: student.academic_year_id },
            new_value: { class_id: new_class_id, academic_year_id: new_academic_year_id },
            ip_address: getClientIp(req),
        });

        const { aadhaar_encrypted: _ae, ...safePromoted } = updated;
        res.json({ message: 'Student promoted successfully', student: safePromoted });
    } catch (error) {
        logger.error('Promote student error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/students/:id/tc — Generate Transfer Certificate
router.post('/:id/tc', authenticate, authorize('tenant_admin', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const student = await db('students')
            .where({ id: req.params.id, school_id: schoolId })
            .whereNull('deleted_at')
            .first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const tcNo = await generateTCNo();
        const tc = await db.transaction(async (trx) => {
            const [createdTc] = await trx('transfer_certificates').insert({
                student_id: student.id,
                tc_no: tcNo,
                issue_date: new Date().toISOString().split('T')[0],
                reason: req.body.reason || 'Transfer',
                issued_by: req.user!.id,
                school_id: schoolId,
            }).returning('*');

            await trx('students').where({ id: student.id, school_id: schoolId }).update({ status: 'tc_issued' });

            await trx('student_class_history')
                .where({ student_id: student.id, academic_year_id: student.academic_year_id })
                .update({ status: 'tc_issued' });

            return createdTc;
        });

        await createAuditLog({
            user_id: req.user!.id,
            action: 'tc_generated',
            entity_type: 'transfer_certificate',
            entity_id: tc.id,
            new_value: { tc_no: tcNo, student_name: student.name },
            ip_address: getClientIp(req),
        });

        res.status(201).json(tc);
    } catch (error) {
        logger.error('Generate TC error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/students/:id/documents — Upload document
router.post('/:id/documents', authenticate, authorize('tenant_admin', 'admin'), validate([paramId('id')]), upload.single('document'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const student = await db('students')
            .where({ id: req.params.id, school_id: schoolId })
            .whereNull('deleted_at')
            .first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const [doc] = await db('student_documents').insert({
            student_id: student.id,
            doc_type: req.body.doc_type || 'other',
            file_name: req.file.originalname,
            file_url: `/uploads/${req.file.filename}`, // Replace with S3 URL in production
            mime_type: req.file.mimetype,
            file_size: req.file.size,
            school_id: schoolId,
        }).returning('*');

        res.status(201).json(doc);
    } catch (error) {
        logger.error('Upload document error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/students/:id/documents — List documents
router.get('/:id/documents', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'teacher'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const student = await db('students')
            .where({ id: req.params.id, school_id: schoolId })
            .whereNull('deleted_at')
            .first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const docs = await db('student_documents as sd')
            .join('students as s', 'sd.student_id', 's.id')
            .where('sd.student_id', req.params.id)
            .andWhere('s.school_id', schoolId)
            .select('sd.*')
            .orderBy('sd.created_at', 'desc');
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/students/:id/documents/:docId — Delete a specific document
router.delete('/:id/documents/:docId', authenticate, authorize('tenant_admin', 'admin'), validate([paramId('id'), paramId('docId')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        // Verify student belongs to this school
        const student = await db('students')
            .where({ id: req.params.id, school_id: schoolId })
            .whereNull('deleted_at')
            .first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        // Verify document belongs to this student
        const doc = await db('student_documents as sd')
            .join('students as s', 'sd.student_id', 's.id')
            .where('sd.id', req.params.docId)
            .andWhere('sd.student_id', req.params.id)
            .andWhere('s.school_id', schoolId)
            .select('sd.id', 'sd.file_url')
            .first();
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Remove from disk
        if (doc.file_url) {
            const filePath = path.join(config.uploadDir, path.basename(doc.file_url));
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await db('student_documents').where({ id: req.params.docId }).delete();

        await createAuditLog({
            user_id: req.user!.id,
            action: 'delete',
            entity_type: 'student_document',
            entity_id: Number(req.params.docId),
            old_value: { student_id: req.params.id, file_url: doc.file_url },
            ip_address: getClientIp(req),
        });

        res.json({ message: 'Document deleted' });
    } catch (error) {
        logger.error('Delete document error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE (soft) /api/students/:id
router.delete('/:id', authenticate, authorize('tenant_admin', 'admin'), validate([paramId('id')]), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const student = await db('students')
            .where({ id: req.params.id, school_id: schoolId })
            .whereNull('deleted_at')
            .first();
        if (!student) return res.status(404).json({ error: 'Student not found' });

        await db('students').where({ id: req.params.id, school_id: schoolId }).update({ deleted_at: new Date() });

        await createAuditLog({
            user_id: req.user!.id,
            action: 'soft_delete',
            entity_type: 'student',
            entity_id: student.id,
            old_value: { name: student.name, status: student.status },
            ip_address: getClientIp(req),
        });

        res.json({ message: 'Student deleted (soft)' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
