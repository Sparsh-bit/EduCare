# SCHOOL ERP PLATFORM — COMPLETE DOCUMENTATION
## For Indian K-12 Schools | Cloudflare Deployment | Admin + Employee Portals

**Version:** 1.0  
**Date:** March 2026  
**Deployment:** Cloudflare Pages (Frontend) + Cloudflare Workers or External Backend  
**Target:** Indian CBSE/ICSE/State Board Schools  
**Currency:** INR (₹)  
**Language:** English (with Hindi support for SMS/WhatsApp templates)

---

## TABLE OF CONTENTS

1. System Architecture & Deployment
2. User Roles & Permissions Matrix
3. Landing Page & Authentication
4. Dashboard
5. Front Desk
6. Students
7. Human Resource
8. Attendance
9. Communication
10. Examination
11. Accounts
12. Fees
13. Admin Section
14. AI Chatbot Integration
15. Database Schema (All Tables)
16. API Endpoint Reference
17. Notification System
18. Security & Compliance

---

## 1. SYSTEM ARCHITECTURE & DEPLOYMENT

### 1.1 Architecture Overview
```
[Cloudflare Pages] → Landing Page + SPA (React/Next.js)
        ↓
[Cloudflare Workers / External API Server] → REST API (Node.js/Express or Django)
        ↓
[PostgreSQL Database] → Primary data store
[Redis] → Session cache, OTP store, rate limiting
[AWS S3 / Cloudflare R2] → File storage (photos, documents, certificates)
[Firebase / OneSignal] → Push notifications
[MSG91 / Twilio] → SMS OTP & bulk SMS
[WhatsApp Business API] → WhatsApp messaging
[Razorpay / PayU] → Online fee payment (parent portal, if extended)
```

### 1.2 Deployment on Cloudflare
- **Frontend:** Cloudflare Pages — serves the landing page, login/signup, and the full ERP SPA.
- **Backend API:** Cloudflare Workers (for lightweight endpoints) or a VPS/Cloud server (for heavy processing like payroll, report generation).
- **DNS & SSL:** Managed by Cloudflare. Custom domain (e.g., `erp.yourschool.in`).
- **CDN:** Cloudflare CDN for static assets (images, CSS, JS).
- **File Storage:** Cloudflare R2 (S3-compatible) for student photos, documents, certificates.

### 1.3 URL Structure
```
https://erp.yourschool.in/                → Landing page
https://erp.yourschool.in/login           → Login page
https://erp.yourschool.in/signup          → Signup/Registration (admin-controlled)
https://erp.yourschool.in/app/dashboard   → Dashboard (after login)
https://erp.yourschool.in/app/students    → Students module
https://erp.yourschool.in/app/fees        → Fees module
... and so on
```

### 1.4 Single Page Application (SPA) Flow
1. User visits landing page → sees school branding, features, contact info.
2. Clicks "Login" → redirected to `/login`.
3. After successful authentication → redirected to `/app/dashboard`.
4. All ERP modules load within the SPA — no full page reloads.
5. Sidebar navigation shows modules based on user role.

---

## 2. USER ROLES & PERMISSIONS MATRIX

### 2.1 Roles

| Role ID | Role Name | Description |
|---------|-----------|-------------|
| 1 | Super Admin | School owner/IT admin. Full access to everything. |
| 2 | Admin/Principal | School administrator. Manages all operations. |
| 3 | Accountant | Fee collection, expense management, payroll. |
| 4 | Teacher | Attendance, exam entries, class management. |
| 5 | Front Desk Staff | Enquiries, gate pass, visitors, postal. |
| 6 | HR Manager | Employee management, leave, attendance. |
| 7 | Librarian | Library module (future enhancement). |
| 8 | Transport Manager | Transport module (future enhancement). |

### 2.2 Module Visibility Matrix

| Module | Super Admin | Admin | Accountant | Teacher | Front Desk | HR Manager |
|--------|:-----------:|:-----:|:----------:|:-------:|:----------:|:----------:|
| Dashboard | ✅ Full | ✅ Full | ✅ Limited | ✅ Limited | ✅ Limited | ✅ Limited |
| Front Desk | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Students | ✅ | ✅ | ❌ | ✅ View Only | ❌ | ❌ |
| Human Resource | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Attendance | ✅ | ✅ | ❌ | ✅ Own Classes | ❌ | ✅ Staff Only |
| Communication | ✅ | ✅ | ❌ | ✅ Limited | ❌ | ❌ |
| Examination | ✅ | ✅ | ❌ | ✅ Own Subjects | ❌ | ❌ |
| Accounts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Fees | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Admin Section | ✅ | ✅ Limited | ✅ Own Profile | ✅ Own Profile | ✅ Own Profile | ✅ Own Profile |

### 2.3 Employee Self-Service (What Employees See)
Every employee (teacher, accountant, front desk, HR) when logged in sees:
- Their own profile and attendance.
- Modules assigned to their role (as per matrix above).
- Admin Section limited to: Profile, Change Password, Login History, Logout.
- AI Chatbot accessible to all roles.

---

## 3. LANDING PAGE & AUTHENTICATION

### 3.1 Landing Page (`/`)

**Purpose:** Public-facing page for the school. First thing visitors see.

**Sections:**
- **Hero Section:** School name, logo, tagline, background image/video of the school. CTA button: "Login to ERP".
- **Features Section:** Cards showing ERP capabilities — Student Management, Fee Management, Exam Management, HR, Communication, etc. Each card has an icon, title, and one-line description.
- **About Section:** Brief about the school — vision, mission, established year, board affiliation (CBSE/ICSE/State).
- **Statistics Counter:** Animated counters — Total Students, Total Staff, Years of Excellence, Courses Offered.
- **Testimonials (Optional):** Quotes from parents, teachers, or alumni.
- **Contact Section:** School address with embedded Google Map, Phone number, Email, Social media links (Facebook, Instagram, YouTube, X).
- **Footer:** Quick links, copyright, "Powered by [Your Brand]".

**Design Requirements:**
- Modern, responsive design (mobile-first).
- School's brand colors (configurable from admin settings).
- Fast loading (Cloudflare Pages optimized).
- SEO friendly (meta tags, Open Graph for social sharing).

### 3.2 Login Page (`/login`)

**Fields:**
- Phone Number / Email / Employee ID (single input with auto-detect or toggle).
- Password field with show/hide toggle.
- "Remember Me" checkbox.
- "Forgot Password?" link → OTP-based reset flow.
- Login button.
- School logo at top.

**Authentication Flow:**
1. User enters credentials → POST `/api/auth/login`.
2. Server validates → returns JWT access token (15 min expiry) + refresh token (7 days).
3. Token stored in httpOnly cookie (not localStorage for security).
4. Role and permissions loaded → user redirected to `/app/dashboard`.
5. On token expiry, refresh token used silently. If refresh token expired, redirect to login.

**Security:**
- Rate limiting: Max 5 failed attempts → account locked for 15 minutes.
- OTP verification on first login or new device.
- All passwords hashed with bcrypt (min 12 rounds).
- CSRF protection on all forms.

### 3.3 Signup / Registration (`/signup`)
- **NOT public.** Only Super Admin can create new user accounts.
- Admin creates account → credentials sent to user via SMS/email.
- Optional: Self-registration for parents (if parent portal is added later) with admin approval.

### 3.4 Forgot Password Flow
1. User clicks "Forgot Password" → enters registered phone number.
2. OTP sent via SMS (MSG91 / Twilio).
3. User enters OTP → verified → enters new password.
4. Password updated → redirected to login.

---

## 4. DASHBOARD (`/app/dashboard`)

### 4.1 Purpose
Role-specific summary screen. The command center of the ERP.

### 4.2 Admin / Super Admin Dashboard

#### 4.2.1 Key Stat Cards (Top Row)
Four prominent cards displayed in a row:

**Card 1 — Active Students**
- Large number showing total active students.
- Small subtext: "+X new this month" (green if positive).
- Click → navigates to Students > Active Students.

**Card 2 — Inactive Students**
- Total count of students with status `inactive` / `left` / `transferred`.
- Subtext: "X left this session".
- Click → navigates to Students > Inactive Students.

**Card 3 — Active Employees**
- Total teaching + non-teaching active staff.
- Subtext showing breakdown: "X Teachers, Y Staff".
- Click → navigates to HR > Manage Employees.

**Card 4 — Admission Enquiries**
- Total pending enquiries (not yet converted).
- Subtext: "X new today".
- Click → navigates to Front Desk > Admission Enquiry.

#### 4.2.2 Quick Action Cards (Grid Below Stats)
A grid of shortcut cards, one for each major module/action in the ERP. Each card has an icon, label, and navigates to the respective page on click.

**Quick Action Cards List:**
```
Row 1: Admission Enquiry | Gate Pass | Visitors Log | Postal Records
Row 2: Active Students | Student Reports | Certificates | Student ID Card
Row 3: Manage Employees | Assign Teachers | Staff ID Card | HR Dashboard
Row 4: Student Attendance | Employee Attendance | Attendance Dashboard
Row 5: Bulk Messages | WhatsApp Messages | SMS Templates
Row 6: Exam Settings | Report Card Entries | Exam Dashboard
Row 7: Income Report | Manage Expense | Accounts Dashboard
Row 8: Fee Payment | Fee Reports | Fees Setup | Fees Dashboard
Row 9: Communication | AI Chatbot | Admin Settings
```

Each card:
- Has a distinct colored icon (use school's color palette).
- Shows a badge with pending count (e.g., "5 pending enquiries" on Admission Enquiry card).
- Is role-filtered (teachers don't see Fee Payment, HR, etc.).

#### 4.2.3 Charts Section
- **Student Gender Ratio:** Pie chart (Boys vs Girls vs Other).
- **Class-wise Student Distribution:** Bar chart showing student count per class.
- **Monthly Fee Collection:** Line/bar chart showing ₹ collected per month (current academic year).
- **Attendance Trend:** Line chart showing daily/weekly attendance percentage.

#### 4.2.4 Additional Widgets
- **Today's Birthdays:** List of students and staff with birthdays today. Name, class/designation, profile photo thumbnail.
- **Recent Announcements:** Last 5 announcements/notices.
- **Upcoming Events:** Next 5 events from school calendar.
- **Today's Absentees:** Quick count — "X students absent today, Y staff absent".

### 4.3 Teacher Dashboard
- **My Timetable Today:** List of periods — time, class, section, subject, room.
- **My Attendance Summary:** Own attendance this month (present/absent/leave count).
- **Quick Actions:** Mark Attendance (for assigned classes), Enter Marks, View My Students.
- **Pending Tasks:** Unsubmitted attendance, pending mark entries.
- **My Leave Balance:** CL, SL, EL remaining.

### 4.4 Accountant Dashboard
- **Today's Fee Collection:** Total ₹ collected today.
- **Pending Dues:** Total outstanding fees.
- **Quick Actions:** Collect Fee, View Due Report, Add Expense.
- **Monthly Summary:** Collection vs Target chart.

### 4.5 Front Desk Dashboard
- **Today's Visitors:** Count and latest entries.
- **Pending Enquiries:** Unresolved admission enquiries.
- **Quick Actions:** New Enquiry, Issue Gate Pass, Log Visitor.
- **Postal Summary:** Dispatched and received today.

### 4.6 HR Dashboard
- **Staff on Leave Today:** Count and names.
- **Pending Leave Requests:** Count with quick approve/reject.
- **Quick Actions:** Add Employee, Mark Staff Attendance, View Attendance Report.

### 4.7 Data Requirements
```
GET /api/dashboard
Response varies by role. Each widget is a separate key for lazy loading:
{
  "stats": { "active_students": 1240, "inactive_students": 85, ... },
  "quick_actions": [...],
  "charts": { "gender_ratio": {...}, "class_distribution": {...}, ... },
  "birthdays": [...],
  "announcements": [...],
  "upcoming_events": [...]
}
Cache: Redis, 5 minutes TTL. Invalidated on relevant data changes.
```

---

## 5. FRONT DESK (`/app/front-desk`)

### 5.1 Purpose
Manage all front-office operations — enquiries, visitors, gate passes, and postal.

### 5.2 Sub-Modules

#### 5.2.1 Admission Enquiry (`/app/front-desk/admission-enquiry`)

**Add Enquiry Form:**
- Student Name*
- Date of Birth
- Gender
- Class Applying For* (dropdown of all classes)
- Father's Name*
- Mother's Name
- Contact Number* (primary)
- Alternate Number
- Email
- Current Address
- Previous School Name
- Enquiry Source* (dropdown: Walk-in, Phone Call, Website, Referral, Social Media, Advertisement, Other)
- Enquiry Date* (auto-filled with today, editable)
- Assigned To (dropdown of staff members who handle admissions)
- Notes/Remarks (textarea)
- Follow-up Date
- Status* (dropdown: New, Contacted, Follow-up Scheduled, Interested, Not Interested, Admitted, Closed)

**Enquiry List:**
- Table with columns: Enquiry #, Student Name, Class, Contact, Source, Status, Enquiry Date, Follow-up Date, Assigned To, Actions.
- Filters: By status, by class, by date range, by source.
- Search: By name or phone.
- Actions per row: View Details, Edit, Change Status, Delete, Convert to Admission (creates student record with pre-filled data).
- Export: CSV, PDF.

**Follow-up Tracking:**
- When follow-up date is today or past, show alert on dashboard.
- Admin can add follow-up notes with timestamp.
- History trail of all status changes and notes.

**Enquiry Analytics (on dashboard or within module):**
- Total enquiries this month/quarter/year.
- Conversion rate (Enquiry → Admitted).
- Source-wise breakdown (pie chart).
- Class-wise demand (which classes get most enquiries).

#### 5.2.2 Gate Pass (`/app/front-desk/gate-pass`)

**Purpose:** Issue gate passes for students leaving school premises during school hours (e.g., medical emergency, parent pickup).

**Issue Gate Pass Form:**
- Student Name* (search by name or admission number — auto-complete).
- Class & Section (auto-filled from student record).
- Reason for Leaving* (dropdown: Medical, Parent Request, Emergency, Official, Other + text field for custom reason).
- Authorized By* (dropdown of admin/teacher names or text entry).
- Out Time* (auto-filled with current time, editable).
- Expected Return (optional — for short-duration passes).
- Parent/Guardian Picking Up (name and phone).
- **Camera Capture:** Button to open device camera and take a photo of the person picking up the student. Photo stored with the gate pass record.
- Remarks.

**Gate Pass Actions:**
- **Print Feature:** Generate a printable gate pass slip containing: School logo/name, Gate pass number (auto: `GP-{DATE}-{SEQ}`), Student name, class, section, Reason, Out time, Authorized by, Photo (if captured), Barcode/QR code for verification. Print format: A5 or half-A4, suitable for thermal printers too.
- **Mark Return:** When student returns, front desk marks "Returned" with actual return time.

**Gate Pass List:**
- Table: GP#, Student Name, Class, Reason, Out Time, Return Time, Status (Out/Returned), Actions.
- Filters: Date, class, status.
- Search: By student name or GP number.

**Camera Integration:**
- Use browser's `navigator.mediaDevices.getUserMedia()` API.
- Capture photo → store as base64 or upload to R2/S3.
- Works on mobile and desktop browsers.
- Fallback: Manual photo upload if camera not available.

#### 5.2.3 Visitors (`/app/front-desk/visitors`)

**Add Visitor Form:**
- Visitor Name*
- Visitor Phone*
- Purpose of Visit* (dropdown: Meeting, Enquiry, Delivery, Official, Personal, Other)
- Whom to Meet* (search staff or enter manually)
- Visitor ID Type (Aadhaar, Driving License, Voter ID, Passport, Other)
- Visitor ID Number
- Number of Persons (default 1)
- Vehicle Number (optional)
- **Camera Capture:** Photo of visitor (same camera integration as gate pass).
- In Time* (auto-filled)
- Visitor Badge Number (if physical badges are used)

**Visitor Actions:**
- **Check-Out:** Mark visitor out with Out Time.
- **Print Visitor Pass:** Printable slip with visitor details, purpose, whom to meet, photo, in-time.

**Visitor Log List:**
- Table: V#, Name, Phone, Purpose, Meeting With, In Time, Out Time, Status, Actions.
- Filters: Date, purpose, status (In/Out).
- Daily visitor count summary.

#### 5.2.4 Postal — Dispatched & Received (`/app/front-desk/postal`)

**Two Tabs: Received | Dispatched**

**Received Postal Form:**
- Reference Number / Tracking Number
- Received From* (sender name/organization)
- Received Date* (auto today)
- Type* (dropdown: Letter, Courier, Parcel, Document, Legal Notice, Government, Other)
- Addressed To* (search staff or department)
- Description
- Attachment (upload scan/photo of envelope or document)
- Status (Pending Delivery, Delivered, Returned)

**Dispatched Postal Form:**
- Reference Number / Tracking Number
- Sent To* (recipient name/organization)
- Recipient Address
- Dispatch Date* (auto today)
- Type* (same dropdown)
- Sent By (staff member)
- Mode* (Speed Post, Registered Post, Courier, Hand Delivery, Email)
- Weight (for courier)
- Cost/Postage (₹)
- Description
- Attachment (upload receipt/proof)
- Status (Dispatched, In Transit, Delivered, Returned)

**Postal List:**
- Separate tables for Received and Dispatched.
- Columns: Ref#, From/To, Date, Type, Status, Actions.
- Filters: Date range, type, status.
- Search by reference number or name.

#### 5.2.5 Lost and Found (`/app/front-desk/lost-and-found`)

**Report Lost/Found Item Form:**
- Item Type* (dropdown: Water Bottle, Tiffin Box, Bag, Jacket/Sweater, Stationery, Book, ID Card, Electronic Device, Jewelry, Other)
- Item Description*
- Color
- Found/Lost Location* (dropdown of school areas: Playground, Classroom, Library, Cafeteria, Bus, Corridor, Other)
- Found/Lost Date*
- Reported By (student name or staff name)
- **Photo Upload:** Photo of the found item.
- Status (Found - Unclaimed, Claimed, Lost - Searching, Lost - Found, Disposed)

**Claim Process:**
- When someone claims an item, front desk marks it as "Claimed".
- Records: Claimed by (name), Claim date, Verified by (staff).

**Lost and Found List:**
- Table: Item#, Description, Type, Location, Date, Status, Photo Thumbnail, Actions.
- Filters: Status, type, date range.
- Search by description.
- Dashboard widget: "X items unclaimed for 30+ days" (prompt disposal).

---

## 6. STUDENTS (`/app/students`)

### 6.1 Sidebar Sub-Navigation
```
Students
├── Manage Students
│   ├── Active Students
│   ├── Inactive Students
│   ├── Manage Siblings
│   ├── Guardians Mapping
│   ├── Alumni
│   └── Upload Photos
├── Reports
│   ├── Student Reports
│   ├── Documents Reports
│   └── Parents / Siblings Reports
├── Certificates
│   ├── Transfer Certificate
│   ├── Character Certificate
│   ├── Bonafide Certificate
│   ├── Fees Certificate
│   └── APAAR Consent Form
├── Student ID Card
│   ├── Default ID Card
│   └── Generate ID Card
├── Standard List
└── Student Dashboard
```

### 6.2 Manage Students

#### 6.2.1 Active Students (`/app/students/active`)

**Add Student Form (Comprehensive — Indian school specific):**

**Personal Information:**
- First Name* (VARCHAR 50)
- Last Name* (VARCHAR 50)
- Date of Birth* (DATE — with age auto-calculated)
- Gender* (ENUM: Male, Female, Other)
- Blood Group (dropdown: A+, A-, B+, B-, O+, O-, AB+, AB-)
- Religion (dropdown: Hindu, Muslim, Christian, Sikh, Buddhist, Jain, Other)
- Caste / Category* (dropdown: General, OBC, SC, ST, EWS)
- Sub-Caste (text)
- Nationality* (default: Indian)
- Mother Tongue (dropdown: Hindi, English, Punjabi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Odia, Urdu, Other)
- Aadhaar Number (12-digit, validated)
- APAAR ID / ABC ID (Unique student ID as per NEP 2020)
- Profile Photo (upload, max 2MB, JPG/PNG)

**Contact Information:**
- Primary Phone* (10-digit Indian mobile, with +91)
- Secondary Phone
- Email
- Current Address* (House No, Street, Locality, City, State dropdown of all Indian states/UTs, PIN Code — 6 digit validated)
- Permanent Address (with "Same as Current" checkbox)

**Parent / Guardian Information:**
- **Father's Details:** Name*, Occupation, Qualification, Phone* (10-digit), Email, Aadhaar Number, Annual Income, Photo Upload.
- **Mother's Details:** Name*, Occupation, Qualification, Phone*, Email, Aadhaar Number, Annual Income, Photo Upload.
- **Guardian Details (if different):** Name, Relation (dropdown: Grandfather, Grandmother, Uncle, Aunt, Sibling, Other), Occupation, Phone, Email, Address.
- **Primary Contact for SMS/Notifications:** Radio button — Father / Mother / Guardian.

**Academic Information:**
- Admission Number* (auto-generated: configurable pattern, e.g., `{SCHOOL_CODE}/{YEAR}/{SEQ}` → `APS/2026/0042`). Editable by admin.
- Admission Date* (DATE)
- Admission Type* (dropdown: New, Transfer, Re-admission, RTE)
- Class* (dropdown of all active classes)
- Section* (dropdown filtered by selected class)
- Roll Number (auto-assigned or manual)
- Stream (for Class 11-12: Science, Commerce, Arts/Humanities — shown only if applicable class selected)
- House (if school has house system: e.g., Red, Blue, Green, Yellow — configurable)
- Previous School Name
- Previous School Board (CBSE, ICSE, State Board, Other)
- Previous Class Completed
- TC Number (from previous school)
- Fee Group* (dropdown: Regular, RTE, Staff Ward, Scholarship, Special — configurable)

**Medical Information:**
- Known Allergies (textarea)
- Chronic Conditions (textarea)
- Disability (dropdown: None, Visual, Hearing, Physical, Learning, Intellectual, Other)
- Disability Certificate Number (shown if disability ≠ None)
- Emergency Contact Name*
- Emergency Contact Phone*
- Emergency Relation
- Preferred Hospital
- Blood Group (auto-filled from personal info)

**Transport Information:**
- Needs Transport* (Yes/No toggle)
- If Yes: Pickup Point* (dropdown from transport routes), Route, Vehicle Number (auto-filled from route).

**Documents Upload Section:**
Multi-file upload area. Each document has: Type (dropdown), File upload, Verified checkbox (admin marks as verified).
Document Types:
- Birth Certificate
- Aadhaar Card (Student)
- Aadhaar Card (Father)
- Aadhaar Card (Mother)
- Previous School TC (Transfer Certificate)
- Previous Marksheet / Report Card
- Caste Certificate
- Income Certificate
- Passport Size Photos (at least 2)
- Medical Fitness Certificate
- Migration Certificate
- RTE Certificate
- Disability Certificate
- Address Proof
- Other

**Workflow on Submit:**
1. Validate all required fields.
2. Auto-generate admission number.
3. Create student record with status `ACTIVE`.
4. Auto-assign fee structure based on class + fee group.
5. Send welcome SMS to parent's primary phone with student details.
6. Create audit log entry.

**Active Students List View:**
- Table columns: S.No, Admission No, Student Name, Father's Name, Class, Section, Phone, Status, Actions.
- Filters: Class*, Section, Fee Group, Gender, Category, Admission Year.
- Search: By name, admission number, father's name, phone.
- Bulk actions: Export CSV, Export PDF, Print List, Bulk SMS, Bulk WhatsApp.
- Actions per row: View Profile, Edit, Deactivate, Print ID Card, Fee Details, Attendance.
- Pagination: 25, 50, 100 per page.
- Column sorting on all columns.

**Student Profile View (on clicking a student):**
Full-page profile with tabs:
- **Overview:** Photo, name, class, section, admission number, key stats (attendance %, fee status).
- **Personal:** All personal and contact info.
- **Parents:** Father, mother, guardian details.
- **Academic:** Admission details, previous school, exam results history.
- **Fees:** Fee structure, payment history, dues.
- **Attendance:** Monthly calendar view, percentage, trend.
- **Documents:** Uploaded documents with view/download.
- **Certificates:** Generated certificates list.
- **Activity Log:** All changes made to this student's record.

#### 6.2.2 Inactive Students (`/app/students/inactive`)

**Same list view as Active Students but filtered by status = `INACTIVE` / `LEFT` / `TRANSFERRED` / `SUSPENDED`.**

**Making a Student Inactive:**
- From active student's profile → Actions → Deactivate.
- Form: Reason for deactivation* (dropdown: Transfer, Left, Expelled, Passed Out, Deceased, Other), Effective Date, Remarks.
- Clearance check: System checks — any pending fees? Any library books? Flags but doesn't block.
- Status changed to appropriate value.
- Student disappears from active lists but all data retained.

**Reactivation:**
- From inactive list → Actions → Reactivate.
- Requires admin approval and reason.
- Status back to `ACTIVE`.

#### 6.2.3 Manage Siblings (`/app/students/siblings`)

**Purpose:** Link students who are siblings for shared parent data and fee discounts.

**Link Siblings:**
- Search and select Student A → Search and select Student B → Confirm as siblings.
- Parent/guardian data auto-synced (option to choose which parent record to keep as primary).
- Sibling fee discount auto-applied if configured in Fees Setup.

**Sibling List:**
- Table: Family Group ID, Students in Group (names, classes), Parent Name, Phone, Actions.
- Actions: View family, Add sibling, Remove link.

**Sibling Report:**
- Which families have multiple children in school.
- Discount amounts applied due to sibling policy.

#### 6.2.4 Guardians Mapping (`/app/students/guardians`)

**Purpose:** Map guardians to students, especially for cases where the primary guardian is not a parent.

**Mapping View:**
- List of all students with their mapped guardians.
- Filter: Students without guardian mapped, students with non-parent guardians.
- Actions: Add/Change Guardian, Set Primary Contact.

**Guardian Database:**
- Each guardian has a unique record.
- A guardian can be mapped to multiple students (e.g., uncle is guardian for 3 siblings).
- Fields: Name, Relation to student, Phone, Email, Address, Occupation, ID proof.

#### 6.2.5 Alumni (`/app/students/alumni`)

**Auto-Archive Rules:**
- Students who completed the final class (e.g., Class 12 or Class 10 depending on school) and session ended → status `ALUMNI`.
- Batch year auto-assigned.

**Alumni Directory:**
- Table: Name, Batch Year, Last Class, Last Known Phone, Last Known Email, Actions.
- Filters: Batch year range, class.
- Search: By name, phone.
- Export: CSV for bulk communications.

**Alumni Record View:**
- Basic info: Name, DOB, Batch, Photo.
- Academic summary: Classes attended, final marks.
- Parent details (as recorded).
- Contact info (may be outdated — marked as "last known").

#### 6.2.6 Upload Photos (`/app/students/upload-photos`)

**Bulk Photo Upload:**
- **Method 1 — Individual:** Select student from dropdown → upload photo → crop/resize → save.
- **Method 2 — Bulk Upload by Admission Number:** Upload a ZIP file or multiple files. File naming convention: `{ADMISSION_NUMBER}.jpg`. System matches and assigns. Report shows: matched, unmatched, duplicates.
- **Method 3 — Class-wise Upload:** Select class + section → grid of students appears → click on each to upload or use drag-and-drop.

**Photo Specifications:**
- Format: JPG, PNG.
- Max size: 2 MB.
- Recommended: Passport size, white background.
- Auto-resize to 300x400px for storage.
- Original stored separately for ID card printing.

### 6.3 Reports

#### 6.3.1 Student Reports (`/app/students/reports/student`)
**Available Reports (each has filters and export):**
- **Class-wise Student List:** Filter by class, section. Export for registers.
- **Gender-wise Report:** Class-wise gender breakdown.
- **Category-wise Report:** General/OBC/SC/ST/EWS breakdown (required for government reporting).
- **Religion-wise Report.**
- **Age-wise Report:** Students by age group.
- **Admission Date-wise Report:** Students admitted in a date range.
- **Fee Group-wise Report:** Regular, RTE, Scholarship, etc.
- **Transport-wise Report:** Students using transport, route-wise.
- **Blood Group-wise Report.**
- **New Admissions Report:** Admissions in current session.
- **Left/Transferred Report:** Students who left in a date range.
- **House-wise Report.**
- **Custom Report Builder:** Select fields to include → generate report.

#### 6.3.2 Documents Reports (`/app/students/reports/documents`)
**Purpose:** Track which documents each student has submitted and which are missing.

**Report View:**
- Table: Student Name, Admission No, Class, Birth Cert (✅/❌), Aadhaar (✅/❌), TC (✅/❌), Marksheet (✅/❌), Caste Cert (✅/❌), Photos (✅/❌), ... each document type is a column.
- Filters: Class, section, specific missing document.
- **Missing Documents Report:** "Which students are missing Aadhaar card?" → filtered list.
- **Completion Percentage:** Per student and per class.
- Export: CSV, PDF.

#### 6.3.3 Parents / Siblings Reports (`/app/students/reports/parents`)
- **Parents Contact List:** Father's name, phone, email. Mother's name, phone, email. Class-wise or section-wise.
- **Parents Without Phone/Email:** Flag for follow-up.
- **Siblings Report:** Families with multiple children, their classes, fee status.
- Export: CSV for WhatsApp/SMS campaigns.

### 6.4 Certificates

**Design:** All certificate types displayed as **card format** in a grid layout. Each card shows: Certificate icon, Title, Description, "Generate" button. Clicking opens the generation form.

#### 6.4.1 Transfer Certificate (TC) (`/app/students/certificates/tc`)

**Generation Form:**
- Select Student* (search by name/admission number — typically from inactive students).
- TC Serial Number* (auto-generated: `TC/{YEAR}/{SEQ}`, editable).
- Date of Issue* (default today).
- Date of Leaving*
- Class at Time of Leaving*
- Reason for Leaving* (dropdown: Transfer, Parent's Request, Completed Final Class, Expulsion, Other)
- Last Exam Appeared (dropdown of exams)
- Result of Last Exam (Passed / Failed / Did Not Appear)
- Qualified for Promotion to Class (next class or same)
- Subjects Studied (auto-filled from class subjects, editable)
- Total Working Days
- Total Days Present
- Whether student was NCC/Scout/Guide
- Games/Sports Participated
- General Conduct* (dropdown: Excellent, Very Good, Good, Satisfactory, Needs Improvement)
- Date of Birth in Words (auto-generated from DOB)
- Whether SC/ST/OBC
- Whether fee concession availed (RTE, scholarship, etc.)
- Remarks

**TC Template:**
- Pre-designed template matching CBSE/State Board format.
- School letterhead auto-included (logo, name, address, affiliation number, UDISE code).
- Principal's signature placeholder.
- TC number and book number.
- **Output:** PDF download, direct print (A4 size).
- **Duplicate TC:** Option to generate duplicate TC with "DUPLICATE" watermark and new serial number.

#### 6.4.2 Character Certificate (`/app/students/certificates/character`)

**Generation Form:**
- Select Student*
- Certificate Number (auto-generated)
- Date of Issue*
- Character Assessment* (dropdown: Excellent, Very Good, Good, Satisfactory)
- Period (From date - To date)
- Special Remarks
- Purpose (dropdown: Higher Studies, Employment, General, Other)

**Template:** Formal certificate on school letterhead. States that the student was of good character during their time at the school. PDF/Print output.

#### 6.4.3 Bonafide Certificate (`/app/students/certificates/bonafide`)

**Generation Form:**
- Select Student* (from active students)
- Certificate Number (auto)
- Date of Issue*
- Purpose* (dropdown: Bank Account, Passport, Visa, Scholarship, Domicile, Railway Concession, Other)
- Additional Text (optional — custom line to add)

**Template:** Certifies that the student is a bonafide student of the school studying in Class X, Section Y during the academic session. Includes DOB, father's name, address. PDF/Print.

#### 6.4.4 Fees Certificate (`/app/students/certificates/fees`)

**Generation Form:**
- Select Student*
- Certificate Number (auto)
- Date of Issue*
- Period* (From month/year — To month/year)
- Total Fee Paid (auto-calculated from fee records for the period)
- Breakdown (optional — show fee category wise)
- Purpose (Income Tax, Scholarship, Reimbursement, Other)

**Template:** States the total fee paid by the student for the specified period. Itemized if requested. Useful for parent's income tax claims. PDF/Print.

#### 6.4.5 APAAR Consent Form (`/app/students/certificates/apaar`)

**Purpose:** Generate the APAAR (Automated Permanent Academic Account Registry) consent form as per Government of India / NEP 2020 guidelines.

**Generation Form:**
- Select Student(s)* (bulk selection possible — for class-wise generation)
- Auto-populated fields from student record: Student name, DOB, Gender, Aadhaar number, Parent/Guardian name, Class, School name, UDISE code.
- Consent text (pre-filled as per government template, not editable).

**Template:** Government-prescribed format. Option to generate in bulk (all students of a class) as a combined PDF or individual PDFs in a ZIP. PDF/Print.

### 6.5 Student ID Card

#### 6.5.1 Default ID Card (`/app/students/id-card/default`)
**Template Selection:**
- Multiple pre-designed ID card templates (at least 3 designs).
- Each template shows: School logo, School name, Student photo, Name, Class, Section, Roll No, Admission No, DOB, Blood Group, Father's Name, Address, Phone, Transport route (if applicable), Barcode/QR code (encodes admission number).
- **Back Side:** School address, emergency contact, principal's signature, terms/rules, validity year.

**Design Customization:**
- Choose template → customize: change colors, rearrange fields, add/remove fields, upload school logo, set background image.
- Save as school's default template.

#### 6.5.2 Generate ID Card (`/app/students/id-card/generate`)
**Generation Options:**
- **Single:** Select student → preview ID card → download/print.
- **Bulk by Class:** Select class + section → generate for all students. Output as PDF (multiple cards per page, e.g., 4 per A4 sheet, or 1 per card-size cutout).
- **Bulk by Selection:** Checkbox select specific students → generate.
- **Re-generate:** For students with updated photos or info.

**Output:**
- PDF download (high resolution, print-ready).
- Print directly (configured for standard ID card printers or A4 with cut marks).
- Card size: Standard CR80 (85.6mm × 54mm) or custom.

### 6.6 Standard List (`/app/students/standard-list`)

**Purpose:** Manage the school's class-section-stream structure.

**Two-Panel Layout: Add Form (Left) | List (Right)**

**Add Section Form:**
- Class/Standard* (dropdown of existing classes, or "Add New Class" option)
- Section Name* (A, B, C, etc.)
- Stream (dropdown: N/A, Science, Commerce, Arts — for higher classes)
- Maximum Capacity*
- Class Teacher (dropdown of teachers)

**Add Class Form (if adding new):**
- Class Name* (e.g., "Nursery", "LKG", "UKG", "Class 1" through "Class 12")
- Numeric Order* (for sorting — Nursery=0, LKG=1, UKG=2, Class 1=3, ... Class 12=14)
- Board (CBSE, ICSE, State — if school has multiple boards)
- Is Active (toggle)

**Standard List (Right Panel):**
- Table: Class Name, Section, Stream, Capacity, Current Strength, Class Teacher, Actions.
- Grouped by class (collapsible sections).
- Actions: Edit, Delete (only if no students assigned), View Students.
- Summary row per class: total sections, total students.

### 6.7 Student Dashboard (`/app/students/dashboard`)

**Full analytics page with charts and graphs:**

- **Total Strength Overview:** Large number + pie chart (boys vs girls).
- **Class-wise Distribution:** Horizontal bar chart showing student count per class.
- **Section-wise Heatmap:** Grid showing class × section with student count, color-coded by fullness (green = capacity available, yellow = nearly full, red = overcrowded).
- **Category-wise Distribution:** Pie chart — General, OBC, SC, ST, EWS.
- **Religion-wise Distribution:** Pie chart.
- **Admission Trend:** Line chart showing month-wise admissions over current year.
- **Fee Group Distribution:** Donut chart — Regular, RTE, Scholarship, Staff Ward.
- **Transport Utilization:** X students using transport / total students.
- **Age Distribution:** Histogram of student ages.
- **Year-over-Year Comparison:** Bar chart — total students this year vs last year per class.
- **Disability Statistics:** Count by disability type (for government reporting).

All charts should be interactive (hover for details, click to drill down).

---

## 7. HUMAN RESOURCE (`/app/hr`)

### 7.1 Sidebar Sub-Navigation
```
Human Resource
├── Manage Employees
├── Assign Teachers
│   ├── Assign Subject Teacher
│   └── Assign Class Teacher
├── Staff ID Card
│   ├── Default ID Card
│   └── Generate ID Card
└── HR Dashboard
```

### 7.2 Manage Employees (`/app/hr/employees`)

**Add Employee Form:**

**Personal Information:**
- First Name*, Last Name*, DOB*, Gender*, Blood Group, Marital Status, Spouse Name, Religion, Category (General/OBC/SC/ST/EWS), Nationality (default Indian), Mother Tongue, Profile Photo Upload.

**Contact Information:**
- Phone* (10-digit Indian mobile), Alternate Phone, Personal Email, Current Address* (full Indian address with state/PIN), Permanent Address.

**Professional Information:**
- Employee ID* (auto: `EMP/{YEAR}/{SEQ}`, editable)
- Designation* (dropdown: Principal, Vice Principal, PGT, TGT, PRT, NTT, Lab Assistant, Librarian, Accountant, Clerk, Peon, Driver, Guard, Other — configurable)
- Department* (dropdown: Academic, Administration, Accounts, Library, Transport, Maintenance, IT, Other)
- Date of Joining*
- Employment Type* (Full-time, Part-time, Contract, Temporary, Probation)
- Probation Period End Date (if applicable)
- Reporting To (dropdown of other employees)
- Role in ERP* (dropdown: Admin, Teacher, Accountant, Front Desk, HR Manager — determines ERP access)

**Qualification Information:**
Multiple entries allowed (add more button):
- Degree* (dropdown: 10th, 12th, Diploma, B.A., B.Sc., B.Com., B.Ed., M.A., M.Sc., M.Ed., M.Phil., Ph.D., D.El.Ed., B.Tech., MBA, Other)
- University/Board*
- Year of Passing*
- Percentage/CGPA
- Certificate Upload

**Experience (Previous):**
Multiple entries:
- Organization Name, Designation, From Date, To Date, Reason for Leaving, Experience Letter Upload.

**Identification:**
- Aadhaar Number* (12-digit validated)
- PAN Number* (format validated: `ABCDE1234F`)
- UAN (Universal Account Number for PF)
- Voter ID Number
- Passport Number, Passport Expiry Date
- Driving License Number

**Bank & Salary Information:**
- Bank Name*
- Branch*
- Account Number*
- IFSC Code* (11-character validated)
- Account Type (Savings/Current)
- Basic Salary* (₹)
- HRA (₹)
- DA (₹)
- TA (₹)
- Special Allowance (₹)
- Medical Allowance (₹)
- PF Deduction (₹ or % of basic)
- Professional Tax (₹)
- TDS (₹ or % — auto-calculate based on slab is enhancement)
- ESI (if applicable)
- Gross Salary (auto-calculated)
- Net Salary (auto-calculated)

**Documents Upload:**
- Resume/CV
- ID Proof
- Address Proof
- PAN Card
- Qualification Certificates (multiple)
- Experience Letters (multiple)
- Medical Fitness Certificate
- Police Verification Certificate
- Photo (separate from profile photo — formal)
- Other

**Leave Policy Assignment:**
- Leave policy template* (dropdown — configured in HR settings)
- Or manual allocation: CL, SL, EL, etc.

**Employee List View:**
- Table: S.No, Emp ID, Name, Designation, Department, Phone, Date of Joining, Status, Actions.
- Filters: Department, Designation, Employment Type, Status (Active/Resigned/Terminated).
- Search: By name, emp ID, phone.
- Actions: View Profile, Edit, Deactivate, Print ID Card, Salary Details, Attendance.
- Export: CSV, PDF.

**Employee Profile View:**
Tabbed layout similar to student profile:
- Overview, Personal, Professional, Qualification, Documents, Salary, Attendance, Leave, Activity Log.

### 7.3 Assign Teachers

#### 7.3.1 Assign Subject Teacher (`/app/hr/assign-subject-teacher`)

**Two-Panel Layout:**

**Assignment Form (Left):**
- Select Class* (dropdown)
- Select Section* (filtered by class)
- Select Subject* (filtered by class-subject mapping)
- Select Teacher* (dropdown of teachers with their designation — filtered to show available teachers)
- Academic Session* (current session pre-selected)

**Assignment Matrix View (Right):**
- Grid/table: Rows = Subjects, Columns = Sections of selected class.
- Each cell shows assigned teacher's name.
- Empty cells highlighted in yellow (unassigned).
- Click on cell to assign/change teacher.

**Constraints & Warnings:**
- Warn if teacher already has >30 periods/week (configurable limit).
- Warn if subject in this section already has a teacher assigned.
- Allow override with confirmation.

**Bulk Assignment:**
- Upload CSV: Class, Section, Subject Code, Employee ID.
- Validate and assign.

#### 7.3.2 Assign Class Teacher (`/app/hr/assign-class-teacher`)

**Assignment View:**
- Table: Class, Section, Current Class Teacher, Action.
- All class-sections listed.
- Action: dropdown to select/change teacher.
- One teacher can be class teacher of only one section (system warns if already assigned elsewhere).
- Class teacher is also listed on the class-section master.

### 7.4 Staff ID Card

#### 7.4.1 Default ID Card (`/app/hr/id-card/default`)
- Template selection and customization (same concept as student ID card).
- Fields: School logo, School name, Employee photo, Name, Designation, Department, Employee ID, DOB, Blood Group, Phone, Address, Emergency Contact, Barcode/QR.
- Back side: School address, validity, principal's signature.

#### 7.4.2 Generate ID Card (`/app/hr/id-card/generate`)
- **Single:** Select employee → preview → download/print.
- **Bulk:** Select department or designation → generate for all.
- **Format:** PDF, print-ready, standard card size.

### 7.5 HR Dashboard (`/app/hr/dashboard`)

**Widgets and Charts:**
- **Total Employees:** Card with count. Breakdown: Teaching vs Non-teaching.
- **Department-wise Distribution:** Bar chart.
- **Designation-wise Distribution:** Pie/donut chart.
- **Gender Ratio:** Pie chart.
- **New Joinings This Month/Year:** Card.
- **Resignations This Year:** Card with trend.
- **Staff Attendance Today:** Percentage + count (Present/Absent/On Leave).
- **Upcoming Leave:** Staff on leave today and this week.
- **Pending Leave Requests:** Count with quick action.
- **Experience Distribution:** How many staff with <1yr, 1-3yr, 3-5yr, 5-10yr, 10+yr.
- **Salary Overview:** Total monthly payroll cost, department-wise breakdown.
- **Birthdays This Month:** List.
- **Probation Ending Soon:** Staff whose probation ends within 30 days.
- **Contract Expiring Soon:** Contract staff whose tenure ends within 60 days.

---

## 8. ATTENDANCE (`/app/attendance`)

### 8.1 Sidebar Sub-Navigation
```
Attendance
├── Student Attendance
├── Employee Attendance
│   └── Biometric Integration
└── Attendance Dashboard
```

### 8.2 Student Attendance (`/app/attendance/student`)

**Mark Attendance View:**
- **Step 1:** Select Class* → Section* → Date* (default today).
- **Step 2:** Student list loads with columns: S.No, Roll No, Student Name, Father's Name, Status (radio buttons: Present / Absent / Late / Half-Day / Excused).
- **Default:** All marked as "Present". Teacher/Admin only changes exceptions.
- **Bulk Actions:** "Mark All Present" button, "Mark All Absent" button.
- **Submit:** Saves attendance. Shows confirmation count: "25 Present, 2 Absent, 1 Late".
- **Lock:** Once submitted, locked for that class-section-date. Only admin can edit.
- **Holiday Check:** If date is marked as holiday in school calendar, system warns "This is a holiday. Are you sure?"

**Edit Attendance (Admin Only):**
- Select class, section, date → load marked attendance → edit → save with reason for change → audit logged.

**View Attendance:**
- **Daily View:** Select date → see all classes' attendance status. Green (marked), Red (not marked).
- **Student-wise View:** Select student → calendar heatmap showing P/A/L/H for each day of the month. Monthly summary below.
- **Class-wise Monthly Report:** Grid: Students (rows) × Days (columns). Each cell shows P/A/L/H. Bottom row: daily totals. Right column: student's monthly total and percentage.

**Notifications:**
- Auto SMS/Push to parent when student marked Absent: "Dear Parent, your child {Name} (Class {X}, Section {Y}) was absent on {Date}. — {School Name}".
- Configurable: Send immediately on marking or at end of school day (batch send).
- Threshold alert: If student's monthly attendance drops below 75% (configurable), alert sent to parent and admin.

**Attendance for Teacher (Role-specific):**
- Teacher sees only their assigned classes/sections.
- Can only mark attendance for current date (configurable: allow marking for previous day until next day 10 AM).
- Cannot edit after submission — must request admin.

### 8.3 Employee Attendance (`/app/attendance/employee`)

**Manual Marking (by HR/Admin):**
- Same interface as student attendance but for employees.
- Select Date → Employee list → Mark: Present / Absent / Half-Day / On Leave / On Duty / WFH (Work From Home, if applicable).
- Leave auto-marked if approved leave exists for the date.

**Biometric Machine Integration:**
- **How it works:** Biometric device (fingerprint/face) records punch-in and punch-out times locally. Device pushes data to a server/API endpoint (usually via the device's own software like eSSL, ZKTeco, etc.).
- **ERP Integration:**
  - API endpoint: `POST /api/attendance/biometric-sync`
  - Accepts data in device's format or standardized format:
    ```json
    {
      "employee_id": "EMP/2026/0012",
      "punch_time": "2026-03-04T08:55:00",
      "punch_type": "IN", // or "OUT"
      "device_id": "BIO-GATE-01"
    }
    ```
  - System processes: First punch = IN, Last punch = OUT. Calculates total hours.
  - Attendance status derived: If IN time before cutoff → Present. If after cutoff → Late. If no punch → Absent (unless on approved leave).
  - Configurable: School start time (e.g., 7:45 AM), Grace period (e.g., 15 min), Half-day cutoff (e.g., IN after 10:00 AM).

- **Biometric Attendance Report:**
  - Table: Employee Name, Emp ID, Date, Punch-In Time, Punch-Out Time, Total Hours, Status, Late By (minutes).
  - Filters: Date range, department, late arrivals only.
  - Monthly summary: Working days, present, absent, late count, leave, total hours.

**Leave Management (within HR/Attendance):**
- **Leave Types (Indian standard):**
  - Casual Leave (CL): 12/year
  - Sick Leave (SL): 10/year (may require medical certificate if >2 consecutive days)
  - Earned Leave (EL): 15/year (encashable)
  - Maternity Leave: 180 days (as per Indian law)
  - Paternity Leave: 15 days
  - Child Care Leave: 730 days (for female govt employees — if applicable)
  - Compensatory Off
  - Special Leave (for exams, etc.)
  - Loss of Pay (LOP) / Leave Without Pay (LWP)

- **Leave Request Workflow:**
  1. Employee submits: Leave type, From date, To date, Half/Full day, Reason, Medical certificate upload (if SL).
  2. Goes to Reporting Manager / Admin for approval.
  3. Approved → deducted from balance → reflected in attendance. Rejected → employee notified with reason.
  4. If balance insufficient → auto-flagged as LWP unless admin overrides.

- **Leave Dashboard (within HR or Attendance):**
  - My leave balance, history, pending requests.
  - Admin view: all pending, calendar showing who's on leave.

### 8.4 Attendance Dashboard (`/app/attendance/dashboard`)

**Charts and Widgets:**
- **Today's Student Attendance:** Big percentage number + donut chart (Present vs Absent).
- **Class-wise Today:** Bar chart showing attendance % per class. Lowest highlighted.
- **Today's Staff Attendance:** Similar widget for employees.
- **Monthly Trend:** Line chart showing daily attendance % over the month.
- **Absentee Hotspots:** Which students have been absent >5 days this month (table).
- **Class Attendance Comparison:** Compare attendance across classes over time.
- **Unmarked Classes:** List of class-sections where attendance not yet marked today (urgent — highlighted red).
- **Late Arrivals (Staff):** Today's late staff with punch-in time.
- **Leave Summary:** Pie chart of leave types used this month.

---

## 9. COMMUNICATION (`/app/communication`)

### 9.1 Sidebar Sub-Navigation
```
Communication
├── Bulk Messages
│   ├── SMS Templates
│   └── Delivery Report
└── WhatsApp Message API
```

### 9.2 Bulk Messages (`/app/communication/bulk-messages`)

**Send Bulk SMS:**

**Step 1 — Select Recipients:**
- **By Class:** Select class(es) + section(s) → all parent phone numbers.
- **By Group:** All parents, All staff, Class 10 parents, Transport users, Fee defaulters, etc.
- **Custom Selection:** Checkbox list of individuals.
- **Upload Numbers:** Paste or upload CSV of phone numbers.
- Recipient count shown: "Sending to 245 numbers".

**Step 2 — Compose Message:**
- Select from SMS Templates (dropdown) or compose new.
- Template variables: `{student_name}`, `{father_name}`, `{class}`, `{section}`, `{admission_no}`, `{due_amount}`, `{school_name}`, `{date}`.
- Character count and SMS segment count shown (160 chars = 1 SMS, 320 = 2 SMS, etc.).
- Preview: Show how the message will look with sample data.
- **Language:** Option to type in Hindi (transliteration support) or English.

**Step 3 — Send:**
- Send Now or Schedule for later (date + time picker).
- Confirmation dialog: "Send X messages? Cost: ₹Y" (if SMS provider charges apply).
- Submit → messages queued and sent via SMS gateway (MSG91, Textlocal, or similar Indian SMS provider).

**SMS API Integration:**
```
Provider: MSG91 / Textlocal / other Indian SMS gateway
API: REST API
DLT Registration: Required for Indian SMS (TRAI regulation)
- Sender ID registered (e.g., "SCHOOL")
- Templates registered with DLT portal (BSNL/Jio/Airtel/Vodafone)
- Template ID passed with each SMS
```

#### 9.2.1 SMS Templates (`/app/communication/sms-templates`)

**Add Template Form:**
- Template Name*
- Category* (dropdown: Attendance, Fee Reminder, Exam, General, Emergency, Event, Holiday, Result)
- Template Body* (with variable placeholders)
- DLT Template ID* (required for Indian SMS compliance)
- Language (English / Hindi / Bilingual)
- Is Active (toggle)

**Pre-configured Templates (created during setup):**
```
1. Absence Alert:
   "Dear Parent, your ward {student_name} of Class {class}-{section} was absent on {date}. Please ensure regular attendance. - {school_name}"

2. Fee Reminder:
   "Dear Parent, fee of ₹{due_amount} for {student_name} (Class {class}) is due. Please pay by {due_date} to avoid late fine. - {school_name}"

3. Exam Notification:
   "Dear Parent, {exam_name} for Class {class} will begin from {start_date}. Please ensure your ward prepares well. - {school_name}"

4. Holiday Notice:
   "Dear Parent, school will remain closed on {date} on account of {reason}. - {school_name}"

5. Result Announcement:
   "Dear Parent, results for {exam_name} have been declared. {student_name} scored {percentage}%. - {school_name}"

6. General Notice:
   "Dear Parent, {message}. - {school_name}"

7. Fee Payment Confirmation:
   "Dear Parent, ₹{amount} received towards fees for {student_name}. Receipt No: {receipt_no}. Balance: ₹{balance}. - {school_name}"

8. Emergency:
   "URGENT: {message}. Please contact school immediately. - {school_name}, Ph: {school_phone}"
```

**Template List:**
- Table: Name, Category, Body (truncated), DLT ID, Status, Actions (Edit, Delete, Preview).

#### 9.2.2 Delivery Report (`/app/communication/delivery-report`)

**Report View:**
- Table: Message ID, Sent To (phone), Recipient Name, Template Used, Sent At, Status (Delivered / Failed / Pending / Rejected), Delivery Time.
- Filters: Date range, status, template category.
- Summary: Total sent, Delivered, Failed, Pending with percentages.
- Export: CSV.
- Resend failed: Button to retry failed messages.

### 9.3 WhatsApp Message API (`/app/communication/whatsapp`)

**Integration with WhatsApp Business API:**
- Provider: Interakt, WATI, Gupshup, Twilio for WhatsApp, or official Meta Business API.
- Requires WhatsApp Business Account + verified phone number.
- Template messages must be pre-approved by Meta.

**Send WhatsApp Message:**
- Same recipient selection as SMS (by class, group, custom).
- Select WhatsApp template (pre-approved) or compose session message (if within 24hr window).
- Variables filled same as SMS.
- Media support: Attach PDF (fee receipt, report card), Image, Video.
- Send Now or Schedule.

**WhatsApp Template Management:**
- Sync templates from WhatsApp Business provider.
- View approval status.
- Template variables mapping.

**WhatsApp Delivery Report:**
- Same structure as SMS delivery report.
- Additional statuses: Sent, Delivered, Read (blue ticks).

**Use Cases for WhatsApp in School:**
- Fee receipts sent as PDF attachment.
- Report cards sent as PDF.
- Event invitations with images.
- Daily homework/notices.
- Absence alerts (richer than SMS).
- Emergency broadcasts.

---

## 10. EXAMINATION (`/app/examination`)

### 10.1 Sidebar Sub-Navigation
```
Examination
├── Exam Settings
│   ├── 1. Exam Area
│   ├── 2. Subject Group
│   ├── 3. Subject
│   ├── 4. Term
│   ├── 5. Exam Type
│   ├── 6. Marks & Grade Mapping
│   ├── 7. Class & Template Mapping
│   ├── 8. Subject Maximum Marks Setting
│   ├── 9. Exam Datesheet Classwise
│   ├── 10. Remark Setting
│   ├── 11. Exam Datesheet for All Classes
│   └── 12. Report Card 360
├── Report Card Entries
└── Exam Dashboard
```

### 10.2 Exam Settings (`/app/examination/settings`)

**Layout:** Card grid (as shown in your screenshot). Each card numbered, with title and examples. Clicking opens the configuration page.

#### 10.2.1 Card 1 — Exam Area
**Purpose:** Define broad assessment areas.
**Examples:** Scholastic, Co-Scholastic, Discipline.

**Add Form:**
- Area Name* (e.g., "Scholastic")
- Description
- Display Order* (1, 2, 3 — controls order on report card)
- Is Active (toggle)

**List:** Table with Name, Order, Status, Actions (Edit, Delete).

**Usage:** On the report card, marks/grades are grouped by exam area. Scholastic shows subjects with marks. Co-Scholastic shows activities with grades. Discipline shows behavior/attendance.

#### 10.2.2 Card 2 — Subject Group
**Purpose:** Group subjects for report card sections and stream management.
**Examples:** Science Subjects Group, Language Group, Co-Scholastic Activities.

**Add Form:**
- Group Name*
- Exam Area* (dropdown from Card 1 — links this group to an area)
- Description
- Display Order*

**List:** Table with Name, Exam Area, Order, Actions.

**Usage:** Subjects are assigned to groups. Groups are displayed under their exam area on the report card.

#### 10.2.3 Card 3 — Subject
**Purpose:** Master list of all subjects.
**Examples:** Hindi, English, Mathematics, Science, Social Science, Art Education, Physical Education, Computer Science.

**Add Form:**
- Subject Name*
- Subject Code* (e.g., "ENG", "MATH-10")
- Subject Group* (dropdown from Card 2)
- Type* (dropdown: Theory, Practical, Theory+Practical, Activity, Project)
- Is Elective (checkbox)
- Display Order*
- Is Active (toggle)

**List:** Table with Name, Code, Group, Type, Elective, Order, Status, Actions.

**Note:** This is the master subject list for exams. The academic subject management (Module 5 in previous doc) feeds into this, but exam subjects may have additional exam-specific configurations.

#### 10.2.4 Card 4 — Term
**Purpose:** Define academic terms/semesters.
**Examples:** Term I, Term II, Annual.

**Add Form:**
- Term Name* (e.g., "Term I")
- Start Date*
- End Date*
- Display Order*
- Is Active (toggle)
- Academic Session* (dropdown)

**List:** Table with Name, Date Range, Session, Status, Actions.

#### 10.2.5 Card 5 — Exam Type
**Purpose:** Types of exams conducted within a term.
**Examples:** Periodic Test, Note Book Submission, Half Yearly, Annual, Subject Enrichment, Portfolio, Lab Practical.

**Add Form:**
- Exam Type Name*
- Term* (dropdown from Card 4)
- Weightage (%)* — how much this exam type contributes to the final grade. E.g., Periodic Test = 10%, Half Yearly = 40%, Notebook = 5%.
- Maximum Marks (default — can be overridden per subject)
- Display Order*
- Is Active (toggle)
- Is Grade-based (toggle — if yes, teacher enters grades not marks)

**List:** Table with Name, Term, Weightage, Max Marks, Grade-based, Order, Status, Actions.

**CBSE-Specific Example (for one term):**
```
Term I:
  Periodic Test 1 — 10% — 20 marks
  Periodic Test 2 — 10% — 20 marks
  Half Yearly — 40% — 80 marks
  Notebook Submission — 5% — Grade
  Subject Enrichment — 5% — Grade

Term II:
  Periodic Test 3 — 10% — 20 marks
  Periodic Test 4 — 10% — 20 marks
  Annual Exam — 40% — 80 marks
  Notebook Submission — 5% — Grade
  Subject Enrichment — 5% — Grade
```

#### 10.2.6 Card 6 — Marks & Grade Mapping
**Purpose:** Define the grading scale.
**Examples:** A1 (91-100%), A2 (81-90%), B1 (71-80%), etc.

**Add Form:**
- Grade Name* (e.g., "A1")
- Grade Point* (e.g., 10)
- Marks From (%)* (e.g., 91)
- Marks To (%)* (e.g., 100)
- Description (e.g., "Outstanding")
- Is Pass (toggle — marks if this grade means passed)
- Display Order*

**Pre-configured CBSE 9-Point Scale:**
```
A1 — 91-100 — 10 — Outstanding
A2 — 81-90  — 9  — Excellent
B1 — 71-80  — 8  — Very Good
B2 — 61-70  — 7  — Good
C1 — 51-60  — 6  — Above Average
C2 — 41-50  — 5  — Average
D  — 33-40  — 4  — Below Average
E1 — 21-32  — 0  — Needs Improvement (Fail)
E2 — 0-20   — 0  — Poor (Fail)
```

**For Co-Scholastic (Grade-based):**
```
A — Excellent
B — Very Good
C — Good
D — Needs Improvement
```

**List:** Table with Grade, Points, Range, Pass/Fail, Actions.

#### 10.2.7 Card 7 — Class & Template Mapping
**Purpose:** Assign which report card template is used for which class.

**Why:** Different classes may have different report card formats. E.g., Nursery-UKG has a different format (activity-based, no marks) vs Class 1-5 (marks-based) vs Class 9-10 (CBSE pattern with grade points).

**Mapping Form:**
- Select Class* (dropdown)
- Select Report Card Template* (dropdown of templates defined in Card 12 — Report Card 360)
- Applicable Terms (multi-select)

**List:** Table with Class, Template Name, Terms, Actions.

#### 10.2.8 Card 8 — Subject Maximum Marks Setting
**Purpose:** Set maximum marks for each subject in each exam type for each class.

**Form:**
- Select Class* → Select Exam Type* (dropdown from Card 5)
- Table loads: Rows = Subjects (from class-subject mapping), Columns = Max Marks (Theory), Max Marks (Practical), Max Marks (Internal), Total Max Marks, Pass Marks.
- Admin fills in for each subject.
- Save all.

**Example:**
```
Class 10, Half Yearly Exam:
  English — Theory: 80, Internal: 20, Total: 100, Pass: 33
  Mathematics — Theory: 80, Internal: 20, Total: 100, Pass: 33
  Science — Theory: 60, Practical: 20, Internal: 20, Total: 100, Pass: 33
  Hindi — Theory: 80, Internal: 20, Total: 100, Pass: 33
```

**List:** Saved configurations viewable by class + exam type.

#### 10.2.9 Card 9 — Exam Datesheet Classwise
**Purpose:** Create exam schedule for a specific class.

**Form:**
- Select Class*
- Select Term*
- Select Exam Type*
- Table: Rows = Subjects. Columns = Exam Date*, Start Time, End Time, Room/Hall.
- Fill in dates for each subject.
- Save.

**Output:**
- Datesheet viewable and printable per class.
- Auto-notifies parents via SMS/WhatsApp when datesheet is published.

#### 10.2.10 Card 10 — Remark Setting
**Purpose:** Pre-define teacher remarks for report cards.

**Add Form:**
- Remark Text* (e.g., "Excellent performance. Keep it up!", "Needs to improve in Mathematics.", "Regular attendance required.")
- Category (dropdown: Academic, Behavior, Attendance, General)
- For Grade Range (optional — auto-suggest this remark for students in this grade range)

**List:** Table with Remark, Category, Actions.

**Usage:** When entering report card data, teacher can select from pre-defined remarks or type custom remark per student.

#### 10.2.11 Card 11 — Exam Datesheet for All Classes
**Purpose:** Combined view of exam schedules across all classes.

**View:**
- Calendar or table view showing: Date (rows) × Classes (columns).
- Each cell shows which subjects have exams that day.
- Useful for admin to ensure no scheduling conflicts (e.g., same day for too many classes when shared teachers are needed for invigilation).
- Print: Full datesheet for notice board.

#### 10.2.12 Card 12 — Report Card 360
**Purpose:** Design and configure report card templates.

**Template Designer:**
- **Header Section:** School logo, School name, Affiliation number, UDISE code, Session year, "Report Card" / "Academic Report" title. Configurable layout.
- **Student Info Section:** Name, Class, Section, Roll No, Admission No, DOB, Father's Name, Mother's Name, Address. Select which fields to show.
- **Exam Area Sections (Scholastic):** Table layout: Subject names (rows) × Exam types (columns: PT1 marks, PT2 marks, Half Yearly, Notebook, SE, Total, Grade). Auto-populated from marks entered.
- **Co-Scholastic Section:** Activities with grade columns.
- **Discipline Section:** Attendance details (working days, present days, percentage). Behavior grade.
- **Remarks Section:** Class teacher remarks, Principal remarks. Selected from remark bank or custom.
- **Result Section:** Total marks, Percentage, Grade, CGPA, Rank, Result (Pass/Fail/Promoted).
- **Signature Section:** Class Teacher, Examiner, Principal, Parent.
- **Footer:** Date of issue, next term start date.

**Multiple Templates:**
- Create different templates for different class groups (e.g., Pre-primary, Primary, Secondary, Senior Secondary).
- Map to classes via Card 7.
- Preview with sample data before publishing.
- Export as PDF (per student or bulk for a class).

### 10.3 Report Card Entries (`/app/examination/entries`)

**Purpose:** Teachers and admin enter student marks/grades.

**Entry Form:**
- Select Class* → Section* → Subject* → Term* → Exam Type*
- Table loads: Rows = Students (roll number order). Columns depend on exam type configuration.
  - For marks-based: Theory Marks, Practical Marks, Internal Marks, Total (auto), Grade (auto from mapping).
  - For grade-based: Grade (dropdown A/B/C/D).
- Teacher enters marks for each student.
- Validation: Marks cannot exceed max marks. Negative marks not allowed. All students must have entries (blank = absent, marked separately).
- Save as Draft (can edit later) or Submit (locked for teacher, admin can still edit).
- **Absent Handling:** Checkbox "Absent" per student → marks show as "AB" on report card.

**Bulk Entry:**
- Copy-paste from Excel/Google Sheets.
- Upload CSV with columns: Roll No, Theory Marks, Practical Marks, Internal Marks.

**Entry Status View (Admin):**
- Matrix: Rows = Class-Sections, Columns = Subjects. Cell = Entry Status (Not Started / Draft / Submitted).
- Percentage completion shown. Deadline tracking.

### 10.4 Exam Dashboard (`/app/examination/dashboard`)

**Widgets and Charts:**
- **Ongoing/Upcoming Exams:** List of active exam schedules.
- **Mark Entry Progress:** Donut chart — Completed vs Pending entries.
- **Class-wise Results Summary:** After results computed — pass/fail percentage per class.
- **Subject-wise Performance:** Average marks per subject across classes.
- **Grade Distribution:** Bar chart showing how many students got A1, A2, B1, etc.
- **Toppers List:** Top 3-5 students per class by percentage.
- **Comparison:** This term vs last term performance trend.
- **At-Risk Students:** Students who failed in >2 subjects.

---

## 11. ACCOUNTS (`/app/accounts`)

### 11.1 Sidebar Sub-Navigation
```
Accounts
├── Income Report
├── Expense
│   ├── Manage Expense
│   ├── Vendor Bill
│   └── Expense Dashboard
└── Accounts Dashboard
```

### 11.2 Income Report (`/app/accounts/income`)

**Purpose:** View all income streams of the school.

**Income Sources:**
- Fee Collection (primary — auto-populated from Fees module)
- Transport Fees (if separate)
- Admission Fees
- Exam Fees
- Event Income (fairs, functions)
- Canteen Income
- Uniform/Book Sale
- Donations
- Government Grants (RTE reimbursement, mid-day meal, etc.)
- Rental Income
- Other Income

**Add Income Entry (Non-Fee):**
- Date*
- Income Category* (dropdown of above)
- Amount (₹)*
- Payment Mode* (Cash, Bank Transfer, Cheque, Online)
- Received From
- Description
- Receipt Number
- Attachment (upload receipt/proof)

**Income Report View:**
- Table: Date, Category, Description, Amount, Payment Mode, Receipt No, Actions.
- Filters: Date range, category, payment mode.
- **Summary Cards:** Total income this month, this quarter, this year.
- **Category-wise Breakdown:** Pie chart.
- **Monthly Income Trend:** Bar chart.
- Export: CSV, PDF.

### 11.3 Expense

#### 11.3.1 Manage Expense (`/app/accounts/expense`)

**Add Expense Form:**
- Date*
- Expense Category* (configurable dropdown: Salary, Electricity, Water, Building Maintenance, Furniture, Stationery, Printing, Sports Equipment, Lab Equipment, Books, Transport Fuel, Vehicle Maintenance, Security, Housekeeping, Internet/IT, Phone, Event Expense, Miscellaneous, Other)
- Sub-Category (optional — further classification)
- Amount (₹)*
- Paid To* (vendor name or person)
- Payment Mode* (Cash, Bank Transfer, Cheque, UPI, Credit Card)
- Cheque/Transaction Number (if applicable)
- Bank Name (if applicable)
- Description/Remarks
- Approved By (dropdown of admin staff)
- Attachment (upload bill/invoice/receipt — multiple files)
- Is Recurring (toggle) → if yes: Frequency (Monthly, Quarterly, Yearly), Next Due Date.

**Expense List:**
- Table: Date, Category, Paid To, Amount, Payment Mode, Status (Paid/Pending), Attachment (📎 icon), Actions.
- Filters: Date range, category, payment mode, amount range.
- Search: By description or vendor name.
- Bulk export: CSV, PDF.
- Summary: Total expense for filtered period.

#### 11.3.2 Vendor Bill (`/app/accounts/vendor-bill`)

**Purpose:** Track vendor invoices and payment status.

**Add Vendor Bill Form:**
- Vendor Name* (auto-complete from vendor database or add new)
- Vendor Contact (phone, email — auto-filled if existing vendor)
- Bill Number*
- Bill Date*
- Due Date*
- Category* (same expense categories)
- Items/Description (line items — add multiple):
  - Item Name, Quantity, Rate, Amount (auto: qty × rate)
- Sub-Total (auto-sum of items)
- Tax/GST (₹ or %)
- Total Amount*
- Amount Paid (₹)
- Balance Due (auto: Total - Paid)
- Payment Status* (Unpaid, Partially Paid, Paid, Overdue)
- Attachment (upload vendor invoice)
- Notes

**Vendor Database:**
- Auto-maintained from vendor bills.
- View: Vendor name, contact, total bills, total paid, total outstanding.
- Vendor history: All bills from a specific vendor.

**Vendor Bill List:**
- Table: Bill#, Vendor, Date, Due Date, Amount, Paid, Balance, Status, Actions.
- Filters: Status (Overdue highlighted red), date range, vendor.
- Alerts: Bills overdue for >30 days.
- Actions: View, Edit, Record Payment (partial or full), Delete, Print.

#### 11.3.3 Expense Dashboard (`/app/accounts/expense-dashboard`)
- **Total Expenses:** This month, quarter, year.
- **Category-wise Breakdown:** Pie/donut chart.
- **Monthly Expense Trend:** Bar/line chart.
- **Top Expense Categories:** Ranked list.
- **Vendor Payables:** Total outstanding to vendors.
- **Recurring Expenses Due:** Upcoming recurring payments.
- **Budget vs Actual (Enhancement):** If budgets are set, show variance.

### 11.4 Accounts Dashboard (`/app/accounts/dashboard`)

**The Big Picture:**
- **Net Position Card:** Total Income − Total Expense = Net (this month / this year). Green if positive, red if negative.
- **Income vs Expense:** Side-by-side bar chart per month.
- **Cash Flow:** Line chart showing cumulative cash position over time.
- **Fee Collection Status:** Total expected vs collected (from Fees module).
- **Outstanding Receivables:** Total pending fees from students.
- **Outstanding Payables:** Total unpaid vendor bills.
- **Quick Stats:** Today's income, today's expense, bank balance (manual entry or API if bank integrated).
- **Profit & Loss Summary:** Income and expense breakdown for the financial year (April to March for Indian schools).
- **Monthly Financial Summary Table:** Month-wise rows with: Total Income, Total Expense, Net, Fee Collection, Salary Paid.

---

## 12. FEES (`/app/fees`)

### 12.1 Sidebar Sub-Navigation
```
Fees
├── Fee Payment
├── Fee Report
│   ├── Due Fees Report
│   ├── Fees Collection Report
│   ├── Fees Setup Report
│   ├── Payment History
│   └── Students Without Fees
├── Demand Bill
├── Fees & Discounts Setup
│   ├── Step 1: Fees Setting
│   ├── Step 2: Fees Category
│   ├── Step 3: Installment Setup
│   ├── Step 4: Class Wise Fees Setup
│   ├── Step 5: Assign Fees to Student
│   ├── Step 6: Fees Adjustment
│   ├── Step 7: Sibling Fees Adjustment
│   ├── Step 8: Publish Fees to Parents
│   ├── Step 9: Setup Fees (Old Way)
│   ├── Step 10: Fees Structure
│   └── Step 11: Fees Card
├── Fee Payment (Parent Wise)
├── Demand Bill (Parent Wise)
└── Fees Dashboard
```

### 12.2 Fee Payment (`/app/fees/payment`)

**Layout:** (As shown in your screenshot — Image 2)

**Three-Column Layout:**

**Left + Center Area:**

**Find Student Section (Top):**
- Receipt No.* (auto-generated: sequential, e.g., 2186, 2187...)
- Student Name* (search field with autocomplete — search by name or admission number)
- Admission No (auto-filled on student selection)
- Date* (default today, editable)
- Fee Group* (dropdown: Regular, RTE, Staff Ward, etc. — auto-filled from student record)

**Installment Section (Left Panel):**
- List of installments for the selected student (e.g., JUL-APR, AUG, SEP-MAY, OCT, NOV, DEC, JAN-JUN, FEB, MAR).
- Each shows: Installment name, Amount due, Paid status.
- Checkbox to select which installments to pay now.
- Multiple installments can be selected for combined payment.

**Fees Detail Section (Center):**
- Table: Installment | Fees Category | Fees (₹) | Discount (₹) | Bal. Amt (₹).
- Populates based on selected installments.
- Shows each fee category (Tuition Fee, Development Fee, Lab Fee, etc.) separately.
- Discount column shows any applied discounts.

**Discount Detail Button:**
- Opens modal/panel showing: Discount name, Discount type (%, flat), Amount, Applied to which fee categories.

**Payment Calculation Section (Below Fees Detail):**
- Advanced Paid Amount: Shows any advance payment already credited.
- Total Dues* (auto-calculated)
- Discount* (auto-calculated from discount setup + any ad-hoc discount entered here)
- Gross Fees* (Dues - Discount)
- Fine (₹) (manual entry or auto-calculated based on late payment rules)
- Net Fees* (Gross + Fine)
- T.Pay = N.Fees - Adv.** (Total to pay = Net fees minus advance paid)
- Balance* (if partial payment)

**Payment Mode Section:**
- P/Mode* (dropdown: Cash, Cheque, D.D., Online/UPI, Bank Transfer, Credit/Debit Card)
- Account Type* (dropdown: School's bank accounts — e.g., "SBI Main Account", "HDFC Fee Account")
- Cheque/D.D. No. (if mode = Cheque/DD)
- Bank Name (if mode = Cheque/DD)
- Cheque/D.D. Date (if mode = Cheque/DD)
- Reference No (for online/UPI/bank transfer)
- Remark (text)

**Receipt Options:**
- Print Receipt (checkbox, default on)
- Receipt format: 1-Receipt / 2-Receipts / 3-Receipts (radio buttons — for student copy, school copy, bank copy)
- Push Notification (checkbox) — send in-app notification to parent
- Send WhatsApp (checkbox) — send receipt via WhatsApp
- Send SMS (checkbox) — send confirmation SMS
- Send Email (checkbox) — email receipt PDF

**Submit Payment:**
- On submit: payment recorded, receipt generated, installment marked as paid, balance updated.
- Receipt PDF auto-generated containing: School header, Receipt number, Date, Student name, Class, Father's name, Admission no, Fee breakdown table (category, amount, discount, net), Fine, Total paid, Payment mode, Balance if any, Received by (staff name), Authorized signature placeholder.
- Receipt number format: `REC/{YEAR}/{SEQUENTIAL}` (e.g., REC/2026/2186).

**Right Sidebar — Student Detail Panel:**
- Student Name, Admission No, Father Name, Class, Admission Type, Category (General/OBC/SC/ST), Pickup Point (transport), Address, Father's Phone No.
- Profile photo placeholder.

**Sibling Detail Section (Right):**
- Table: Adm. No, Name, Class — of siblings.
- Quick link to switch to sibling's fee payment.

**Previous Payment Detail Section (Right):**
- Table: Receipt#, Installment, Fees, Paid, Fine, Date, Action (View/Print receipt).
- Shows last 10 payments.

### 12.3 Fee Reports

#### 12.3.1 Due Fees Report (`/app/fees/reports/due`)
**Filters:** Class, Section, Installment, Fee Group, Amount Range, As of Date.
**Table:** S.No, Admission No, Student Name, Father's Name, Class, Section, Phone, Total Fees, Paid, Discount, Balance Due.
**Summary:** Total due amount for filtered criteria.
**Actions:** Send reminder SMS (individual or bulk), Print list, Export CSV/PDF.
**Sorting:** By amount (highest dues first), by class, by student name.

#### 12.3.2 Fees Collection Report (`/app/fees/reports/collection`)
**Filters:** Date range*, Class, Section, Payment Mode, Collected By (staff).
**Table:** Receipt No, Date, Student Name, Class, Installment, Amount, Fine, Total, Payment Mode, Collected By.
**Summary Cards:** Total collected, Cash amount, Cheque amount, Online amount.
**Charts:** Daily collection bar chart, Payment mode pie chart.
**Export:** CSV, PDF. Bank deposit slip format (for cheque collections).

#### 12.3.3 Fees Setup Report (`/app/fees/reports/setup`)
**Purpose:** View the complete fee structure as configured.
**View:** Class-wise fee structure showing all fee categories, amounts, installments, and any discount rules.
**Export:** PDF for records.

#### 12.3.4 Payment History (`/app/fees/reports/history`)
**Filters:** Student (search), Class, Section, Date Range.
**Table:** Receipt No, Date, Student, Class, Amount, Fine, Discount, Net Paid, Mode, Balance, Actions (View Receipt, Print, Cancel).
**Receipt Cancellation:** Admin can cancel a receipt (with reason) — reverses the payment, marks installment as unpaid.
**Receipt Reprint:** Generate receipt PDF again.

#### 12.3.5 Students Without Fees (`/app/fees/reports/no-fees`)
**Purpose:** Identify students who have no fee structure assigned.
**Table:** Admission No, Student Name, Class, Section, Admission Date, Fee Group — but no fees mapped.
**Action:** Assign fees (link to Step 5).
**Why:** Data integrity check — ensures all students have fees assigned.

### 12.4 Demand Bill (`/app/fees/demand-bill`)

**Purpose:** Generate fee demand/invoice for students showing what's due.

**Generate:**
- Select Class* → Section* (or All) → Installment(s)* → Date.
- Generates demand bill for each student showing: Student details, Fee categories and amounts, Discounts, Fine (if past due date), Total due, Due date, Payment instructions.
- **Bulk Print:** All demand bills for a class in one PDF.
- **Send:** Via SMS, WhatsApp, Email, Push notification.
- **Format:** Printable slip (half A4 or full A4).

### 12.5 Fees & Discounts Setup (Step-by-Step Configuration)

**Layout:** Card grid as shown in your screenshot (Image 3). Each card numbered as a step, clicked to open.

#### Step 1: Fees Setting (`/app/fees/setup/settings`)
**Purpose:** Global fee-related configurations.
- Academic Session* (current session)
- Fine Settings:
  - Enable Late Fee Fine (toggle)
  - Fine Type (Fixed amount or Percentage per month)
  - Fine Amount (₹ or %)
  - Grace Period (days after due date before fine applies)
  - Maximum Fine Cap (₹)
- Receipt Settings:
  - Receipt Number Prefix (e.g., "REC/")
  - Receipt Number Starting Sequence
  - Receipt Header Text
  - Receipt Footer Text / Terms
- Advance Payment: Allow advance fee payment (toggle)
- Partial Payment: Allow partial installment payment (toggle)
- Rounding: Round to nearest ₹1 / ₹10 / No rounding.

#### Step 2: Fees Category (`/app/fees/setup/category`)
**Purpose:** Define all fee heads/categories.

**Add Form:**
- Category Name* (e.g., "Tuition Fee", "Development Fee", "Lab Fee", "Computer Fee", "Activity Fee", "Exam Fee", "Registration Fee", "Admission Fee", "Caution Money", "Transport Fee", "Annual Charge", "Smart Class Fee", "Library Fee", "Sports Fee")
- Category Code (auto or manual)
- Is One-Time (toggle — for admission fee, caution money, etc.)
- Is Refundable (toggle — for caution money)
- Description
- Is Active (toggle)

**List:** Table with Name, Code, One-Time, Refundable, Status, Actions.

#### Step 3: Installment Setup (`/app/fees/setup/installment`)

**Layout:** (As shown in your screenshot — Image 4)

**Add Installment Form (Left Panel):**
- Installment Name* (e.g., "APR-MAR", "AUG", "SEP-MAY")
- Month(s)* (multi-select dropdown of months: April through March)
- Due Date*
- Class Standard* (dropdown — which class this installment applies to, or "All")
- Sequence No.* (order in which installments appear)

**Installment List (Right Panel):**
- Table: Class Standard, Installment Name, Sequence No., Due Date, Action (Edit icon).
- Search and pagination.
- Shows all configured installments across classes.

**Examples (Monthly for Indian Academic Year April-March):**
```
Installment 1: APR — Due: 2025-04-15 — Seq: 1
Installment 2: MAY — Due: 2025-05-15 — Seq: 2
Installment 3: JUN — Due: 2025-06-15 — Seq: 3
... through ...
Installment 12: MAR — Due: 2026-03-15 — Seq: 12
```
Or quarterly:
```
Q1: APR-JUN — Due: 2025-04-30
Q2: JUL-SEP — Due: 2025-07-31
Q3: OCT-DEC — Due: 2025-10-31
Q4: JAN-MAR — Due: 2026-01-31
```

#### Step 4: Class Wise Fees Setup (`/app/fees/setup/class-wise`)
**Purpose:** Define how much each fee category costs for each class.

**Form:**
- Select Class*
- Select Fee Group* (Regular, RTE, etc.)
- Table loads: Rows = Fee Categories (from Step 2). Columns = Installments (from Step 3).
- Admin enters the amount (₹) for each fee category in each installment.
- Some categories may be only in certain installments (e.g., Annual Charge only in April installment).

**Example for Class 5, Regular:**
```
                    APR    MAY    JUN    JUL    AUG    ...
Tuition Fee         3000   3000   3000   3000   3000
Development Fee     500    500    500    500    500
Computer Fee        300    300    300    300    300
Lab Fee             —      —      —      —      —
Annual Charge       2000   —      —      —      —
Total               5800   3800   3800   3800   3800
```

**Save:** Creates the fee structure for that class + fee group combination.

#### Step 5: Assign Fees to Student (`/app/fees/setup/assign`)
**Purpose:** Apply the fee structure to students.

**Options:**
- **Bulk Assign by Class:** Select Class → Section → Fee Group → Click "Assign to All Students in Class". System assigns the class-wise fee structure to each student.
- **Individual Assign:** Select student → assign or change fee group → custom fee adjustments.
- **New Admission Auto-Assign:** When a new student is admitted, fees auto-assigned based on class and fee group.

**Assign List:** Table showing: Student Name, Class, Section, Fee Group, Total Annual Fee, Assigned Date, Actions (View Structure, Change Fee Group, Custom Adjustment).

#### Step 6: Fees Adjustment (`/app/fees/setup/adjustment`)
**Purpose:** Apply individual adjustments — add/reduce fee for specific students.

**Form:**
- Select Student*
- Adjustment Type* (Addition / Reduction)
- Fee Category* (which fee head to adjust)
- Installment(s)* (which installments affected)
- Amount (₹)*
- Reason*
- Approved By

**Use Cases:** Student joins mid-year (reduce first-half fees), Special scholarship for one student, Extra charges for optional activities.

#### Step 7: Sibling Fees Adjustment (`/app/fees/setup/sibling`)
**Purpose:** Configure and apply sibling discounts.

**Configuration:**
- Sibling Discount Policy:
  - 2nd child: X% discount or ₹Y flat
  - 3rd child: X% discount or ₹Z flat
- Apply to which fee categories (all or specific — usually tuition fee only)
- Apply to which installments (all or specific)

**Apply:**
- System auto-detects sibling groups (from Manage Siblings).
- Shows list of sibling groups with proposed discount amounts.
- Admin reviews and approves.
- Discounts applied to respective students' fee structures.

#### Step 8: Publish Fees to Parents (`/app/fees/setup/publish`)
**Purpose:** Make fee structures visible to parents (if parent portal exists) and send notifications.

**Actions:**
- Select Class(es) to publish.
- Preview what parents will see.
- Publish → fee structures become visible on parent portal/app.
- Notification: Send SMS/WhatsApp to all parents of selected classes informing them that fee details are available.
- Include: Installment schedule, amounts, due dates, payment methods.

#### Step 9: Setup Fees (Old Way) (`/app/fees/setup/old`)
**Purpose:** Legacy/simplified fee setup for schools that don't need the step-by-step granularity.

**Simple Form:**
- Select Class → Enter total annual fee → Divide into installments (equal or custom) → Assign to all students of that class.
- No category-wise breakdown.
- Kept for backward compatibility.

#### Step 10: Fees Structure (`/app/fees/setup/structure`)
**Purpose:** View the complete fee structure as configured.

**View:**
- Select Class + Fee Group → see full table: Fee categories × Installments with amounts.
- Totals: Per installment, per category, annual total.
- Print / Export as PDF (useful for parent circular, notice board).

#### Step 11: Fees Card (`/app/fees/setup/card`)
**Purpose:** Generate individual fee cards for students.

**Fee Card:** A printable document (like a passbook page) showing:
- Student name, class, admission number.
- Table: Installment, Amount, Due Date, Date Paid, Receipt No, Balance.
- All installments listed. Paid ones filled, unpaid ones empty (for manual entry if needed).
- Useful for schools that give physical fee cards to parents.

**Generate:**
- Individual: per student.
- Bulk: per class/section — all cards in one PDF.

### 12.6 Fee Payment — Parent Wise (`/app/fees/payment-parent`)

**Purpose:** Collect fees for all children of a parent in a single transaction.

**Flow:**
- Search by parent name or phone number.
- Shows all children of that parent with their individual fee status.
- Select installments for each child.
- Combined total calculated.
- Single payment → single receipt covering all children.
- Receipt shows each child's fee breakdown separately.

### 12.7 Demand Bill — Parent Wise (`/app/fees/demand-bill-parent`)

**Purpose:** Generate a combined demand bill for all children of a parent.

**Flow:**
- Search parent → shows all children.
- Select installments.
- Generate combined demand bill showing each child's dues.
- Print / Send.

### 12.8 Fees Dashboard (`/app/fees/dashboard`)

**Comprehensive Financial Dashboard:**
- **Total Fee Expected (This Year):** ₹ amount.
- **Total Collected:** ₹ amount + percentage of expected.
- **Total Outstanding:** ₹ amount.
- **Collection Today:** ₹ amount.
- **Collection This Month:** ₹ amount with daily trend chart.
- **Payment Mode Breakdown:** Pie chart — Cash vs Cheque vs Online.
- **Class-wise Collection Status:** Stacked bar chart — Collected (green) vs Outstanding (red) per class.
- **Installment-wise Collection:** Which installments have highest collection and which are lagging.
- **Fee Group Distribution:** Regular vs RTE vs Scholarship collection.
- **Top Defaulters:** List of students with highest outstanding amounts.
- **Fine Collected:** Total late fee fine collected this year.
- **Discount Given:** Total discounts/concessions applied.
- **Day-wise Collection Trend:** Line chart showing daily collection over the month.
- **Year-on-Year Comparison:** This year collection vs last year.

---

## 13. ADMIN SECTION (`/app/admin`)

### 13.1 Purpose
Personal account management and system administration for the logged-in user.

### 13.2 Sub-Modules

#### 13.2.1 Phone Number Verification (`/app/admin/phone-verify`)
- Shows current registered phone number (masked: ****XX1234).
- Option to change phone number.
- **Verification Flow:**
  1. Enter new phone number.
  2. Click "Send OTP" → OTP sent via SMS (MSG91/Twilio).
  3. Enter 6-digit OTP.
  4. On verification → phone number updated.
  5. OTP validity: 5 minutes. Max 3 attempts. Resend after 60 seconds.
- Used for: Password reset, two-factor authentication, important notifications.

#### 13.2.2 Profile (`/app/admin/profile`)
- **View/Edit Profile:**
  - Name, Email, Phone, Designation, Profile Photo.
  - Non-editable fields (grayed out): Employee ID, Role, Date of Joining (admin-controlled).
  - Editable fields: Email, Phone (with OTP verification), Profile Photo, Address.
- **Save Changes** → confirmation notification.

#### 13.2.3 Change Password (`/app/admin/change-password`)
- Current Password*
- New Password* (min 8 chars, must have: uppercase, lowercase, number, special character)
- Confirm New Password*
- Password strength meter (visual indicator).
- On success: All other sessions logged out. Confirmation message. Optional: Send SMS/email notification that password was changed.

#### 13.2.4 Login History (`/app/admin/login-history`)
- **Table:** Date & Time, IP Address, Device/Browser (parsed from User-Agent), Location (from IP geolocation — approximate), Status (Success / Failed), Session Duration.
- Last 50 entries shown with pagination.
- **Security Alert:** If login from unrecognized device/location, flag in red.
- **Active Sessions:** Show currently active sessions. Button to "Logout from all other devices".
- Export: CSV.

#### 13.2.5 Billing & Renewal (`/app/admin/billing`)

**Purpose:** Manage the ERP software subscription/license (if the ERP is offered as SaaS or has a renewal model).

**Current Plan Section:**
- Plan Name (e.g., "Premium", "Enterprise")
- Status: Active / Expired / Grace Period
- Valid From — Valid To
- Features included
- Renewal Amount (₹)

**Invoice History Table:**
- Invoice#, Date, Amount (₹), Status (Paid / Unpaid / Overdue), Payment Mode, Actions.
- Actions: View Invoice, Print Invoice, Download PDF.
- **Print Invoice:** Full invoice with: ERP provider name and GST number, School name and GST number, Invoice number, Date, Period covered, Itemized charges (subscription, SMS credits, WhatsApp credits, storage, etc.), Sub-total, GST (18%), Total, Payment status, Payment details.

**Renewal:**
- Button: "Renew Now" → opens payment flow (Razorpay / bank transfer details).
- Auto-reminder: 30 days and 7 days before expiry.
- Grace period: 15 days after expiry (limited access — read-only mode).

**SMS/WhatsApp Credits:**
- Current balance: X SMS credits, Y WhatsApp messages.
- Purchase more → payment flow.
- Usage history: Date, Count, Purpose, Balance.

#### 13.2.6 Logout
- Click → confirm → clear session/token → redirect to landing page.
- Optional: "Logout from all devices" button.

### 13.3 Super Admin Only — System Settings (`/app/admin/settings`)

*(Visible only to Super Admin role)*

**School Information:**
- School Name, Address, Phone, Email, Website.
- Logo Upload (used on letterhead, reports, receipts, ID cards).
- Affiliation Number (CBSE/ICSE/State Board).
- UDISE Code.
- School Registration Number.
- Established Year.
- Principal's Name and Signature Upload.
- GST Number.

**Academic Session Management:**
- Add/switch academic session (e.g., 2025-26, 2026-27).
- Set current active session.
- Session start and end dates.

**Role & Permission Management:**
- View all roles.
- Create custom roles.
- Edit permissions per role (checkbox matrix of all modules and CRUD operations).

**User Management:**
- List all users.
- Create new user account: Name, Phone, Email, Role assignment.
- Deactivate/Activate users.
- Reset password (send OTP to user).

**Backup & Data:**
- Manual database backup trigger.
- Download backup.
- Backup schedule (daily/weekly — automated).

**SMS Gateway Configuration:**
- Provider selection and API key setup.
- DLT configuration.
- Sender ID.

**WhatsApp API Configuration:**
- Provider selection and API credentials.
- Business phone number.
- Template sync.

**Notification Settings:**
- Enable/disable: SMS, WhatsApp, Email, Push notifications.
- Default notification events: Absence alert, Fee reminder, Exam notification, etc. — toggle each.

---

## 14. AI CHATBOT INTEGRATION

### 14.1 Purpose
An AI-powered chatbot embedded in the ERP that answers queries from admins and employees. Reduces support load and provides instant information.

### 14.2 Placement
- **Floating Chat Icon:** Bottom-right corner of every page in the ERP (after login).
- Click to expand chat window.
- Minimize/maximize/close options.

### 14.3 Capabilities

**For Admin:**
- "How many students are in Class 10?" → queries database, returns count.
- "Show me fee defaulters for November" → returns list or link to report.
- "What is the attendance percentage of Class 5A today?" → real-time query.
- "Generate a report of students without Aadhaar" → triggers report generation.
- "How much fee was collected today?" → returns today's total.
- "Who is the class teacher of Class 8B?" → returns staff name.
- "How many employees are on leave today?" → returns count and names.
- School policy questions (trained on school handbook — "What is the uniform for winter?").
- ERP help: "How do I generate a TC?" → step-by-step guide.

**For Employees (Teachers):**
- "What is my timetable for today?" → returns period list.
- "What is my leave balance?" → returns CL, SL, EL remaining.
- "Show attendance of my class 7B for this week" → returns summary.
- "How do I enter exam marks?" → guided steps.
- School policy and HR questions.

### 14.4 Technical Implementation
- **LLM Backend:** Anthropic Claude API (via `/v1/messages` endpoint).
- **Context Injection:** Each query sent to the LLM with:
  - User's role and permissions.
  - System prompt defining the chatbot's scope and school context.
  - Relevant database query results (chatbot has access to read-only API endpoints).
- **Tool/Function Calling:** LLM uses tool calls to:
  - Query student count by class.
  - Fetch fee data.
  - Fetch attendance data.
  - Fetch employee data.
  - Search school knowledge base.
- **Knowledge Base:** School handbook, fee structure document, academic calendar, FAQs — uploaded and indexed. LLM retrieves relevant chunks.
- **Safety:** Chatbot cannot modify data — read-only access. All responses logged for audit.
- **Rate Limiting:** Max 50 messages per user per day.

### 14.5 Chat Interface
- Chat window with message bubbles (user on right, bot on left).
- Text input with send button.
- Typing indicator when bot is processing.
- Message history maintained for the session.
- Option to clear chat.
- Quick suggestion chips: "Today's attendance", "Fee collection", "My timetable", "Help".
- Feedback: Thumbs up/down on each bot response.

---

## 15. DATABASE SCHEMA (ALL TABLES)

### 15.1 Authentication & Users
```sql
users
├── id (UUID, PK)
├── phone (VARCHAR 15, UNIQUE)
├── email (VARCHAR 100, UNIQUE, NULLABLE)
├── password_hash (VARCHAR 255)
├── role_id (FK → roles.id)
├── is_active (BOOLEAN, DEFAULT true)
├── is_phone_verified (BOOLEAN, DEFAULT false)
├── last_login (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

roles
├── id (INTEGER, PK)
├── name (VARCHAR 50, UNIQUE)
├── display_name (VARCHAR 100)
├── description (TEXT)
└── is_system_role (BOOLEAN) -- cannot be deleted

permissions
├── id (INTEGER, PK)
├── module (VARCHAR 50) -- 'students', 'fees', 'hr', etc.
├── action (VARCHAR 50) -- 'view', 'create', 'edit', 'delete', 'export'
└── description (VARCHAR 200)

role_permissions
├── role_id (FK → roles.id)
└── permission_id (FK → permissions.id)
-- Composite PK (role_id, permission_id)

login_history
├── id (UUID, PK)
├── user_id (FK → users.id)
├── login_at (TIMESTAMP)
├── ip_address (VARCHAR 45)
├── user_agent (TEXT)
├── device_type (VARCHAR 20) -- 'desktop', 'mobile', 'tablet'
├── location (VARCHAR 100) -- from IP geolocation
├── status (ENUM: success, failed)
├── session_token (VARCHAR 255, NULLABLE)
└── logout_at (TIMESTAMP, NULLABLE)

otp_store (Redis preferred, DB fallback)
├── id (UUID, PK)
├── phone (VARCHAR 15)
├── otp_code (VARCHAR 6)
├── purpose (ENUM: login, password_reset, phone_verify)
├── expires_at (TIMESTAMP)
├── attempts (INTEGER, DEFAULT 0)
└── is_verified (BOOLEAN, DEFAULT false)
```

### 15.2 School Configuration
```sql
school_settings
├── id (INTEGER, PK, DEFAULT 1) -- singleton
├── school_name (VARCHAR 200)
├── address (TEXT)
├── city (VARCHAR 100)
├── state (VARCHAR 50)
├── pin_code (VARCHAR 6)
├── phone (VARCHAR 15)
├── email (VARCHAR 100)
├── website (VARCHAR 200)
├── logo_url (VARCHAR 500)
├── affiliation_number (VARCHAR 50)
├── udise_code (VARCHAR 20)
├── registration_number (VARCHAR 50)
├── board (VARCHAR 20) -- CBSE, ICSE, State
├── principal_name (VARCHAR 100)
├── principal_signature_url (VARCHAR 500)
├── gst_number (VARCHAR 20)
├── established_year (INTEGER)
└── updated_at (TIMESTAMP)

academic_sessions
├── id (UUID, PK)
├── name (VARCHAR 20) -- "2025-26"
├── start_date (DATE) -- April 1
├── end_date (DATE) -- March 31
├── is_current (BOOLEAN)
└── created_at (TIMESTAMP)
```

### 15.3 Students (See Section 6 for complete fields)
```sql
students -- (full schema as defined in Section 6.2.1)
student_parents -- (father, mother, guardian records)
student_documents -- (uploaded documents)
student_siblings -- (sibling linkage)
student_guardians -- (guardian mapping)
```

### 15.4 Staff / HR (See Section 7 for complete fields)
```sql
staff -- (full employee table)
staff_qualifications -- (multiple per staff)
staff_experience -- (previous employment)
staff_documents -- (uploaded documents)
staff_salary_structure -- (pay components)
staff_bank_details -- (bank info)
```

### 15.5 Academics
```sql
classes
sections
subjects
class_subjects -- (which subjects in which class)
teacher_assignments -- (teacher → subject → class → section)
class_teachers -- (teacher → class → section)
```

### 15.6 Attendance
```sql
student_attendance
├── id (UUID, PK)
├── student_id (FK → students.id)
├── class_id (FK → classes.id)
├── section_id (FK → sections.id)
├── date (DATE)
├── status (ENUM: present, absent, late, half_day, excused)
├── marked_by (FK → users.id)
├── marked_at (TIMESTAMP)
├── academic_session_id (FK)
└── UNIQUE (student_id, date)

employee_attendance
├── id (UUID, PK)
├── staff_id (FK → staff.id)
├── date (DATE)
├── status (ENUM: present, absent, half_day, on_leave, on_duty, wfh)
├── punch_in (TIMESTAMP, NULLABLE)
├── punch_out (TIMESTAMP, NULLABLE)
├── total_hours (DECIMAL, NULLABLE)
├── late_by_minutes (INTEGER, DEFAULT 0)
├── source (ENUM: manual, biometric)
├── marked_by (FK → users.id, NULLABLE)
└── UNIQUE (staff_id, date)

biometric_punches
├── id (UUID, PK)
├── staff_id (FK → staff.id)
├── punch_time (TIMESTAMP)
├── punch_type (ENUM: in, out)
├── device_id (VARCHAR 50)
├── raw_data (JSON, NULLABLE)
└── processed (BOOLEAN, DEFAULT false)

leave_types
├── id (INTEGER, PK)
├── name (VARCHAR 50)
├── code (VARCHAR 5) -- CL, SL, EL
├── default_days (INTEGER)
├── carry_forward (BOOLEAN)
├── encashable (BOOLEAN)
├── requires_document (BOOLEAN) -- medical cert for SL
├── max_consecutive_days (INTEGER, NULLABLE)
└── is_active (BOOLEAN)

leave_balances
├── id (UUID, PK)
├── staff_id (FK → staff.id)
├── leave_type_id (FK → leave_types.id)
├── academic_session_id (FK)
├── allocated (INTEGER)
├── used (INTEGER)
├── remaining (INTEGER) -- computed: allocated - used
└── UNIQUE (staff_id, leave_type_id, academic_session_id)

leave_requests
├── id (UUID, PK)
├── staff_id (FK → staff.id)
├── leave_type_id (FK → leave_types.id)
├── from_date (DATE)
├── to_date (DATE)
├── is_half_day (BOOLEAN)
├── half_day_type (ENUM: first_half, second_half, NULL)
├── total_days (DECIMAL) -- 1, 0.5, 2, etc.
├── reason (TEXT)
├── document_url (VARCHAR 500, NULLABLE)
├── status (ENUM: pending, approved, rejected, cancelled)
├── approved_by (FK → users.id, NULLABLE)
├── approved_at (TIMESTAMP, NULLABLE)
├── rejection_reason (TEXT, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### 15.7 Front Desk
```sql
admission_enquiries
├── id (UUID, PK)
├── enquiry_number (VARCHAR 20, UNIQUE) -- auto: ENQ/2026/0001
├── student_name (VARCHAR 100)
├── dob (DATE, NULLABLE)
├── gender (ENUM: male, female, other, NULLABLE)
├── class_applying_for (FK → classes.id)
├── father_name (VARCHAR 100)
├── mother_name (VARCHAR 100, NULLABLE)
├── contact_phone (VARCHAR 15)
├── alternate_phone (VARCHAR 15, NULLABLE)
├── email (VARCHAR 100, NULLABLE)
├── address (TEXT, NULLABLE)
├── previous_school (VARCHAR 200, NULLABLE)
├── source (ENUM: walkin, phone, website, referral, social_media, advertisement, other)
├── assigned_to (FK → users.id, NULLABLE)
├── status (ENUM: new, contacted, follow_up, interested, not_interested, admitted, closed)
├── follow_up_date (DATE, NULLABLE)
├── notes (TEXT, NULLABLE)
├── converted_student_id (FK → students.id, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

enquiry_follow_ups
├── id (UUID, PK)
├── enquiry_id (FK → admission_enquiries.id)
├── follow_up_date (DATE)
├── notes (TEXT)
├── status_changed_to (VARCHAR 20, NULLABLE)
├── done_by (FK → users.id)
└── created_at (TIMESTAMP)

gate_passes
├── id (UUID, PK)
├── pass_number (VARCHAR 20, UNIQUE) -- GP-20260304-001
├── student_id (FK → students.id)
├── reason (ENUM: medical, parent_request, emergency, official, other)
├── reason_detail (TEXT, NULLABLE)
├── authorized_by (VARCHAR 100)
├── out_time (TIMESTAMP)
├── expected_return (TIMESTAMP, NULLABLE)
├── actual_return (TIMESTAMP, NULLABLE)
├── pickup_person_name (VARCHAR 100, NULLABLE)
├── pickup_person_phone (VARCHAR 15, NULLABLE)
├── pickup_person_photo_url (VARCHAR 500, NULLABLE) -- camera capture
├── status (ENUM: out, returned)
├── remarks (TEXT, NULLABLE)
├── issued_by (FK → users.id)
└── created_at (TIMESTAMP)

visitors
├── id (UUID, PK)
├── visitor_name (VARCHAR 100)
├── visitor_phone (VARCHAR 15)
├── purpose (ENUM: meeting, enquiry, delivery, official, personal, other)
├── whom_to_meet (VARCHAR 100)
├── whom_to_meet_staff_id (FK → staff.id, NULLABLE)
├── id_type (ENUM: aadhaar, driving_license, voter_id, passport, other, NULLABLE)
├── id_number (VARCHAR 50, NULLABLE)
├── num_persons (INTEGER, DEFAULT 1)
├── vehicle_number (VARCHAR 20, NULLABLE)
├── photo_url (VARCHAR 500, NULLABLE)
├── badge_number (VARCHAR 20, NULLABLE)
├── in_time (TIMESTAMP)
├── out_time (TIMESTAMP, NULLABLE)
├── status (ENUM: in, out)
├── registered_by (FK → users.id)
└── created_at (TIMESTAMP)

postal_records
├── id (UUID, PK)
├── type (ENUM: received, dispatched)
├── reference_number (VARCHAR 50, NULLABLE)
├── party_name (VARCHAR 200) -- from (if received) / to (if dispatched)
├── party_address (TEXT, NULLABLE)
├── date (DATE)
├── postal_type (ENUM: letter, courier, parcel, document, legal, government, other)
├── addressed_to (VARCHAR 100, NULLABLE) -- for received
├── addressed_to_staff_id (FK → staff.id, NULLABLE)
├── sent_by_staff_id (FK → staff.id, NULLABLE) -- for dispatched
├── mode (ENUM: speed_post, registered, courier, hand_delivery, email, NULLABLE) -- for dispatched
├── weight (VARCHAR 20, NULLABLE)
├── cost (DECIMAL, NULLABLE) -- postage cost for dispatched
├── description (TEXT, NULLABLE)
├── attachment_url (VARCHAR 500, NULLABLE)
├── status (ENUM: pending_delivery, delivered, returned, dispatched, in_transit)
├── logged_by (FK → users.id)
└── created_at (TIMESTAMP)

lost_and_found
├── id (UUID, PK)
├── item_number (VARCHAR 20, UNIQUE) -- LF/2026/0001
├── item_type (ENUM: water_bottle, tiffin, bag, jacket, stationery, book, id_card, electronic, jewelry, other)
├── description (TEXT)
├── color (VARCHAR 50, NULLABLE)
├── location_found (ENUM: playground, classroom, library, cafeteria, bus, corridor, other)
├── found_date (DATE)
├── reported_by (VARCHAR 100, NULLABLE)
├── photo_url (VARCHAR 500, NULLABLE)
├── status (ENUM: found_unclaimed, claimed, lost_searching, lost_found, disposed)
├── claimed_by (VARCHAR 100, NULLABLE)
├── claimed_date (DATE, NULLABLE)
├── verified_by (FK → users.id, NULLABLE)
├── logged_by (FK → users.id)
└── created_at (TIMESTAMP)
```

### 15.8 Examination
```sql
exam_areas
├── id (UUID, PK)
├── name (VARCHAR 100)
├── description (TEXT, NULLABLE)
├── display_order (INTEGER)
├── academic_session_id (FK)
└── is_active (BOOLEAN)

subject_groups
├── id (UUID, PK)
├── name (VARCHAR 100)
├── exam_area_id (FK → exam_areas.id)
├── description (TEXT, NULLABLE)
└── display_order (INTEGER)

exam_subjects
├── id (UUID, PK)
├── name (VARCHAR 100)
├── code (VARCHAR 20)
├── subject_group_id (FK → subject_groups.id)
├── type (ENUM: theory, practical, theory_practical, activity, project)
├── is_elective (BOOLEAN)
├── display_order (INTEGER)
└── is_active (BOOLEAN)

terms
├── id (UUID, PK)
├── name (VARCHAR 50)
├── start_date (DATE)
├── end_date (DATE)
├── display_order (INTEGER)
├── academic_session_id (FK)
└── is_active (BOOLEAN)

exam_types
├── id (UUID, PK)
├── name (VARCHAR 100)
├── term_id (FK → terms.id)
├── weightage_percent (DECIMAL)
├── max_marks_default (INTEGER, NULLABLE)
├── display_order (INTEGER)
├── is_grade_based (BOOLEAN)
└── is_active (BOOLEAN)

grade_mappings
├── id (UUID, PK)
├── grade_name (VARCHAR 10)
├── grade_point (DECIMAL)
├── marks_from (DECIMAL)
├── marks_to (DECIMAL)
├── description (VARCHAR 50)
├── is_pass (BOOLEAN)
├── display_order (INTEGER)
└── academic_session_id (FK)

report_card_templates
├── id (UUID, PK)
├── name (VARCHAR 100)
├── template_config (JSON) -- stores layout, field visibility, etc.
├── header_config (JSON)
├── footer_config (JSON)
└── created_at (TIMESTAMP)

class_template_mappings
├── id (UUID, PK)
├── class_id (FK → classes.id)
├── template_id (FK → report_card_templates.id)
├── term_ids (JSON) -- array of term IDs
└── academic_session_id (FK)

subject_max_marks
├── id (UUID, PK)
├── class_id (FK → classes.id)
├── exam_subject_id (FK → exam_subjects.id)
├── exam_type_id (FK → exam_types.id)
├── max_marks_theory (INTEGER)
├── max_marks_practical (INTEGER, NULLABLE)
├── max_marks_internal (INTEGER, NULLABLE)
├── total_max_marks (INTEGER)
├── pass_marks (INTEGER)
└── academic_session_id (FK)

exam_datesheets
├── id (UUID, PK)
├── class_id (FK → classes.id)
├── term_id (FK → terms.id)
├── exam_type_id (FK → exam_types.id)
├── exam_subject_id (FK → exam_subjects.id)
├── exam_date (DATE)
├── start_time (TIME)
├── end_time (TIME)
├── room (VARCHAR 50, NULLABLE)
├── academic_session_id (FK)
└── created_at (TIMESTAMP)

remarks_bank
├── id (UUID, PK)
├── remark_text (TEXT)
├── category (ENUM: academic, behavior, attendance, general)
├── for_grade_range (VARCHAR 10, NULLABLE) -- e.g., "A1-A2"
└── is_active (BOOLEAN)

mark_entries
├── id (UUID, PK)
├── student_id (FK → students.id)
├── class_id (FK → classes.id)
├── section_id (FK → sections.id)
├── exam_subject_id (FK → exam_subjects.id)
├── exam_type_id (FK → exam_types.id)
├── term_id (FK → terms.id)
├── marks_theory (DECIMAL, NULLABLE)
├── marks_practical (DECIMAL, NULLABLE)
├── marks_internal (DECIMAL, NULLABLE)
├── total_marks (DECIMAL, NULLABLE)
├── grade (VARCHAR 10, NULLABLE) -- auto or manual
├── grade_point (DECIMAL, NULLABLE)
├── is_absent (BOOLEAN, DEFAULT false)
├── teacher_remark (TEXT, NULLABLE)
├── entered_by (FK → users.id)
├── status (ENUM: draft, submitted)
├── academic_session_id (FK)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
-- UNIQUE (student_id, exam_subject_id, exam_type_id, term_id, academic_session_id)
```

### 15.9 Fees
```sql
fee_settings
├── id (INTEGER, PK, DEFAULT 1) -- singleton
├── academic_session_id (FK)
├── late_fine_enabled (BOOLEAN)
├── fine_type (ENUM: fixed, percentage)
├── fine_amount (DECIMAL)
├── grace_period_days (INTEGER)
├── max_fine_cap (DECIMAL, NULLABLE)
├── receipt_prefix (VARCHAR 20)
├── receipt_start_number (INTEGER)
├── receipt_header (TEXT, NULLABLE)
├── receipt_footer (TEXT, NULLABLE)
├── allow_advance_payment (BOOLEAN)
├── allow_partial_payment (BOOLEAN)
├── rounding (ENUM: none, rupee, ten)
└── updated_at (TIMESTAMP)

fee_categories
├── id (UUID, PK)
├── name (VARCHAR 100)
├── code (VARCHAR 20)
├── is_one_time (BOOLEAN)
├── is_refundable (BOOLEAN)
├── description (TEXT, NULLABLE)
├── is_active (BOOLEAN)
└── created_at (TIMESTAMP)

fee_groups
├── id (UUID, PK)
├── name (VARCHAR 50) -- Regular, RTE, Staff Ward, Scholarship
├── description (TEXT, NULLABLE)
└── is_active (BOOLEAN)

installments
├── id (UUID, PK)
├── name (VARCHAR 50) -- "APR", "MAY", "JUL-APR"
├── months (JSON) -- [4, 5] for Apr-May
├── due_date (DATE)
├── class_id (FK → classes.id, NULLABLE) -- NULL = all classes
├── sequence_number (INTEGER)
├── academic_session_id (FK)
└── created_at (TIMESTAMP)

class_fee_structure
├── id (UUID, PK)
├── class_id (FK → classes.id)
├── fee_group_id (FK → fee_groups.id)
├── fee_category_id (FK → fee_categories.id)
├── installment_id (FK → installments.id)
├── amount (DECIMAL)
├── academic_session_id (FK)
└── UNIQUE (class_id, fee_group_id, fee_category_id, installment_id, academic_session_id)

student_fee_assignments
├── id (UUID, PK)
├── student_id (FK → students.id)
├── fee_group_id (FK → fee_groups.id)
├── academic_session_id (FK)
├── assigned_at (TIMESTAMP)
└── assigned_by (FK → users.id)

student_fee_adjustments
├── id (UUID, PK)
├── student_id (FK → students.id)
├── fee_category_id (FK → fee_categories.id)
├── installment_id (FK → installments.id, NULLABLE) -- NULL = all installments
├── adjustment_type (ENUM: addition, reduction)
├── amount (DECIMAL)
├── reason (TEXT)
├── approved_by (FK → users.id)
├── academic_session_id (FK)
└── created_at (TIMESTAMP)

discount_policies
├── id (UUID, PK)
├── name (VARCHAR 100) -- "Sibling Discount - 2nd Child"
├── type (ENUM: sibling, scholarship, rte, staff_ward, custom)
├── discount_type (ENUM: percentage, flat)
├── discount_value (DECIMAL) -- 10 (for 10%) or 5000 (for ₹5000)
├── applies_to_categories (JSON, NULLABLE) -- array of fee_category_ids, NULL = all
├── applies_to_installments (JSON, NULLABLE) -- array of installment_ids, NULL = all
├── conditions (JSON, NULLABLE) -- e.g., {"sibling_order": 2}
├── academic_session_id (FK)
└── is_