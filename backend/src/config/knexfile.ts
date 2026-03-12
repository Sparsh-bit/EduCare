import type { Knex } from 'knex';
import { config } from './index';

const connection = {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: config.db.connectionTimeoutMs,
};

// afterCreate hook: sets app.bypass_rls = 'on' so the backend's privileged
// connection bypasses Row-Level Security (RLS is enforced at app level via school_id).
// For Supabase with service_role key, the role already has BYPASSRLS, so this
// is a belt-and-suspenders safety measure for self-hosted deployments.
type PgConn = { query: (sql: string, cb: (err: Error | null) => void) => void };
const bypassRlsAfterCreate = (
    conn: PgConn,
    done: (err: Error | null, conn: PgConn) => void,
): void => {
    conn.query("SET app.bypass_rls = 'on'", (err) => {
        done(err, conn);
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
            afterCreate: bypassRlsAfterCreate,
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
            afterCreate: bypassRlsAfterCreate,
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
            afterCreate: bypassRlsAfterCreate,
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
};

export default knexConfig;
