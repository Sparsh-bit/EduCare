import { Knex } from 'knex';

/**
 * Migration 021 — Add sr_no (Serial Register Number) to students
 *
 * sr_no is an optional admin-entered number unique to each student within a school.
 * Used alongside auto-generated roll_no for searching and identifying students.
 */
export async function up(knex: Knex): Promise<void> {
    const hasSrNo = await knex.schema.hasColumn('students', 'sr_no');
    if (!hasSrNo) {
        await knex.schema.alterTable('students', (t) => {
            t.string('sr_no', 20).nullable();
        });
    }

    // Unique per school: two students in the same school can't share an sr_no
    await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS students_sr_no_school_unique
        ON students (school_id, sr_no)
        WHERE sr_no IS NOT NULL
    `);

    await knex.raw(`
        CREATE INDEX IF NOT EXISTS students_sr_no_idx ON students (sr_no)
        WHERE sr_no IS NOT NULL
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw('DROP INDEX IF EXISTS students_sr_no_school_unique');
    await knex.raw('DROP INDEX IF EXISTS students_sr_no_idx');
    await knex.schema.alterTable('students', (t) => {
        t.dropColumn('sr_no');
    });
}
