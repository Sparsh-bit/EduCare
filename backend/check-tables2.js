require('dotenv').config({ path: '.env' });
const knex = require('knex')({
  client: 'pg',
  connection: { host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD || '' },
});

const tables = ['message_log', 'audit_logs', 'fee_reminders', 'academic_years', 'student_class_history', 'payment_instruments', 'bounced_cheques', 'bank_reconciliation', 'salary_structures', 'payroll_runs', 'tax_config', 'udise_infrastructure'];

Promise.all(tables.map(t => knex.schema.hasTable(t).then(e => ({ t, e }))))
  .then(r => { r.forEach(({ t, e }) => console.log((e ? '✅' : '❌') + ' ' + t)); knex.destroy(); })
  .catch(e => { console.error(e.message); knex.destroy(); });
