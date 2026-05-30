"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.columnExists = columnExists;
exports.tableExists = tableExists;
exports.constraintExists = constraintExists;
exports.indexExists = indexExists;
exports.triggerExists = triggerExists;
exports.addColumnIfNotExists = addColumnIfNotExists;
exports.dropColumnIfExists = dropColumnIfExists;
exports.dropConstraintIfExists = dropConstraintIfExists;
exports.dropIndexIfExists = dropIndexIfExists;
exports.dropTriggerIfExists = dropTriggerIfExists;
/**
 * Safe helpers for idempotent schema changes.
 * Use these in migrations so they never crash on re-run or partial states.
 */
async function columnExists(client, table, column) {
    const result = await client.query(`SELECT 1 FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`, [table, column]);
    return result.rows.length > 0;
}
async function tableExists(client, table) {
    const result = await client.query(`SELECT 1 FROM information_schema.tables
     WHERE table_name = $1`, [table]);
    return result.rows.length > 0;
}
async function constraintExists(client, table, constraint) {
    const result = await client.query(`SELECT 1 FROM information_schema.table_constraints
     WHERE table_name = $1 AND constraint_name = $2`, [table, constraint]);
    return result.rows.length > 0;
}
async function indexExists(client, index) {
    const result = await client.query(`SELECT 1 FROM pg_indexes WHERE indexname = $1`, [index]);
    return result.rows.length > 0;
}
async function triggerExists(client, trigger, table) {
    const result = await client.query(`SELECT 1 FROM pg_trigger WHERE tgname = $1 AND tgrelid = $2::regclass`, [trigger, table]);
    return result.rows.length > 0;
}
async function addColumnIfNotExists(client, table, column, def) {
    if (!(await columnExists(client, table, column))) {
        await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    }
}
async function dropColumnIfExists(client, table, column) {
    if (await columnExists(client, table, column)) {
        await client.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
    }
}
async function dropConstraintIfExists(client, table, constraint) {
    if (await constraintExists(client, table, constraint)) {
        await client.query(`ALTER TABLE ${table} DROP CONSTRAINT ${constraint}`);
    }
}
async function dropIndexIfExists(client, index) {
    if (await indexExists(client, index)) {
        await client.query(`DROP INDEX ${index}`);
    }
}
async function dropTriggerIfExists(client, trigger, table) {
    if (await triggerExists(client, trigger, table)) {
        await client.query(`DROP TRIGGER ${trigger} ON ${table}`);
    }
}
