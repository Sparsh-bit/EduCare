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

knex('users')
  .select('id', 'username', 'email', 'role', 'school_id')
  .limit(5)
  .then(rows => {
    console.log('Users:', JSON.stringify(rows, null, 2));
    knex.destroy();
  })
  .catch(e => { console.error(e.message); knex.destroy(); });
