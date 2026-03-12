import db from './src/config/database';

async function listClasses() {
  const classes = await db('classes').select('name');
  console.log(classes);
  process.exit(0);
}

listClasses();
