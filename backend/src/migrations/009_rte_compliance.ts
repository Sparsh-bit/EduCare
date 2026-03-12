import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Add RTE columns to students
    await knex.schema.alterTable('students', (t) => {
        t.boolean('is_rte').defaultTo(false);
        t.enum('rte_category', ['EWS', 'DG', 'CWSN']).nullable();
        t.string('rte_admission_number', 50).nullable();
        t.date('rte_admission_date').nullable();
        t.boolean('no_detention').defaultTo(false);
    });

    // Per-class RTE quota (25% as per RTE Act)
    await knex.schema.createTable('rte_quota_config', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.integer('class_id').unsigned().references('id').inTable('classes').notNullable();
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years').notNullable();
        t.integer('total_seats').notNullable().defaultTo(40);
        t.integer('rte_seats').notNullable().defaultTo(10);
        t.integer('rte_filled').defaultTo(0);
        t.timestamps(true, true);
        t.unique(['school_id', 'class_id', 'academic_year_id']);
    });

    // Entitlement records (uniform, books, mid-day meal, etc.)
    await knex.schema.createTable('rte_entitlement_records', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.integer('student_id').unsigned().references('id').inTable('students').notNullable();
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years').notNullable();
        t.enum('entitlement_type', ['uniform', 'books', 'mid_day_meal', 'stationery', 'bag']).notNullable();
        t.boolean('provided').defaultTo(false);
        t.date('provided_date').nullable();
        t.decimal('cost', 10, 2).nullable();
        t.string('remarks', 255).nullable();
        t.timestamps(true, true);
    });

    // Government reimbursement claims
    await knex.schema.createTable('rte_reimbursement_claims', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years').notNullable();
        t.string('claim_number', 50).nullable();
        t.date('claim_date').notNullable();
        t.integer('student_count').defaultTo(0);
        t.decimal('total_amount', 12, 2).defaultTo(0);
        t.enum('status', ['draft', 'submitted', 'approved', 'rejected', 'paid']).defaultTo('draft');
        t.date('submission_date').nullable();
        t.date('payment_date').nullable();
        t.decimal('amount_received', 12, 2).nullable();
        t.text('remarks').nullable();
        t.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('rte_reimbursement_claims');
    await knex.schema.dropTableIfExists('rte_entitlement_records');
    await knex.schema.dropTableIfExists('rte_quota_config');
    await knex.schema.alterTable('students', (t) => {
        t.dropColumn('is_rte');
        t.dropColumn('rte_category');
        t.dropColumn('rte_admission_number');
        t.dropColumn('rte_admission_date');
        t.dropColumn('no_detention');
    });
}
