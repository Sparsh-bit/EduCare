import { Knex } from 'knex';

/**
 * Migration 020 — Add school_id to academic_years
 *
 * academic_years was originally a global table shared across all schools.
 * This migration makes it fully tenant-isolated:
 *   - Adds school_id FK column (nullable first, then NOT NULL after backfill)
 *   - Backfills existing rows using the first school's id (safe assumption for
 *     single-school dev instances; multi-school prod data should be reviewed)
 *   - Drops the global UNIQUE(year) constraint and replaces it with UNIQUE(year, school_id)
 *   - Adds an index on school_id for query performance
 */
export async function up(knex: Knex): Promise<void> {
    const hasCol = await knex.schema.hasColumn('academic_years', 'school_id');
    if (!hasCol) {
        await knex.schema.alterTable('academic_years', (t) => {
            t.integer('school_id').unsigned().nullable()
                .references('id').inTable('schools').onDelete('CASCADE');
        });
    }

    // Backfill: assign existing rows to the first school (dev/single-tenant safe)
    await knex.raw(`
        UPDATE academic_years ay
        SET school_id = s.id
        FROM (SELECT id FROM schools ORDER BY id LIMIT 1) s
        WHERE ay.school_id IS NULL
    `);

    // Enforce NOT NULL now that all rows have a school_id
    const hasNotNull = await knex.raw(`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_name = 'academic_years' AND column_name = 'school_id'
    `);
    if (hasNotNull.rows[0]?.is_nullable === 'YES') {
        await knex.raw(`ALTER TABLE academic_years ALTER COLUMN school_id SET NOT NULL`);
    }

    // Drop global UNIQUE(year) — causes cross-tenant collisions
    await knex.raw(`
        ALTER TABLE academic_years DROP CONSTRAINT IF EXISTS academic_years_year_unique
    `);

    // Add composite unique + index
    await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS academic_years_year_school_unique
        ON academic_years (year, school_id)
    `);
    await knex.raw(`
        CREATE INDEX IF NOT EXISTS academic_years_school_id_idx ON academic_years (school_id)
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`DROP INDEX IF EXISTS academic_years_year_school_unique`);
    await knex.raw(`DROP INDEX IF EXISTS academic_years_school_id_idx`);
    await knex.raw(`
        ALTER TABLE academic_years ADD CONSTRAINT academic_years_year_unique UNIQUE (year)
    `);
    await knex.schema.alterTable('academic_years', (t) => {
        t.dropColumn('school_id');
    });
}
