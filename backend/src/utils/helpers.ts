import crypto from 'crypto';
import db from '../config/database';

/**
 * All ID/number generators now use PostgreSQL sequences to guarantee
 * uniqueness even under concurrent requests.  The sequences are created
 * lazily on first call so no extra migration is needed.
 */

let _seqsEnsured = false;
async function ensureSequences(): Promise<void> {
    if (_seqsEnsured) return;
    await db.raw('CREATE SEQUENCE IF NOT EXISTS admission_no_seq START 1000 INCREMENT 1');
    await db.raw('CREATE SEQUENCE IF NOT EXISTS receipt_no_seq   START 10000 INCREMENT 1');
    await db.raw('CREATE SEQUENCE IF NOT EXISTS tc_no_seq        START 1000 INCREMENT 1');
    await db.raw('CREATE SEQUENCE IF NOT EXISTS employee_id_seq  START 1000 INCREMENT 1');
    _seqsEnsured = true;
}

/**
 * Generate a school-specific admission number.
 * Format: {prefix}{year}{seq} e.g. DPS20251001
 * prefix comes from schools.admission_prefix (set at registration from school name initials).
 */
export async function generateAdmissionNo(year: string = new Date().getFullYear().toString(), prefix: string = 'SCH'): Promise<string> {
    await ensureSequences();
    const [{ nextval }] = await db.raw("SELECT nextval('admission_no_seq')").then(r => r.rows);
    const clean = prefix.replace(/[^A-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'SCH';
    return `${clean}${year}${nextval}`;
}

/** Generate a short 8-char hex UID for a student (unique per school). */
export function generateStudentUid(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function generateReceiptNo(): Promise<string> {
    await ensureSequences();
    const date = new Date();
    const prefix = `RCP${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const [{ nextval }] = await db.raw("SELECT nextval('receipt_no_seq')").then(r => r.rows);
    return `${prefix}${nextval}`;
}

export async function generateTCNo(year: string = new Date().getFullYear().toString()): Promise<string> {
    await ensureSequences();
    const [{ nextval }] = await db.raw("SELECT nextval('tc_no_seq')").then(r => r.rows);
    return `TC${year}${nextval}`;
}

export async function generateEmployeeId(): Promise<string> {
    await ensureSequences();
    const [{ nextval }] = await db.raw("SELECT nextval('employee_id_seq')").then(r => r.rows);
    return `EMP${nextval}`;
}

/**
 * Auto-generate a roll number for a student.
 * Format: {YY}{class_numeric_order_2d}{seq_3d}
 * e.g., class 5 in 2025-26 with 12 existing students → 250512
 * Unique within the class per academic year; sequential within class.
 */
/**
 * Auto-generate a roll number for a student.
 * Format: {class_numeric_order}/{seq_within_section}
 * e.g. "5/23" — Class 5, student 23 in that section for the academic year.
 * Simple, readable, and standard for Indian schools.
 */
export async function generateRollNo(
    _academicYearStart: string,
    classNumericOrder: number,
    classId: number,
    academicYearId: number,
    sectionId: number,
    schoolId?: number,
): Promise<string> {
    let q = db('students')
        .where({ current_class_id: classId, current_section_id: sectionId, academic_year_id: academicYearId })
        .whereNull('deleted_at');
    if (schoolId !== undefined) {
        q = q.andWhere('school_id', schoolId);
    }
    const [{ count }] = await q.count('id as count');

    const seq = Number(count) + 1;
    return `${classNumericOrder}/${seq}`;
}

export function calculatePercentage(obtained: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((obtained / total) * 10000) / 100;
}

export function calculateLateFee(dueDate: Date, paymentDate: Date, perDay: number, max: number): number {
    const diffDays = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0;
    return Math.min(diffDays * perDay, max);
}

export function formatIndianDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function getPaginationParams(query: any): { limit: number; offset: number; page: number } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;
    return { limit, offset, page };
}
