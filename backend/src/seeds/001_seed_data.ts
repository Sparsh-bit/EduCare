import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
    // ─── Clear existing data (CASCADE handles FK constraints) ───
    await knex.raw('TRUNCATE TABLE schools CASCADE');
    await knex.raw('TRUNCATE TABLE academic_years CASCADE');

    // ─── Demo School ───
    const [school] = await knex('schools').insert({
        school_code: 'DEMO01',
        name: 'Concilio Demo School',
        owner_name: 'Administrator',
    }).returning('*');

    // ─── Academic Year ───
    const [academicYear] = await knex('academic_years').insert([
        { year: '2025-26', is_current: true, start_date: '2025-04-01', end_date: '2026-03-31' },
    ]).returning('*');

    // ─── Owner User ───
    const hashedPw = await bcrypt.hash('admin@123', 12);
    const [adminUser] = await knex('users').insert([
        { email: 'admin@concilio.edu', username: 'admin', password_hash: hashedPw, name: 'Administrator', phone: '9876543210', role: 'owner', school_id: school.id },
    ]).returning('*');

    // ─── Teacher Users ───
    const teacherPw = await bcrypt.hash('teacher@123', 12);
    const teacherUsers = await knex('users').insert([
        { email: 'ram.sharma@concilio.edu', username: 'ram.sharma', password_hash: teacherPw, name: 'Ram Sharma', phone: '9876543211', role: 'teacher', school_id: school.id },
        { email: 'priya.singh@concilio.edu', username: 'priya.singh', password_hash: teacherPw, name: 'Priya Singh', phone: '9876543212', role: 'teacher', school_id: school.id },
        { email: 'ankit.verma@concilio.edu', username: 'ankit.verma', password_hash: teacherPw, name: 'Ankit Verma', phone: '9876543213', role: 'teacher', school_id: school.id },
    ]).returning('*');

    // ─── Parent Users ───
    const parentPw = await bcrypt.hash('parent@123', 12);
    const parentUsers = await knex('users').insert([
        { email: 'rajesh.kumar@gmail.com', username: 'rajesh.kumar', password_hash: parentPw, name: 'Rajesh Kumar', phone: '9876543220', role: 'parent', school_id: school.id },
        { email: 'sunil.gupta@gmail.com', username: 'sunil.gupta', password_hash: parentPw, name: 'Sunil Gupta', phone: '9876543221', role: 'parent', school_id: school.id },
        { email: 'mohd.ali@gmail.com', username: 'mohd.ali', password_hash: parentPw, name: 'Mohammad Ali', phone: '9876543222', role: 'parent', school_id: school.id },
    ]).returning('*');

    // ─── Classes ───
    const classNames = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const classes = await knex('classes').insert(
        classNames.map((name, i) => ({ name, numeric_order: i + 1, school_id: school.id }))
    ).returning('*');

    // ─── Sections ───
    const sectionInserts: any[] = [];
    for (const cls of classes) {
        ['A', 'B', 'C'].forEach((sec) => {
            sectionInserts.push({ class_id: cls.id, name: sec, school_id: school.id });
        });
    }
    const sections = await knex('sections').insert(sectionInserts).returning('*');

    // ─── Subjects ───
    const subjectInserts: any[] = [];
    for (const cls of classes) {
        if (cls.numeric_order >= 1 && cls.numeric_order <= 5) {
            ['English', 'Hindi', 'Mathematics', 'EVS', 'GK'].forEach((sub) => {
                subjectInserts.push({ name: sub, class_id: cls.id, is_optional: false, school_id: school.id });
            });
        } else if (cls.numeric_order >= 6 && cls.numeric_order <= 10) {
            ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science'].forEach((sub) => {
                subjectInserts.push({ name: sub, class_id: cls.id, is_optional: false, school_id: school.id });
            });
            subjectInserts.push({ name: 'Computer Science', class_id: cls.id, is_optional: true, school_id: school.id });
        } else {
            ['English', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science'].forEach((sub) => {
                subjectInserts.push({ name: sub, class_id: cls.id, is_optional: false, school_id: school.id });
            });
        }
    }
    await knex('subjects').insert(subjectInserts);

    // ─── Helper lookups ───
    const classV = classes.find((c: any) => c.name === 'V')!;
    const classVI = classes.find((c: any) => c.name === 'VI')!;
    const classX = classes.find((c: any) => c.name === 'X')!;
    const sectionVA = sections.find((s: any) => s.class_id === classV.id && s.name === 'A')!;
    const sectionVIA = sections.find((s: any) => s.class_id === classVI.id && s.name === 'A')!;
    const sectionXA = sections.find((s: any) => s.class_id === classX.id && s.name === 'A')!;

    // ─── Sample Students ───
    const sampleStudents = await knex('students').insert([
        {
            admission_no: 'CONCIL2025001', name: 'Aarav Kumar', dob: '2014-05-15', gender: 'male',
            category: 'GEN', father_name: 'Rajesh Kumar', father_phone: '9876543220', mother_name: 'Sunita Kumar',
            current_class_id: classV.id, current_section_id: sectionVA.id, current_roll_no: '1',
            academic_year_id: academicYear.id, status: 'active', admission_date: '2020-04-01',
            address: '123, Defence Colony', city: 'New Delhi', state: 'Delhi', pincode: '110024', school_id: school.id,
        },
        {
            admission_no: 'CONCIL2025002', name: 'Priya Gupta', dob: '2013-08-22', gender: 'female',
            category: 'OBC', father_name: 'Sunil Gupta', father_phone: '9876543221', mother_name: 'Reena Gupta',
            current_class_id: classVI.id, current_section_id: sectionVIA.id, current_roll_no: '1',
            academic_year_id: academicYear.id, status: 'active', admission_date: '2019-04-01',
            address: '456, Sector 15', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', school_id: school.id,
        },
        {
            admission_no: 'CONCIL2025003', name: 'Mohammad Zaid', dob: '2010-12-10', gender: 'male',
            category: 'GEN', father_name: 'Mohammad Ali', father_phone: '9876543222', mother_name: 'Fatima Ali',
            current_class_id: classX.id, current_section_id: sectionXA.id, current_roll_no: '1',
            academic_year_id: academicYear.id, status: 'active', admission_date: '2016-04-01',
            address: '789, Jamia Nagar', city: 'New Delhi', state: 'Delhi', pincode: '110025', school_id: school.id,
        },
        {
            admission_no: 'CONCIL2025004', name: 'Sneha Patel', dob: '2014-03-08', gender: 'female',
            category: 'GEN', father_name: 'Vikram Patel', father_phone: '9876543223', mother_name: 'Kavita Patel',
            current_class_id: classV.id, current_section_id: sectionVA.id, current_roll_no: '2',
            academic_year_id: academicYear.id, status: 'active', admission_date: '2020-04-01',
            address: '321, Vasant Kunj', city: 'New Delhi', state: 'Delhi', pincode: '110070', school_id: school.id,
        },
        {
            admission_no: 'CONCIL2025005', name: 'Rohan Singh', dob: '2013-11-25', gender: 'male',
            category: 'SC', father_name: 'Harjeet Singh', father_phone: '9876543224', mother_name: 'Gurpreet Kaur',
            current_class_id: classVI.id, current_section_id: sectionVIA.id, current_roll_no: '2',
            academic_year_id: academicYear.id, status: 'active', admission_date: '2019-04-01',
            address: '654, Dwarka', city: 'New Delhi', state: 'Delhi', pincode: '110075', school_id: school.id,
        },
    ]).returning('*');

    // ─── Student Class History ───
    for (const student of sampleStudents) {
        await knex('student_class_history').insert({
            student_id: student.id,
            class_id: student.current_class_id,
            section_id: student.current_section_id,
            roll_no: student.current_roll_no,
            academic_year_id: academicYear.id,
            status: 'admitted',
            school_id: school.id,
        });
    }

    // ─── Link parents ───
    await knex('student_parents').insert([
        { student_id: sampleStudents[0].id, parent_user_id: parentUsers[0].id, relation: 'father', school_id: school.id },
        { student_id: sampleStudents[1].id, parent_user_id: parentUsers[1].id, relation: 'father', school_id: school.id },
        { student_id: sampleStudents[2].id, parent_user_id: parentUsers[2].id, relation: 'father', school_id: school.id },
    ]);

    // ─── Fee Structures ───
    for (const fd of [
        { class_id: classV.id, total: 24000 },
        { class_id: classVI.id, total: 30000 },
        { class_id: classX.id, total: 42000 },
    ]) {
        const [fs] = await knex('fee_structures').insert({
            class_id: fd.class_id, academic_year_id: academicYear.id,
            total_amount: fd.total, installments_count: 4, description: 'Annual tuition fee', school_id: school.id,
        }).returning('*');

        const amt = fd.total / 4;
        await knex('fee_installments').insert(
            ['2025-06-15', '2025-09-15', '2025-12-15', '2026-03-15'].map((d, i) => ({
                fee_structure_id: fs.id, installment_no: i + 1, amount: amt, due_date: d, school_id: school.id,
            }))
        );
    }

    // ─── Staff ───
    await knex('staff').insert([
        { user_id: teacherUsers[0].id, name: 'Ram Sharma', employee_id: 'EMP001', designation: 'PGT Mathematics', department: 'Mathematics', phone: '9876543211', email: 'ram.sharma@concilio.edu', salary: 55000, join_date: '2018-07-01', qualification: 'M.Sc. Mathematics, B.Ed.', school_id: school.id },
        { user_id: teacherUsers[1].id, name: 'Priya Singh', employee_id: 'EMP002', designation: 'TGT English', department: 'English', phone: '9876543212', email: 'priya.singh@concilio.edu', salary: 45000, join_date: '2019-04-01', qualification: 'M.A. English, B.Ed.', school_id: school.id },
        { user_id: teacherUsers[2].id, name: 'Ankit Verma', employee_id: 'EMP003', designation: 'TGT Science', department: 'Science', phone: '9876543213', email: 'ankit.verma@concilio.edu', salary: 45000, join_date: '2020-07-01', qualification: 'M.Sc. Physics, B.Ed.', school_id: school.id },
    ]);

    // ─── Notice ───
    await knex('notices').insert({
        title: 'Welcome to Academic Session 2025-26',
        content: 'Dear Parents and Students, the new academic session 2025-26 begins from April 1, 2025. Please ensure all fees are cleared and uniforms are ready.',
        target_audience: 'all', created_by: adminUser.id, school_id: school.id,
    });

    console.log('✅ Seed data inserted successfully');
    console.log('📋 Demo credentials:');
    console.log(`   School Code: DEMO01`);
    console.log('   Owner:   admin@concilio.edu / admin@123');
    console.log('   Teacher: ram.sharma@concilio.edu / teacher@123');
}
