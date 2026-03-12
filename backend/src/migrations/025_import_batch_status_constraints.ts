import type { Knex } from 'knex';

const BATCH_STATUSES = ['preview_ready', 'processing', 'completed', 'failed', 'canceled', 'reverted'];
const ITEM_STATUSES = ['valid', 'invalid', 'created', 'skipped', 'failed'];

export async function up(knex: Knex): Promise<void> {
    // Fix any existing rows with invalid/legacy status values before adding constraints
    await knex('student_import_batches')
        .whereNotIn('status', BATCH_STATUSES)
        .update({ status: 'completed' });

    await knex('student_import_batch_items')
        .whereNotIn('status', ITEM_STATUSES)
        .update({ status: 'failed' });

    // DDL CHECK constraints cannot use parameterized bindings — inline quoted literals
    const batchList = BATCH_STATUSES.map((s) => `'${s}'`).join(', ');
    const itemList = ITEM_STATUSES.map((s) => `'${s}'`).join(', ');

    await knex.raw(`
        ALTER TABLE student_import_batches
        ADD CONSTRAINT chk_batch_status
        CHECK (status IN (${batchList}))
    `);

    await knex.raw(`
        ALTER TABLE student_import_batch_items
        ADD CONSTRAINT chk_item_status
        CHECK (status IN (${itemList}))
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw('ALTER TABLE student_import_batches DROP CONSTRAINT IF EXISTS chk_batch_status');
    await knex.raw('ALTER TABLE student_import_batch_items DROP CONSTRAINT IF EXISTS chk_item_status');
}
