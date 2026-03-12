import type { Knex } from 'knex';
import crypto from 'crypto';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('schools', (t) => {
        t.uuid('website_token').nullable().unique();
    });

    // Generate a unique token for every existing school
    const schools = await knex('schools').select('id');
    for (const school of schools) {
        await knex('schools').where('id', school.id).update({
            website_token: crypto.randomUUID(),
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('schools', (t) => {
        t.dropColumn('website_token');
    });
}
