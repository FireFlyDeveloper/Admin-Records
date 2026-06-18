import { PoolClient } from 'pg';

/**
 * Fix admin@local account that was seeded without the admin role.
 * The original seed script assigns the admin role only on initial creation
 * (when the user does not exist). This migration ensures admin@local always
 * has the admin role, whether it was seeded before this fix or freshly created.
 */
export async function up(client: PoolClient): Promise<void> {
  // Check if admin@local exists and is not soft-deleted
  const userResult = await client.query(
    `SELECT id FROM users WHERE email = 'admin@local' AND deleted_at IS NULL`
  );

  if (userResult.rows.length === 0) {
    console.log('admin@local user not found, skipping role assignment.');
    return;
  }

  const userId = userResult.rows[0].id;

  // Check if admin role exists
  const roleResult = await client.query(
    `SELECT id FROM roles WHERE name = 'admin'`
  );

  if (roleResult.rows.length === 0) {
    console.log('admin role not found, skipping role assignment.');
    return;
  }

  const roleId = roleResult.rows[0].id;

  // Assign admin role if not already assigned
  await client.query(
    `INSERT INTO user_roles (user_id, role_id, assigned_by)
     VALUES ($1, $2, $1)
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [userId, roleId]
  );

  console.log(`admin@local role assignment complete (user_id=${userId}, role_id=${roleId})`);
}

export async function down(_client: PoolClient): Promise<void> {
  // No-op: we don't want to remove the admin role on downgrade
}
