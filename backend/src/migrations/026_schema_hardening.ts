import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ─── 1. Fix existing NULL school_id rows in audit_logs ───
    // Set school_id from the user who performed the action where possible
    await knex.raw(`
        UPDATE audit_logs al
        SET school_id = u.school_id
        FROM users u
        WHERE al.user_id = u.id
          AND al.school_id IS NULL
          AND u.school_id IS NOT NULL
    `);

    // Delete any remaining audit_logs rows where school_id is still NULL
    // (orphaned logs from deleted users with no school mapping)
    await knex('audit_logs').whereNull('school_id').delete();

    // ─── 2. Make audit_logs.school_id NOT NULL ───
    await knex.schema.alterTable('audit_logs', (table) => {
        table.integer('school_id').notNullable().alter();
    });

    // ─── 3. Make student_import_batches.school_id NOT NULL (already is, verify) ───
    // Already notNullable from migration 023 — skip

    // ─── 4. Add index on audit_logs(school_id, created_at) if not exists ───
    await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created
        ON audit_logs (school_id, created_at DESC)
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('audit_logs', (table) => {
        table.integer('school_id').nullable().alter();
    });
    await knex.raw('DROP INDEX IF EXISTS idx_audit_logs_school_created');
}
