import { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE checkout_transaction_items
    ALTER COLUMN lot_id DROP NOT NULL
  `);
}

export async function down(client: PoolClient): Promise<void> {
  // Keep rollback conservative: this migration may create legitimate
  // trackable checkout rows with lot_id = NULL.
}
