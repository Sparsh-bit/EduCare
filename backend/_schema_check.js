const knex = require('knex');
const db = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    port: 5432,
    database: 'ndps_erp',
    user: 'sparsh',
    password: '',
  },
});

async function main() {
  const tables = ['fee_payments', 'students', 'bank_statements', 'upi_qr_codes', 'payment_receipt_sequence', 'vendor_bills', 'fee_structures', 'exams', 'attendance', 'tax_config', 'school_settings', 'tds_certificates', 'vendor_bill_items', 'classes'];
  for (const t of tables) {
    const res = await db.raw(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position",
      [t]
    );
    console.log(`\n=== ${t} (${res.rows.length} cols) ===`);
    if (res.rows.length === 0) {
      console.log('  TABLE DOES NOT EXIST');
    } else {
      res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));
    }
  }
  await db.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });
