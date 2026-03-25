-- ================================================================
-- EduCare ERP — Complete Database Schema Patch
-- Run this in Supabase SQL Editor to fix all missing columns/tables
-- Safe to run multiple times (idempotent — uses IF NOT EXISTS)
-- ================================================================

-- ── 1. FIX USERS ROLE (expand from enum to varchar for all roles) ──
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_enum_check;

-- ── 2. SCHOOLS — missing columns ─────────────────────────────────
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS board VARCHAR(100);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS affiliation_number VARCHAR(50);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS principal_name VARCHAR(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS admission_prefix VARCHAR(4);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website_token UUID DEFAULT gen_random_uuid();

-- ── 3. USERS — missing columns ───────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- ── 4. STUDENTS — missing columns ────────────────────────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_rte BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS rte_category VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS rte_admission_number VARCHAR(30);
ALTER TABLE students ADD COLUMN IF NOT EXISTS rte_admission_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS no_detention BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sr_no VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_uid VARCHAR(12);
ALTER TABLE students ADD COLUMN IF NOT EXISTS upload_batch_id INTEGER;

-- ── 5. CLASSES, SECTIONS, SUBJECTS — school_id ───────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE sections ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);

-- ── 6. ACADEMIC YEARS — school_id ────────────────────────────────
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);

-- ── 7. ATTENDANCE — school_id ────────────────────────────────────
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);

-- ── 8. FEE TABLES — school_id + instrument columns ───────────────
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE fee_installments ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS instrument_type VARCHAR(50);
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS instrument_number VARCHAR(100);
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100);
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS instrument_date DATE;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS instrument_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS bounce_penalty DECIMAL(10,2) DEFAULT 0;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS clearance_date DATE;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);
ALTER TABLE fee_payments ALTER COLUMN payment_mode TYPE VARCHAR(50);

-- ── 9. EXAMS, MARKS — school_id ──────────────────────────────────
ALTER TABLE exams ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE marks ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);

-- ── 10. STAFF — school_id + extra columns ────────────────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(11);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_name_staff VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS epf_number VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS esi_number VARCHAR(20);
ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE staff_leaves ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE staff_leaves ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE staff_salary_records ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);

-- ── 11. OTHER TABLES — school_id ─────────────────────────────────
ALTER TABLE notices ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE homework ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE transfer_certificates ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE student_documents ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE student_class_history ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);

-- ── 12. NEW TABLES ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    school_id INTEGER REFERENCES schools(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_otp_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    days_allowed INTEGER NOT NULL DEFAULT 0,
    is_paid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    leave_type_id INTEGER REFERENCES leave_types(id),
    leave_type VARCHAR(50),
    academic_year_id INTEGER REFERENCES academic_years(id),
    allocated INTEGER DEFAULT 0,
    used INTEGER DEFAULT 0,
    remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    teacher_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id),
    section_id INTEGER REFERENCES sections(id),
    subject_id INTEGER REFERENCES subjects(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_teachers (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    teacher_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id),
    section_id INTEGER REFERENCES sections(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_import_batches (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    original_file_name VARCHAR(255),
    total_rows INTEGER DEFAULT 0,
    created_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'preview_ready',
    detected_header_mapping JSONB,
    class_wise_summary JSONB,
    reverted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_import_batch_items (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES student_import_batches(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    row_number INTEGER,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    class_name VARCHAR(100),
    student_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'valid',
    error TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_config (
    id SERIAL PRIMARY KEY,
    school_id INTEGER UNIQUE REFERENCES schools(id),
    board_type VARCHAR(20) DEFAULT 'CBSE',
    state_board_name VARCHAR(100),
    udise_code VARCHAR(20),
    pan_number VARCHAR(10),
    gstin VARCHAR(15),
    cce_enabled BOOLEAN DEFAULT FALSE,
    fa_weightage INTEGER DEFAULT 40,
    sa_weightage INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_terms (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    term_type VARCHAR(20),
    term_name VARCHAR(100),
    max_marks INTEGER DEFAULT 100,
    weightage_percent INTEGER,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cce_co_scholastic (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    student_id INTEGER REFERENCES students(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    term VARCHAR(20),
    art_education VARCHAR(1),
    work_education VARCHAR(1),
    health_physical_education VARCHAR(1),
    thinking_skills VARCHAR(1),
    social_skills VARCHAR(1),
    emotional_skills VARCHAR(1),
    attitude_towards_school VARCHAR(1),
    attitude_towards_teachers VARCHAR(1),
    attitude_towards_peers VARCHAR(1),
    teacher_remarks TEXT,
    entered_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_card_config (
    id SERIAL PRIMARY KEY,
    school_id INTEGER UNIQUE REFERENCES schools(id),
    school_name VARCHAR(255),
    school_address TEXT,
    school_phone VARCHAR(20),
    principal_name VARCHAR(255),
    affiliation_number VARCHAR(50),
    logo_url VARCHAR(500),
    show_co_scholastic BOOLEAN DEFAULT TRUE,
    show_attendance BOOLEAN DEFAULT TRUE,
    show_remarks BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rte_quota_config (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    class_id INTEGER REFERENCES classes(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    total_seats INTEGER DEFAULT 0,
    rte_seats INTEGER DEFAULT 0,
    rte_filled INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rte_entitlement_records (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    student_id INTEGER REFERENCES students(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    entitlement_type VARCHAR(50),
    provided BOOLEAN DEFAULT FALSE,
    provided_date DATE,
    cost DECIMAL(10,2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rte_reimbursement_claims (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    claim_number VARCHAR(50),
    claim_date DATE,
    student_count INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'draft',
    submission_date DATE,
    payment_date DATE,
    amount_received DECIMAL(10,2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_config (
    id SERIAL PRIMARY KEY,
    school_id INTEGER UNIQUE REFERENCES schools(id),
    pan_number VARCHAR(10),
    tan_number VARCHAR(10),
    gstin VARCHAR(15),
    gst_state_code VARCHAR(2),
    gst_applicable BOOLEAN DEFAULT FALSE,
    gst_rate DECIMAL(5,2) DEFAULT 18,
    pt_state VARCHAR(50),
    pf_applicable BOOLEAN DEFAULT FALSE,
    esi_applicable BOOLEAN DEFAULT FALSE,
    pf_employee_rate DECIMAL(5,2) DEFAULT 12,
    pf_employer_rate DECIMAL(5,2) DEFAULT 12,
    esi_employee_rate DECIMAL(5,2) DEFAULT 0.75,
    esi_employer_rate DECIMAL(5,2) DEFAULT 3.25,
    pf_wage_ceiling DECIMAL(10,2) DEFAULT 15000,
    esi_wage_ceiling DECIMAL(10,2) DEFAULT 21000,
    epf_establishment_id VARCHAR(30),
    esic_code VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professional_tax_slabs (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    state VARCHAR(50),
    min_salary DECIMAL(10,2),
    max_salary DECIMAL(10,2),
    monthly_tax DECIMAL(8,2),
    feb_tax DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_structure (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    staff_id INTEGER REFERENCES staff(id),
    basic DECIMAL(10,2) DEFAULT 0,
    hra DECIMAL(10,2) DEFAULT 0,
    da DECIMAL(10,2) DEFAULT 0,
    ta DECIMAL(10,2) DEFAULT 0,
    medical_allowance DECIMAL(10,2) DEFAULT 0,
    special_allowance DECIMAL(10,2) DEFAULT 0,
    other_allowance DECIMAL(10,2) DEFAULT 0,
    gross_salary DECIMAL(10,2) DEFAULT 0,
    pf_applicable BOOLEAN DEFAULT FALSE,
    esi_applicable BOOLEAN DEFAULT FALSE,
    pt_applicable BOOLEAN DEFAULT FALSE,
    tds_applicable BOOLEAN DEFAULT FALSE,
    declared_investment_80c DECIMAL(10,2) DEFAULT 0,
    declared_hra_exemption DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, staff_id)
);

CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    staff_id INTEGER REFERENCES staff(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    working_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    leave_days INTEGER DEFAULT 0,
    lop_days INTEGER DEFAULT 0,
    basic_earned DECIMAL(10,2) DEFAULT 0,
    hra_earned DECIMAL(10,2) DEFAULT 0,
    da_earned DECIMAL(10,2) DEFAULT 0,
    ta_earned DECIMAL(10,2) DEFAULT 0,
    medical_earned DECIMAL(10,2) DEFAULT 0,
    special_earned DECIMAL(10,2) DEFAULT 0,
    other_earned DECIMAL(10,2) DEFAULT 0,
    gross_earned DECIMAL(10,2) DEFAULT 0,
    pf_employee DECIMAL(10,2) DEFAULT 0,
    pf_employer DECIMAL(10,2) DEFAULT 0,
    esi_employee DECIMAL(10,2) DEFAULT 0,
    esi_employer DECIMAL(10,2) DEFAULT 0,
    professional_tax DECIMAL(10,2) DEFAULT 0,
    tds DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    payment_date DATE,
    payment_mode VARCHAR(50),
    transaction_ref VARCHAR(100),
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, staff_id, month, year)
);

CREATE TABLE IF NOT EXISTS tds_certificates (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    staff_id INTEGER REFERENCES staff(id),
    financial_year_start INTEGER NOT NULL,
    gross_salary DECIMAL(12,2) DEFAULT 0,
    exemptions_hra DECIMAL(12,2) DEFAULT 0,
    deductions_80c DECIMAL(12,2) DEFAULT 0,
    standard_deduction DECIMAL(12,2) DEFAULT 0,
    taxable_income DECIMAL(12,2) DEFAULT 0,
    total_tds DECIMAL(12,2) DEFAULT 0,
    surcharge DECIMAL(12,2) DEFAULT 0,
    education_cess DECIMAL(12,2) DEFAULT 0,
    certificate_number VARCHAR(50),
    issue_date DATE,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, staff_id, financial_year_start)
);

CREATE TABLE IF NOT EXISTS payment_receipt_sequence (
    id SERIAL PRIMARY KEY,
    school_id INTEGER UNIQUE REFERENCES schools(id),
    last_receipt_number INTEGER DEFAULT 0,
    prefix VARCHAR(10) DEFAULT 'RCP',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statements (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    account_number VARCHAR(30),
    bank_name VARCHAR(100),
    transaction_date DATE,
    description TEXT,
    credit DECIMAL(12,2),
    debit DECIMAL(12,2),
    balance DECIMAL(12,2),
    reference VARCHAR(100),
    reconciled BOOLEAN DEFAULT FALSE,
    fee_payment_id INTEGER REFERENCES fee_payments(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upi_qr_codes (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    student_id INTEGER UNIQUE REFERENCES students(id),
    upi_id VARCHAR(100),
    qr_data TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_settings (
    id SERIAL PRIMARY KEY,
    school_id INTEGER UNIQUE REFERENCES schools(id),
    school_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    affiliation_number VARCHAR(50),
    udise_code VARCHAR(20),
    registration_number VARCHAR(50),
    board VARCHAR(50),
    principal_name VARCHAR(255),
    principal_signature_url VARCHAR(500),
    gst_number VARCHAR(15),
    established_year INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    is_one_time BOOLEAN DEFAULT FALSE,
    is_refundable BOOLEAN DEFAULT FALSE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_settings (
    id SERIAL PRIMARY KEY,
    school_id INTEGER UNIQUE REFERENCES schools(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    late_fine_enabled BOOLEAN DEFAULT FALSE,
    fine_type VARCHAR(20) DEFAULT 'fixed',
    fine_amount DECIMAL(10,2) DEFAULT 0,
    grace_period_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gate_passes (
    id SERIAL PRIMARY KEY,
    pass_number VARCHAR(30),
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    reason VARCHAR(50),
    reason_detail TEXT,
    authorized_by VARCHAR(100),
    out_time TIMESTAMP,
    expected_return TIMESTAMP,
    actual_return TIMESTAMP,
    pickup_person_name VARCHAR(255),
    pickup_person_phone VARCHAR(20),
    pickup_person_photo_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    remarks TEXT,
    issued_by INTEGER REFERENCES users(id),
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitors (
    id SERIAL PRIMARY KEY,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(20),
    purpose VARCHAR(50),
    whom_to_meet VARCHAR(255),
    whom_to_meet_staff_id INTEGER REFERENCES staff(id),
    id_type VARCHAR(30),
    id_number VARCHAR(50),
    num_persons INTEGER DEFAULT 1,
    vehicle_number VARCHAR(20),
    photo_url VARCHAR(500),
    badge_number VARCHAR(30),
    in_time TIMESTAMP,
    out_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in',
    registered_by INTEGER REFERENCES users(id),
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS postal_records (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    reference_number VARCHAR(50),
    party_name VARCHAR(255),
    party_address TEXT,
    date DATE,
    postal_type VARCHAR(30),
    addressed_to VARCHAR(255),
    addressed_to_staff_id INTEGER REFERENCES staff(id),
    sent_by_staff_id INTEGER REFERENCES staff(id),
    mode VARCHAR(30),
    weight DECIMAL(6,3),
    cost DECIMAL(8,2),
    description TEXT,
    attachment_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    logged_by INTEGER REFERENCES users(id),
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lost_and_found (
    id SERIAL PRIMARY KEY,
    item_number VARCHAR(30),
    item_type VARCHAR(50),
    description TEXT,
    color VARCHAR(50),
    location_found VARCHAR(100),
    found_date DATE,
    reported_by VARCHAR(255),
    photo_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'unclaimed',
    claimed_by VARCHAR(255),
    claimed_date DATE,
    verified_by INTEGER REFERENCES users(id),
    logged_by INTEGER REFERENCES users(id),
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS income_entries (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    category VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    payment_mode VARCHAR(30),
    received_from VARCHAR(255),
    description TEXT,
    receipt_number VARCHAR(50),
    attachment_url VARCHAR(500),
    created_by INTEGER REFERENCES users(id),
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_entries (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    paid_to VARCHAR(255),
    payment_mode VARCHAR(30),
    transaction_number VARCHAR(100),
    bank_name VARCHAR(100),
    description TEXT,
    approved_by_name VARCHAR(255),
    attachment_url VARCHAR(500),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(20),
    next_due_date DATE,
    created_by INTEGER REFERENCES users(id),
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(15),
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_bills (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    bill_number VARCHAR(50),
    bill_date DATE,
    due_date DATE,
    category VARCHAR(100),
    sub_total DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    balance_due DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid',
    attachment_url VARCHAR(500),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_bill_items (
    id SERIAL PRIMARY KEY,
    vendor_bill_id INTEGER REFERENCES vendor_bills(id) ON DELETE CASCADE,
    item_name VARCHAR(255),
    quantity DECIMAL(10,2),
    rate DECIMAL(10,2),
    amount DECIMAL(12,2)
);

CREATE TABLE IF NOT EXISTS sms_templates (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    name VARCHAR(100) NOT NULL,
    template_id VARCHAR(50),
    content TEXT NOT NULL,
    variables JSONB,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS razorpay_orders (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    student_id INTEGER REFERENCES students(id),
    installment_id INTEGER REFERENCES fee_installments(id),
    razorpay_order_id VARCHAR(100) UNIQUE,
    amount INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'created',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Subject groups and exam areas (used by master routes)
CREATE TABLE IF NOT EXISTS subject_groups (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grade_mappings (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    min_marks DECIMAL(5,2),
    max_marks DECIMAL(5,2),
    grade VARCHAR(5),
    grade_point DECIMAL(4,2),
    remarks VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── 13. INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_sections_school ON sections(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school ON attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON fee_structures(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school ON fee_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_school ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_school ON exam_subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_marks_school ON marks(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_school ON staff(school_id);
CREATE INDEX IF NOT EXISTS idx_notices_school ON notices(school_id);
CREATE INDEX IF NOT EXISTS idx_homework_school ON homework(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_tc_school ON transfer_certificates(school_id);
CREATE INDEX IF NOT EXISTS idx_student_docs_school ON student_documents(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_leaves_school ON staff_leaves(school_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_school ON staff_salary_records(school_id);

-- ── 14. MARK ALL MIGRATIONS AS COMPLETE IN KNEX ──────────────────
INSERT INTO knex_migrations (name, batch, migration_time)
SELECT name, 1, NOW()
FROM (VALUES
  ('001_initial_schema.js'),('002_add_schools.js'),('003_add_enquiries.js'),
  ('004_expand_roles.js'),('005_comprehensive_erp.js'),('006_add_tenant_admin_role.js'),
  ('007_add_username.js'),('008_board_cce.js'),('009_rte_compliance.js'),
  ('010_tax_payroll.js'),('011_payment_instruments.js'),('012_harden_multi_tenant_constraints.js'),
  ('013_harden_payments_and_attendance.js'),('014_add_exams_school_id.js'),
  ('015_tenant_harden_remaining_tables.js'),('016_complete_tenant_isolation.js'),
  ('017_add_refresh_token_hash.js'),('018_password_reset_and_school_expand.js'),
  ('019_email_otp_verification.js'),('020_academic_years_school_id.js'),
  ('021_add_sr_no_to_students.js'),('022_student_uid_and_admission_prefix.js'),
  ('023_student_import_batches.js'),('024_add_upload_batch_id_to_students.js'),
  ('025_import_batch_status_constraints.js'),('026_schema_hardening.js'),
  ('027_enable_rls.js'),('028_enable_rls_on_all_school_tables.js'),
  ('029_schema_isolation_and_rls_hardening.js'),('030_fix_stuck_import_batches.js'),
  ('031_comprehensive_rls_and_security_hardening.js'),('032_add_website_token_to_schools.js'),
  ('033_composite_indexes.js'),('034_supabase_security_advisor_fix.js'),
  ('035_leave_rejection_reason.js')
) AS t(name)
WHERE NOT EXISTS (SELECT 1 FROM knex_migrations WHERE knex_migrations.name = t.name);

SELECT 'Schema patch complete! All ' || COUNT(*) || ' migrations marked.' as status
FROM knex_migrations;
