import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ─── USERS ───
    await knex.schema.createTable('users', (t) => {
        t.increments('id').primary();
        t.string('email', 255).notNullable().unique();
        t.string('password_hash', 255).notNullable();
        t.string('name', 255).notNullable();
        t.string('phone', 15);
        t.enum('role', ['admin', 'teacher', 'parent', 'staff']).notNullable();
        t.boolean('is_active').defaultTo(true);
        t.string('preferred_language', 5).defaultTo('en');
        t.timestamps(true, true);
    });

    // ─── ACADEMIC YEARS ───
    await knex.schema.createTable('academic_years', (t) => {
        t.increments('id').primary();
        t.string('year', 10).notNullable().unique();
        t.boolean('is_current').defaultTo(false);
        t.date('start_date');
        t.date('end_date');
        t.timestamps(true, true);
    });

    // ─── CLASSES ───
    await knex.schema.createTable('classes', (t) => {
        t.increments('id').primary();
        t.string('name', 10).notNullable();
        t.integer('numeric_order').notNullable();
        t.timestamps(true, true);
    });

    // ─── SECTIONS ───
    await knex.schema.createTable('sections', (t) => {
        t.increments('id').primary();
        t.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
        t.string('name', 5).notNullable();
        t.integer('class_teacher_id').unsigned().references('id').inTable('users');
        t.timestamps(true, true);
        t.unique(['class_id', 'name']);
    });

    // ─── SUBJECTS ───
    await knex.schema.createTable('subjects', (t) => {
        t.increments('id').primary();
        t.string('name', 100).notNullable();
        t.string('name_hi', 100);
        t.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
        t.boolean('is_optional').defaultTo(false);
        t.timestamps(true, true);
    });

    // ─── STUDENTS ───
    await knex.schema.createTable('students', (t) => {
        t.increments('id').primary();
        t.string('admission_no', 20).notNullable().unique();
        t.string('name', 255).notNullable();
        t.string('name_hi', 255);
        t.date('dob').notNullable();
        t.enum('gender', ['male', 'female', 'other']).notNullable();
        t.string('aadhaar_encrypted', 500); // AES encrypted
        t.string('aadhaar_last4', 4); // Last 4 digits for display
        t.enum('category', ['GEN', 'OBC', 'SC', 'ST', 'EWS']).defaultTo('GEN');
        t.string('religion', 50);
        t.string('nationality', 50).defaultTo('Indian');
        t.string('blood_group', 5);
        t.text('address');
        t.string('city', 100);
        t.string('state', 100);
        t.string('pincode', 6);
        t.string('photo_url', 500);
        // Parent info
        t.string('father_name', 255);
        t.string('father_phone', 15);
        t.string('father_occupation', 100);
        t.string('father_email', 255);
        t.string('mother_name', 255);
        t.string('mother_phone', 15);
        t.string('mother_occupation', 100);
        t.string('guardian_name', 255);
        t.string('guardian_phone', 15);
        t.string('guardian_relation', 50);
        // Current academic (denormalized for quick access; history in student_class_history)
        t.integer('current_class_id').unsigned().references('id').inTable('classes');
        t.integer('current_section_id').unsigned().references('id').inTable('sections');
        t.string('current_roll_no', 10);
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years');
        t.enum('status', ['active', 'alumni', 'tc_issued']).defaultTo('active');
        t.date('admission_date');
        t.string('previous_school', 255);
        // Soft delete
        t.timestamp('deleted_at').nullable();
        t.timestamps(true, true);
    });

    // ─── STUDENT CLASS HISTORY (Promotion Tracking) ───
    await knex.schema.createTable('student_class_history', (t) => {
        t.increments('id').primary();
        t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.integer('class_id').unsigned().notNullable().references('id').inTable('classes');
        t.integer('section_id').unsigned().references('id').inTable('sections');
        t.string('roll_no', 10);
        t.integer('academic_year_id').unsigned().notNullable().references('id').inTable('academic_years');
        t.enum('status', ['promoted', 'retained', 'admitted', 'tc_issued']).defaultTo('admitted');
        t.timestamps(true, true);
        t.unique(['student_id', 'academic_year_id']);
    });

    // ─── STUDENT PARENTS ───
    await knex.schema.createTable('student_parents', (t) => {
        t.increments('id').primary();
        t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.integer('parent_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.enum('relation', ['father', 'mother', 'guardian']).notNullable();
        t.timestamps(true, true);
        t.unique(['student_id', 'parent_user_id']);
    });

    // ─── STUDENT DOCUMENTS ───
    await knex.schema.createTable('student_documents', (t) => {
        t.increments('id').primary();
        t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.string('doc_type', 50).notNullable();
        t.string('file_name', 255).notNullable();
        t.string('file_url', 500).notNullable(); // S3/R2 URL
        t.string('mime_type', 100);
        t.integer('file_size');
        t.timestamps(true, true);
    });

    // ─── ATTENDANCE ───
    await knex.schema.createTable('attendance', (t) => {
        t.increments('id').primary();
        t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.date('date').notNullable();
        t.enum('status', ['P', 'A', 'L', 'HD']).notNullable();
        t.integer('class_id').unsigned().notNullable().references('id').inTable('classes');
        t.integer('section_id').unsigned().notNullable().references('id').inTable('sections');
        t.integer('marked_by').unsigned().references('id').inTable('users');
        t.integer('academic_year_id').unsigned().notNullable().references('id').inTable('academic_years');
        t.timestamps(true, true);
        t.unique(['student_id', 'date']);
    });

    // ─── FEE STRUCTURES ───
    await knex.schema.createTable('fee_structures', (t) => {
        t.increments('id').primary();
        t.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
        t.integer('academic_year_id').unsigned().notNullable().references('id').inTable('academic_years');
        t.decimal('total_amount', 10, 2).notNullable();
        t.integer('installments_count').notNullable().defaultTo(4);
        t.text('description');
        t.timestamp('deleted_at').nullable();
        t.timestamps(true, true);
        t.unique(['class_id', 'academic_year_id']);
    });

    // ─── FEE INSTALLMENTS ───
    await knex.schema.createTable('fee_installments', (t) => {
        t.increments('id').primary();
        t.integer('fee_structure_id').unsigned().notNullable().references('id').inTable('fee_structures').onDelete('CASCADE');
        t.integer('installment_no').notNullable();
        t.decimal('amount', 10, 2).notNullable();
        t.date('due_date').notNullable();
        t.timestamps(true, true);
        t.unique(['fee_structure_id', 'installment_no']);
    });

    // ─── FEE PAYMENTS ───
    await knex.schema.createTable('fee_payments', (t) => {
        t.increments('id').primary();
        t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.integer('installment_id').unsigned().notNullable().references('id').inTable('fee_installments');
        t.integer('academic_year_id').unsigned().notNullable().references('id').inTable('academic_years');
        t.decimal('amount_paid', 10, 2).notNullable();
        t.decimal('late_fee', 10, 2).defaultTo(0);
        t.date('payment_date').notNullable();
        t.enum('payment_mode', ['online', 'cash', 'cheque', 'bank_transfer']).notNullable();
        t.string('razorpay_payment_id', 100);
        t.string('razorpay_order_id', 100);
        t.string('receipt_no', 50).notNullable().unique();
        t.text('notes');
        t.timestamps(true, true);
    });

    // ─── EXAMS ───
    await knex.schema.createTable('exams', (t) => {
        t.increments('id').primary();
        t.string('name', 100).notNullable();
        t.enum('term', ['1', '2']).notNullable();
        t.integer('class_id').unsigned().notNullable().references('id').inTable('classes');
        t.integer('academic_year_id').unsigned().notNullable().references('id').inTable('academic_years');
        t.date('start_date');
        t.date('end_date');
        t.enum('status', ['upcoming', 'ongoing', 'completed']).defaultTo('upcoming');
        t.timestamps(true, true);
    });

    // ─── EXAM SUBJECTS ───
    await knex.schema.createTable('exam_subjects', (t) => {
        t.increments('id').primary();
        t.integer('exam_id').unsigned().notNullable().references('id').inTable('exams').onDelete('CASCADE');
        t.integer('subject_id').unsigned().notNullable().references('id').inTable('subjects');
        t.integer('max_marks').notNullable().defaultTo(100);
        t.integer('passing_marks').notNullable().defaultTo(33);
        t.date('exam_date');
        t.timestamps(true, true);
        t.unique(['exam_id', 'subject_id']);
    });

    // ─── MARKS ───
    await knex.schema.createTable('marks', (t) => {
        t.increments('id').primary();
        t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.integer('exam_subject_id').unsigned().notNullable().references('id').inTable('exam_subjects').onDelete('CASCADE');
        t.integer('academic_year_id').unsigned().notNullable().references('id').inTable('academic_years');
        t.decimal('marks_obtained', 5, 2);
        t.boolean('is_absent').defaultTo(false);
        t.integer('entered_by').unsigned().references('id').inTable('users');
        t.timestamps(true, true);
        t.unique(['student_id', 'exam_subject_id']);
    });

    // ─── STAFF ───
    await knex.schema.createTable('staff', (t) => {
        t.increments('id').primary();
        t.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
        t.string('name', 255).notNullable();
        t.string('employee_id', 20).unique();
        t.string('designation', 100);
        t.string('department', 100);
        t.string('phone', 15);
        t.string('email', 255);
        t.decimal('salary', 10, 2);
        t.date('join_date');
        t.string('qualification', 255);
        t.enum('status', ['active', 'inactive', 'resigned']).defaultTo('active');
        t.timestamp('deleted_at').nullable();
        t.timestamps(true, true);
    });

    // ─── STAFF ATTENDANCE ───
    await knex.schema.createTable('staff_attendance', (t) => {
        t.increments('id').primary();
        t.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE');
        t.date('date').notNullable();
        t.enum('status', ['P', 'A', 'L', 'HD']).notNullable();
        t.timestamps(true, true);
        t.unique(['staff_id', 'date']);
    });

    // ─── STAFF LEAVES ───
    await knex.schema.createTable('staff_leaves', (t) => {
        t.increments('id').primary();
        t.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE');
        t.enum('leave_type', ['casual', 'sick', 'earned', 'unpaid']).notNullable();
        t.date('from_date').notNullable();
        t.date('to_date').notNullable();
        t.text('reason');
        t.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
        t.integer('approved_by').unsigned().references('id').inTable('users');
        t.timestamps(true, true);
    });

    // ─── STAFF SALARY RECORDS ───
    await knex.schema.createTable('staff_salary_records', (t) => {
        t.increments('id').primary();
        t.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE');
        t.integer('month').notNullable();
        t.integer('year').notNullable();
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years');
        t.decimal('basic', 10, 2).notNullable();
        t.decimal('allowances', 10, 2).defaultTo(0);
        t.decimal('deductions', 10, 2).defaultTo(0);
        t.decimal('net_pay', 10, 2).notNullable();
        t.date('paid_on');
        t.enum('status', ['pending', 'paid']).defaultTo('pending');
        t.timestamps(true, true);
        t.unique(['staff_id', 'month', 'year']);
    });

    // ─── NOTICES ───
    await knex.schema.createTable('notices', (t) => {
        t.increments('id').primary();
        t.string('title', 255).notNullable();
        t.text('content').notNullable();
        t.enum('target_audience', ['all', 'students', 'parents', 'staff', 'teachers']).defaultTo('all');
        t.integer('class_id').unsigned().references('id').inTable('classes');
        t.integer('created_by').unsigned().references('id').inTable('users');
        t.boolean('is_active').defaultTo(true);
        t.timestamps(true, true);
    });

    // ─── HOMEWORK ───
    await knex.schema.createTable('homework', (t) => {
        t.increments('id').primary();
        t.integer('class_id').unsigned().notNullable().references('id').inTable('classes');
        t.integer('section_id').unsigned().notNullable().references('id').inTable('sections');
        t.integer('subject_id').unsigned().notNullable().references('id').inTable('subjects');
        t.text('description').notNullable();
        t.date('due_date').notNullable();
        t.integer('assigned_by').unsigned().references('id').inTable('users');
        t.timestamps(true, true);
    });

    // ─── TRANSFER CERTIFICATES ───
    await knex.schema.createTable('transfer_certificates', (t) => {
        t.increments('id').primary();
        t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.string('tc_no', 20).notNullable().unique();
        t.date('issue_date').notNullable();
        t.text('reason');
        t.string('pdf_url', 500); // S3 URL
        t.integer('issued_by').unsigned().references('id').inTable('users');
        t.timestamps(true, true);
    });

    // ─── AUDIT LOGS ───
    await knex.schema.createTable('audit_logs', (t) => {
        t.increments('id').primary();
        t.integer('user_id').unsigned().references('id').inTable('users');
        t.string('action', 50).notNullable(); // create, update, delete, login, etc.
        t.string('entity_type', 50).notNullable(); // student, fee_payment, marks, etc.
        t.integer('entity_id');
        t.jsonb('old_value');
        t.jsonb('new_value');
        t.string('ip_address', 45);
        t.text('description');
        t.timestamp('created_at').defaultTo(knex.fn.now());
    });

    // ─── INDEXES ───
    await knex.schema.raw('CREATE INDEX idx_attendance_date ON attendance(date)');
    await knex.schema.raw('CREATE INDEX idx_attendance_student ON attendance(student_id)');
    await knex.schema.raw('CREATE INDEX idx_attendance_class_section ON attendance(class_id, section_id)');
    await knex.schema.raw('CREATE INDEX idx_attendance_academic_year ON attendance(academic_year_id)');
    await knex.schema.raw('CREATE INDEX idx_students_class ON students(current_class_id)');
    await knex.schema.raw('CREATE INDEX idx_students_status ON students(status)');
    await knex.schema.raw('CREATE INDEX idx_students_academic_year ON students(academic_year_id)');
    await knex.schema.raw('CREATE INDEX idx_students_deleted ON students(deleted_at)');
    await knex.schema.raw('CREATE INDEX idx_fee_payments_student ON fee_payments(student_id)');
    await knex.schema.raw('CREATE INDEX idx_fee_payments_date ON fee_payments(payment_date)');
    await knex.schema.raw('CREATE INDEX idx_fee_payments_academic_year ON fee_payments(academic_year_id)');
    await knex.schema.raw('CREATE INDEX idx_marks_student ON marks(student_id)');
    await knex.schema.raw('CREATE INDEX idx_marks_academic_year ON marks(academic_year_id)');
    await knex.schema.raw('CREATE INDEX idx_exams_academic_year ON exams(academic_year_id)');
    await knex.schema.raw('CREATE INDEX idx_exams_class ON exams(class_id)');
    await knex.schema.raw('CREATE INDEX idx_class_history_student ON student_class_history(student_id)');
    await knex.schema.raw('CREATE INDEX idx_class_history_year ON student_class_history(academic_year_id)');
    await knex.schema.raw('CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id)');
    await knex.schema.raw('CREATE INDEX idx_audit_user ON audit_logs(user_id)');
    await knex.schema.raw('CREATE INDEX idx_audit_created ON audit_logs(created_at)');
    await knex.schema.raw('CREATE INDEX idx_staff_deleted ON staff(deleted_at)');
    await knex.schema.raw('CREATE INDEX idx_salary_academic_year ON staff_salary_records(academic_year_id)');
}

export async function down(knex: Knex): Promise<void> {
    const tables = [
        'audit_logs', 'transfer_certificates', 'homework', 'notices',
        'staff_salary_records', 'staff_leaves', 'staff_attendance', 'staff',
        'marks', 'exam_subjects', 'exams',
        'fee_payments', 'fee_installments', 'fee_structures',
        'attendance', 'student_documents', 'student_parents', 'student_class_history',
        'students', 'subjects', 'sections', 'classes',
        'academic_years', 'users',
    ];

    for (const table of tables) {
        await knex.schema.dropTableIfExists(table);
    }
}
