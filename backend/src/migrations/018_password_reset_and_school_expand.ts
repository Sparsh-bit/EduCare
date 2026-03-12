import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Expand schools table with details collected during registration
    await knex.schema.alterTable('schools', (t) => {
        t.string('phone', 20);
        t.string('address', 500);
        t.string('board', 50).defaultTo('CBSE');
        t.string('affiliation_number', 100);
        t.string('principal_name', 255);
    });

    // Secure password-reset token store (never stores raw tokens)
    await knex.schema.createTable('password_reset_tokens', (t) => {
        t.increments('id').primary();
        t.integer('user_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');
        t.string('token_hash', 64).notNullable().unique();
        t.timestamp('expires_at').notNullable();
        t.timestamp('used_at').nullable();
        t.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('password_reset_tokens');
    await knex.schema.alterTable('schools', (t) => {
        t.dropColumn('phone');
        t.dropColumn('address');
        t.dropColumn('board');
        t.dropColumn('affiliation_number');
        t.dropColumn('principal_name');
    });
}
