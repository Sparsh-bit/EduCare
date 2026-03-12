import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Add instrument columns to fee_payments
    await knex.schema.alterTable('fee_payments', (t) => {
        t.enum('instrument_type', ['cash', 'cheque', 'dd', 'upi', 'neft', 'rtgs', 'online']).nullable();
        t.string('instrument_number', 100).nullable();
        t.string('bank_name', 100).nullable();
        t.string('bank_branch', 100).nullable();
        t.date('instrument_date').nullable();
        t.enum('instrument_status', ['pending', 'cleared', 'bounced', 'returned']).nullable();
        t.decimal('bounce_penalty', 10, 2).defaultTo(0);
        t.date('clearance_date').nullable();
        t.string('receipt_number', 50).nullable();
    });

    // Sequential receipt numbering per school
    await knex.schema.createTable('payment_receipt_sequence', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable().unique();
        t.integer('last_receipt_number').defaultTo(0);
        t.string('prefix', 20).defaultTo('RCP');
        t.timestamps(true, true);
    });

    // Imported bank statement entries
    await knex.schema.createTable('bank_statements', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.string('account_number', 30).nullable();
        t.string('bank_name', 100).nullable();
        t.date('transaction_date').notNullable();
        t.string('description', 500).nullable();
        t.decimal('credit', 12, 2).defaultTo(0);
        t.decimal('debit', 12, 2).defaultTo(0);
        t.decimal('balance', 12, 2).defaultTo(0);
        t.string('reference', 100).nullable();
        t.boolean('reconciled').defaultTo(false);
        t.integer('fee_payment_id').unsigned().references('id').inTable('fee_payments').nullable();
        t.timestamps(true, true);
    });

    // Static UPI QR codes per student
    await knex.schema.createTable('upi_qr_codes', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools').notNullable();
        t.integer('student_id').unsigned().references('id').inTable('students').notNullable().unique();
        t.string('upi_id', 100).nullable();
        t.string('qr_data', 1000).nullable();
        t.boolean('is_active').defaultTo(true);
        t.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('upi_qr_codes');
    await knex.schema.dropTableIfExists('bank_statements');
    await knex.schema.dropTableIfExists('payment_receipt_sequence');
    await knex.schema.alterTable('fee_payments', (t) => {
        t.dropColumn('instrument_type');
        t.dropColumn('instrument_number');
        t.dropColumn('bank_name');
        t.dropColumn('bank_branch');
        t.dropColumn('instrument_date');
        t.dropColumn('instrument_status');
        t.dropColumn('bounce_penalty');
        t.dropColumn('clearance_date');
        t.dropColumn('receipt_number');
    });
}
