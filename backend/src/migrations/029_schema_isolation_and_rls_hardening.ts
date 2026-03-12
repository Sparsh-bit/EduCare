/**
 * Migration 029 — Schema isolation and RLS hardening
 *
 * Problems addressed:
 * 1. vendor_bill_items had no school_id → RLS policy was USING (true) (allow-all cross-tenant).
 * 2. student_siblings had no school_id → RLS was disabled / no tenant isolation.
 * 3. email_otp_tokens and password_reset_tokens had RLS disabled despite being auth-sensitive.
 *
 * Fixes:
 * - Add school_id to vendor_bill_items, back-fill from vendor_bills, enforce NOT NULL.
 * - Add school_id to student_siblings, back-fill from the referenced student, enforce NOT NULL.
 * - Replace USING (true) on vendor_bill_items with proper tenant_isolation policy.
 * - Enable RLS on student_siblings with tenant_isolation policy.
 * - Enable RLS on email_otp_tokens and password_reset_tokens with backend-only (bypass) policy.
 */

import type { Knex } from 'knex';

const BYPASS_ONLY_POLICY = `
    CREATE POLICY tenant_isolation ON ??
    FOR ALL
    USING (current_setting('app.bypass_rls', true) = 'on')
    WITH CHECK (current_setting('app.bypass_rls', true) = 'on')
`;

const TENANT_POLICY = `
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

export async function up(knex: Knex): Promise<void> {
    // ─── 1. vendor_bill_items — add school_id ──────────────────────────────────
    const vbiHasSchoolId = await knex.schema.hasColumn('vendor_bill_items', 'school_id');
    if (!vbiHasSchoolId) {
        await knex.schema.alterTable('vendor_bill_items', (t) => {
            t.integer('school_id').unsigned().nullable().references('id').inTable('schools');
        });
        // Back-fill from parent vendor_bills row
        await knex.raw(`
            UPDATE vendor_bill_items vbi
            SET school_id = vb.school_id
            FROM vendor_bills vb
            WHERE vb.id = vbi.vendor_bill_id
        `);
        // Now enforce NOT NULL (all rows must have been populated)
        await knex.raw(`ALTER TABLE vendor_bill_items ALTER COLUMN school_id SET NOT NULL`);
        await knex.raw(`CREATE INDEX IF NOT EXISTS idx_vendor_bill_items_school_id ON vendor_bill_items (school_id)`);
    }

    // Fix the USING (true) policy on vendor_bill_items → proper tenant isolation
    await knex.raw(`ALTER TABLE vendor_bill_items ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON vendor_bill_items`);
    await knex.raw(TENANT_POLICY, ['vendor_bill_items']);

    // ─── 2. student_siblings — add school_id ──────────────────────────────────
    const sibHasSchoolId = await knex.schema.hasColumn('student_siblings', 'school_id');
    if (!sibHasSchoolId) {
        await knex.schema.alterTable('student_siblings', (t) => {
            t.integer('school_id').unsigned().nullable().references('id').inTable('schools');
        });
        // Back-fill from the student row (both siblings share the same school)
        await knex.raw(`
            UPDATE student_siblings ss
            SET school_id = s.school_id
            FROM students s
            WHERE s.id = ss.student_id
        `);
        await knex.raw(`ALTER TABLE student_siblings ALTER COLUMN school_id SET NOT NULL`);
        await knex.raw(`CREATE INDEX IF NOT EXISTS idx_student_siblings_school_id ON student_siblings (school_id)`);
    }

    // Enable + harden RLS on student_siblings
    await knex.raw(`ALTER TABLE student_siblings ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON student_siblings`);
    await knex.raw(TENANT_POLICY, ['student_siblings']);

    // ─── 3. email_otp_tokens — backend-only RLS ───────────────────────────────
    // These tokens are auth-sensitive. Only the backend service role (bypass_rls=on)
    // should be able to read or write them. Any direct PostgREST/Supabase access is blocked.
    await knex.raw(`ALTER TABLE email_otp_tokens ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON email_otp_tokens`);
    await knex.raw(BYPASS_ONLY_POLICY, ['email_otp_tokens']);

    // ─── 4. password_reset_tokens — backend-only RLS ──────────────────────────
    await knex.raw(`ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON password_reset_tokens`);
    await knex.raw(BYPASS_ONLY_POLICY, ['password_reset_tokens']);
}

export async function down(knex: Knex): Promise<void> {
    // Disable RLS on auth token tables
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON password_reset_tokens`);
    await knex.raw(`ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY`);

    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON email_otp_tokens`);
    await knex.raw(`ALTER TABLE email_otp_tokens DISABLE ROW LEVEL SECURITY`);

    // Revert student_siblings: drop policy, disable RLS, drop column
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON student_siblings`);
    await knex.raw(`ALTER TABLE student_siblings DISABLE ROW LEVEL SECURITY`);
    const sibHasSchoolId = await knex.schema.hasColumn('student_siblings', 'school_id');
    if (sibHasSchoolId) {
        await knex.raw(`DROP INDEX IF EXISTS idx_student_siblings_school_id`);
        await knex.schema.alterTable('student_siblings', (t) => { t.dropColumn('school_id'); });
    }

    // Revert vendor_bill_items: restore USING(true) policy, drop school_id column
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON vendor_bill_items`);
    await knex.raw(`
        CREATE POLICY tenant_isolation ON vendor_bill_items
        FOR ALL USING (true) WITH CHECK (true)
    `);
    const vbiHasSchoolId = await knex.schema.hasColumn('vendor_bill_items', 'school_id');
    if (vbiHasSchoolId) {
        await knex.raw(`DROP INDEX IF EXISTS idx_vendor_bill_items_school_id`);
        await knex.schema.alterTable('vendor_bill_items', (t) => { t.dropColumn('school_id'); });
    }
}
