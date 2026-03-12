// IMPORTANT: RLS bypass for backend service connections.
// The backend connects with a privileged DB user. To bypass RLS for server-side
// queries (which already enforce school_id at app level), set in knexfile.ts:
//   afterCreate: (conn, done) => { conn.query("SET app.bypass_rls = 'on'", done); }
// OR enable RLS bypass for the backend DB role:
//   GRANT BYPASS RLS TO your_backend_role;
// Without this, all backend queries will fail once RLS is enabled.
// For Supabase: use service_role key (which has BYPASSRLS privilege by default).

import type { Knex } from 'knex';

// All tenant-scoped tables that hold school_id
const TENANT_TABLES = [
    'students',
    'classes',
    'sections',
    'subjects',
    'academic_years',
    'attendance',
    'fee_structures',
    'fee_installments',
    'fee_payments',
    'exams',
    'exam_marks',
    'exam_results',
    'staff',
    'staff_leaves',
    'staff_salary_records',
    'salary_structure',
    'notices',
    'homework',
    'alerts',
    'student_documents',
    'transfer_certificates',
    'student_class_history',
    'student_import_batches',
    'student_import_batch_items',
    'audit_logs',
    'vendor_bills',
    'vendor_bill_items',
    'income',
    'expenses',
    'users',
];

export async function up(knex: Knex): Promise<void> {
    for (const table of TENANT_TABLES) {
        // Check if table exists before enabling RLS
        const exists = await knex.schema.hasTable(table);
        if (!exists) continue;

        // Enable RLS
        await knex.raw(`ALTER TABLE ?? ENABLE ROW LEVEL SECURITY`, [table]);

        // Drop existing policies if any (idempotent)
        await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON ??`, [table]);
        await knex.raw(`DROP POLICY IF EXISTS service_role_bypass ON ??`, [table]);

        // Check if table has school_id column
        const hasSchoolId = await knex.schema.hasColumn(table, 'school_id');
        if (!hasSchoolId) {
            // For tables without school_id, allow all authenticated
            await knex.raw(`
                CREATE POLICY tenant_isolation ON ??
                FOR ALL
                USING (true)
                WITH CHECK (true)
            `, [table]);
            continue;
        }

        // Tenant isolation policy: app sets current_setting('app.current_school_id')
        // Backend sets this via SET LOCAL before each query (or connection pool config)
        await knex.raw(`
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
        `, [table]);
    }

    // Enable RLS on schools table itself (each row is a tenant)
    const schoolsExists = await knex.schema.hasTable('schools');
    if (schoolsExists) {
        await knex.raw(`ALTER TABLE schools ENABLE ROW LEVEL SECURITY`);
        await knex.raw(`DROP POLICY IF EXISTS school_access ON schools`);
        await knex.raw(`
            CREATE POLICY school_access ON schools
            FOR ALL
            USING (
                id = NULLIF(current_setting('app.current_school_id', true), '')::integer
                OR current_setting('app.bypass_rls', true) = 'on'
            )
        `);
    }
}

export async function down(knex: Knex): Promise<void> {
    for (const table of TENANT_TABLES) {
        const exists = await knex.schema.hasTable(table);
        if (!exists) continue;
        await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON ??`, [table]);
        await knex.raw(`ALTER TABLE ?? DISABLE ROW LEVEL SECURITY`, [table]);
    }
    const schoolsExists = await knex.schema.hasTable('schools');
    if (schoolsExists) {
        await knex.raw(`DROP POLICY IF EXISTS school_access ON schools`);
        await knex.raw(`ALTER TABLE schools DISABLE ROW LEVEL SECURITY`);
    }
}
