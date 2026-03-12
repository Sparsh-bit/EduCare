require('dotenv').config({ path: '.env' });
const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  },
});

const checkTables = [
  'teacher_subject_assignments', 'subjects', 'academic_years',
  'staff', 'students', 'attendance', 'fee_payments', 'fee_structures',
  'fee_installments', 'classes', 'sections', 'schools', 'users',
  'rte_quota_config', 'rte_entitlement_records', 'rte_reimbursement_claims',
  'student_documents', 'notices', 'sms_templates', 'sms_logs',
  'enquiries', 'enquiry_follow_ups'
];

Promise.all(checkTables.map(t => knex.schema.hasTable(t).then(exists => ({ t, exists }))))
  .then(results => {
    results.forEach(({ t, exists }) => console.log(`${exists ? '✅' : '❌'} ${t}`));
    knex.destroy();
  })
  .catch(e => { console.error(e.message); knex.destroy(); });
