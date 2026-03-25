'use strict';
// Plain CommonJS knexfile used by the migrate script in production.
// Avoids ESM/CJS interop issues with Knex 3.x + Node 20/22.

require('dotenv').config();

// Smart SSL: Supabase pooler hosts don't pass strict cert validation.
// Override via DB_SSL_REJECT_UNAUTHORIZED=true|false.
const host = process.env.DB_HOST || '';
const isSupabase = host.includes('supabase.co') || host.includes('pooler.supabase.com');
const sslOverride = process.env.DB_SSL_REJECT_UNAUTHORIZED;
const rejectUnauthorized = sslOverride === 'true' ? true
  : sslOverride === 'false' ? false
  : !isSupabase;

const connection = {
  host,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'postgres',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: (process.env.DB_SSL === 'true') ? { rejectUnauthorized } : false,
  // DATABASE_URL takes precedence if set (Railway Postgres public URL)
  ...(process.env.DATABASE_URL && {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),
};

module.exports = {
  development: {
    client: 'pg',
    connection,
    pool: { min: 0, max: 10 },
    migrations: { directory: './dist/migrations', extension: 'js' },
  },
  production: {
    client: 'pg',
    connection,
    pool: { min: 1, max: 20 },
    migrations: { directory: './dist/migrations', extension: 'js' },
  },
};
