import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Add school_id to exams table
    const hasCol = await knex.schema.hasColumn('exams', 'school_id');
    if (!hasCol) {
        await knex.schema.alterTable('exams', (t) => {
            t.integer('school_id')
                .unsigned()
                .references('id')
                .inTable('schools')
                .onDelete('CASCADE');
        });

        // Backfill from classes.school_id
        await knex.raw(`
            UPDATE exams
            SET school_id = classes.school_id
            FROM classes
            WHERE exams.class_id = classes.id
              AND exams.school_id IS NULL
        `);

        // Now make it NOT NULL
        await knex.raw(`ALTER TABLE exams ALTER COLUMN school_id SET NOT NULL`);

        // Add index for tenant queries
        await knex.schema.alterTable('exams', (t) => {
            t.index(['school_id', 'academic_year_id'], 'idx_exams_school_year');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasCol = await knex.schema.hasColumn('exams', 'school_id');
    if (hasCol) {
        await knex.schema.alterTable('exams', (t) => {
            t.dropIndex([], 'idx_exams_school_year');
            t.dropColumn('school_id');
        });
    }
}
