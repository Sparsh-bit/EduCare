import type { Knex } from 'knex';

// This migration adds composite indexes for the most common multi-tenant query patterns.
// All high-frequency queries filter by school_id first — making it the leading key
// in each composite index lets PostgreSQL use the index for both school-scoped and
// column-specific predicates simultaneously.
//
// CONCURRENTLY avoids table locks on production, but requires the migration to run
// outside a transaction (see config below).

export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
    // Students — active roster by class/section
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_school_status_deleted
        ON students(school_id, status, deleted_at)`);
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_school_class_section
        ON students(school_id, current_class_id, current_section_id)`);

    // Attendance — daily class lookup + student history
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_school_class_sec_date
        ON attendance(school_id, class_id, section_id, date)`);
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_school_student_date
        ON attendance(school_id, student_id, date)`);

    // Fee payments — student fee history + yearly collection report
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_payments_school_student_year
        ON fee_payments(school_id, student_id, academic_year_id)`);
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_payments_school_year_date
        ON fee_payments(school_id, academic_year_id, payment_date)`);

    // Fee structures — class/year lookup
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_school_class_year
        ON fee_structures(school_id, class_id, academic_year_id)`);

    // Staff — active staff list + salary records
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_school_status_deleted
        ON staff(school_id, status, deleted_at)`);
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_salary_school_year_month
        ON staff_salary_records(school_id, year, month)`);
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_leaves_school_status_date
        ON staff_leaves(school_id, status, from_date)`);

    // Users — role-based listing (list users, find teachers, etc.)
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_school_role_active
        ON users(school_id, role, is_active)`);

    // Notices + Homework — active notices dashboard
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notices_school_active_created
        ON notices(school_id, is_active, created_at DESC)`);
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homework_school_class_sec_due
        ON homework(school_id, class_id, section_id, due_date DESC)`);

    // Exams — exam listing by school/year/status
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_school_year_status
        ON exams(school_id, academic_year_id, status)`);

    // Audit logs — recent activity dashboard (school + time)
    await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_school_created_desc
        ON audit_logs(school_id, created_at DESC)`);
}

export async function down(knex: Knex): Promise<void> {
    const indexes = [
        'idx_students_school_status_deleted',
        'idx_students_school_class_section',
        'idx_attendance_school_class_sec_date',
        'idx_attendance_school_student_date',
        'idx_fee_payments_school_student_year',
        'idx_fee_payments_school_year_date',
        'idx_fee_structures_school_class_year',
        'idx_staff_school_status_deleted',
        'idx_staff_salary_school_year_month',
        'idx_staff_leaves_school_status_date',
        'idx_users_school_role_active',
        'idx_notices_school_active_created',
        'idx_homework_school_class_sec_due',
        'idx_exams_school_year_status',
        'idx_audit_logs_school_created_desc',
    ];
    for (const idx of indexes) {
        await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS ${idx}`);
    }
}
