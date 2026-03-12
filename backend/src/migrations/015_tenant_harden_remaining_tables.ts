import type { Knex } from 'knex';

/**
 * Migration 015 — Add school_id to every tenant-bound table that was still missing it.
 *
 * Tables addressed:
 *   notices, homework, transfer_certificates, student_documents,
 *   staff_leaves, staff_salary_records, audit_logs
 *
 * Pattern: add nullable FK → backfill from parent → enforce NOT NULL → index.
 */
export async function up(knex: Knex): Promise<void> {
    // ── helpers ─────────────────────────────────────────────────────────────
    const addSchoolId = async (table: string) => {
        const has = await knex.schema.hasColumn(table, 'school_id');
        if (!has) {
            await knex.schema.alterTable(table, (t) => {
                t.integer('school_id').unsigned().nullable()
                    .references('id').inTable('schools').onDelete('CASCADE');
            });
        }
    };

    // ── notices ─────────────────────────────────────────────────────────────
    await addSchoolId('notices');
    await knex.raw(`
        UPDATE notices
        SET school_id = u.school_id
        FROM users u
        WHERE notices.created_by = u.id
          AND notices.school_id IS NULL
    `);
    await knex.raw(`ALTER TABLE notices ALTER COLUMN school_id SET NOT NULL`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_notices_school ON notices (school_id)`);

    // ── homework ─────────────────────────────────────────────────────────────
    await addSchoolId('homework');
    await knex.raw(`
        UPDATE homework
        SET school_id = c.school_id
        FROM classes c
        WHERE homework.class_id = c.id
          AND homework.school_id IS NULL
    `);
    await knex.raw(`ALTER TABLE homework ALTER COLUMN school_id SET NOT NULL`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_homework_school ON homework (school_id)`);

    // ── transfer_certificates ────────────────────────────────────────────────
    await addSchoolId('transfer_certificates');
    await knex.raw(`
        UPDATE transfer_certificates
        SET school_id = s.school_id
        FROM students s
        WHERE transfer_certificates.student_id = s.id
          AND transfer_certificates.school_id IS NULL
    `);
    await knex.raw(`ALTER TABLE transfer_certificates ALTER COLUMN school_id SET NOT NULL`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_tc_school ON transfer_certificates (school_id)`);

    // ── student_documents ────────────────────────────────────────────────────
    await addSchoolId('student_documents');
    await knex.raw(`
        UPDATE student_documents
        SET school_id = s.school_id
        FROM students s
        WHERE student_documents.student_id = s.id
          AND student_documents.school_id IS NULL
    `);
    await knex.raw(`ALTER TABLE student_documents ALTER COLUMN school_id SET NOT NULL`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_student_docs_school ON student_documents (school_id)`);

    // ── staff_leaves ─────────────────────────────────────────────────────────
    await addSchoolId('staff_leaves');
    await knex.raw(`
        UPDATE staff_leaves
        SET school_id = st.school_id
        FROM staff st
        WHERE staff_leaves.staff_id = st.id
          AND staff_leaves.school_id IS NULL
    `);
    await knex.raw(`ALTER TABLE staff_leaves ALTER COLUMN school_id SET NOT NULL`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_staff_leaves_school ON staff_leaves (school_id)`);

    // ── staff_salary_records ─────────────────────────────────────────────────
    await addSchoolId('staff_salary_records');
    await knex.raw(`
        UPDATE staff_salary_records
        SET school_id = st.school_id
        FROM staff st
        WHERE staff_salary_records.staff_id = st.id
          AND staff_salary_records.school_id IS NULL
    `);
    await knex.raw(`ALTER TABLE staff_salary_records ALTER COLUMN school_id SET NOT NULL`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_salary_records_school ON staff_salary_records (school_id)`);

    // ── audit_logs ────────────────────────────────────────────────────────────
    await addSchoolId('audit_logs');
    await knex.raw(`
        UPDATE audit_logs
        SET school_id = u.school_id
        FROM users u
        WHERE audit_logs.user_id = u.id
          AND audit_logs.school_id IS NULL
    `);
    // audit_logs can come from system/scheduler with no user; keep nullable
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON audit_logs (school_id)`);
}

export async function down(knex: Knex): Promise<void> {
    const dropCol = async (table: string) => {
        const has = await knex.schema.hasColumn(table, 'school_id');
        if (has) await knex.schema.alterTable(table, (t) => t.dropColumn('school_id'));
    };
    await dropCol('audit_logs');
    await dropCol('staff_salary_records');
    await dropCol('staff_leaves');
    await dropCol('student_documents');
    await dropCol('transfer_certificates');
    await dropCol('homework');
    await dropCol('notices');
}
