const { Client } = require('pg');

const regions = [
  'ap-south-1', // Mumbai
  'eu-central-1', // Frankfurt
  'ap-southeast-1', // Singapore
  'ap-northeast-1', // Tokyo
  'us-east-1', // N. Virginia
  'us-west-1', // N. California
  'us-west-2', // Oregon
  'eu-west-1', // Ireland
  'eu-west-2', // London
  'sa-east-1', // Sao Paulo
  'ca-central-1', // Canada
  'ap-southeast-2', // Sydney
  'eu-north-1', // Stockholm
  'ap-northeast-2', // Seoul
  'eu-south-1', // Milan
];

async function testRegion(region) {
  const connectionString = `postgresql://postgres.rrywtpmuxeugruwmnozq:sparsh%404200@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log(`Success in region: ${region}`);
    await client.end();
    return true;
  } catch (err) {
    // console.error(`Failed ${region}:`, err.message);
    return false;
  }
}

async function run() {
  for (const region of regions) {
    process.stdout.write(`Testing ${region}... `);
    const success = await testRegion(region);
    if (success) {
      console.log('FOUND!');
      process.exit(0);
    } else {
      console.log('No.');
    }
  }
}
run();
