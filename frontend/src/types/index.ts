export interface User {
    id: number;
    email: string;
    name: string;
    role: 'tenant_admin' | 'owner' | 'co-owner' | 'super_admin' | 'admin' | 'accountant' | 'teacher' | 'front_desk' | 'hr_manager' | 'parent' | 'staff';
    phone?: string;
    school_id?: number;
    preferred_language?: string;
    is_active?: boolean;
    email_verified?: boolean;
}

export interface Student {
    id: number;
    admission_no: string;
    name: string;
    name_hi?: string;
    dob: string;
    gender: string;
    category: string;
    aadhaar_last4?: string;
    father_name: string;
    father_phone?: string;
    father_occupation?: string;
    mother_name?: string;
    mother_occupation?: string;
    guardian_name?: string;
    guardian_phone?: string;
    guardian_relation?: string;
    current_class_id: number;
    current_section_id: number;
    current_roll_no?: string;
    class_name?: string;
    section_name?: string;
    status: 'active' | 'alumni' | 'tc_issued';
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    photo_url?: string;
    admission_date?: string;
    // Extended fields
    mother_tongue?: string;
    apaar_id?: string;
    admission_type?: string;
    stream?: string;
    house?: string;
    fee_group?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    needs_transport?: boolean;
    pickup_point?: string;
    religion?: string;
    blood_group?: string;
    nationality?: string;
    previous_school?: string;
}

export interface AttendanceRecord {
    student_id: number;
    date: string;
    status: 'P' | 'A' | 'L' | 'HD';
}

export interface AttendanceSummary {
    total_days: number;
    present: number;
    absent: number;
    leave: number;
    half_day: number;
    percentage: number;
    eligible_for_exam: boolean;
}

export interface FeeInstallment {
    id: number;
    installment_no: number;
    amount: number;
    due_date: string;
    paid: boolean;
    payment_date?: string;
    receipt_no?: string;
    is_overdue?: boolean;
    late_fee_estimate?: number;
}

export interface FeeStatus {
    student_id: number;
    student_name: string;
    class_name?: string;
    total_fee: number;
    total_paid: number;
    total_due: number;
    installments: FeeInstallment[];
}

export interface Exam {
    id: number;
    name: string;
    term: '1' | '2';
    class_id: number;
    class_name?: string;
    start_date?: string;
    end_date?: string;
    status: 'upcoming' | 'ongoing' | 'completed';
}

export interface SubjectResult {
    subject: string;
    max_marks: number;
    passing_marks: number;
    obtained: number;
    passed: boolean;
    grade?: string;
    is_absent?: boolean;
}

export interface StudentResult {
    student_id: number;
    name: string;
    admission_no: string;
    roll_no?: string;
    subjects: SubjectResult[];
    total_obtained: number;
    total_max: number;
    percentage: number;
    result: 'PASS' | 'FAIL';
    rank?: number;
}

export interface Staff {
    id: number;
    name: string;
    employee_id?: string;
    designation?: string;
    department?: string;
    phone?: string;
    email?: string;
    salary?: number;
    join_date?: string;
    qualification?: string;
    status: 'active' | 'inactive' | 'resigned';
    blood_group?: string;
    employment_type?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    basic_salary?: number;
    hra?: number;
    photo_url?: string;
}

export interface DashboardStats {
    academic_year?: string;
    students: { total: number; by_class: { class_name: string; count: number }[] };
    attendance: { today_date: string; total_marked: number; present: number; absent: number; percentage: number };
    fees: { total_expected: number; total_collected: number; collection_percentage: number };
    staff: { total: number };
    pending_dues_count: number;
}

export interface Notice {
    id: number;
    title: string;
    content: string;
    target_audience: string;
    created_by_name?: string;
    created_at: string;
}

export interface Alert {
    student_id?: number;
    student_name?: string;
    severity: 'critical' | 'high' | 'medium' | 'warning';
    message: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: { page: number; limit: number; total: number };
}

// ─── FRONT DESK TYPES ───

export interface AdmissionEnquiry {
    id: number;
    enquiry_number: string;
    student_name: string;
    dob?: string;
    gender?: string;
    class_applying_for?: number;
    class_name?: string;
    father_name: string;
    mother_name?: string;
    contact_phone: string;
    alternate_phone?: string;
    email?: string;
    address?: string;
    previous_school?: string;
    source: string;
    assigned_to?: number;
    assigned_to_name?: string;
    status: 'new' | 'contacted' | 'follow_up' | 'interested' | 'not_interested' | 'admitted' | 'closed';
    follow_up_date?: string;
    notes?: string;
    created_at: string;
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
    authorized_by: string;
    out_time: string;
    expected_return?: string;
    actual_return?: string;
    pickup_person_name?: string;
    pickup_person_phone?: string;
    status: 'out' | 'returned';
}

export interface Visitor {
    id: number;
    visitor_name: string;
    visitor_phone: string;
    purpose: string;
    whom_to_meet: string;
    id_type?: string;
    id_number?: string;
    num_persons: number;
    vehicle_number?: string;
    badge_number?: string;
    in_time: string;
    out_time?: string;
    status: 'in' | 'out';
}

export interface PostalRecord {
    id: number;
    type: 'received' | 'dispatched';
    reference_number?: string;
    party_name: string;
    date: string;
    postal_type: string;
    addressed_to?: string;
    mode?: string;
    cost?: number;
    description?: string;
    status: string;
}

export interface LostFoundItem {
    id: number;
    item_number: string;
    item_type: string;
    description: string;
    color?: string;
    location_found?: string;
    found_date: string;
    reported_by?: string;
    photo_url?: string;
    status: 'found_unclaimed' | 'claimed' | 'lost_searching' | 'lost_found' | 'disposed';
    claimed_by?: string;
    claimed_date?: string;
}

// ─── ACCOUNTS TYPES ───

export interface IncomeEntry {
    id: number;
    date: string;
    category: string;
    amount: number;
    payment_mode: string;
    received_from?: string;
    description?: string;
    receipt_number?: string;
}

export interface ExpenseEntry {
    id: number;
    date: string;
    category: string;
    sub_category?: string;
    amount: number;
    paid_to: string;
    payment_mode: string;
    description?: string;
    is_recurring?: boolean;
}

export interface Vendor {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    total_billed?: number;
    total_paid?: number;
    total_outstanding?: number;
}

export interface VendorBill {
    id: number;
    vendor_id: number;
    vendor_name?: string;
    bill_number: string;
    bill_date: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    status: 'unpaid' | 'partial' | 'paid' | 'overdue';
}

// ─── COMMUNICATION TYPES ───

export interface SmsTemplate {
    id: number;
    name: string;
    category: string;
    body: string;
    dlt_template_id?: string;
    language: string;
    is_active: boolean;
}

export interface MessageLog {
    id: number;
    channel: 'sms' | 'whatsapp' | 'email' | 'push';
    recipient: string;
    recipient_name?: string;
    template_name?: string;
    content?: string;
    sent_at: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected';
}

// ─── HR TYPES ───

export interface TeacherAssignment {
    id: number;
    teacher_id: number;
    teacher_name: string;
    class_id: number;
    class_name: string;
    section_id: number;
    section_name: string;
    subject_id: number;
    subject_name: string;
}

export interface LeaveType {
    id: number;
    name: string;
    code: string;
    default_days: number;
}

export interface LeaveBalance {
    leave_type_name: string;
    code: string;
    allocated: number;
    used: number;
    remaining: number;
}
