// EduCare ERP — Shared TypeScript interfaces
// Generated from api.ts method signatures

// ─── Auth ───
export interface LoginResponse {
    token: string;
    refreshToken?: string;
    user: User;
}

export interface User {
    id: number;
    name: string;
    username: string;
    email?: string;
    role: string;
    phone?: string;
    designation?: string;
    department?: string;
    school_id: number;
    school_name?: string;
    is_active: boolean;
    created_at: string;
}

// ─── Students ───
export interface Student {
    id: number;
    name: string;
    name_hi?: string;
    admission_no: string;
    student_uid?: string;
    sr_no?: string;
    dob: string;
    gender: string;
    aadhaar?: string;
    category?: string;
    religion?: string;
    nationality?: string;
    blood_group?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    father_name: string;
    father_phone?: string;
    father_occupation?: string;
    father_email?: string;
    mother_name?: string;
    mother_phone?: string;
    mother_occupation?: string;
    guardian_name?: string;
    guardian_phone?: string;
    guardian_relation?: string;
    phone?: string;
    email?: string;
    previous_school?: string;
    class_id: number;
    class_name?: string;
    section_id: number;
    section_name?: string;
    current_class_id?: number;
    current_section_id?: number;
    current_roll_no?: string;
    academic_year?: string;
    status: string;
    school_id: number;
    created_at: string;
    updated_at?: string;
}

export interface StudentListResponse {
    data: Student[];
    total?: number;
    page?: number;
}

// ─── Attendance ───
export interface AttendanceRecord {
    id?: number;
    student_id: number;
    student_name?: string;
    class_id: number;
    section_id: number;
    date: string;
    status: 'P' | 'A' | 'L' | 'H';
    roll_no?: string;
}

export interface ClassAttendanceResponse {
    students: AttendanceRecord[];
    date: string;
    class_id: number;
    section_id: number;
}

export interface StudentAttendanceSummary {
    student_id: number;
    total_days: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
    eligible_for_exam: boolean;
    recent_records?: AttendanceRecord[];
}

export interface AttendanceEligibility {
    student_id: number;
    percentage: number;
    eligible: boolean;
    threshold: number;
}

// ─── Fees ───
export interface FeeStructure {
    id: number;
    class_id: number;
    class_name?: string;
    installments: FeeInstallment[];
    total_amount?: number;
    description?: string;
    school_id: number;
    created_at: string;
}

export interface FeeInstallment {
    id: number;
    installment_no: number;
    amount: number;
    due_date: string;
    paid?: boolean;
    paid_date?: string;
    receipt_no?: string;
    late_fee?: number;
}

export interface FeePayment {
    id: number;
    student_id: number;
    student_name?: string;
    installment_id: number;
    amount_paid: number;
    payment_mode: string;
    payment_date: string;
    receipt_no: string;
    notes?: string;
    school_id: number;
}

export interface StudentFeeStatus {
    student_id: number;
    student_name: string;
    class_name: string;
    total_fee: number;
    total_paid: number;
    total_due: number;
    installments: Array<FeeInstallment & {
        paid: boolean;
        payment: FeePayment | null;
        is_overdue: boolean;
        late_fee_estimate: number;
    }>;
}

export interface FeeDue {
    id: number;
    name: string;
    admission_no: string;
    father_phone: string | null;
    class_name: string;
    total_amount: number;
    total_paid: number;
    due_amount: number;
}

export interface FeeDuesResponse {
    data: FeeDue[];
    pagination: { page: number; limit: number; total: number };
}

export interface FeeCollectionSummary {
    academic_year: string;
    total_students: number;
    total_collected: number;
    today_collected: number;
    online_collected: number;
    cash_collected: number;
}

export interface FeeSettings {
    late_fine_enabled: boolean;
    fine_type?: 'fixed' | 'percentage';
    fine_amount: number;
    grace_period_days?: number;
    receipt_prefix?: string;
    rounding?: 'none' | 'rupee' | 'ten';
    allow_partial_payment?: boolean;
}

// ─── Exams ───
export interface Exam {
    id: number;
    name: string;
    class_id: number;
    class_name?: string;
    section_id?: number;
    term: string;
    start_date: string;
    end_date?: string;
    status: string;
    school_id: number;
    created_at: string;
    subjects?: Array<{ subject_id: number; max_marks: number; passing_marks: number }>;
}

export interface Mark {
    student_id: number;
    student_name?: string;
    subject_id: number;
    subject_name?: string;
    max_marks: number;
    obtained_marks: number;
    grade?: string;
    passed?: boolean;
}

export interface ExamResult {
    student_id: number;
    student_name?: string;
    roll_no?: string;
    total_obtained: number;
    total_max: number;
    percentage: number;
    grade: string;
    status: 'Pass' | 'Fail';
    subjects?: Mark[];
}

export interface ExamResultsResponse {
    exam_id: number;
    class_id: number;
    results: ExamResult[];
}

export interface ReportCard {
    student_id: number;
    student_name: string;
    exam_id: number;
    exam_name: string;
    term: string;
    percentage: number;
    total_obtained: number;
    total_max: number;
    grade: string;
    subjects: Mark[];
}

// ─── Staff ───
export interface StaffMember {
    id: number;
    name: string;
    designation?: string;
    department?: string;
    phone?: string;
    email?: string;
    salary?: number;
    employee_id?: string;
    is_teacher: boolean;
    status: string;
    school_id: number;
    created_at: string;
}

export interface StaffListResponse {
    data: StaffMember[];
    total?: number;
}

export interface Leave {
    id: number;
    staff_id: number;
    staff_name?: string;
    designation?: string;
    leave_type: string;
    from_date: string;
    to_date: string;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string;
    approved_by?: number;
    school_id: number;
    created_at: string;
    updated_at?: string;
}

export interface SalaryRecord {
    id: number;
    staff_id: number;
    staff_name?: string;
    designation?: string;
    month: number;
    year: number;
    gross_earned: number;
    basic_earned?: number;
    pf_employee?: number;
    esi_employee?: number;
    professional_tax?: number;
    tds?: number;
    total_deductions: number;
    net_salary: number;
    status: 'processed' | 'paid' | 'draft';
    payment_date?: string;
    school_id: number;
}

// ─── Dashboard ───
export interface DashboardStats {
    academic_year?: string;
    students?: {
        total: number;
        by_class: Array<{ class_name: string; count: number }>;
    };
    attendance?: {
        today_date: string;
        total_marked: number;
        present: number;
        absent: number;
        percentage: number;
    };
    fees?: {
        total_expected: number;
        total_collected: number;
        collection_percentage: number;
    };
    staff?: {
        total: number;
    };
    pending_dues_count?: number;
    upcoming_exams?: Exam[];
    recent_activity?: ActivityLog[];
}

export interface ActivityLog {
    id: number;
    type: string;
    description: string;
    user_id: number;
    user_name?: string;
    created_at: string;
}

// ─── Notices ───
export interface Notice {
    id: number;
    title: string;
    content: string;
    target_audience: string;
    class_id?: number;
    created_by?: number;
    school_id: number;
    created_at: string;
}

// ─── Classes / Sections ───
export interface Class {
    id: number;
    name: string;
    numeric_level?: number;
    school_id: number;
}

export interface Section {
    id: number;
    name: string;
    class_id: number;
    school_id: number;
}

// ─── Front Desk ───
export interface AdmissionEnquiry {
    id: number;
    enquiry_number?: string;
    student_name: string;
    father_name: string;
    mother_name?: string;
    contact_phone: string;
    alternate_phone?: string;
    email?: string;
    dob?: string;
    gender?: string;
    class_applying_for?: string;
    source: string;
    notes?: string;
    address?: string;
    previous_school?: string;
    follow_up_date?: string;
    status: string;
    school_id: number;
    created_at: string;
}

export interface EnquiryStats {
    total: number;
    today_new: number;
    by_status?: Array<{ status: string; count: number }>;
}

export interface GatePass {
    id: number;
    pass_number: string;
    student_id: number;
    student_name?: string;
    class_name?: string;
    section_name?: string;
    reason: string;
    reason_detail?: string;
    authorized_by?: string;
    pickup_person_name?: string;
    pickup_person_phone?: string;
    out_time?: string;
    actual_return?: string;
    status: 'out' | 'returned';
    school_id: number;
    created_at: string;
}

export interface Visitor {
    id: number;
    visitor_name: string;
    visitor_phone: string;
    purpose: string;
    whom_to_meet?: string;
    id_type?: string;
    id_number?: string;
    num_persons?: number;
    vehicle_number?: string;
    in_time?: string;
    out_time?: string;
    status: 'in' | 'out';
    school_id: number;
    created_at: string;
}

export interface PostalRecord {
    id: number;
    reference_number?: string;
    type: 'received' | 'dispatched';
    party_name: string;
    date: string;
    postal_type: string;
    addressed_to?: string;
    mode?: string;
    description?: string;
    status: string;
    school_id: number;
    created_at: string;
}

export interface LostFoundItem {
    id: number;
    item_number: string;
    item_type: string;
    description: string;
    color?: string;
    location_found: string;
    found_date: string;
    reported_by?: string;
    claimed_by?: string;
    status: 'found_unclaimed' | 'claimed' | 'lost_searching' | 'disposed';
    school_id: number;
    created_at: string;
}

// ─── Accounts ───
export interface IncomeEntry {
    id: number;
    date: string;
    category: string;
    amount: number;
    payment_mode: string;
    received_from?: string;
    description?: string;
    receipt_number?: string;
    school_id: number;
    created_at: string;
}

export interface ExpenseEntry {
    id: number;
    date: string;
    category: string;
    amount: number;
    paid_to: string;
    payment_mode: string;
    description?: string;
    transaction_number?: string;
    school_id: number;
    created_at: string;
}

export interface Vendor {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gst_number?: string;
    school_id: number;
    created_at: string;
}

export interface VendorBill {
    id: number;
    vendor_id: number;
    vendor_name?: string;
    bill_number: string;
    bill_date: string;
    due_date: string;
    category?: string;
    sub_total: number;
    tax_amount: number;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    status: 'unpaid' | 'partial' | 'paid' | 'overdue';
    school_id: number;
    created_at: string;
}

export interface AccountsEntriesResponse {
    data: IncomeEntry[] | ExpenseEntry[];
    summary?: { total_amount: number };
}

export interface VendorBillsResponse {
    data: VendorBill[];
}

// ─── HR ───
export interface TeacherAssignment {
    id: number;
    teacher_id: number;
    teacher_name?: string;
    class_id: number;
    class_name?: string;
    section_id: number;
    section_name?: string;
    subject_id: number;
    subject_name?: string;
    school_id: number;
    created_at: string;
}

export interface LeaveType {
    id: number;
    name: string;
    days_allowed: number;
    school_id: number;
}

export interface LeaveBalance {
    staff_id: number;
    leave_type: string;
    total_days: number;
    used_days: number;
    balance_days: number;
}

// ─── Communication ───
export interface SmsTemplate {
    id: number;
    name: string;
    category: string;
    body: string;
    dlt_template_id?: string;
    language: string;
    school_id: number;
    created_at: string;
}

export interface Recipient {
    id: number;
    name: string;
    phone: string;
    email?: string;
    type: string;
}

export interface MessageLog {
    id: number;
    channel: string;
    recipient: string;
    recipient_name?: string;
    template_id?: number;
    template_name?: string;
    content: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected';
    sent_at?: string;
    school_id: number;
    created_at: string;
}

export interface DeliveryReportResponse {
    data: MessageLog[];
    summary: Array<{ status: string; count: number }>;
}

// ─── Master Data ───
export interface MasterDataItem {
    id: number;
    name: string;
    code?: string;
    description?: string;
    is_one_time?: boolean;
    is_refundable?: boolean;
    school_id?: number;
    created_at?: string;
}

// ─── Parent Portal ───
export interface ParentChildFee {
    total_fee: number;
    total_paid: number;
    total_due: number;
    installments: FeeInstallment[];
}

export interface ParentExamResult {
    exam_id: number;
    exam_name: string;
    term: string;
    percentage: number;
    total_obtained: number;
    total_max: number;
    grade?: string;
    subjects?: Array<{
        subject: string;
        max_marks: number;
        obtained: number;
        passed: boolean;
    }>;
}

// ─── Audit ───
export interface AuditLog {
    id: number;
    user_id: number;
    user_name?: string;
    action: string;
    table_name?: string;
    record_id?: number;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    school_id: number;
    created_at: string;
}
