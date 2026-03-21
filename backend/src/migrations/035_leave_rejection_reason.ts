import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasCol = await knex.schema.hasColumn('staff_leaves', 'rejection_reason');
    if (!hasCol) {
        await knex.schema.alterTable('staff_leaves', (t) => {
            t.text('rejection_reason').nullable();
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasCol = await knex.schema.hasColumn('staff_leaves', 'rejection_reason');
    if (hasCol) {
        await knex.schema.alterTable('staff_leaves', (t) => {
            t.dropColumn('rejection_reason');
        });
    }
}
