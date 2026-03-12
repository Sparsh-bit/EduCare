import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasColumn = await knex.schema.hasColumn('students', 'upload_batch_id');
    if (!hasColumn) {
        await knex.schema.alterTable('students', (table) => {
            table.integer('upload_batch_id').nullable().references('id').inTable('student_import_batches').onDelete('SET NULL');
            table.index(['upload_batch_id']);
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasColumn = await knex.schema.hasColumn('students', 'upload_batch_id');
    if (hasColumn) {
        await knex.schema.alterTable('students', (table) => {
            table.dropIndex(['upload_batch_id']);
            table.dropColumn('upload_batch_id');
        });
    }
}
