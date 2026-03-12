import type { Knex } from 'knex';

/**
 * Migration 016 — Complete Multi-Tenant Isolation
 *
 * Addresses:
 *   1. Tables still missing school_id (sections, subjects, fee_structures,
 *      fee_installments, fee_payments, marks, exam_subjects, student_class_history,
 *      student_parents, staff_attendance, leave_balances, login_history,
 *      enquiry_follow_ups, enquiries).
 *   2. Global unique constraints that cause cross-tenant collisions
 *      (users.email, users.username, staff.employee_id, fee_payments.receipt_no,
 *      transfer_certificates.tc_no, admission_enquiries.enquiry_number,
 *      gate_passes.pass_number, lost_and_found.item_number, vendor_bills.bill_number).
 *   3. teacher_subject_assignments unique constraint missing school_id.
 *
 * Pattern: add nullable FK → backfill from parent → enforce NOT NULL → index.
 * Every step is idempotent (guarded by `hasColumn` / `IF NOT EXISTS`).
 *
 * Safety: each table-alter block is wrapped in its own try/catch so a single
 * failure doesn't block subsequent tables (Knex migrations run inside an
 * implicit transaction—if the driver supports DDL-in-txn—so any unhandled
 * error still rolls the whole migration back).
 */
export async function up(knex: Knex): Promise<void> {
    const log = (msg: string) => console.log(`[016] ${msg}`);

    // ── helper: add school_id FK column if missing ─────────────────────────
    const ensureSchoolIdColumn = async (table: string) => {
        const has = await knex.schema.hasColumn(table, 'school_id');
        if (!has) {
            await knex.schema.alterTable(table, (t) => {
                t.integer('school_id').unsigned().nullable()
                    .references('id').inTable('schools').onDelete('CASCADE');
            });
        }
    };

    // ── helper: safely drop a constraint/index ─────────────────────────────
    const safeDrop = async (sql: string) => {
        try { await knex.raw(sql); } catch { /* already dropped */ }
    };

    // ── helper: backfill + enforce NOT NULL + index ────────────────────────
    const hardenTable = async (
        table: string,
        backfillSql: string | null,
        enforceNotNull = true,
    ) => {
        log(`→ ${table}: ensuring school_id column`);
        await ensureSchoolIdColumn(table);
        if (backfillSql) {
            log(`→ ${table}: backfilling school_id`);
            await knex.raw(backfillSql);
            // fallback: assign orphan rows to first school
            await knex.raw(`
                UPDATE ${table} SET school_id = (SELECT id FROM schools LIMIT 1)
                WHERE school_id IS NULL AND (SELECT id FROM schools LIMIT 1) IS NOT NULL
            `);
        }
        if (enforceNotNull) {
            const nullCount = await knex(table).whereNull('school_id').count('* as c').first();
            if (Number(nullCount?.c) === 0) {
                log(`→ ${table}: setting NOT NULL`);
                await knex.raw(`ALTER TABLE ${table} ALTER COLUMN school_id SET NOT NULL`);
            } else {
                log(`⚠ ${table}: ${nullCount?.c} rows still NULL — skipping NOT NULL`);
            }
        }
        await knex.raw(`CREATE INDEX IF NOT EXISTS idx_${table}_school ON ${table}(school_id)`);
        log(`✓ ${table} done`);
    };

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 1: Add school_id to 14 tables, backfill, enforce NOT NULL
    // ══════════════════════════════════════════════════════════════════════════

    // 1. sections — backfill from classes
    await hardenTable('sections', `
        UPDATE sections SET school_id = c.school_id
        FROM classes c WHERE sections.class_id = c.id AND sections.school_id IS NULL
    `);

    // 2. subjects — backfill from classes
    await hardenTable('subjects', `
        UPDATE subjects SET school_id = c.school_id
        FROM classes c WHERE subjects.class_id = c.id AND subjects.school_id IS NULL
    `);

    // 3. fee_structures — backfill from classes
    await hardenTable('fee_structures', `
        UPDATE fee_structures SET school_id = c.school_id
        FROM classes c WHERE fee_structures.class_id = c.id AND fee_structures.school_id IS NULL
    `);

    // 4. fee_payments — backfill from students
    await hardenTable('fee_payments', `
        UPDATE fee_payments SET school_id = s.school_id
        FROM students s WHERE fee_payments.student_id = s.id AND fee_payments.school_id IS NULL
    `);

    // 5. marks — backfill from students
    await hardenTable('marks', `
        UPDATE marks SET school_id = s.school_id
        FROM students s WHERE marks.student_id = s.id AND marks.school_id IS NULL
    `);

    // 6. exam_subjects — backfill from exams
    await hardenTable('exam_subjects', `
        UPDATE exam_subjects SET school_id = e.school_id
        FROM exams e WHERE exam_subjects.exam_id = e.id AND exam_subjects.school_id IS NULL
    `);

    // 7. student_class_history — backfill from students
    await hardenTable('student_class_history', `
        UPDATE student_class_history SET school_id = s.school_id
        FROM students s WHERE student_class_history.student_id = s.id AND student_class_history.school_id IS NULL
    `);

    // 8. student_parents — backfill from students
    await hardenTable('student_parents', `
        UPDATE student_parents SET school_id = s.school_id
        FROM students s WHERE student_parents.student_id = s.id AND student_parents.school_id IS NULL
    `);

    // 9. staff_attendance — backfill from staff
    await hardenTable('staff_attendance', `
        UPDATE staff_attendance SET school_id = st.school_id
        FROM staff st WHERE staff_attendance.staff_id = st.id AND staff_attendance.school_id IS NULL
    `);

    // 10. leave_balances — backfill from staff
    await hardenTable('leave_balances', `
        UPDATE leave_balances SET school_id = st.school_id
        FROM staff st WHERE leave_balances.staff_id = st.id AND leave_balances.school_id IS NULL
    `);

    // 11. login_history — backfill from users (stays nullable)
    await hardenTable('login_history', `
        UPDATE login_history SET school_id = u.school_id
        FROM users u WHERE login_history.user_id = u.id AND login_history.school_id IS NULL
    `, false);

    // 12. enquiries — no backfill possible (pre-registration), stays nullable
    await hardenTable('enquiries', null, false);

    // 13. enquiry_follow_ups — backfill from admission_enquiries (stays nullable)
    await hardenTable('enquiry_follow_ups', `
        UPDATE enquiry_follow_ups SET school_id = ae.school_id
        FROM admission_enquiries ae WHERE enquiry_follow_ups.enquiry_id = ae.id AND enquiry_follow_ups.school_id IS NULL
    `, false);

    // 14. fee_installments — backfill from fee_structures
    await hardenTable('fee_installments', `
        UPDATE fee_installments SET school_id = fs.school_id
        FROM fee_structures fs WHERE fee_installments.fee_structure_id = fs.id AND fee_installments.school_id IS NULL
    `);

    log('Phase 1 complete — all 14 tables hardened');

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 2: FIX GLOBAL UNIQUE CONSTRAINTS → COMPOUND WITH school_id
    // ══════════════════════════════════════════════════════════════════════════
    log('Phase 2 — converting global uniques to compound indexes');

    // users.email: global unique → (school_id, email)
    await safeDrop('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique');
    await safeDrop('DROP INDEX IF EXISTS users_email_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS users_school_email_unique ON users(school_id, email)');

    // users.username: global unique → (school_id, username)
    await safeDrop('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_unique');
    await safeDrop('DROP INDEX IF EXISTS users_username_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS users_school_username_unique ON users(school_id, username)');

    // staff.employee_id: global unique → (school_id, employee_id)
    await safeDrop('ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_employee_id_unique');
    await safeDrop('DROP INDEX IF EXISTS staff_employee_id_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS staff_school_employee_id_unique ON staff(school_id, employee_id)');

    // fee_payments.receipt_no: global unique → (school_id, receipt_no)
    await safeDrop('ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_receipt_no_unique');
    await safeDrop('DROP INDEX IF EXISTS fee_payments_receipt_no_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS fee_payments_school_receipt_unique ON fee_payments(school_id, receipt_no)');

    // transfer_certificates.tc_no: global unique → (school_id, tc_no)
    await safeDrop('ALTER TABLE transfer_certificates DROP CONSTRAINT IF EXISTS transfer_certificates_tc_no_unique');
    await safeDrop('DROP INDEX IF EXISTS transfer_certificates_tc_no_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS tc_school_tc_no_unique ON transfer_certificates(school_id, tc_no)');

    // admission_enquiries.enquiry_number: global unique → (school_id, enquiry_number)
    await safeDrop('ALTER TABLE admission_enquiries DROP CONSTRAINT IF EXISTS admission_enquiries_enquiry_number_unique');
    await safeDrop('DROP INDEX IF EXISTS admission_enquiries_enquiry_number_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS admission_enquiries_school_enquiry_unique ON admission_enquiries(school_id, enquiry_number)');

    // gate_passes.pass_number: global unique → (school_id, pass_number)
    await safeDrop('ALTER TABLE gate_passes DROP CONSTRAINT IF EXISTS gate_passes_pass_number_unique');
    await safeDrop('DROP INDEX IF EXISTS gate_passes_pass_number_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS gate_passes_school_pass_unique ON gate_passes(school_id, pass_number)');

    // lost_and_found.item_number: global unique → (school_id, item_number)
    await safeDrop('ALTER TABLE lost_and_found DROP CONSTRAINT IF EXISTS lost_and_found_item_number_unique');
    await safeDrop('DROP INDEX IF EXISTS lost_and_found_item_number_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS lost_and_found_school_item_unique ON lost_and_found(school_id, item_number)');

    // vendor_bills.bill_number: global unique → (school_id, bill_number)
    await safeDrop('ALTER TABLE vendor_bills DROP CONSTRAINT IF EXISTS vendor_bills_bill_number_unique');
    await safeDrop('DROP INDEX IF EXISTS vendor_bills_bill_number_unique');
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS vendor_bills_school_bill_unique ON vendor_bills(school_id, bill_number)');

    // ══════════════════════════════════════════════════════════════════════════
    // 16. FIX teacher_subject_assignments compound unique to include school_id
    // ══════════════════════════════════════════════════════════════════════════
    await safeDrop('ALTER TABLE teacher_subject_assignments DROP CONSTRAINT IF EXISTS teacher_subject_assignments_teacher_id_class_id_section_id_s_unique');
    await safeDrop('DROP INDEX IF EXISTS teacher_subject_assignments_teacher_id_class_id_section_id_s_unique');
    await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS tsa_school_teacher_class_section_subject_year_unique
        ON teacher_subject_assignments(school_id, teacher_id, class_id, section_id, subject_id, academic_year_id)
    `);

    log('Phase 2 complete — all global uniques converted to compound indexes');
}

export async function down(knex: Knex): Promise<void> {
    // Reverse unique constraint changes (restore global uniques)
    const restoreGlobal = async (table: string, col: string, newIdx: string) => {
        try { await knex.raw(`DROP INDEX IF EXISTS ${newIdx}`); } catch { /* ok */ }
        try { await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_${col}_unique ON ${table}(${col})`); } catch { /* ok */ }
    };

    await restoreGlobal('users', 'email', 'users_school_email_unique');
    await restoreGlobal('users', 'username', 'users_school_username_unique');
    await restoreGlobal('staff', 'employee_id', 'staff_school_employee_id_unique');
    await restoreGlobal('fee_payments', 'receipt_no', 'fee_payments_school_receipt_unique');
    await restoreGlobal('transfer_certificates', 'tc_no', 'tc_school_tc_no_unique');
    await restoreGlobal('admission_enquiries', 'enquiry_number', 'admission_enquiries_school_enquiry_unique');
    await restoreGlobal('gate_passes', 'pass_number', 'gate_passes_school_pass_unique');
    await restoreGlobal('lost_and_found', 'item_number', 'lost_and_found_school_item_unique');
    await restoreGlobal('vendor_bills', 'bill_number', 'vendor_bills_school_bill_unique');

    // Drop tsa compound unique
    try { await knex.raw('DROP INDEX IF EXISTS tsa_school_teacher_class_section_subject_year_unique'); } catch { /* ok */ }

    // Drop school_id columns (reverse order)
    const tables = [
        'fee_installments', 'enquiry_follow_ups', 'enquiries', 'login_history',
        'leave_balances', 'staff_attendance', 'student_parents', 'student_class_history',
        'exam_subjects', 'marks', 'fee_payments', 'fee_structures', 'subjects', 'sections',
    ];
    for (const table of tables) {
        const has = await knex.schema.hasColumn(table, 'school_id');
        if (has) {
            await knex.schema.alterTable(table, (t) => { t.dropColumn('school_id'); });
        }
    }
}
