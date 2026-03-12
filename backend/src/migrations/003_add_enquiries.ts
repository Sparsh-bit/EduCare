import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('enquiries', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('school_name').notNullable();
        table.string('owner_name').notNullable();
        table.string('contact_email').notNullable();
        table.string('contact_phone').notNullable();
        table.integer('expected_students').notNullable();
        table.string('status').notNullable().defaultTo('pending'); // pending, contacted, rejected, active
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('enquiries');
}
