"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("../utils/db"));
const MIGRATIONS_DIR = '/app/dist/migrations';
async function ensureMigrationsTable(client) {
    await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
async function getAppliedMigrations(client) {
    const result = await client.query('SELECT name FROM schema_migrations ORDER BY name');
    return new Set(result.rows.map((r) => r.name));
}
async function recordMigration(client, name) {
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
}
async function unrecordMigration(client, name) {
    await client.query('DELETE FROM schema_migrations WHERE name = $1', [name]);
}
function listMigrationFiles() {
    if (!fs_1.default.existsSync(MIGRATIONS_DIR))
        return [];
    const files = fs_1.default
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.js') && !f.endsWith('.d.js'))
        .map((f) => {
        const timestamp = f.match(/^(\d{14})_/)?.[1] ?? f;
        return { name: f, filepath: path_1.default.join(MIGRATIONS_DIR, f), timestamp };
    })
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return files;
}
async function runMigration(file, direction) {
    const mod = require(file.filepath);
    const fn = mod[direction];
    if (typeof fn !== 'function') {
        throw new Error(`Migration ${file.name} does not export ${direction}()`);
    }
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        await fn(client);
        if (direction === 'up') {
            await recordMigration(client, file.name);
        }
        else {
            await unrecordMigration(client, file.name);
        }
        await client.query('COMMIT');
        console.log(`[migrate] ${direction.toUpperCase()}  ${file.name}`);
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
async function migrate() {
    const client = await db_1.default.connect();
    try {
        await ensureMigrationsTable(client);
        const applied = await getAppliedMigrations(client);
        client.release();
        const files = listMigrationFiles();
        let ran = 0;
        for (const file of files) {
            if (!applied.has(file.name)) {
                await runMigration(file, 'up');
                ran++;
            }
        }
        if (ran === 0) {
            console.log('[migrate] No pending migrations');
        }
        else {
            console.log(`[migrate] Applied ${ran} migration(s)`);
        }
    }
    catch (e) {
        client.release();
        console.error('[migrate] Error:', e);
        process.exit(1);
    }
}
async function rollback(steps = 1) {
    const client = await db_1.default.connect();
    try {
        await ensureMigrationsTable(client);
        const applied = Array.from(await getAppliedMigrations(client));
        client.release();
        const files = listMigrationFiles();
        const appliedFiles = files.filter((f) => applied.includes(f.name));
        const toRollback = appliedFiles.slice(-steps).reverse();
        if (toRollback.length === 0) {
            console.log('[migrate] Nothing to rollback');
            return;
        }
        for (const file of toRollback) {
            await runMigration(file, 'down');
        }
        console.log(`[migrate] Rolled back ${toRollback.length} migration(s)`);
    }
    catch (e) {
        client.release();
        console.error('[migrate] Rollback error:', e);
        process.exit(1);
    }
}
async function status() {
    const client = await db_1.default.connect();
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    client.release();
    const files = listMigrationFiles();
    console.log('\nMigration Status');
    console.log('----------------');
    for (const file of files) {
        const mark = applied.has(file.name) ? '✓' : ' ';
        console.log(` [${mark}] ${file.name}`);
    }
    console.log();
}
async function create(name) {
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const filename = `${timestamp}_${name}.ts`;
    const filepath = path_1.default.join(MIGRATIONS_DIR, filename);
    if (!fs_1.default.existsSync(MIGRATIONS_DIR)) {
        fs_1.default.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }
    const template = `import { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  // TODO: implement migration
}

export async function down(client: PoolClient): Promise<void> {
  // TODO: implement rollback
}
`;
    fs_1.default.writeFileSync(filepath, template);
    console.log(`[migrate] Created ${filepath}`);
}
// CLI
const cmd = process.argv[2];
const arg = process.argv[3];
(async () => {
    try {
        if (cmd === 'rollback') {
            await rollback(Number(arg) || 1);
        }
        else if (cmd === 'status') {
            await status();
        }
        else if (cmd === 'create') {
            if (!arg) {
                console.error('Usage: npm run migrate create <name>');
                process.exit(1);
            }
            await create(arg);
        }
        else {
            await migrate();
        }
        await db_1.default.end();
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
