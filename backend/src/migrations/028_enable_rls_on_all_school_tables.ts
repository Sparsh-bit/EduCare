import type { Knex } from 'knex';

interface TableRow {
    table_name: string;
}

async function getSchoolScopedTables(knex: Knex): Promise<string[]> {
    const rows = await knex('information_schema.columns')
        .select<TableRow[]>('table_name')
        .where({ table_schema: 'public', column_name: 'school_id' })
        .groupBy('table_name');

    return rows
        .map((r) => r.table_name)
        .filter((name) => !!name && name !== 'schools')
        .sort();
}

export async function up(knex: Knex): Promise<void> {
    const tables = await getSchoolScopedTables(knex);

    for (const table of tables) {
        await knex.raw(`ALTER TABLE ?? ENABLE ROW LEVEL SECURITY`, [table]);
        await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON ??`, [table]);
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

    const schoolsExists = await knex.schema.hasTable('schools');
    if (schoolsExists) {
        await knex.raw('ALTER TABLE schools ENABLE ROW LEVEL SECURITY');
        await knex.raw('DROP POLICY IF EXISTS school_access ON schools');
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
    }
}

export async function down(knex: Knex): Promise<void> {
    const tables = await getSchoolScopedTables(knex);

    for (const table of tables) {
        await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON ??`, [table]);
        await knex.raw(`ALTER TABLE ?? DISABLE ROW LEVEL SECURITY`, [table]);
    }

    const schoolsExists = await knex.schema.hasTable('schools');
    if (schoolsExists) {
        await knex.raw('DROP POLICY IF EXISTS school_access ON schools');
        await knex.raw('ALTER TABLE schools DISABLE ROW LEVEL SECURITY');
    }
}
