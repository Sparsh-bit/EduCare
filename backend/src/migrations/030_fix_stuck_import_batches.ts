/**
 * Migration 030 — Fix stuck student_import_batches
 *
 * Repairs data-level inconsistency where import batches are stuck in
 * 'processing' status due to prior early-return bugs (now fixed in the
 * application code). Any batch still in 'processing' is reset to 'failed'.
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const result = await knex('student_import_batches')
        .where('status', 'processing')
        .update({ status: 'failed', updated_at: knex.fn.now() });

    if (result > 0) {
        // eslint-disable-next-line no-console
        console.log(`[Migration 030] Reset ${result} stuck import batch(es) from 'processing' to 'failed'.`);
    }
}

export async function down(_knex: Knex): Promise<void> {
    // Data repair — no meaningful rollback.
}
