import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Drop old role check constraint and add new one with owner, co-owner, teacher
    await knex.raw(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('owner', 'co-owner', 'teacher', 'admin', 'staff', 'parent'));
    `);

    // Update any existing 'admin' users to 'owner'
    await knex('users').where({ role: 'admin' }).update({ role: 'owner' });
}

export async function down(knex: Knex): Promise<void> {
    // Revert co-owner/owner back to admin
    await knex('users').where({ role: 'owner' }).update({ role: 'admin' });
    await knex('users').where({ role: 'co-owner' }).update({ role: 'admin' });

    await knex.raw(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('admin', 'teacher', 'parent', 'staff'));
    `);
}
