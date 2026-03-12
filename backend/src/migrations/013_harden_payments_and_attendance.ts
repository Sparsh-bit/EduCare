import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasAttendanceSchoolId = await knex.schema.hasColumn('attendance', 'school_id');
    if (!hasAttendanceSchoolId) {
        await knex.schema.alterTable('attendance', (t) => {
            t.integer('school_id').unsigned().nullable().references('id').inTable('schools').onDelete('CASCADE');
        });
    }

    await knex.raw(`
        UPDATE attendance a
        SET school_id = s.school_id
        FROM students s
        WHERE a.student_id = s.id
          AND a.school_id IS NULL
    `);

    await knex.raw('ALTER TABLE attendance ALTER COLUMN school_id SET NOT NULL');

    await knex.raw('ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_unique');
    await knex.raw('DROP INDEX IF EXISTS attendance_student_id_date_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS attendance_school_student_date_unique ON attendance(school_id, student_id, date)');
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, date)');

    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS fee_payments_student_installment_unique ON fee_payments(student_id, installment_id)');
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw('DROP INDEX IF EXISTS fee_payments_student_installment_unique');

    await knex.raw('DROP INDEX IF EXISTS attendance_school_student_date_unique');
    await knex.raw('DROP INDEX IF EXISTS idx_attendance_school_date');

    const hasAttendanceSchoolId = await knex.schema.hasColumn('attendance', 'school_id');
    if (hasAttendanceSchoolId) {
        await knex.schema.alterTable('attendance', (t) => {
            t.dropColumn('school_id');
        });
    }

    await knex.raw('ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_unique UNIQUE (student_id, date)');
}
