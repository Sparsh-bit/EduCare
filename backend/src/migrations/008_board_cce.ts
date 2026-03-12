import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // 1. board_config — per-school board type and settings
    await knex.schema.createTable('board_config', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable().unique();
        t.enum('board_type', ['CBSE', 'ICSE', 'State']).notNullable().defaultTo('CBSE');
        t.string('state_board_name', 100).nullable();
        t.string('udise_code', 20).nullable();
        t.string('pan_number', 10).nullable();
        t.string('gstin', 15).nullable();
        t.boolean('cce_enabled').defaultTo(true);
        t.integer('fa_weightage').defaultTo(10);   // Each FA = 10%
        t.integer('sa_weightage').defaultTo(30);   // Each SA = 30%
        t.timestamps(true, true);
    });

    // 2. exam_terms — FA1, FA2, SA1, SA2 (or quarterly/half-yearly for other boards)
    await knex.schema.createTable('exam_terms', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years').notNullable();
        t.enum('term_type', ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2', 'ANNUAL', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']).notNullable();
        t.string('term_name', 100).notNullable();
        t.integer('max_marks').defaultTo(100);
        t.integer('weightage_percent').defaultTo(10);
        t.date('start_date').nullable();
        t.date('end_date').nullable();
        t.enum('status', ['upcoming', 'ongoing', 'completed']).defaultTo('upcoming');
        t.timestamps(true, true);
    });

    // 3. cce_co_scholastic — Art, Work Ed, Physical Ed + Life Skills + Attitudes (A-E)
    await knex.schema.createTable('cce_co_scholastic', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.integer('student_id').unsigned().references('id').inTable('students').notNullable();
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years').notNullable();
        t.enum('term', ['Term1', 'Term2', 'Annual']).notNullable();
        // Co-Scholastic Areas
        t.enum('art_education', ['A', 'B', 'C', 'D', 'E']).nullable();
        t.enum('work_education', ['A', 'B', 'C', 'D', 'E']).nullable();
        t.enum('health_physical_education', ['A', 'B', 'C', 'D', 'E']).nullable();
        // Life Skills
        t.enum('thinking_skills', ['A', 'B', 'C', 'D', 'E']).nullable();
        t.enum('social_skills', ['A', 'B', 'C', 'D', 'E']).nullable();
        t.enum('emotional_skills', ['A', 'B', 'C', 'D', 'E']).nullable();
        // Attitudes & Values
        t.enum('attitude_towards_school', ['A', 'B', 'C', 'D', 'E']).nullable();
        t.enum('attitude_towards_teachers', ['A', 'B', 'C', 'D', 'E']).nullable();
        t.enum('attitude_towards_peers', ['A', 'B', 'C', 'D', 'E']).nullable();
        t.text('teacher_remarks').nullable();
        t.integer('entered_by').unsigned().references('id').inTable('users').nullable();
        t.timestamps(true, true);
        t.unique(['school_id', 'student_id', 'academic_year_id', 'term']);
    });

    // 4. report_card_config — template settings for printable report cards
    await knex.schema.createTable('report_card_config', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable().unique();
        t.string('school_name', 255).nullable();
        t.string('school_address', 500).nullable();
        t.string('school_phone', 20).nullable();
        t.string('principal_name', 100).nullable();
        t.string('affiliation_number', 50).nullable();
        t.string('logo_url', 500).nullable();
        t.boolean('show_co_scholastic').defaultTo(true);
        t.boolean('show_attendance').defaultTo(true);
        t.boolean('show_remarks').defaultTo(true);
        t.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('report_card_config');
    await knex.schema.dropTableIfExists('cce_co_scholastic');
    await knex.schema.dropTableIfExists('exam_terms');
    await knex.schema.dropTableIfExists('board_config');
}
