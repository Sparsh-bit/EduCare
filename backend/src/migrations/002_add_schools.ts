import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('schools', (t) => {
        t.increments('id').primary();
        t.string('school_code', 50).notNullable().unique();
        t.string('name', 255).notNullable();
        t.string('owner_name', 255).notNullable();
        t.timestamps(true, true);
    });

    // Add school_id to users
    await knex.schema.alterTable('users', (t) => {
        t.integer('school_id').unsigned().references('id').inTable('schools');
    });

    // Pre-insert a default school for existing users (from seed)
    const [defaultSchool] = await knex('schools').insert({
        school_code: 'CONCIL1',
        name: 'Concilio EduCare Default',
        owner_name: 'Admin',
    }).returning('*');

    // Update existing users to the default school
    await knex('users').update({ school_id: defaultSchool.id });

    // Add school_id to other main tables
    const tables = ['students', 'classes', 'staff'];
    for (const table of tables) {
        await knex.schema.alterTable(table, (t) => {
            t.integer('school_id').unsigned().references('id').inTable('schools');
        });

        // Update existing to default school
        await knex(table).update({ school_id: defaultSchool.id });
    }
}

export async function down(knex: Knex): Promise<void> {
    const tables = ['students', 'classes', 'staff', 'users'];
    for (const table of tables) {
        await knex.schema.alterTable(table, (t) => {
            t.dropColumn('school_id');
        });
    }
    await knex.schema.dropTableIfExists('schools');
}
