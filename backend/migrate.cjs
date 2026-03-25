'use strict';
/**
 * migrate.cjs — Custom Knex migration runner
 *
 * WHY THIS FILE EXISTS:
 * Knex CLI's importFile() uses isModuleType()/get-package-type to decide whether
 * to use require() or import(). On Node 22+, require() on CJS files can trigger
 * importSyncForRequire() which fails with "Unexpected token '{'" when Node's
 * internal ESM detector mis-identifies compiled TypeScript CJS output.
 *
 * This runner bypasses importFile entirely by using fs.readFileSync + vm.runInNewContext,
 * guaranteeing CJS evaluation regardless of Node version.
 *
 * ALSO: If knex_migrations table contains .ts filenames (leftover from dev ts-node runs),
 * this runner renames them to .js before proceeding so validation passes.
 */
require('dotenv').config();

const fs     = require('fs');
const path   = require('path');
const vm     = require('vm');
const Module = require('module');
const knexLib = require('knex');
const config  = require('./knexfile.cjs');

const env = process.env.NODE_ENV || 'development';
const cfg = config[env];
const db  = knexLib(cfg);

// Force CJS evaluation of a migration file via vm — bypasses any Node ESM detection.
function loadMigrationFile(filepath) {
    const code = fs.readFileSync(filepath, 'utf8');
    const modExports = {};
    const mod = { exports: modExports };
    const req = Module.createRequire(path.resolve(filepath));
    const ctx = vm.createContext({
        exports: modExports, module: mod, require: req,
        __filename: path.resolve(filepath),
        __dirname: path.dirname(path.resolve(filepath)),
        process, console, Buffer,
        setTimeout, clearTimeout, setInterval, clearInterval, setImmediate, clearImmediate,
    });
    new vm.Script(code, { filename: filepath }).runInContext(ctx);
    return mod.exports;
}

const migDir = path.resolve(__dirname, cfg.migrations.directory);
const migExt = cfg.migrations.extension || 'js';

const migrationSource = {
    getMigrations() {
        const files = fs.readdirSync(migDir)
            .filter(f => f.endsWith('.' + migExt))
            .sort();
        return Promise.resolve(files.map(name => ({ name, file: path.join(migDir, name) })));
    },
    getMigrationName(migration) { return migration.name; },
    getMigration(migration)     { return Promise.resolve(loadMigrationFile(migration.file)); },
};

// Repair knex_migrations if it has .ts filenames (from dev ts-node runs).
async function repairMigrationTable() {
    const tbl = 'knex_migrations';
    try {
        if (!(await db.schema.hasTable(tbl))) return;
        const rows = await db(tbl).select('id', 'name').where('name', 'like', '%.ts');
        if (rows.length === 0) return;
        console.log('  Repairing ' + rows.length + ' migration entries (.ts -> .js)...');
        for (const row of rows) {
            await db(tbl).where('id', row.id).update({ name: row.name.replace(/\.ts$/, '.js') });
        }
        console.log('  Repair complete.');
    } catch (err) {
        console.warn('  Warning: migration table repair skipped:', err.message);
    }
}

async function main() {
    try {
        await repairMigrationTable();
        const [batch, ran] = await db.migrate.latest({ migrationSource });
        if (ran.length === 0) {
            console.log('Migrations: already up to date');
        } else {
            console.log('Migrations: batch ' + batch + ', ran ' + ran.length + ' file(s):');
            ran.forEach(function(f) { console.log('  + ' + f); });
        }
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        await db.destroy().catch(function() {});
    }
}

main();
