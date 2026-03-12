import { Knex } from 'knex';
import crypto from 'crypto';

/**
 * Migration 022 — Student UID + School Admission Prefix
 *
 * student_uid: a short 8-char alphanumeric code (e.g. "A3K9X7B2") unique
 *   per school. Allows finding any student quickly without cross-tenant leaks.
 *
 * schools.admission_prefix: 2-4 uppercase letters derived from school name
 *   initials (e.g. "DPS" for Delhi Public School). Used as the prefix in
 *   auto-generated admission numbers instead of the old hardcoded "NDPS".
 */

function generateUid(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
}

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .map(w => w.replace(/[^a-zA-Z]/g, ''))
        .filter(Boolean)
        .map(w => w[0].toUpperCase())
        .join('')
        .slice(0, 4) || 'SCH';
}

export async function up(knex: Knex): Promise<void> {
    // 1. Add admission_prefix to schools
    const hasPfx = await knex.schema.hasColumn('schools', 'admission_prefix');
    if (!hasPfx) {
        await knex.schema.alterTable('schools', t => {
            t.string('admission_prefix', 6).nullable();
        });
    }

    // Backfill admission_prefix from school name initials
    const schools = await knex('schools').select('id', 'name', 'admission_prefix');
    for (const school of schools) {
        if (!school.admission_prefix) {
            await knex('schools').where('id', school.id).update({ admission_prefix: getInitials(school.name) });
        }
    }

    // Make it NOT NULL with default
    await knex.raw(`ALTER TABLE schools ALTER COLUMN admission_prefix SET NOT NULL`);
    await knex.raw(`ALTER TABLE schools ALTER COLUMN admission_prefix SET DEFAULT 'SCH'`);

    // 2. Add student_uid to students
    const hasUid = await knex.schema.hasColumn('students', 'student_uid');
    if (!hasUid) {
        await knex.schema.alterTable('students', t => {
            t.string('student_uid', 12).nullable();
        });
    }

    // Backfill UIDs for existing students
    const students = await knex('students').whereNull('student_uid').select('id');
    for (const student of students) {
        await knex('students').where('id', student.id).update({ student_uid: generateUid() });
    }

    // Unique index: (school_id, student_uid)
    await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS students_uid_school_unique
        ON students (school_id, student_uid)
        WHERE student_uid IS NOT NULL
    `);
    await knex.raw(`CREATE INDEX IF NOT EXISTS students_uid_idx ON students (student_uid) WHERE student_uid IS NOT NULL`);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw('DROP INDEX IF EXISTS students_uid_school_unique');
    await knex.raw('DROP INDEX IF EXISTS students_uid_idx');
    await knex.schema.alterTable('students', t => t.dropColumn('student_uid'));
    await knex.schema.alterTable('schools', t => t.dropColumn('admission_prefix'));
}
