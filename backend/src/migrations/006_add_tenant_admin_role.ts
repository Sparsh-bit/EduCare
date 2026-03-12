import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Drop old role check constraint and add new one with tenant_admin
    await knex.raw(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('super_admin', 'tenant_admin', 'owner', 'co-owner', 'teacher', 'admin', 'staff', 'parent', 'accountant', 'front_desk', 'hr_manager'));
    `);

    // Update 'owner' users to 'tenant_admin' to follow the new multi-tenancy naming
    // But keep 'owner' in the check for backward compatibility if needed, 
    // or just migrate them all.
    await knex('users').where({ role: 'owner' }).update({ role: 'tenant_admin' });
}

export async function down(knex: Knex): Promise<void> {
    await knex('users').where({ role: 'tenant_admin' }).update({ role: 'owner' });

    await knex.raw(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('owner', 'co-owner', 'teacher', 'admin', 'staff', 'parent'));
    `);
}
