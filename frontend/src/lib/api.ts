import { authStorage } from './authStorage';
import { API_BASE } from './runtimeConfig';
import type {
    LoginResponse, User, Student, StudentListResponse, AttendanceRecord,
    ClassAttendanceResponse, StudentAttendanceSummary, AttendanceEligibility,
    FeeStructure, FeePayment, StudentFeeStatus, FeeDuesResponse, FeeCollectionSummary,
    FeeSettings, Exam, ExamResultsResponse, ReportCard,
    StaffMember, StaffListResponse, Leave, SalaryRecord,
    DashboardStats, Notice, Class, Section, AdmissionEnquiry, EnquiryStats,
    GatePass, Visitor, PostalRecord, LostFoundItem, IncomeEntry, ExpenseEntry,
    Vendor, VendorBill, VendorBillsResponse, TeacherAssignment,
    SmsTemplate, Recipient, DeliveryReportResponse,
    MasterDataItem, ParentChildFee, ParentExamResult, AccountsEntriesResponse,
} from './types';

export function reportApiError(_error: unknown): void {
    // All API errors are user-facing (callers show toast.error).
    // Intentionally silent — do not console.error, it floods the Next.js dev overlay.
}

class ApiClient {
    private _refreshing: Promise<string | null> | null = null;

    private getToken(): string | null {
        return authStorage.getToken();
    }

    // Silently exchange the stored refresh token for a fresh access token.
    // Only one in-flight refresh at a time — concurrent callers share the same promise.
    private async silentRefresh(): Promise<string | null> {
        if (this._refreshing) return this._refreshing;
        const refreshToken = authStorage.getRefreshToken();
        if (!refreshToken) return null;

        this._refreshing = (async () => {
            try {
                const res = await fetch(`${API_BASE}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                    credentials: 'include',
                });
                if (!res.ok) return null;
                const data = await res.json() as { token?: string };
                if (data.token) {
                    authStorage.setToken(data.token);
                    return data.token;
                }
                return null;
            } catch {
                return null;
            } finally {
                this._refreshing = null;
            }
        })();

        return this._refreshing;
    }

    private async request<T>(path: string, options: RequestInit = {}, _retry = true): Promise<T> {
        const token = this.getToken();
        const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
        const headers: Record<string, string> = {
            ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
            ...((options.headers as Record<string, string>) || {}),
        };

        if (token) headers['Authorization'] = `Bearer ${token}`;

        let res: Response;
        try {
            res = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers,
                credentials: 'include',
            });
        } catch {
            throw new Error('Server unavailable. Please check backend connection and try again.');
        }

        if (res.status === 401) {
            // Only redirect when a token was actually sent (session expired).
            // If no token was present we're on a public page (e.g. /login) — just throw.
            if (token && typeof window !== 'undefined') {
                // Attempt silent token refresh before forcing re-login
                if (_retry) {
                    const newToken = await this.silentRefresh();
                    if (newToken) {
                        // Retry the original request with the fresh token
                        return this.request<T>(path, options, false);
                    }
                }
                authStorage.clear();
                window.location.href = '/login';
            }
            throw new Error('Unauthorized');
        }

        if (res.status === 403) {
            // Permission denied — do NOT log the user out.
            // A 403 means "authenticated but not allowed", not "session invalid".
            throw new Error('Access denied. You do not have permission to perform this action.');
        }

        if (res.status === 429) {
            throw new Error('Too many requests. Please wait a moment and try again.');
        }

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Request failed' }));
            // Sanitize raw DB/internal details — never expose SQL or stack traces to UI
            const raw = error.error || error.message || 'Request failed';
            const sanitized = /duplicate key|violates|syntax error|constraint|deadlock|pg_|knex|ECONNREFUSED/i.test(raw)
                ? 'Operation failed. Please try again or contact support.'
                : raw;
            throw new Error(sanitized);
        }

        return res.json();
    }

    // ─── Auth ───
    async login(schoolCode: string, username: string, password: string) {
        return this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ schoolCode, username, password }),
        });
    }

    async getMe() {
        return this.request<User>('/auth/me');
    }

    async changePassword(currentPassword: string, newPassword: string) {
        return this.request<{ message: string }>('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    }

    async logout() {
        return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
    }

    async forgotPassword(username: string, schoolCode?: string) {
        return this.request<{ message: string }>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ username, ...(schoolCode && { school_code: schoolCode }) }),
        });
    }

    async resetPassword(token: string, newPassword: string) {
        return this.request<{ message: string }>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        });
    }

    async sendVerificationOtp() {
        return this.request<{ message: string }>('/auth/send-verification-otp', { method: 'POST' });
    }

    async verifyEmail(otp: string) {
        return this.request<{ message: string }>('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ otp }),
        });
    }

    // ─── Students ───
    async getStudents(params?: Record<string, string | number>) {
        const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<StudentListResponse>(`/students${query}`);
    }

    async getStudent(id: number) {
        return this.request<Student>(`/students/${id}`);
    }

    async createStudent(data: Partial<Student>) {
        return this.request<Student>('/students', { method: 'POST', body: JSON.stringify(data) });
    }

    async importStudentsFile(file: File) {
        const form = new FormData();
        form.append('file', file);
        return this.request<{
            status: 'preview_ready';
            batch_id: number;
            file_name: string;
            total_rows_detected: number;
            valid_students: number;
            invalid_rows: number;
            headers_detected: string[];
            class_distribution: Record<string, number>;
            class_wise_summary: Array<{ class_name: string; added_count: number }>;
            mapping: Record<string, { field: string; confidence: number }>;
            errors: Array<{ row: number; errors: string[] }>;
            preview_records: Array<Record<string, unknown>>;
        }>('/students/import/preview', { method: 'POST', body: form });
    }

    async remapStudentImportBatch(batchId: number, mapping: Record<string, { field: string; confidence?: number }>) {
        return this.request<{
            status: 'preview_ready';
            batch_id: number;
            file_name: string;
            total_rows_detected: number;
            valid_students: number;
            invalid_rows: number;
            headers_detected: string[];
            class_distribution: Record<string, number>;
            class_wise_summary: Array<{ class_name: string; added_count: number }>;
            mapping: Record<string, { field: string; confidence: number }>;
            errors: Array<{ row: number; errors: string[] }>;
            preview_records: Array<Record<string, unknown>>;
        }>(`/students/import/${batchId}/remap`, {
            method: 'POST',
            body: JSON.stringify({ mapping }),
        });
    }

    async confirmStudentImportBatch(batchId: number, duplicateStrategy: 'skip' | 'replace' | 'add_both' = 'skip') {
        return this.request<{
            status: 'completed';
            batch_id: number;
            students_added: number;
            skipped_rows: number;
            class_distribution: Record<string, number>;
            skipped: Array<{ row: number; reason: string; name?: string }>;
            failed: Array<{ row: number; reason: string; name?: string }>;
            created_preview: Array<{ row: number; id: number; name: string; class_name: string }>;
        }>(`/students/import/${batchId}/confirm`, {
            method: 'POST',
            body: JSON.stringify({ duplicate_strategy: duplicateStrategy }),
        });
    }

    async cancelStudentImportBatch(batchId: number) {
        return this.request<{ status: 'canceled'; batch_id: number }>(`/students/import/${batchId}/cancel`, {
            method: 'POST',
        });
    }

    async revertStudentImportBatch(batchId: number) {
        return this.request<{ message: string; batch_id: number; reverted_count: number }>(`/students/import/${batchId}/revert`, {
            method: 'POST',
        });
    }

    async getLastStudentImportBatch() {
        return this.request<{ status: string; batch: Record<string, unknown>; items_preview: Array<Record<string, unknown>> }>('/students/import/last');
    }

    async updateStudent(id: number, data: Partial<Student>) {
        return this.request<Student>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async promoteStudent(id: number, data: Record<string, unknown>) {
        return this.request<{ message: string }>(`/students/${id}/promote`, { method: 'POST', body: JSON.stringify(data) });
    }

    async generateTC(id: number, reason?: string) {
        return this.request<{ message: string }>(`/students/${id}/tc`, { method: 'POST', body: JSON.stringify({ reason }) });
    }

    // ─── Attendance ───
    async markAttendance(data: { class_id: number; section_id: number; date: string; records: { student_id: number; status: string }[] }) {
        return this.request<{ message: string }>('/attendance/mark', { method: 'POST', body: JSON.stringify(data) });
    }

    async getClassAttendance(classId: number, sectionId: number, date: string) {
        return this.request<ClassAttendanceResponse>(`/attendance/class/${classId}/section/${sectionId}/date/${date}`);
    }

    async getStudentAttendance(studentId: number, params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<StudentAttendanceSummary>(`/attendance/student/${studentId}${query}`);
    }

    async getAttendanceEligibility(studentId: number) {
        return this.request<AttendanceEligibility>(`/attendance/student/${studentId}/eligibility`);
    }

    async getMonthlyReport(classId: number, sectionId: number, month: string) {
        return this.request<{ data: AttendanceRecord[] }>(`/attendance/monthly-report/${classId}/${sectionId}/${month}`);
    }

    // ─── Fees ───
    async createFeeStructure(data: Partial<FeeStructure>) {
        return this.request<FeeStructure>('/fees/structure', { method: 'POST', body: JSON.stringify(data) });
    }

    async getFeeStructure(classId: number) {
        return this.request<FeeStructure>(`/fees/structure/${classId}`);
    }

    async payCash(data: { student_id: number; installment_id: number; amount_paid: number; notes?: string; payment_mode?: 'cash' | 'cheque' | 'bank' | 'dd' }) {
        return this.request<FeePayment>('/fees/pay/cash', { method: 'POST', body: JSON.stringify(data) });
    }

    async initiatePayment(data: Record<string, unknown>) {
        return this.request<{ order_id: string; amount: number; currency: string; key: string; student_name: string; late_fee: number }>('/fees/pay/initiate', { method: 'POST', body: JSON.stringify(data) });
    }

    async verifyPayment(data: Record<string, unknown>) {
        return this.request<{ message: string; payment: FeePayment }>('/fees/pay/verify', { method: 'POST', body: JSON.stringify(data) });
    }

    async getStudentFees(studentId: number) {
        return this.request<StudentFeeStatus>(`/fees/student/${studentId}`);
    }

    async getReceipt(paymentId: number) {
        return this.request<FeePayment>(`/fees/receipt/${paymentId}`);
    }

    async getFeeDues(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<FeeDuesResponse>(`/fees/dues${query}`);
    }

    async getFeeCollectionSummary() {
        return this.request<FeeCollectionSummary>('/fees/collection-summary');
    }

    async getFeeSettings() {
        return this.request<FeeSettings>('/fees/settings');
    }

    async updateFeeSettings(data: Partial<FeeSettings>) {
        return this.request<{ message: string }>('/fees/settings', { method: 'POST', body: JSON.stringify(data) });
    }

    async sendFeeReminders(student_ids?: number[]) {
        return this.request<{ message: string }>('/fees/send-reminder', { method: 'POST', body: JSON.stringify({ student_ids }) });
    }

    // ─── Exams ───
    async createExam(data: Partial<Exam>) {
        return this.request<Exam>('/exams', { method: 'POST', body: JSON.stringify(data) });
    }

    async requestExamAccess() {
        return this.request<{ message: string }>('/exams/request-access', { method: 'POST' });
    }

    async getExams(params?: Record<string, string | number>) {
        const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<Exam[]>(`/exams${query}`);
    }

    async getExam(examId: number) {
        return this.request<Exam>(`/exams/${examId}`);
    }

    async enterMarks(examId: number, data: { exam_subject_id: number; marks: Array<{ student_id: number; marks_obtained?: number; is_absent?: boolean }> }) {
        return this.request<{ message: string }>(`/exams/${examId}/marks`, { method: 'POST', body: JSON.stringify(data) });
    }

    async getExamResults(examId: number, classId: number, sectionId?: number) {
        const query = sectionId ? `?section_id=${sectionId}` : '';
        return this.request<ExamResultsResponse>(`/exams/${examId}/results/${classId}${query}`);
    }

    async getReportCard(studentId: number, examId: number) {
        return this.request<ReportCard>(`/exams/student/${studentId}/report-card/${examId}`);
    }

    // ─── Staff ───
    async createStaff(data: Partial<StaffMember>) {
        return this.request<StaffMember>('/staff', { method: 'POST', body: JSON.stringify(data) });
    }

    async getStaffList(params?: Record<string, string | number>) {
        const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<StaffListResponse>(`/staff${query}`);
    }

    async getStaff(id: number): Promise<StaffMember | null> {
        const res = await this.request<StaffListResponse>('/staff');
        return ((res as StaffListResponse).data ?? []).find(s => s.id === id) ?? null;
    }

    async updateStaff(id: number, data: Partial<StaffMember>) {
        return this.request<StaffMember>(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async applyLeave(data: Partial<Leave>) {
        return this.request<Leave>('/staff/leave', { method: 'POST', body: JSON.stringify(data) });
    }

    async updateLeave(id: number, status: string, rejection_reason?: string) {
        return this.request<Leave>(`/staff/leave/${id}`, { method: 'PUT', body: JSON.stringify({ status, ...(rejection_reason && { rejection_reason }) }) });
    }

    async getLeaves(params?: Record<string, string | number>) {
        const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<Leave[]>(`/staff/leaves${query}`);
    }

    async getMyLeaveBalances() {
        return this.request<Array<{ leave_type_name: string; code: string; allocated: number; used: number; remaining: number }>>('/staff/my/leave-balances');
    }

    async getAllLeaveBalances() {
        return this.request<Array<{ staff_id: number; staff_name: string; designation: string; department: string; balances: Array<{ leave_type_name: string; code: string; allocated: number; used: number; remaining: number }> }>>('/staff/all-leave-balances');
    }

    async processSalary(month: number, year: number) {
        return this.request<SalaryRecord[]>('/staff/salary/process', { method: 'POST', body: JSON.stringify({ month, year }) });
    }

    // ─── Dashboard ───
    async getDashboardStats() {
        return this.request<DashboardStats>('/admin/dashboard/stats');
    }

    async getUpcomingExams() {
        return this.request<Exam[]>('/admin/dashboard/upcoming-exams');
    }

    async getRecentActivity() {
        return this.request<{ data: Array<{ type: string; description: string; created_at: string }> }>('/admin/dashboard/recent-activity');
    }

    // ─── Alerts ───
    async getWeakSubjects(studentId: number) {
        return this.request<{ subjects: string[] }>(`/alerts/weak-subjects/${studentId}`);
    }

    async getAttendanceRisk(classId: number, sectionId?: number) {
        const query = sectionId ? `?section_id=${sectionId}` : '';
        return this.request<{ students: Student[] }>(`/alerts/attendance-risk/${classId}${query}`);
    }

    async getFeeDelayAlerts() {
        return this.request<{ data: FeeDuesResponse['data'] }>('/alerts/fee-delay');
    }

    // ─── Parent ───
    async getChildren() {
        return this.request<Student[]>('/parent/children');
    }

    async getChildAttendance(studentId: number) {
        return this.request<StudentAttendanceSummary>(`/parent/attendance/${studentId}`);
    }

    async getChildFees(studentId: number) {
        return this.request<ParentChildFee>(`/parent/fees/${studentId}`);
    }

    async getChildFeesDetails(studentId: number) {
        return this.request<StudentFeeStatus>(`/parent/fees-details/${studentId}`);
    }

    async getChildResults(studentId: number) {
        return this.request<ParentExamResult[]>(`/parent/results/${studentId}`);
    }

    async getParentNotices() {
        return this.request<Notice[]>('/parent/notices');
    }

    async getParentHomework(classId: number, sectionId: number) {
        return this.request<{ data: Array<Record<string, unknown>> }>(`/parent/homework/${classId}/${sectionId}`);
    }

    // ─── Notices ───
    async createNotice(data: Partial<Notice>) {
        return this.request<Notice>('/notices', { method: 'POST', body: JSON.stringify(data) });
    }

    async getNotices() {
        return this.request<Notice[]>('/notices');
    }

    async deleteNotice(id: number) {
        return this.request<void>(`/notices/${id}`, { method: 'DELETE' });
    }

    async postHomework(data: { title: string; description: string; class_id: number; section_id: number; subject_id: number; due_date: string }) {
        return this.request<Record<string, unknown>>('/notices/homework', { method: 'POST', body: JSON.stringify(data) });
    }

    async getHomework(classId: number, sectionId: number) {
        return this.request<Array<Record<string, unknown>>>(`/notices/homework/${classId}/${sectionId}`);
    }

    // ─── Utility ───
    async getClasses() {
        return this.request<Class[]>('/students/classes');
    }

    async getSections(classId: number) {
        return this.request<Section[]>(`/students/sections/${classId}`);
    }

    async getAcademicYears() {
        return this.request<{ id: number; year: string; is_current: boolean; start_date: string; end_date: string }[]>('/students/academic-years');
    }

    async getSubjects(classId: number) {
        return this.request<{ id: number; name: string; name_hi: string; class_id: number; is_optional: boolean }[]>(`/students/subjects/${classId}`);
    }

    // ─── AI ───
    async getHindiName(name: string) {
        return this.request<{ hindi_name: string }>('/students/ai/hindi-name', { method: 'POST', body: JSON.stringify({ name }) });
    }

    async suggestClass(data: { name: string; dob: string; previous_school?: string; previous_class?: string }) {
        return this.request<{ suggested_class: string; suggested_class_id: number | null; reason: string; available_classes: Class[] }>('/students/ai/suggest-class', { method: 'POST', body: JSON.stringify(data) });
    }

    // ─── User Management (Owner only) ───
    async createUser(data: { name: string; username: string; password: string; role: string; phone?: string; designation?: string; department?: string }) {
        return this.request<{ message: string; user: User }>('/auth/create-user', { method: 'POST', body: JSON.stringify(data) });
    }

    async getSchoolUsers() {
        return this.request<{ data: User[] }>('/auth/users');
    }

    async updateUserRole(userId: number, role: string) {
        return this.request<{ message: string }>(`/auth/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
    }

    async deactivateUser(userId: number) {
        return this.request<{ message: string }>(`/auth/users/${userId}/deactivate`, { method: 'PUT' });
    }

    async reactivateUser(userId: number) {
        return this.request<{ message: string }>(`/auth/users/${userId}/reactivate`, { method: 'PUT' });
    }

    async resetUserPassword(userId: number, newPassword: string) {
        return this.request<{ message: string }>(`/auth/users/${userId}/reset-password`, { method: 'PUT', body: JSON.stringify({ newPassword }) });
    }

    // ═══════════════════════════════════════════
    //  FRONT DESK MODULE
    // ═══════════════════════════════════════════

    async getEnquiries(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: AdmissionEnquiry[] }>(`/front-desk/enquiries${query}`);
    }

    async createEnquiry(data: Partial<AdmissionEnquiry>) {
        return this.request<AdmissionEnquiry>('/front-desk/enquiries', { method: 'POST', body: JSON.stringify(data) });
    }

    async updateEnquiry(id: number, data: Partial<AdmissionEnquiry>) {
        return this.request<AdmissionEnquiry>(`/front-desk/enquiries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async getEnquiryStats() {
        return this.request<EnquiryStats>('/front-desk/enquiry-stats');
    }

    async getGatePasses(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: GatePass[] }>(`/front-desk/gate-passes${query}`);
    }

    async createGatePass(data: Partial<GatePass>) {
        return this.request<GatePass>('/front-desk/gate-passes', { method: 'POST', body: JSON.stringify(data) });
    }

    async markGatePassReturn(id: number) {
        return this.request<{ message: string }>(`/front-desk/gate-passes/${id}/return`, { method: 'PUT' });
    }

    async getVisitors(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: Visitor[] }>(`/front-desk/visitors${query}`);
    }

    async createVisitor(data: Partial<Visitor>) {
        return this.request<Visitor>('/front-desk/visitors', { method: 'POST', body: JSON.stringify(data) });
    }

    async checkoutVisitor(id: number) {
        return this.request<{ message: string }>(`/front-desk/visitors/${id}/checkout`, { method: 'PUT' });
    }

    async getPostalRecords(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: PostalRecord[] }>(`/front-desk/postal${query}`);
    }

    async createPostalRecord(data: Partial<PostalRecord>) {
        return this.request<PostalRecord>('/front-desk/postal', { method: 'POST', body: JSON.stringify(data) });
    }

    async getLostFoundItems(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: LostFoundItem[] }>(`/front-desk/lost-found${query}`);
    }

    async createLostFoundItem(data: Partial<LostFoundItem>) {
        return this.request<LostFoundItem>('/front-desk/lost-found', { method: 'POST', body: JSON.stringify(data) });
    }

    async claimLostFoundItem(id: number, claimedBy: string) {
        return this.request<{ message: string }>(`/front-desk/lost-found/${id}/claim`, { method: 'PUT', body: JSON.stringify({ claimed_by: claimedBy }) });
    }

    async getFrontDeskDashboard() {
        return this.request<Record<string, unknown>>('/front-desk/dashboard');
    }

    // ═══════════════════════════════════════════
    //  ACCOUNTS MODULE
    // ═══════════════════════════════════════════

    async getIncomeEntries(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<AccountsEntriesResponse>(`/accounts/income${query}`);
    }

    async createIncomeEntry(data: Partial<IncomeEntry>) {
        return this.request<IncomeEntry>('/accounts/income', { method: 'POST', body: JSON.stringify(data) });
    }

    async getExpenseEntries(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<AccountsEntriesResponse>(`/accounts/expenses${query}`);
    }

    async createExpenseEntry(data: Partial<ExpenseEntry>) {
        return this.request<ExpenseEntry>('/accounts/expenses', { method: 'POST', body: JSON.stringify(data) });
    }

    async getVendors() {
        return this.request<Vendor[]>('/accounts/vendors');
    }

    async createVendor(data: Partial<Vendor>) {
        return this.request<Vendor>('/accounts/vendors', { method: 'POST', body: JSON.stringify(data) });
    }

    async getVendorBills(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<VendorBillsResponse>(`/accounts/vendor-bills${query}`);
    }

    async createVendorBill(data: Partial<VendorBill>) {
        return this.request<VendorBill>('/accounts/vendor-bills', { method: 'POST', body: JSON.stringify(data) });
    }

    async payVendorBill(id: number, amount: number) {
        return this.request<{ message: string }>(`/accounts/vendor-bills/${id}/pay`, { method: 'PUT', body: JSON.stringify({ amount }) });
    }

    async getAccountsDashboard() {
        return this.request<Record<string, unknown>>('/accounts/dashboard');
    }

    // ═══════════════════════════════════════════
    //  HR MODULE
    // ═══════════════════════════════════════════

    async getTeacherAssignments(params?: Record<string, string | number>) {
        const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<TeacherAssignment[]>(`/hr/teacher-assignments${query}`);
    }

    async createTeacherAssignment(data: Partial<TeacherAssignment>) {
        return this.request<TeacherAssignment>('/hr/teacher-assignments', { method: 'POST', body: JSON.stringify(data) });
    }

    async deleteTeacherAssignment(id: number) {
        return this.request<{ message: string }>(`/hr/teacher-assignments/${id}`, { method: 'DELETE' });
    }

    async getClassTeachers() {
        return this.request<TeacherAssignment[]>('/hr/class-teachers');
    }

    async assignClassTeacher(sectionId: number, data: { teacher_id: number | null }) {
        return this.request<{ message: string; data: unknown }>(`/hr/class-teachers/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async getLeaveTypes() {
        return this.request<Array<{ id: number; name: string; days_allowed: number }>>('/hr/leave-types');
    }

    async getLeaveBalances(staffId: number) {
        return this.request<Array<{ id: number; staff_id: number; leave_type_id: number; leave_type_name: string; code: string; allocated: number; used: number; remaining: number }>>(`/hr/leave-balances/${staffId}`);
    }

    async getHrDashboard() {
        return this.request<Record<string, unknown>>('/hr/dashboard');
    }

    // ═══════════════════════════════════════════
    //  COMMUNICATION MODULE
    // ═══════════════════════════════════════════

    async getSmsTemplates() {
        return this.request<SmsTemplate[]>('/communication/sms-templates');
    }

    async createSmsTemplate(data: Partial<SmsTemplate>) {
        return this.request<SmsTemplate>('/communication/sms-templates', { method: 'POST', body: JSON.stringify(data) });
    }

    async deleteSmsTemplate(id: number) {
        return this.request<{ message: string }>(`/communication/sms-templates/${id}`, { method: 'DELETE' });
    }

    async getRecipients(group: string) {
        return this.request<Recipient[]>(`/communication/recipients?group=${group}`);
    }

    async sendBulkMessage(data: { channel: string; recipients: Recipient[]; content: string; template_id?: string }) {
        return this.request<{ total?: number; queued?: number }>('/communication/send-bulk', { method: 'POST', body: JSON.stringify(data) });
    }

    async getDeliveryReport(params?: Record<string, string>) {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<DeliveryReportResponse>(`/communication/delivery-report${query}`);
    }

    // ═══════════════════════════════════════════
    //  MASTER GENERIC MODULE
    // ═══════════════════════════════════════════
    async getMasterData(table: string) { return this.request<MasterDataItem[]>(`/master/${table}`); }
    async createMasterData(table: string, data: Partial<MasterDataItem>) { return this.request<MasterDataItem>(`/master/${table}`, { method: 'POST', body: JSON.stringify(data) }); }
    async deleteMasterData(table: string, id: number) { return this.request<{ message: string }>(`/master/${table}/${id}`, { method: 'DELETE' }); }

    // ═══════════════════════════════════════════
    //  BOARD / CCE MODULE
    // ═══════════════════════════════════════════
    async getBoardConfig() { return this.request<Record<string, unknown>>('/board/config'); }
    async saveBoardConfig(data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/board/config', { method: 'POST', body: JSON.stringify(data) }); }
    async getBoardTerms() { return this.request<Array<Record<string, unknown>>>('/board/terms'); }
    async createBoardTerm(data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/board/terms', { method: 'POST', body: JSON.stringify(data) }); }
    async updateBoardTerm(id: number, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/board/terms/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async deleteBoardTerm(id: number) { return this.request<{ message: string }>(`/board/terms/${id}`, { method: 'DELETE' }); }
    async getReportCardConfig() { return this.request<Record<string, unknown>>('/board/report-card-config'); }
    async saveReportCardConfig(data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/board/report-card-config', { method: 'POST', body: JSON.stringify(data) }); }
    async getCoScholastic(studentId: number, academicYearId: number, term: string) { return this.request<Record<string, unknown>>(`/board/co-scholastic/${studentId}/${academicYearId}/${term}`); }
    async saveCoScholastic(studentId: number, academicYearId: number, term: string, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/board/co-scholastic/${studentId}/${academicYearId}/${term}`, { method: 'POST', body: JSON.stringify(data) }); }
    async bulkSaveCoScholastic(classId: number, academicYearId: number, term: string, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/board/co-scholastic/bulk/${classId}/${academicYearId}/${term}`, { method: 'POST', body: JSON.stringify(data) }); }
    async getBoardReportCard(studentId: number, examId: number) { return this.request<Record<string, unknown>>(`/board/report-card/${studentId}/${examId}`); }

    // ═══════════════════════════════════════════
    //  RTE MODULE
    // ═══════════════════════════════════════════
    async getRteStudents(params?: Record<string, string>) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<StudentListResponse>(`/rte/students${q}`);
    }
    async tagRteStudent(id: number, data: Record<string, unknown>) { return this.request<{ message: string }>(`/rte/students/${id}/tag`, { method: 'PUT', body: JSON.stringify(data) }); }
    async getRteQuota(params?: Record<string, string>) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<Record<string, unknown>>(`/rte/quota${q}`);
    }
    async saveRteQuota(data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/rte/quota', { method: 'POST', body: JSON.stringify(data) }); }
    async getRteEntitlements(params?: Record<string, string>) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: Array<Record<string, unknown>> }>(`/rte/entitlements${q}`);
    }
    async saveRteEntitlement(data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/rte/entitlements', { method: 'POST', body: JSON.stringify(data) }); }
    async updateRteEntitlement(id: number, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/rte/entitlements/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async getRteClaims(params?: Record<string, string>) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: Array<Record<string, unknown>> }>(`/rte/claims${q}`);
    }
    async saveRteClaim(data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/rte/claims', { method: 'POST', body: JSON.stringify(data) }); }
    async updateRteClaim(id: number, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/rte/claims/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async getRteReport() { return this.request<Record<string, unknown>>('/rte/report'); }
    async validateRteAge(studentId: number) { return this.request<{ age_years: number; rte_eligible: boolean; message: string }>(`/rte/validate-age/${studentId}`, { method: 'POST' }); }
    async getRteUdiseExport() { return this.request<Record<string, unknown>>('/rte/udise-export'); }

    // ═══════════════════════════════════════════
    //  UDISE MODULE
    // ═══════════════════════════════════════════
    async getUdiseExport() { return this.request<Record<string, unknown>>('/udise/export'); }
    async getUdiseInfrastructure() { return this.request<Record<string, unknown>>('/udise/infrastructure'); }
    async saveUdiseInfrastructure(data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/udise/infrastructure', { method: 'POST', body: JSON.stringify(data) }); }
    async getUdiseEnrollmentSummary() { return this.request<Record<string, unknown>>('/udise/enrollment-summary'); }
    async getUdiseTeacherSummary() { return this.request<Record<string, unknown>>('/udise/teacher-summary'); }

    // ═══════════════════════════════════════════
    //  TAX & PAYROLL MODULE
    // ═══════════════════════════════════════════
    async getTaxConfig() { return this.request<Record<string, unknown>>('/tax/config'); }
    async saveTaxConfig(data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/tax/config', { method: 'POST', body: JSON.stringify(data) }); }
    async getPtSlabs() { return this.request<Array<Record<string, unknown>>>('/tax/pt-slabs'); }
    async savePtSlab(data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/tax/pt-slabs', { method: 'POST', body: JSON.stringify(data) }); }
    async getSalaryStructure(staffId: number) { return this.request<Record<string, unknown>>(`/tax/salary-structure/${staffId}`); }
    async saveSalaryStructure(staffId: number, data: Record<string, unknown>) { return this.request<Record<string, unknown>>('/tax/salary-structure', { method: 'POST', body: JSON.stringify({ ...data, staff_id: staffId }) }); }
    async getPayrollRecords(params?: Record<string, string>) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: SalaryRecord[] }>(`/tax/payroll${q}`);
    }
    async processPayroll(data: Record<string, unknown>) { return this.request<SalaryRecord[]>('/tax/payroll/process', { method: 'POST', body: JSON.stringify(data) }); }
    async markPayrollPaid(id: number, data: Record<string, unknown>) { return this.request<SalaryRecord>(`/tax/payroll/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async getPayslip(id: number) { return this.request<Record<string, unknown>>(`/tax/payroll/${id}/slip`); }
    async getForm16(staffId: number, financialYear: string) { return this.request<Record<string, unknown>>(`/tax/form16/${staffId}/${financialYear}`); }
    async generateForm16(financialYear: string) { return this.request<{ message: string }>(`/tax/form16/generate/${financialYear}`, { method: 'POST' }); }
    async listForm16(financialYear: string) { return this.request<Array<Record<string, unknown>>>(`/tax/form16/list/${financialYear}`); }
    async getGstReport(params?: Record<string, string>) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<Record<string, unknown>>(`/tax/gst-report${q}`);
    }

    // ═══════════════════════════════════════════
    //  PAYMENT INSTRUMENTS MODULE
    // ═══════════════════════════════════════════
    async getPaymentInstruments(params?: Record<string, string>) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: Array<Record<string, unknown>> }>(`/payment-instruments${q}`);
    }
    async updateInstrumentDetails(paymentId: number, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/payment-instruments/${paymentId}/instrument`, { method: 'PUT', body: JSON.stringify(data) }); }
    async updateInstrumentClearance(paymentId: number, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/payment-instruments/${paymentId}/clearance`, { method: 'PUT', body: JSON.stringify(data) }); }
    async getBouncedInstruments() { return this.request<{ data: Array<Record<string, unknown>> }>('/payment-instruments/bounced'); }
    async getPaymentReceipt(paymentId: number) { return this.request<FeePayment>(`/payment-instruments/receipt/${paymentId}`); }
    async getUpiQr(studentId: number) { return this.request<Record<string, unknown>>(`/payment-instruments/upi-qr/${studentId}`); }
    async saveUpiQr(studentId: number, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/payment-instruments/upi-qr/${studentId}`, { method: 'POST', body: JSON.stringify(data) }); }
    async getBankStatements(params?: Record<string, string>) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: Array<Record<string, unknown>> }>(`/payment-instruments/bank-statements${q}`);
    }
    async importBankStatements(entries: Array<Record<string, unknown>>) { return this.request<{ message: string }>('/payment-instruments/bank-statements', { method: 'POST', body: JSON.stringify({ entries }) }); }
    async reconcileBankStatement(id: number, feePaymentId: number) { return this.request<{ message: string }>(`/payment-instruments/bank-statements/${id}/reconcile`, { method: 'PUT', body: JSON.stringify({ fee_payment_id: feePaymentId }) }); }
    async getUnreconciledEntries() { return this.request<{ data: Array<Record<string, unknown>> }>('/payment-instruments/bank-statements/unreconciled'); }
    async getCollectionSummary(params?: Record<string, string>) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<Record<string, unknown>>(`/payment-instruments/collection-summary${q}`);
    }

    async deleteEnquiry(id: number) { return this.request<{ message: string }>(`/front-desk/enquiries/${id}`, { method: 'DELETE' }); }
    async addEnquiryFollowUp(id: number, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/front-desk/enquiries/${id}/follow-up`, { method: 'POST', body: JSON.stringify(data) }); }
    async getEnquiryFollowUps(id: number) { return this.request<Array<Record<string, unknown>>>(`/front-desk/enquiries/${id}/follow-ups`); }
    async updatePostalRecord(id: number, data: Record<string, unknown>) { return this.request<Record<string, unknown>>(`/front-desk/postal/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async lookupStudentForGatePass(q: string) { return this.request<{ data: Record<string, unknown> | null }>(`/front-desk/student-lookup?q=${encodeURIComponent(q)}`); }

    // ── Website Integration Token ──
    async getWebsiteToken() { return this.request<{ website_token: string; school_name: string }>('/auth/school/website-token'); }
    async regenerateWebsiteToken() { return this.request<{ website_token: string; message: string }>('/auth/school/website-token/regenerate', { method: 'POST' }); }
}

export const api = new ApiClient();
