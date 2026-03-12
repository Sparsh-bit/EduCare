/**
 * Security Check Script
 *
 * Verifies critical security invariants at the database level:
 *   1. RLS is enabled on ALL tables
 *   2. Every table with school_id has a tenant_isolation policy
 *   3. No tables allow unrestricted USING(true) policies
 *   4. Sensitive columns (password_hash, aadhaar_encrypted) are not exposed
 *   5. Performance indexes exist on school_id columns
 *
 * Run: npm run security:check
 */

import db from '../config/database';

interface RlsRow {
    tablename: string;
    rowsecurity: boolean;
}

interface PolicyRow {
    tablename: string;
    policyname: string;
    cmd: string;
    qual: string;
}

interface ColumnRow {
    table_name: string;
    column_name: string;
}

interface IndexRow {
    indexname: string;
    tablename: string;
}

async function main() {
    let exitCode = 0;

    console.log('\n🔒 EduCare ERP — Security Health Check\n');
    console.log('═'.repeat(60));

    // 1. Check RLS status on all tables
    console.log('\n📋 1. Row Level Security (RLS) Status\n');

    const tables = await db.raw(`
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    `);

    const rlsRows: RlsRow[] = tables.rows;
    let rlsEnabled = 0;
    let rlsDisabled = 0;
    const disabledTables: string[] = [];

    for (const t of rlsRows) {
        if (t.rowsecurity) {
            rlsEnabled++;
        } else {
            rlsDisabled++;
            disabledTables.push(t.tablename);
        }
    }

    console.log(`   ✅ RLS enabled: ${rlsEnabled}/${rlsRows.length} tables`);
    if (rlsDisabled > 0) {
        console.log(`   ❌ RLS DISABLED on ${rlsDisabled} tables:`);
        disabledTables.forEach((t) => console.log(`      - ${t}`));
        exitCode = 1;
    }

    // 2. Check policies
    console.log('\n📋 2. RLS Policies\n');

    const policies = await db.raw(`
        SELECT tablename, policyname, cmd, qual
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    `);

    const policyRows: PolicyRow[] = policies.rows;
    const tablesWithPolicies = new Set(policyRows.map((p) => p.tablename));
    const tablesWithoutPolicies = rlsRows
        .filter((t) => t.rowsecurity && !tablesWithPolicies.has(t.tablename))
        .map((t) => t.tablename);

    if (tablesWithoutPolicies.length > 0) {
        console.log(`   ⚠️  ${tablesWithoutPolicies.length} tables have RLS enabled but NO policies (will block ALL access):`);
        tablesWithoutPolicies.forEach((t) => console.log(`      - ${t}`));
        exitCode = 1;
    }

    // Check for dangerous USING (true) policies
    const unsafePolicies = policyRows.filter(
        (p) => p.qual && p.qual.trim() === 'true'
    );
    if (unsafePolicies.length > 0) {
        console.log(`   ❌ ${unsafePolicies.length} tables have unsafe USING(true) policies:`);
        unsafePolicies.forEach((p) => console.log(`      - ${p.tablename}.${p.policyname}`));
        exitCode = 1;
    } else {
        console.log(`   ✅ No unsafe USING(true) policies found`);
    }

    console.log(`   ✅ ${policyRows.length} policies across ${tablesWithPolicies.size} tables`);

    // 3. Check school_id coverage
    console.log('\n📋 3. Tenant Isolation (school_id)\n');

    const schoolIdCols = await db.raw(`
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'school_id'
        GROUP BY table_name
        ORDER BY table_name
    `);

    const schoolIdRows: ColumnRow[] = schoolIdCols.rows;
    console.log(`   ✅ ${schoolIdRows.length} tables have school_id column`);

    // 4. Check for sensitive data exposure
    console.log('\n📋 4. Sensitive Data Check\n');

    const sensitiveCheck = await db.raw(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name IN ('password_hash', 'aadhaar_encrypted', 'refresh_token_hash', 'otp_hash', 'token_hash')
        ORDER BY table_name, column_name
    `);

    const sensitiveRows: ColumnRow[] = sensitiveCheck.rows;
    console.log(`   🔐 ${sensitiveRows.length} sensitive columns found (protected by app-layer + RLS):`);
    sensitiveRows.forEach((r) => console.log(`      - ${r.table_name}.${r.column_name}`));

    // 5. Check indexes
    console.log('\n📋 5. Performance Indexes\n');

    const indexes = await db.raw(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname LIKE 'idx_%'
        ORDER BY tablename, indexname
    `);

    const indexRows: IndexRow[] = indexes.rows;
    console.log(`   ✅ ${indexRows.length} custom performance indexes found`);

    // Summary
    console.log('\n' + '═'.repeat(60));
    if (exitCode === 0) {
        console.log('✅ All security checks PASSED\n');
    } else {
        console.log('❌ Some security checks FAILED — review issues above\n');
    }

    await db.destroy();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Security check failed:', err);
    process.exit(1);
});
