import { Knex } from 'knex';

/**
 * Migration 037 — Add transport / hostel / bus_route to students table
 *
 * Professional Indian school Excel exports commonly include these logistics fields.
 * The bulk import pipeline now maps them from uploaded files into these columns.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('students', (t) => {
        t.boolean('transport').defaultTo(false);
        t.string('hostel', 10).nullable();     // 'yes'/'no'/null
        t.string('bus_route', 100).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('students', (t) => {
        t.dropColumn('transport');
        t.dropColumn('hostel');
        t.dropColumn('bus_route');
    });
}
