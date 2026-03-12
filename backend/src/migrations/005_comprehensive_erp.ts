import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ─── ROLES & PERMISSIONS ───
    await knex.schema.createTable('roles', (t) => {
        t.increments('id').primary();
        t.string('name', 50).notNullable().unique();
        t.string('display_name', 100).notNullable();
        t.text('description');
        t.boolean('is_system_role').defaultTo(false);
        t.timestamps(true, true);
    });

    await knex.schema.createTable('permissions', (t) => {
        t.increments('id').primary();
        t.string('module', 50).notNullable();
        t.string('action', 50).notNullable();
        t.string('description', 200);
        t.unique(['module', 'action']);
    });

    await knex.schema.createTable('role_permissions', (t) => {
        t.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
        t.integer('permission_id').unsigned().notNullable().references('id').inTable('permissions').onDelete('CASCADE');
        t.primary(['role_id', 'permission_id']);
    });

    // Add role_id to users (nullable for migration — existing users keep enum role)
    await knex.schema.alterTable('users', (t) => {
        t.integer('role_id').unsigned().references('id').inTable('roles');
    });

    // ─── SCHOOL SETTINGS ───
    await knex.schema.createTable('school_settings', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.string('school_name', 200);
        t.text('address');
        t.string('city', 100);
        t.string('state', 50);
        t.string('pin_code', 6);
        t.string('phone', 15);
        t.string('email', 100);
        t.string('website', 200);
        t.string('logo_url', 500);
        t.string('affiliation_number', 50);
        t.string('udise_code', 20);
        t.string('registration_number', 50);
        t.string('board', 20);
        t.string('principal_name', 100);
        t.string('principal_signature_url', 500);
        t.string('gst_number', 20);
        t.integer('established_year');
        t.timestamps(true, true);
    });

    // ─── LOGIN HISTORY ───
    await knex.schema.createTable('login_history', (t) => {
        t.increments('id').primary();
        t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.timestamp('login_at').defaultTo(knex.fn.now());
        t.string('ip_address', 45);
        t.text('user_agent');
        t.string('device_type', 20);
        t.string('location', 100);
        t.enum('status', ['success', 'failed']).notNullable();
        t.string('session_token', 255);
        t.timestamp('logout_at');
    });

    // ─── FRONT DESK: ADMISSION ENQUIRY ───
    await knex.schema.createTable('admission_enquiries', (t) => {
        t.increments('id').primary();
        t.string('enquiry_number', 20).notNullable().unique();
        t.string('student_name', 100).notNullable();
        t.date('dob');
        t.enum('gender', ['male', 'female', 'other']);
        t.integer('class_applying_for').unsigned().references('id').inTable('classes');
        t.string('father_name', 100).notNullable();
        t.string('mother_name', 100);
        t.string('contact_phone', 15).notNullable();
        t.string('alternate_phone', 15);
        t.string('email', 100);
        t.text('address');
        t.string('previous_school', 200);
        t.enum('source', ['walkin', 'phone', 'website', 'referral', 'social_media', 'advertisement', 'other']).defaultTo('walkin');
        t.integer('assigned_to').unsigned().references('id').inTable('users');
        t.enum('status', ['new', 'contacted', 'follow_up', 'interested', 'not_interested', 'admitted', 'closed']).defaultTo('new');
        t.date('follow_up_date');
        t.text('notes');
        t.integer('converted_student_id').unsigned().references('id').inTable('students');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('enquiry_follow_ups', (t) => {
        t.increments('id').primary();
        t.integer('enquiry_id').unsigned().notNullable().references('id').inTable('admission_enquiries').onDelete('CASCADE');
        t.date('follow_up_date');
        t.text('notes');
        t.string('status_changed_to', 20);
        t.integer('done_by').unsigned().references('id').inTable('users');
        t.timestamps(true, true);
    });

    // ─── FRONT DESK: GATE PASS ───
    await knex.schema.createTable('gate_passes', (t) => {
        t.increments('id').primary();
        t.string('pass_number', 20).notNullable().unique();
        t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.enum('reason', ['medical', 'parent_request', 'emergency', 'official', 'other']).notNullable();
        t.text('reason_detail');
        t.string('authorized_by', 100);
        t.timestamp('out_time').notNullable();
        t.timestamp('expected_return');
        t.timestamp('actual_return');
        t.string('pickup_person_name', 100);
        t.string('pickup_person_phone', 15);
        t.string('pickup_person_photo_url', 500);
        t.enum('status', ['out', 'returned']).defaultTo('out');
        t.text('remarks');
        t.integer('issued_by').unsigned().references('id').inTable('users');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    // ─── FRONT DESK: VISITORS ───
    await knex.schema.createTable('visitors', (t) => {
        t.increments('id').primary();
        t.string('visitor_name', 100).notNullable();
        t.string('visitor_phone', 15).notNullable();
        t.enum('purpose', ['meeting', 'enquiry', 'delivery', 'official', 'personal', 'other']).notNullable();
        t.string('whom_to_meet', 100);
        t.integer('whom_to_meet_staff_id').unsigned().references('id').inTable('staff');
        t.enum('id_type', ['aadhaar', 'driving_license', 'voter_id', 'passport', 'other']);
        t.string('id_number', 50);
        t.integer('num_persons').defaultTo(1);
        t.string('vehicle_number', 20);
        t.string('photo_url', 500);
        t.string('badge_number', 20);
        t.timestamp('in_time').notNullable();
        t.timestamp('out_time');
        t.enum('status', ['in', 'out']).defaultTo('in');
        t.integer('registered_by').unsigned().references('id').inTable('users');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    // ─── FRONT DESK: POSTAL ───
    await knex.schema.createTable('postal_records', (t) => {
        t.increments('id').primary();
        t.enum('type', ['received', 'dispatched']).notNullable();
        t.string('reference_number', 50);
        t.string('party_name', 200).notNullable();
        t.text('party_address');
        t.date('date').notNullable();
        t.enum('postal_type', ['letter', 'courier', 'parcel', 'document', 'legal', 'government', 'other']).defaultTo('letter');
        t.string('addressed_to', 100);
        t.integer('addressed_to_staff_id').unsigned().references('id').inTable('staff');
        t.integer('sent_by_staff_id').unsigned().references('id').inTable('staff');
        t.enum('mode', ['speed_post', 'registered', 'courier', 'hand_delivery', 'email']);
        t.string('weight', 20);
        t.decimal('cost', 10, 2);
        t.text('description');
        t.string('attachment_url', 500);
        t.enum('status', ['pending_delivery', 'delivered', 'returned', 'dispatched', 'in_transit']).defaultTo('pending_delivery');
        t.integer('logged_by').unsigned().references('id').inTable('users');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    // ─── FRONT DESK: LOST AND FOUND ───
    await knex.schema.createTable('lost_and_found', (t) => {
        t.increments('id').primary();
        t.string('item_number', 20).unique();
        t.enum('item_type', ['water_bottle', 'tiffin', 'bag', 'jacket', 'stationery', 'book', 'id_card', 'electronic', 'jewelry', 'other']).notNullable();
        t.text('description').notNullable();
        t.string('color', 50);
        t.enum('location_found', ['playground', 'classroom', 'library', 'cafeteria', 'bus', 'corridor', 'other']);
        t.date('found_date').notNullable();
        t.string('reported_by', 100);
        t.string('photo_url', 500);
        t.enum('status', ['found_unclaimed', 'claimed', 'lost_searching', 'lost_found', 'disposed']).defaultTo('found_unclaimed');
        t.string('claimed_by', 100);
        t.date('claimed_date');
        t.integer('verified_by').unsigned().references('id').inTable('users');
        t.integer('logged_by').unsigned().references('id').inTable('users');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    // ─── ACCOUNTS: INCOME ───
    await knex.schema.createTable('income_entries', (t) => {
        t.increments('id').primary();
        t.date('date').notNullable();
        t.string('category', 50).notNullable();
        t.decimal('amount', 12, 2).notNullable();
        t.enum('payment_mode', ['cash', 'bank_transfer', 'cheque', 'online', 'upi']).notNullable();
        t.string('received_from', 200);
        t.text('description');
        t.string('receipt_number', 50);
        t.string('attachment_url', 500);
        t.integer('created_by').unsigned().references('id').inTable('users');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    // ─── ACCOUNTS: EXPENSES ───
    await knex.schema.createTable('expense_entries', (t) => {
        t.increments('id').primary();
        t.date('date').notNullable();
        t.string('category', 50).notNullable();
        t.string('sub_category', 50);
        t.decimal('amount', 12, 2).notNullable();
        t.string('paid_to', 200).notNullable();
        t.enum('payment_mode', ['cash', 'bank_transfer', 'cheque', 'upi', 'credit_card']).notNullable();
        t.string('transaction_number', 100);
        t.string('bank_name', 100);
        t.text('description');
        t.string('approved_by_name', 100);
        t.string('attachment_url', 500);
        t.boolean('is_recurring').defaultTo(false);
        t.string('recurring_frequency', 20);
        t.date('next_due_date');
        t.integer('created_by').unsigned().references('id').inTable('users');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    // ─── ACCOUNTS: VENDOR BILLS ───
    await knex.schema.createTable('vendors', (t) => {
        t.increments('id').primary();
        t.string('name', 200).notNullable();
        t.string('phone', 15);
        t.string('email', 100);
        t.text('address');
        t.string('gst_number', 20);
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('vendor_bills', (t) => {
        t.increments('id').primary();
        t.integer('vendor_id').unsigned().notNullable().references('id').inTable('vendors');
        t.string('bill_number', 50).notNullable();
        t.date('bill_date').notNullable();
        t.date('due_date').notNullable();
        t.string('category', 50);
        t.decimal('sub_total', 12, 2).notNullable();
        t.decimal('tax_amount', 10, 2).defaultTo(0);
        t.decimal('total_amount', 12, 2).notNullable();
        t.decimal('amount_paid', 12, 2).defaultTo(0);
        t.decimal('balance_due', 12, 2).notNullable();
        t.enum('status', ['unpaid', 'partial', 'paid', 'overdue']).defaultTo('unpaid');
        t.string('attachment_url', 500);
        t.text('notes');
        t.integer('created_by').unsigned().references('id').inTable('users');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('vendor_bill_items', (t) => {
        t.increments('id').primary();
        t.integer('vendor_bill_id').unsigned().notNullable().references('id').inTable('vendor_bills').onDelete('CASCADE');
        t.string('item_name', 200).notNullable();
        t.integer('quantity').defaultTo(1);
        t.decimal('rate', 10, 2).notNullable();
        t.decimal('amount', 10, 2).notNullable();
    });

    // ─── EXTENDED FEE MANAGEMENT ───
    await knex.schema.createTable('fee_categories', (t) => {
        t.increments('id').primary();
        t.string('name', 100).notNullable();
        t.string('code', 20);
        t.boolean('is_one_time').defaultTo(false);
        t.boolean('is_refundable').defaultTo(false);
        t.text('description');
        t.boolean('is_active').defaultTo(true);
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('fee_groups', (t) => {
        t.increments('id').primary();
        t.string('name', 50).notNullable();
        t.text('description');
        t.boolean('is_active').defaultTo(true);
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('fee_settings', (t) => {
        t.increments('id').primary();
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years');
        t.boolean('late_fine_enabled').defaultTo(false);
        t.enum('fine_type', ['fixed', 'percentage']).defaultTo('fixed');
        t.decimal('fine_amount', 10, 2).defaultTo(0);
        t.integer('grace_period_days').defaultTo(7);
        t.decimal('max_fine_cap', 10, 2);
        t.string('receipt_prefix', 20).defaultTo('REC/');
        t.integer('receipt_start_number').defaultTo(1);
        t.text('receipt_header');
        t.text('receipt_footer');
        t.boolean('allow_advance_payment').defaultTo(true);
        t.boolean('allow_partial_payment').defaultTo(true);
        t.enum('rounding', ['none', 'rupee', 'ten']).defaultTo('none');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('discount_policies', (t) => {
        t.increments('id').primary();
        t.string('name', 100).notNullable();
        t.enum('type', ['sibling', 'scholarship', 'rte', 'staff_ward', 'custom']).notNullable();
        t.enum('discount_type', ['percentage', 'flat']).notNullable();
        t.decimal('discount_value', 10, 2).notNullable();
        t.jsonb('applies_to_categories');
        t.jsonb('applies_to_installments');
        t.jsonb('conditions');
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.boolean('is_active').defaultTo(true);
        t.timestamps(true, true);
    });

    // ─── STUDENT SIBLINGS ───
    await knex.schema.createTable('student_siblings', (t) => {
        t.increments('id').primary();
        t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.integer('sibling_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
        t.integer('family_group_id').unsigned();
        t.timestamps(true, true);
        t.unique(['student_id', 'sibling_id']);
    });

    // ─── EXTENDED EXAM SYSTEM ───
    await knex.schema.createTable('exam_areas', (t) => {
        t.increments('id').primary();
        t.string('name', 100).notNullable();
        t.text('description');
        t.integer('display_order').defaultTo(0);
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years');
        t.boolean('is_active').defaultTo(true);
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('subject_groups', (t) => {
        t.increments('id').primary();
        t.string('name', 100).notNullable();
        t.integer('exam_area_id').unsigned().references('id').inTable('exam_areas');
        t.text('description');
        t.integer('display_order').defaultTo(0);
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('grade_mappings', (t) => {
        t.increments('id').primary();
        t.string('grade_name', 10).notNullable();
        t.decimal('grade_point', 3, 1).notNullable();
        t.decimal('marks_from', 5, 2).notNullable();
        t.decimal('marks_to', 5, 2).notNullable();
        t.string('description', 50);
        t.boolean('is_pass').defaultTo(true);
        t.integer('display_order').defaultTo(0);
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('remarks_bank', (t) => {
        t.increments('id').primary();
        t.text('remark_text').notNullable();
        t.enum('category', ['academic', 'behavior', 'attendance', 'general']).defaultTo('general');
        t.string('for_grade_range', 10);
        t.boolean('is_active').defaultTo(true);
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    // ─── HR: TEACHER ASSIGNMENTS ───
    await knex.schema.createTable('teacher_subject_assignments', (t) => {
        t.increments('id').primary();
        t.integer('teacher_id').unsigned().notNullable().references('id').inTable('users');
        t.integer('class_id').unsigned().notNullable().references('id').inTable('classes');
        t.integer('section_id').unsigned().notNullable().references('id').inTable('sections');
        t.integer('subject_id').unsigned().notNullable().references('id').inTable('subjects');
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
        t.unique(['teacher_id', 'class_id', 'section_id', 'subject_id', 'academic_year_id']);
    });

    // ─── EMPLOYEE ATTENDANCE (biometric) ───
    await knex.schema.createTable('biometric_punches', (t) => {
        t.increments('id').primary();
        t.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE');
        t.timestamp('punch_time').notNullable();
        t.enum('punch_type', ['in', 'out']).notNullable();
        t.string('device_id', 50);
        t.jsonb('raw_data');
        t.boolean('processed').defaultTo(false);
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    // ─── LEAVE TYPES & BALANCES ───
    await knex.schema.createTable('leave_types', (t) => {
        t.increments('id').primary();
        t.string('name', 50).notNullable();
        t.string('code', 5).notNullable();
        t.integer('default_days').defaultTo(0);
        t.boolean('carry_forward').defaultTo(false);
        t.boolean('encashable').defaultTo(false);
        t.boolean('requires_document').defaultTo(false);
        t.integer('max_consecutive_days');
        t.boolean('is_active').defaultTo(true);
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('leave_balances', (t) => {
        t.increments('id').primary();
        t.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE');
        t.integer('leave_type_id').unsigned().notNullable().references('id').inTable('leave_types');
        t.integer('academic_year_id').unsigned().references('id').inTable('academic_years');
        t.integer('allocated').defaultTo(0);
        t.integer('used').defaultTo(0);
        t.integer('remaining').defaultTo(0);
        t.unique(['staff_id', 'leave_type_id', 'academic_year_id']);
    });

    // ─── SMS / COMMUNICATION ───
    await knex.schema.createTable('sms_templates', (t) => {
        t.increments('id').primary();
        t.string('name', 100).notNullable();
        t.string('category', 50).notNullable();
        t.text('body').notNullable();
        t.string('dlt_template_id', 100);
        t.string('language', 10).defaultTo('en');
        t.boolean('is_active').defaultTo(true);
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    await knex.schema.createTable('message_log', (t) => {
        t.increments('id').primary();
        t.enum('channel', ['sms', 'whatsapp', 'email', 'push']).notNullable();
        t.string('recipient', 200).notNullable();
        t.string('recipient_name', 100);
        t.integer('template_id').unsigned().references('id').inTable('sms_templates');
        t.text('content');
        t.timestamp('sent_at').defaultTo(knex.fn.now());
        t.enum('status', ['pending', 'sent', 'delivered', 'failed', 'rejected']).defaultTo('pending');
        t.timestamp('delivered_at');
        t.string('provider_message_id', 200);
        t.integer('sent_by').unsigned().references('id').inTable('users');
        t.integer('school_id').unsigned().references('id').inTable('schools');
    });

    // ─── SCHOOL CALENDAR / EVENTS ───
    await knex.schema.createTable('school_events', (t) => {
        t.increments('id').primary();
        t.string('title', 200).notNullable();
        t.text('description');
        t.date('event_date').notNullable();
        t.date('end_date');
        t.enum('type', ['holiday', 'event', 'exam', 'meeting', 'other']).defaultTo('event');
        t.boolean('is_holiday').defaultTo(false);
        t.integer('created_by').unsigned().references('id').inTable('users');
        t.integer('school_id').unsigned().references('id').inTable('schools');
        t.timestamps(true, true);
    });

    // ─── Expand students table ───
    await knex.schema.alterTable('students', (t) => {
        t.string('mother_tongue', 50);
        t.string('apaar_id', 50);
        t.enum('admission_type', ['new', 'transfer', 'readmission', 'rte']).defaultTo('new');
        t.string('stream', 20);
        t.string('house', 50);
        t.string('fee_group', 50).defaultTo('regular');
        t.text('known_allergies');
        t.text('chronic_conditions');
        t.string('disability', 50);
        t.string('disability_certificate_no', 50);
        t.string('emergency_contact_name', 100);
        t.string('emergency_contact_phone', 15);
        t.string('emergency_contact_relation', 50);
        t.boolean('needs_transport').defaultTo(false);
        t.string('pickup_point', 100);
        t.string('transport_route', 100);
    });

    // ─── Expand staff table ───
    await knex.schema.alterTable('staff', (t) => {
        t.string('blood_group', 5);
        t.string('marital_status', 20);
        t.string('spouse_name', 100);
        t.string('religion', 50);
        t.string('category', 10);
        t.enum('employment_type', ['full_time', 'part_time', 'contract', 'temporary', 'probation']).defaultTo('full_time');
        t.date('probation_end_date');
        t.integer('reporting_to').unsigned().references('id').inTable('staff');
        t.string('aadhaar_number', 50);
        t.string('pan_number', 15);
        t.string('uan_number', 20);
        t.string('bank_name', 100);
        t.string('bank_branch', 100);
        t.string('bank_account_number', 50);
        t.string('bank_ifsc', 11);
        t.decimal('basic_salary', 10, 2);
        t.decimal('hra', 10, 2);
        t.decimal('da', 10, 2);
        t.decimal('ta', 10, 2);
        t.decimal('special_allowance', 10, 2);
        t.decimal('pf_deduction', 10, 2);
        t.decimal('professional_tax', 10, 2);
        t.decimal('tds', 10, 2);
        t.text('current_address');
        t.text('permanent_address');
        t.string('photo_url', 500);
    });

    // ─── INDEXES ───
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_enquiries_status ON admission_enquiries(status)');
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_enquiries_school ON admission_enquiries(school_id)');
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_gate_passes_date ON gate_passes(created_at)');
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_visitors_date ON visitors(in_time)');
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expense_date ON expense_entries(date)');
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_income_date ON income_entries(date)');
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id)');
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_message_log_status ON message_log(status)');

    // ─── SEED DEFAULT ROLES ───
    await knex('roles').insert([
        { name: 'super_admin', display_name: 'Super Admin', description: 'Full system access', is_system_role: true },
        { name: 'admin', display_name: 'Admin/Principal', description: 'School administrator', is_system_role: true },
        { name: 'accountant', display_name: 'Accountant', description: 'Financial management', is_system_role: true },
        { name: 'teacher', display_name: 'Teacher', description: 'Teaching staff', is_system_role: true },
        { name: 'front_desk', display_name: 'Front Desk', description: 'Front office operations', is_system_role: true },
        { name: 'hr_manager', display_name: 'HR Manager', description: 'Human resource management', is_system_role: true },
        { name: 'parent', display_name: 'Parent', description: 'Parent portal access', is_system_role: true },
    ]);

    // ─── SEED DEFAULT PERMISSIONS ───
    const modules = ['dashboard', 'front_desk', 'students', 'hr', 'attendance', 'communication', 'examination', 'accounts', 'fees', 'admin'];
    const actions = ['view', 'create', 'edit', 'delete', 'export'];
    const permInserts: { module: string; action: string; description: string }[] = [];
    for (const mod of modules) {
        for (const act of actions) {
            permInserts.push({ module: mod, action: act, description: `${act} ${mod}` });
        }
    }
    await knex('permissions').insert(permInserts);

    // ─── SEED DEFAULT LEAVE TYPES ───
    await knex('leave_types').insert([
        { name: 'Casual Leave', code: 'CL', default_days: 12, carry_forward: false, encashable: false },
        { name: 'Sick Leave', code: 'SL', default_days: 10, carry_forward: false, encashable: false, requires_document: true },
        { name: 'Earned Leave', code: 'EL', default_days: 15, carry_forward: true, encashable: true },
        { name: 'Maternity Leave', code: 'ML', default_days: 180, carry_forward: false, encashable: false },
        { name: 'Paternity Leave', code: 'PL', default_days: 15, carry_forward: false, encashable: false },
        { name: 'Loss of Pay', code: 'LWP', default_days: 0, carry_forward: false, encashable: false },
    ]);

    // ─── SEED DEFAULT GRADE MAPPINGS (CBSE 9-point) ───
    await knex('grade_mappings').insert([
        { grade_name: 'A1', grade_point: 10, marks_from: 91, marks_to: 100, description: 'Outstanding', is_pass: true, display_order: 1 },
        { grade_name: 'A2', grade_point: 9, marks_from: 81, marks_to: 90, description: 'Excellent', is_pass: true, display_order: 2 },
        { grade_name: 'B1', grade_point: 8, marks_from: 71, marks_to: 80, description: 'Very Good', is_pass: true, display_order: 3 },
        { grade_name: 'B2', grade_point: 7, marks_from: 61, marks_to: 70, description: 'Good', is_pass: true, display_order: 4 },
        { grade_name: 'C1', grade_point: 6, marks_from: 51, marks_to: 60, description: 'Above Average', is_pass: true, display_order: 5 },
        { grade_name: 'C2', grade_point: 5, marks_from: 41, marks_to: 50, description: 'Average', is_pass: true, display_order: 6 },
        { grade_name: 'D', grade_point: 4, marks_from: 33, marks_to: 40, description: 'Below Average', is_pass: true, display_order: 7 },
        { grade_name: 'E1', grade_point: 0, marks_from: 21, marks_to: 32, description: 'Needs Improvement', is_pass: false, display_order: 8 },
        { grade_name: 'E2', grade_point: 0, marks_from: 0, marks_to: 20, description: 'Poor', is_pass: false, display_order: 9 },
    ]);

    // ─── SEED DEFAULT FEE CATEGORIES ───
    await knex('fee_categories').insert([
        { name: 'Tuition Fee', code: 'TF', is_one_time: false },
        { name: 'Development Fee', code: 'DF', is_one_time: false },
        { name: 'Computer Fee', code: 'CF', is_one_time: false },
        { name: 'Lab Fee', code: 'LF', is_one_time: false },
        { name: 'Activity Fee', code: 'AF', is_one_time: false },
        { name: 'Exam Fee', code: 'EF', is_one_time: false },
        { name: 'Annual Charge', code: 'AC', is_one_time: true },
        { name: 'Admission Fee', code: 'ADM', is_one_time: true },
        { name: 'Caution Money', code: 'CM', is_one_time: true, is_refundable: true },
        { name: 'Transport Fee', code: 'TRF', is_one_time: false },
        { name: 'Library Fee', code: 'LIB', is_one_time: false },
        { name: 'Sports Fee', code: 'SF', is_one_time: false },
    ]);

    // ─── SEED DEFAULT FEE GROUPS ───
    await knex('fee_groups').insert([
        { name: 'Regular' },
        { name: 'RTE' },
        { name: 'Staff Ward' },
        { name: 'Scholarship' },
        { name: 'Special' },
    ]);

    // ─── SEED DEFAULT SMS TEMPLATES ───
    await knex('sms_templates').insert([
        { name: 'Absence Alert', category: 'attendance', body: 'Dear Parent, your ward {student_name} of Class {class}-{section} was absent on {date}. Please ensure regular attendance. - {school_name}', language: 'en' },
        { name: 'Fee Reminder', category: 'fee', body: 'Dear Parent, fee of Rs.{due_amount} for {student_name} (Class {class}) is due. Please pay by {due_date} to avoid late fine. - {school_name}', language: 'en' },
        { name: 'Exam Notification', category: 'exam', body: 'Dear Parent, {exam_name} for Class {class} will begin from {start_date}. Please ensure your ward prepares well. - {school_name}', language: 'en' },
        { name: 'Holiday Notice', category: 'general', body: 'Dear Parent, school will remain closed on {date} on account of {reason}. - {school_name}', language: 'en' },
        { name: 'Fee Payment Confirmation', category: 'fee', body: 'Dear Parent, Rs.{amount} received towards fees for {student_name}. Receipt No: {receipt_no}. Balance: Rs.{balance}. - {school_name}', language: 'en' },
        { name: 'Emergency', category: 'emergency', body: 'URGENT: {message}. Please contact school immediately. - {school_name}', language: 'en' },
    ]);
}

export async function down(knex: Knex): Promise<void> {
    // Remove added columns from students
    await knex.schema.alterTable('students', (t) => {
        const cols = ['mother_tongue', 'apaar_id', 'admission_type', 'stream', 'house', 'fee_group',
            'known_allergies', 'chronic_conditions', 'disability', 'disability_certificate_no',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
            'needs_transport', 'pickup_point', 'transport_route'];
        cols.forEach(c => t.dropColumn(c));
    });

    // Remove added columns from staff
    await knex.schema.alterTable('staff', (t) => {
        const cols = ['blood_group', 'marital_status', 'spouse_name', 'religion', 'category',
            'employment_type', 'probation_end_date', 'reporting_to',
            'aadhaar_number', 'pan_number', 'uan_number',
            'bank_name', 'bank_branch', 'bank_account_number', 'bank_ifsc',
            'basic_salary', 'hra', 'da', 'ta', 'special_allowance',
            'pf_deduction', 'professional_tax', 'tds',
            'current_address', 'permanent_address', 'photo_url'];
        cols.forEach(c => t.dropColumn(c));
    });

    // Remove role_id from users
    await knex.schema.alterTable('users', (t) => {
        t.dropColumn('role_id');
    });

    // Drop all new tables in dependency order
    const tables = [
        'message_log', 'sms_templates',
        'school_events',
        'leave_balances', 'leave_types',
        'biometric_punches',
        'teacher_subject_assignments',
        'remarks_bank', 'grade_mappings', 'subject_groups', 'exam_areas',
        'student_siblings',
        'discount_policies', 'fee_settings', 'fee_groups', 'fee_categories',
        'vendor_bill_items', 'vendor_bills', 'vendors',
        'expense_entries', 'income_entries',
        'lost_and_found', 'postal_records', 'visitors', 'gate_passes',
        'enquiry_follow_ups', 'admission_enquiries',
        'login_history',
        'school_settings',
        'role_permissions', 'permissions', 'roles',
    ];

    for (const table of tables) {
        await knex.schema.dropTableIfExists(table);
    }
}
