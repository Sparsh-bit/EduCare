import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // School tax registration (PAN, TAN, GST, PT state, PF/ESI config)
    await knex.schema.createTable('tax_config', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable().unique();
        t.string('pan_number', 10).nullable();
        t.string('tan_number', 10).nullable();
        t.string('gstin', 15).nullable();
        t.string('gst_state_code', 5).nullable();
        t.boolean('gst_applicable').defaultTo(false);
        t.decimal('gst_rate', 5, 2).defaultTo(18.00);
        t.string('pt_state', 50).nullable();
        t.boolean('pf_applicable').defaultTo(true);
        t.boolean('esi_applicable').defaultTo(true);
        t.decimal('pf_employee_rate', 5, 2).defaultTo(12.00);
        t.decimal('pf_employer_rate', 5, 2).defaultTo(12.00);
        t.decimal('esi_employee_rate', 5, 2).defaultTo(0.75);
        t.decimal('esi_employer_rate', 5, 2).defaultTo(3.25);
        t.integer('pf_wage_ceiling').defaultTo(15000);
        t.integer('esi_wage_ceiling').defaultTo(21000);
        t.string('epf_establishment_id', 30).nullable();
        t.string('esic_code', 20).nullable();
        t.timestamps(true, true);
    });

    // State-wise professional tax slabs
    await knex.schema.createTable('professional_tax_slabs', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.string('state', 50).notNullable();
        t.decimal('min_salary', 10, 2).notNullable();
        t.decimal('max_salary', 10, 2).nullable();
        t.decimal('monthly_tax', 8, 2).notNullable();
        t.decimal('feb_tax', 8, 2).nullable();
        t.timestamps(true, true);
    });

    // Per-staff salary component breakdown
    await knex.schema.createTable('salary_structure', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.integer('staff_id').unsigned().references('id').inTable('staff').notNullable();
        t.decimal('basic', 10, 2).defaultTo(0);
        t.decimal('hra', 10, 2).defaultTo(0);
        t.decimal('da', 10, 2).defaultTo(0);
        t.decimal('ta', 10, 2).defaultTo(0);
        t.decimal('medical_allowance', 10, 2).defaultTo(0);
        t.decimal('special_allowance', 10, 2).defaultTo(0);
        t.decimal('other_allowance', 10, 2).defaultTo(0);
        t.decimal('gross_salary', 10, 2).defaultTo(0);
        t.boolean('pf_applicable').defaultTo(true);
        t.boolean('esi_applicable').defaultTo(true);
        t.boolean('pt_applicable').defaultTo(true);
        t.boolean('tds_applicable').defaultTo(false);
        t.decimal('declared_investment_80c', 10, 2).defaultTo(0);
        t.decimal('declared_hra_exemption', 10, 2).defaultTo(0);
        t.timestamps(true, true);
        t.unique(['school_id', 'staff_id']);
    });

    // Monthly payroll records
    await knex.schema.createTable('payroll_records', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.integer('staff_id').unsigned().references('id').inTable('staff').notNullable();
        t.integer('month').notNullable();
        t.integer('year').notNullable();
        t.integer('working_days').notNullable().defaultTo(26);
        t.integer('present_days').notNullable().defaultTo(26);
        t.integer('leave_days').defaultTo(0);
        t.integer('lop_days').defaultTo(0);
        // Earnings
        t.decimal('basic_earned', 10, 2).defaultTo(0);
        t.decimal('hra_earned', 10, 2).defaultTo(0);
        t.decimal('da_earned', 10, 2).defaultTo(0);
        t.decimal('ta_earned', 10, 2).defaultTo(0);
        t.decimal('medical_earned', 10, 2).defaultTo(0);
        t.decimal('special_earned', 10, 2).defaultTo(0);
        t.decimal('other_earned', 10, 2).defaultTo(0);
        t.decimal('gross_earned', 10, 2).defaultTo(0);
        // Deductions
        t.decimal('pf_employee', 10, 2).defaultTo(0);
        t.decimal('pf_employer', 10, 2).defaultTo(0);
        t.decimal('esi_employee', 10, 2).defaultTo(0);
        t.decimal('esi_employer', 10, 2).defaultTo(0);
        t.decimal('professional_tax', 10, 2).defaultTo(0);
        t.decimal('tds', 10, 2).defaultTo(0);
        t.decimal('other_deductions', 10, 2).defaultTo(0);
        t.decimal('total_deductions', 10, 2).defaultTo(0);
        t.decimal('net_salary', 10, 2).defaultTo(0);
        t.enum('status', ['draft', 'processed', 'paid']).defaultTo('draft');
        t.date('payment_date').nullable();
        t.string('payment_mode', 50).nullable();
        t.string('transaction_ref', 100).nullable();
        t.integer('processed_by').unsigned().references('id').inTable('users').nullable();
        t.timestamps(true, true);
        t.unique(['school_id', 'staff_id', 'month', 'year']);
    });

    // Annual TDS certificates (Form 16)
    await knex.schema.createTable('tds_certificates', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.integer('staff_id').unsigned().references('id').inTable('staff').notNullable();
        t.integer('financial_year_start').notNullable();
        t.decimal('gross_salary', 12, 2).defaultTo(0);
        t.decimal('exemptions_hra', 10, 2).defaultTo(0);
        t.decimal('deductions_80c', 10, 2).defaultTo(0);
        t.decimal('standard_deduction', 10, 2).defaultTo(50000);
        t.decimal('taxable_income', 12, 2).defaultTo(0);
        t.decimal('total_tds', 10, 2).defaultTo(0);
        t.decimal('surcharge', 10, 2).defaultTo(0);
        t.decimal('education_cess', 10, 2).defaultTo(0);
        t.string('certificate_number', 50).nullable();
        t.date('issue_date').nullable();
        t.enum('status', ['draft', 'issued']).defaultTo('draft');
        t.timestamps(true, true);
        t.unique(['school_id', 'staff_id', 'financial_year_start']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('tds_certificates');
    await knex.schema.dropTableIfExists('payroll_records');
    await knex.schema.dropTableIfExists('salary_structure');
    await knex.schema.dropTableIfExists('professional_tax_slabs');
    await knex.schema.dropTableIfExists('tax_config');
}
