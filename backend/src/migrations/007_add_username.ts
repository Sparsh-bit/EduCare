import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Add username column (nullable first so existing rows don't fail)
    await knex.schema.alterTable('users', (t) => {
        t.string('username', 100).nullable();
    });

    // For any existing users, copy email → username as a fallback
    await knex.raw(`UPDATE users SET username = email WHERE username IS NULL`);

    // Now make username unique and not nullable
    await knex.schema.alterTable('users', (t) => {
        t.string('username', 100).notNullable().unique().alter();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (t) => {
        t.dropColumn('username');
    });
}
