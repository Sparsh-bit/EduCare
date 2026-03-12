import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const defaultSchool = await knex('schools').orderBy('id', 'asc').first();
    if (!defaultSchool) return;

    await knex('users').whereNull('school_id').update({ school_id: defaultSchool.id });
    await knex('students').whereNull('school_id').update({ school_id: defaultSchool.id });
    await knex('classes').whereNull('school_id').update({ school_id: defaultSchool.id });
    await knex('staff').whereNull('school_id').update({ school_id: defaultSchool.id });

    await knex.raw('ALTER TABLE users ALTER COLUMN school_id SET NOT NULL');
    await knex.raw('ALTER TABLE students ALTER COLUMN school_id SET NOT NULL');
    await knex.raw('ALTER TABLE classes ALTER COLUMN school_id SET NOT NULL');
    await knex.raw('ALTER TABLE staff ALTER COLUMN school_id SET NOT NULL');

    await knex.raw('ALTER TABLE students DROP CONSTRAINT IF EXISTS students_admission_no_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS uq_students_school_admission_no ON students (school_id, admission_no)');

    await knex.raw('CREATE INDEX IF NOT EXISTS idx_students_school_status ON students (school_id, status)');
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_students_school_class_section ON students (school_id, current_class_id, current_section_id)');
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_users_school_role_active ON users (school_id, role, is_active)');
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw('DROP INDEX IF EXISTS idx_users_school_role_active');
    await knex.raw('DROP INDEX IF EXISTS idx_students_school_class_section');
    await knex.raw('DROP INDEX IF EXISTS idx_students_school_status');
    await knex.raw('DROP INDEX IF EXISTS uq_students_school_admission_no');
    await knex.raw('ALTER TABLE students ADD CONSTRAINT students_admission_no_unique UNIQUE (admission_no)');

    await knex.raw('ALTER TABLE staff ALTER COLUMN school_id DROP NOT NULL');
    await knex.raw('ALTER TABLE classes ALTER COLUMN school_id DROP NOT NULL');
    await knex.raw('ALTER TABLE students ALTER COLUMN school_id DROP NOT NULL');
    await knex.raw('ALTER TABLE users ALTER COLUMN school_id DROP NOT NULL');
}
