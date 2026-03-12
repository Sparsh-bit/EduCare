import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('student_import_batches', (table) => {
        table.increments('id').primary();
        table.integer('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
        table.integer('uploaded_by').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.string('original_file_name', 255).notNullable();
        table.integer('total_rows').notNullable().defaultTo(0);
        table.integer('created_count').notNullable().defaultTo(0);
        table.integer('failed_count').notNullable().defaultTo(0);
        table.string('status', 24).notNullable().defaultTo('completed');
        table.jsonb('detected_header_mapping').nullable();
        table.jsonb('class_wise_summary').nullable();
        table.timestamp('reverted_at').nullable();
        table.timestamps(true, true);

        table.index(['school_id', 'created_at']);
        table.index(['uploaded_by', 'created_at']);
    });

    await knex.schema.createTable('student_import_batch_items', (table) => {
        table.increments('id').primary();
        table.integer('batch_id').notNullable().references('id').inTable('student_import_batches').onDelete('CASCADE');
        table.integer('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
        table.integer('row_number').notNullable();
        table.integer('student_id').nullable().references('id').inTable('students').onDelete('SET NULL');
        table.integer('class_id').nullable().references('id').inTable('classes').onDelete('SET NULL');
        table.string('class_name', 60).nullable();
        table.string('student_name', 255).nullable();
        table.string('status', 24).notNullable();
        table.text('error').nullable();
        table.jsonb('raw_payload').nullable();
        table.timestamps(true, true);

        table.index(['batch_id', 'row_number']);
        table.index(['school_id', 'status']);
        table.index(['student_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('student_import_batch_items');
    await knex.schema.dropTableIfExists('student_import_batches');
}
