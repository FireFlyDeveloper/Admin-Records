"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../utils/db");
const password_1 = require("../utils/password");
async function seed() {
    const existing = await (0, db_1.query)(`SELECT id FROM users WHERE email = 'admin@local' AND deleted_at IS NULL`);
    if (existing.rows.length > 0) {
        console.log('Admin user already exists, skipping seed.');
        process.exit(0);
    }
    const passwordHash = await (0, password_1.hashPassword)('admin123');
    const userResult = await (0, db_1.query)(`INSERT INTO users (email, display_name, password_hash, is_active)
     VALUES ('admin@local', 'System Admin', $1, true)
     RETURNING id`, [passwordHash]);
    const userId = userResult.rows[0].id;
    const roleResult = await (0, db_1.query)(`SELECT id FROM roles WHERE name = 'admin'`);
    const roleId = roleResult.rows[0].id;
    await (0, db_1.query)(`INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $1)`, [userId, roleId]);
    console.log('Seeded admin user: admin@local / admin123');
    process.exit(0);
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
