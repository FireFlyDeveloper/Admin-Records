import { PoolClient } from 'pg';
import { constraintExists, dropConstraintIfExists, indexExists } from '../scripts/migrationHelpers';

const PARTIAL_EMAIL_INDEX = 'idx_users_email_active';

/**
 * Allow re-creating a soft-deleted user's email by replacing the full UNIQUE(email)
 * constraint with a partial unique index WHERE deleted_at IS NULL.
 *
 * This means:
 * - Active users (deleted_at IS NULL) still have a unique email constraint at the DB level.
 * - Soft-deleted users (deleted_at IS NOT NULL) are excluded from the unique constraint,
 *   allowing the same email to exist in archived rows.
 * - The application-level createUser already resurrects soft-deleted users (SELECT then UPDATE
 *   instead of INSERT), so this change is a belt-and-suspenders DB-level fix that also enables
 *   direct DB inserts for operators who bypass the application layer.
 */
export async function up(client: PoolClient): Promise<void> {
  // Remove the old full UNIQUE constraint on email
  if (await constraintExists(client, 'users', 'users_email_key')) {
    await dropConstraintIfExists(client, 'users', 'users_email_key');
  }

  // Create partial unique index — only active (non-deleted) users are constrained
  if (!(await indexExists(client, PARTIAL_EMAIL_INDEX))) {
    await client.query(
      `CREATE UNIQUE INDEX ${PARTIAL_EMAIL_INDEX} ON users (email) WHERE deleted_at IS NULL`
    );
  }
}

export async function down(client: PoolClient): Promise<void> {
  // Remove partial unique index
  if (await indexExists(client, PARTIAL_EMAIL_INDEX)) {
    await client.query(`DROP INDEX ${PARTIAL_EMAIL_INDEX}`);
  }

  // Restore the original full UNIQUE constraint on email.
  // NOTE: this will fail if there are duplicate emails among soft-deleted users —
  // that situation should not arise with correct application-level undeletion, but
  // if it does, clean up the duplicate soft-deleted rows first.
  if (!(await constraintExists(client, 'users', 'users_email_key'))) {
    await client.query(
      `ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)`
    );
  }
}
