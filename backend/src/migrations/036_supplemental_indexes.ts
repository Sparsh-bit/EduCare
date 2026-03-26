import { Knex } from 'knex';

/**
 * Migration 036 — Supplemental indexes on lower-frequency tables
 *
 * Identified by database architecture audit as low-priority optimizations.
 * These complement migration 033 (high-frequency composites) by covering
 * secondary lookups on reference and history tables.
 *
 * All indexes are CONCURRENTLY — zero downtime, safe on live Supabase.
 * CONCURRENTLY cannot run inside a transaction, so transaction is disabled.
 */
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
    // student_class_history — promotions, history views, status filters
    await knex.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_class_history_school_status
        ON student_class_history(school_id, status)
    `);

    // exam_subjects — marks entry page loads all subjects for an exam
    await knex.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_subjects_school_exam
        ON exam_subjects(school_id, exam_id)
    `);

    // leave_types — HR dashboards filter by active leave types
    await knex.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_types_school_active
        ON leave_types(school_id, is_active)
        WHERE is_active = true
    `);

    // grade_mappings — result grading looks up passing threshold per school
    await knex.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_mappings_school
        ON grade_mappings(school_id)
    `);

    // salary_structure — payroll processing joins on school_id + staff_id
    await knex.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salary_structure_school_staff
        ON salary_structure(school_id, staff_id)
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_student_class_history_school_status');
    await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_exam_subjects_school_exam');
    await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_leave_types_school_active');
    await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_grade_mappings_school');
    await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_salary_structure_school_staff');
}
