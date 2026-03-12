/**
 * Migration 031 — Comprehensive RLS & Security Hardening
 *
 * Addresses Supabase Security Advisor findings (61 errors).
 *
 * Strategy:
 *   1. Discover ALL tables in the public schema dynamically.
 *   2. For each table with school_id → proper tenant_isolation policy.
 *   3. For auth-sensitive tables → backend-bypass-only policy.
 *   4. For infrastructure tables → bypass-only (knex_migrations, etc.).
 *   5. For public tables (enquiries) → restrictive insert-only + bypass.
 *   6. Add missing performance indexes on school_id + common query columns.
 *   7. Revoke direct anon/authenticated access from Supabase public schema
 *      to force all access through the backend API.
 */

import type { Knex } from 'knex';

// Tables that are ONLY accessed by the backend service role (never via Supabase client)
const BACKEND_ONLY_TABLES = new Set([
    'email_otp_tokens',
    'password_reset_tokens',
    'knex_migrations',
    'knex_migrations_lock',
]);

// Tables without school_id that are public / pre-auth
const PUBLIC_INSERT_TABLES = new Set([
    'enquiries',
]);

// The schools table itself (uses id instead of school_id)
const SCHOOLS_TABLE = 'schools';

const TENANT_POLICY_SQL = `
    CREATE POLICY tenant_isolation ON ??
    FOR ALL
    USING (
        school_id = NULLIF(current_setting('app.current_school_id', true), '')::integer
        OR current_setting('app.bypass_rls', true) = 'on'
    )
    WITH CHECK (
        school_id = NULLIF(current_setting('app.current_school_id', true), '')::integer
        OR current_setting('app.bypass_rls', true) = 'on'
    )
`;

const BYPASS_ONLY_POLICY_SQL = `
    CREATE POLICY tenant_isolation ON ??
    FOR ALL
    USING (current_setting('app.bypass_rls', true) = 'on')
    WITH CHECK (current_setting('app.bypass_rls', true) = 'on')
`;

const PUBLIC_INSERT_POLICY_SQL = `
    CREATE POLICY tenant_isolation ON ??
    FOR ALL
    USING (current_setting('app.bypass_rls', true) = 'on')
    WITH CHECK (true)
`;

interface TableInfo {
    table_name: string;
}

interface ColumnInfo {
    table_name: string;
}

export async function up(knex: Knex): Promise<void> {
    // ─── Step 1: Discover all public tables ────────────────────────────
    const allTables = await knex('information_schema.tables')
        .select<TableInfo[]>('table_name')
        .where({ table_schema: 'public', table_type: 'BASE TABLE' });

    const tableNames = allTables.map((t) => t.table_name).filter(Boolean).sort();

    // Discover which tables have school_id
    const schoolIdTables = await knex('information_schema.columns')
        .select<ColumnInfo[]>('table_name')
        .where({ table_schema: 'public', column_name: 'school_id' })
        .groupBy('table_name');

    const hasSchoolId = new Set(schoolIdTables.map((t) => t.table_name));

    let enabledCount = 0;

    for (const table of tableNames) {
        // Enable RLS on every table
        await knex.raw(`ALTER TABLE ?? ENABLE ROW LEVEL SECURITY`, [table]);
        await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON ??`, [table]);
        await knex.raw(`DROP POLICY IF EXISTS school_access ON ??`, [table]);

        if (table === SCHOOLS_TABLE) {
            // Schools table: match on id
            await knex.raw(`
                CREATE POLICY school_access ON schools
                FOR ALL
                USING (
                    id = NULLIF(current_setting('app.current_school_id', true), '')::integer
                    OR current_setting('app.bypass_rls', true) = 'on'
                )
                WITH CHECK (
                    id = NULLIF(current_setting('app.current_school_id', true), '')::integer
                    OR current_setting('app.bypass_rls', true) = 'on'
                )
            `);
        } else if (BACKEND_ONLY_TABLES.has(table)) {
            await knex.raw(BYPASS_ONLY_POLICY_SQL, [table]);
        } else if (PUBLIC_INSERT_TABLES.has(table)) {
            await knex.raw(PUBLIC_INSERT_POLICY_SQL, [table]);
        } else if (hasSchoolId.has(table)) {
            await knex.raw(TENANT_POLICY_SQL, [table]);
        } else {
            // No school_id and not special → backend-only (safe default)
            await knex.raw(BYPASS_ONLY_POLICY_SQL, [table]);
        }

        enabledCount++;
    }

    // ─── Step 2: Revoke direct access from Supabase public roles ──────
    // This ensures the anon and authenticated Supabase roles cannot
    // directly query tables — all access goes through the backend API.
    // These are safe no-ops if the roles don't exist (self-hosted PG).
    for (const role of ['anon', 'authenticated']) {
        try {
            await knex.raw(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${role}`);
            await knex.raw(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${role}`);
            await knex.raw(`REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM ${role}`);
        } catch {
            // Role doesn't exist in this database — safe to ignore
        }
    }

    // ─── Step 3: Performance indexes on school_id columns ─────────────
    const INDEX_TARGETS: Array<{ table: string; columns: string[]; name: string }> = [
        { table: 'students', columns: ['school_id', 'status'], name: 'idx_students_school_status' },
        { table: 'students', columns: ['school_id', 'current_class_id'], name: 'idx_students_school_class' },
        { table: 'students', columns: ['school_id', 'academic_year_id'], name: 'idx_students_school_ay' },
        { table: 'attendance', columns: ['date', 'student_id'], name: 'idx_attendance_date_student' },
        { table: 'fee_payments', columns: ['student_id', 'academic_year_id'], name: 'idx_feepay_student_ay' },
        { table: 'fee_payments', columns: ['academic_year_id', 'payment_date'], name: 'idx_feepay_ay_date' },
        { table: 'audit_logs', columns: ['school_id', 'created_at'], name: 'idx_audit_school_created' },
        { table: 'staff', columns: ['school_id', 'status'], name: 'idx_staff_school_status' },
        { table: 'users', columns: ['school_id', 'role'], name: 'idx_users_school_role' },
        { table: 'users', columns: ['email'], name: 'idx_users_email' },
        { table: 'exams', columns: ['school_id', 'status'], name: 'idx_exams_school_status' },
        { table: 'vendor_bills', columns: ['school_id', 'status'], name: 'idx_vendorbills_school_status' },
        { table: 'income_entries', columns: ['school_id', 'date'], name: 'idx_income_school_date' },
        { table: 'expense_entries', columns: ['school_id', 'date'], name: 'idx_expense_school_date' },
        { table: 'notices', columns: ['school_id', 'created_at'], name: 'idx_notices_school_created' },
    ];

    for (const idx of INDEX_TARGETS) {
        const tableExists = await knex.schema.hasTable(idx.table);
        if (!tableExists) continue;
        const colList = idx.columns.join(', ');
        await knex.raw(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ?? (${colList})`, [idx.table]);
    }

    // ─── Step 4: Force HTTPS-only cookies in production ───────────────
    // (Applied at app layer — see knexfile and app.ts, nothing DB-side)

    // eslint-disable-next-line no-console
    console.log(`[Migration 031] RLS enabled and hardened on ${enabledCount} tables. Indexes applied.`);
}

export async function down(knex: Knex): Promise<void> {
    // Restore access for Supabase roles (if they exist)
    for (const role of ['anon', 'authenticated']) {
        try {
            await knex.raw(`GRANT USAGE ON SCHEMA public TO ${role}`);
            await knex.raw(`GRANT ALL ON ALL TABLES IN SCHEMA public TO ${role}`);
            await knex.raw(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
        } catch {
            // Role doesn't exist — safe to ignore
        }
    }

    // Drop performance indexes
    const indexes = [
        'idx_students_school_status', 'idx_students_school_class', 'idx_students_school_ay',
        'idx_attendance_date_student', 'idx_feepay_student_ay', 'idx_feepay_ay_date',
        'idx_audit_school_created', 'idx_staff_school_status', 'idx_users_school_role',
        'idx_users_email', 'idx_exams_school_status', 'idx_vendorbills_school_status',
        'idx_income_school_date', 'idx_expense_school_date', 'idx_notices_school_created',
    ];
    for (const idx of indexes) {
        await knex.raw(`DROP INDEX IF EXISTS ${idx}`);
    }

    // Note: We do NOT disable RLS in the down migration for safety —
    // the existing migrations 027/028/029 handle the base state.
}
