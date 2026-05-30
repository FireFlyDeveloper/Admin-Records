"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.getClient = getClient;
exports.withTransaction = withTransaction;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 300_000, // 5 minutes — don't kill idle connections too fast
    connectionTimeoutMillis: 10_000, // 10s timeout for new connections
    // Keep connections alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 60_000,
});
pool.on('error', (err) => {
    console.error('DB pool error (non-fatal):', err.message);
    // Don't exit — the pool will recreate connections as needed
});
async function query(text, params) {
    return pool.query(text, params);
}
async function getClient() {
    return pool.connect();
}
async function withTransaction(fn) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
exports.default = pool;
