import type { Knex } from 'knex';
import { config } from './index';

const connection = {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    // SSL: enabled for Supabase/RDS hosts. rejectUnauthorized defaults to false
    // for Supabase pooler hosts (*.pooler.supabase.com / *.supabase.co) and true
    // for all other hosts. Override via DB_SSL_REJECT_UNAUTHORIZED=true|false.
    ssl: config.db.ssl
        ? { rejectUnauthorized: config.db.sslRejectUnauthorized }
        : false,
    connectionTimeoutMillis: config.db.connectionTimeoutMs,
};

// afterCreate hook — runs for every new connection acquired from the pool.
//   1. Bypasses RLS  — app-level school_id filter is the primary tenant fence;
//      this is a belt-and-suspenders guard for self-hosted Postgres.
//   2. statement_timeout — kills runaway queries before the 30 s HTTP timeout fires.
//   3. lock_timeout      — prevents deadlocks from stalling the pool indefinitely.
const STATEMENT_TIMEOUT_MS = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '25000');
const LOCK_TIMEOUT_MS      = parseInt(process.env.DB_LOCK_TIMEOUT_MS      || '5000');

type PgConn = { query: (sql: string, cb: (err: Error | null) => void) => void };

const afterCreate = (
    conn: PgConn,
    done: (err: Error | null, conn: PgConn) => void,
): void => {
    conn.query("SET app.bypass_rls = 'on'", (err1) => {
        if (err1) return done(err1, conn);
        conn.query(`SET statement_timeout = ${STATEMENT_TIMEOUT_MS}`, (err2) => {
            if (err2) return done(err2, conn);
            conn.query(`SET lock_timeout = ${LOCK_TIMEOUT_MS}`, (err3) => {
                done(err3, conn);
            });
        });
    });
};

const knexConfig: { [key: string]: Knex.Config } = {
    // test uses the same PG connection; unit tests mock db at module level
    test: {
        client: 'pg',
        connection,
        pool: {
            min: 0,
            max: 2,
            afterCreate,
        },
        migrations: { directory: '../migrations', extension: 'ts' },
    },
    development: {
        client: 'pg',
        connection,
        pool: {
            min: config.db.poolMin,
            max: config.db.poolMax,
            idleTimeoutMillis: config.db.idleTimeoutMs,
            acquireTimeoutMillis: config.db.acquireTimeoutMs,
            createTimeoutMillis: config.db.connectionTimeoutMs,
            createRetryIntervalMillis: 200,
            reapIntervalMillis: 1000,
            propagateCreateError: false,
            afterCreate,
        },
        acquireConnectionTimeout: config.db.acquireTimeoutMs,
        migrations: {
            directory: '../migrations',
            extension: 'ts',
        },
        seeds: {
            directory: '../seeds',
            extension: 'ts',
        },
    },
    production: {
        client: 'pg',
        connection,
        pool: {
            min: Math.max(1, config.db.poolMin),
            max: config.db.poolMax,
            idleTimeoutMillis: config.db.idleTimeoutMs,
            acquireTimeoutMillis: config.db.acquireTimeoutMs,
            createTimeoutMillis: config.db.connectionTimeoutMs,
            createRetryIntervalMillis: 200,
            reapIntervalMillis: 1000,
            propagateCreateError: false,
            afterCreate,
        },
        acquireConnectionTimeout: config.db.acquireTimeoutMs,
        migrations: {
            directory: '../migrations',
            extension: 'js',
        },
        seeds: {
            directory: '../seeds',
            extension: 'js',
        },
    },
};

export default knexConfig;
