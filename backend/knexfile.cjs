'use strict';
// Plain CommonJS knexfile used by the migrate script in production.
// Avoids ESM/CJS interop issues with Knex 3.x + Node 20.

require('dotenv').config();

const isProd = (process.env.NODE_ENV || 'development') === 'production';

const connection = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'postgres',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: (process.env.DB_SSL === 'true') ? { rejectUnauthorized: false } : false,
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
