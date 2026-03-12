import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Add email_verified flag to users
    await knex.schema.alterTable('users', (t) => {
        t.boolean('email_verified').notNullable().defaultTo(false);
    });

    // OTP tokens table (6-digit, stored as hash, 10-min expiry)
    await knex.schema.createTable('email_otp_tokens', (t) => {
        t.increments('id').primary();
        t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.string('otp_hash', 64).notNullable();
        t.timestamp('expires_at').notNullable();
        t.timestamp('used_at').nullable();
        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.index('user_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('email_otp_tokens');
    await knex.schema.alterTable('users', (t) => {
        t.dropColumn('email_verified');
    });
}
