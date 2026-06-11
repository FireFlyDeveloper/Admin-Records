import { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE items
    ADD COLUMN IF NOT EXISTS item_model TEXT
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query(`ALTER TABLE items DROP COLUMN IF EXISTS item_model`);
}
