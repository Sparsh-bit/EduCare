import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasColumn = await knex.schema.hasColumn('users', 'refresh_token_hash');
    if (!hasColumn) {
        await knex.schema.alterTable('users', (table) => {
            table.string('refresh_token_hash', 64).nullable();
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasColumn = await knex.schema.hasColumn('users', 'refresh_token_hash');
    if (hasColumn) {
        await knex.schema.alterTable('users', (table) => {
            table.dropColumn('refresh_token_hash');
        });
    }
}
