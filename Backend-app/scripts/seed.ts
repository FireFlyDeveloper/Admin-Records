import { query } from '../utils/db';
import { hashPassword } from '../utils/password';

async function seed() {
  const existing = await query(`SELECT id FROM users WHERE email = 'admin@local' AND deleted_at IS NULL`);
  if (existing.rows.length === 0) {
    // Create admin user if it doesn't exist
    const passwordHash = await hashPassword('admin123');
    const userResult = await query(
      `INSERT INTO users (email, display_name, password_hash, is_active)
       VALUES ('admin@local', 'System Admin', $1, true)
       RETURNING id`,
      [passwordHash]
    );
    const userId = userResult.rows[0].id;
    const roleResult = await query(`SELECT id FROM roles WHERE name = 'admin'`);
    const roleId = roleResult.rows[0].id;
    await query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $1)`,
      [userId, roleId]
    );
    console.log('Seeded admin user: admin@local / admin123');
  } else {
    // admin@local exists but may be missing the admin role (seeded before the role assignment was added)
    const userId = existing.rows[0].id;
    const roleResult = await query(`SELECT id FROM roles WHERE name = 'admin'`);
    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;
      await query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $1)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, roleId]
      );
      console.log('admin@local role assignment ensured.');
    }
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
