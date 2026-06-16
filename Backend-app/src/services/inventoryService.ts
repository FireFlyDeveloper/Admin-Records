import { query, withTransaction } from '../utils/db';
import {
  Item,
  ItemLot,
  CheckoutTransaction,
  CheckoutTransactionItem,
  ReturnTransaction,
  ReturnTransactionItem,
} from '../types';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../utils/errors';

// --- Helpers ---



// --- Items ---

export async function listItems(filters: {
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  room?: string;
  expiration?: string;
}): Promise<Item[]> {
  const conditions: string[] = ['i.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;
  let joinClause = '';

  if (filters.type) {
    conditions.push(`i.item_type = $${idx++}`);
    values.push(filters.type);
  }
  if (filters.category) {
    conditions.push(`i.category = $${idx++}`);
    values.push(filters.category);
  }
  if (filters.status) {
    // "missing" / "present" / "transporting" / "inactive" / "maintenance" live in
    // item_presence_state.presence_status, NOT items.status. Route those through
    // the presence join so the dashboard modal matches the KPI count.
    const presenceStatuses = ['present', 'missing', 'transporting', 'inactive', 'maintenance'];
    if (presenceStatuses.includes(filters.status)) {
      joinClause += ` JOIN item_presence_state ips_status ON ips_status.item_id = i.id`;
      conditions.push(`ips_status.presence_status = $${idx++}`);
      values.push(filters.status);
    } else {
      conditions.push(`i.status = $${idx++}`);
      values.push(filters.status);
    }
  }
  if (filters.search) {
    conditions.push(`(i.name ILIKE $${idx} OR i.description ILIKE $${idx} OR i.sku ILIKE $${idx} OR i.item_model ILIKE $${idx})`);
    values.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.room) {
    joinClause += ` JOIN item_presence_state ips ON ips.item_id = i.id`;
    conditions.push(`ips.current_room_id = $${idx++}`);
    values.push(filters.room);
  }

  let expirationSelect = `
    (SELECT MIN(expires_at) FROM item_lots il WHERE il.item_id = i.id AND il.quantity_on_hand > 0) as earliest_expiration,
    (SELECT MAX(expires_at) FROM item_lots il WHERE il.item_id = i.id AND il.quantity_on_hand > 0) as latest_expiration,
    EXISTS (
      SELECT 1 FROM item_lots il
      WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at < CURRENT_DATE
    ) as has_expired_stock,
    EXISTS (
      SELECT 1 FROM item_lots il
      WHERE il.item_id = i.id AND il.quantity_on_hand > 0
        AND il.expires_at >= CURRENT_DATE AND il.expires_at < CURRENT_DATE + INTERVAL '7 days'
    ) as has_expiring_soon,
    EXISTS (
      SELECT 1 FROM item_lots il
      WHERE il.item_id = i.id AND il.quantity_on_hand > 0
        AND il.expires_at >= CURRENT_DATE + INTERVAL '30 days'
    ) as has_healthy_stock,
    EXISTS (
      SELECT 1 FROM item_lots il
      WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at IS NULL
    ) as has_non_expiring,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM item_lots il
        WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at < CURRENT_DATE
      ) THEN 'expired'
      WHEN NOT EXISTS (
        SELECT 1 FROM item_lots il
        WHERE il.item_id = i.id AND il.quantity_on_hand > 0
      ) THEN 'no_stock'
      WHEN EXISTS (
        SELECT 1 FROM item_lots il
        WHERE il.item_id = i.id AND il.quantity_on_hand > 0
        AND il.expires_at >= CURRENT_DATE + INTERVAL '30 days'
      ) THEN 'healthy'
      WHEN EXISTS (
        SELECT 1 FROM item_lots il
        WHERE il.item_id = i.id AND il.quantity_on_hand > 0
        AND il.expires_at >= CURRENT_DATE AND il.expires_at < CURRENT_DATE + INTERVAL '7 days'
      ) THEN 'expiring_soon'
      WHEN EXISTS (
        SELECT 1 FROM item_lots il
        WHERE il.item_id = i.id AND il.quantity_on_hand > 0
        AND il.expires_at >= CURRENT_DATE + INTERVAL '7 days' AND il.expires_at < CURRENT_DATE + INTERVAL '30 days'
      ) THEN 'expiring_month'
      ELSE 'unknown'
    END as aggregate_expiration_status
  `;
  let quantitySelect = `
    CASE
      WHEN i.item_type = 'quantifiable' THEN
        COALESCE((SELECT SUM(quantity_on_hand) FROM item_lots WHERE item_id = i.id), 0)
      WHEN i.item_type = 'trackable' THEN
        COALESCE((SELECT COUNT(*) FROM item_presence_state WHERE item_id = i.id AND presence_status = 'present'), 0)
      ELSE 0
    END as total_stocks
  `;
  
  if (filters.expiration) {
    // Requires quantifiable items that have lots
    conditions.push(`i.item_type = 'quantifiable'`);
    if (filters.expiration === 'expired') {
      conditions.push(`EXISTS (SELECT 1 FROM item_lots il WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at < CURRENT_DATE)`);
    } else if (filters.expiration === 'expiring_soon') {
      conditions.push(`EXISTS (SELECT 1 FROM item_lots il WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at >= CURRENT_DATE AND il.expires_at < CURRENT_DATE + INTERVAL '7 days')`);
    } else if (filters.expiration === 'expiring_month') {
      conditions.push(`EXISTS (SELECT 1 FROM item_lots il WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at >= CURRENT_DATE + INTERVAL '7 days' AND il.expires_at < CURRENT_DATE + INTERVAL '30 days')`);
    } else if (filters.expiration === 'safe') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM item_lots il WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at < CURRENT_DATE + INTERVAL '30 days')`);
    }
  }

  const result = await query(
    `SELECT i.*, ${expirationSelect}, ${quantitySelect} FROM items i ${joinClause} WHERE ${conditions.join(' AND ')} ORDER BY i.name`,
    values
  );
  return result.rows;
}

export async function getItemById(id: string): Promise<Item> {
  const result = await query(
    `SELECT i.*,
     (SELECT MIN(expires_at) FROM item_lots il WHERE il.item_id = i.id AND il.quantity_on_hand > 0) as earliest_expiration,
     (SELECT MAX(expires_at) FROM item_lots il WHERE il.item_id = i.id AND il.quantity_on_hand > 0) as latest_expiration,
     EXISTS (
       SELECT 1 FROM item_lots il
       WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at < CURRENT_DATE
     ) as has_expired_stock,
     EXISTS (
       SELECT 1 FROM item_lots il
       WHERE il.item_id = i.id AND il.quantity_on_hand > 0
         AND il.expires_at >= CURRENT_DATE AND il.expires_at < CURRENT_DATE + INTERVAL '7 days'
     ) as has_expiring_soon,
     EXISTS (
       SELECT 1 FROM item_lots il
       WHERE il.item_id = i.id AND il.quantity_on_hand > 0
         AND il.expires_at >= CURRENT_DATE + INTERVAL '30 days'
     ) as has_healthy_stock,
     EXISTS (
       SELECT 1 FROM item_lots il
       WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at IS NULL
     ) as has_non_expiring,
     CASE
       WHEN EXISTS (
         SELECT 1 FROM item_lots il
         WHERE il.item_id = i.id AND il.quantity_on_hand > 0 AND il.expires_at < CURRENT_DATE
       ) THEN 'expired'
       WHEN NOT EXISTS (
         SELECT 1 FROM item_lots il
         WHERE il.item_id = i.id AND il.quantity_on_hand > 0
       ) THEN 'no_stock'
       WHEN EXISTS (
         SELECT 1 FROM item_lots il
         WHERE il.item_id = i.id AND il.quantity_on_hand > 0
         AND il.expires_at >= CURRENT_DATE + INTERVAL '30 days'
       ) THEN 'healthy'
       WHEN EXISTS (
         SELECT 1 FROM item_lots il
         WHERE il.item_id = i.id AND il.quantity_on_hand > 0
         AND il.expires_at >= CURRENT_DATE AND il.expires_at < CURRENT_DATE + INTERVAL '7 days'
       ) THEN 'expiring_soon'
       WHEN EXISTS (
         SELECT 1 FROM item_lots il
         WHERE il.item_id = i.id AND il.quantity_on_hand > 0
         AND il.expires_at >= CURRENT_DATE + INTERVAL '7 days' AND il.expires_at < CURRENT_DATE + INTERVAL '30 days'
       ) THEN 'expiring_month'
       ELSE 'unknown'
     END as aggregate_expiration_status,
     CASE
       WHEN i.item_type = 'quantifiable' THEN
         COALESCE((SELECT SUM(quantity_on_hand) FROM item_lots WHERE item_id = i.id), 0)
       WHEN i.item_type = 'trackable' THEN
         COALESCE((SELECT COUNT(*) FROM item_presence_state WHERE item_id = i.id AND presence_status = 'present'), 0)
       ELSE 0
     END as total_stocks
     FROM items i WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (result.rows.length === 0) throw new NotFoundError('Item not found');
  return result.rows[0];
}

export async function createItem(data: {
  item_type: 'trackable' | 'quantifiable';
  name: string;
  sku?: string | null;
  item_model?: string | null;
  category?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'maintenance';
  created_by: string;
}): Promise<Item> {
  const result = await query(
    `INSERT INTO items (item_type, name, sku, item_model, category, description, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.item_type,
      data.name,
      data.sku || null,
      data.item_model || null,
      data.category || null,
      data.description || null,
      data.status || 'active',
      data.created_by,
    ]
  );
  return result.rows[0];
}

export async function updateItem(
  id: string,
  data: {
    name?: string;
    sku?: string | null;
    item_model?: string | null;
    category?: string;
    description?: string;
    status?: 'active' | 'inactive' | 'maintenance';
  }
): Promise<Item> {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    sets.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.sku !== undefined) {
    sets.push(`sku = $${idx++}`);
    values.push(data.sku);
  }
  if (data.item_model !== undefined) {
    sets.push(`item_model = $${idx++}`);
    values.push(data.item_model);
  }
  if (data.category !== undefined) {
    sets.push(`category = $${idx++}`);
    values.push(data.category);
  }
  if (data.description !== undefined) {
    sets.push(`description = $${idx++}`);
    values.push(data.description);
  }
  if (data.status !== undefined) {
    sets.push(`status = $${idx++}`);
    values.push(data.status);
  }
  if (sets.length === 0) throw new ValidationError('No fields to update');

  sets.push(`updated_at = now()`);
  values.push(id);

  const result = await query(
    `UPDATE items SET ${sets.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
    values
  );
  if (result.rows.length === 0) throw new NotFoundError('Item not found');
  return result.rows[0];
}

export async function softDeleteItem(id: string): Promise<void> {
  const result = await query(
    `UPDATE items SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (result.rowCount === 0) throw new NotFoundError('Item not found');
}

// --- Lots ---

export async function listLotsByItem(itemId: string): Promise<ItemLot[]> {
  const result = await query(
    `SELECT il.*, i.name as item_name 
     FROM item_lots il
     JOIN items i ON i.id = il.item_id
     WHERE il.item_id = $1 
     ORDER BY il.created_at DESC`,
    [itemId]
  );
  return result.rows;
}

export async function listLotsByExpiration(status: string): Promise<ItemLot[]> {
  const conditions: string[] = [
    `i.deleted_at IS NULL`,
    `i.item_type = 'quantifiable'`,
    `il.quantity_on_hand > 0`,
  ];

  if (status === 'expired') {
    conditions.push(`il.expires_at < CURRENT_DATE`);
  } else if (status === 'expiring_soon') {
    conditions.push(`il.expires_at >= CURRENT_DATE AND il.expires_at < CURRENT_DATE + INTERVAL '7 days'`);
  } else if (status === 'expiring_month') {
    conditions.push(`il.expires_at >= CURRENT_DATE + INTERVAL '7 days' AND il.expires_at < CURRENT_DATE + INTERVAL '30 days'`);
  } else if (status === 'safe') {
    conditions.push(`il.expires_at IS NULL OR il.expires_at >= CURRENT_DATE + INTERVAL '30 days'`);
  } else {
    throw new ValidationError('Invalid expiration status');
  }

  const result = await query(
    `SELECT il.*, i.name as item_name
     FROM item_lots il
     JOIN items i ON i.id = il.item_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       il.expires_at NULLS LAST,
       i.name,
       il.lot_code`,
    []
  );
  return result.rows;
}

export async function getLotById(id: string): Promise<ItemLot> {
  const result = await query(
    `SELECT il.*, i.name as item_name 
     FROM item_lots il
     JOIN items i ON i.id = il.item_id
     WHERE il.id = $1`,
    [id]
  );
  if (result.rows.length === 0) throw new NotFoundError('Lot not found');
  return result.rows[0];
}

export async function createLot(data: {
  item_id: string;
  lot_code: string;
  quantity_total: number;
  purchased_at?: string;
  expires_at?: string;
  notes?: string;
}): Promise<ItemLot> {
  const item = await getItemById(data.item_id);
  if (item.item_type !== 'quantifiable') {
    throw new ValidationError('Lots can only be created for quantifiable items');
  }
  if (data.quantity_total < 0) {
    throw new ValidationError('quantity_total must be >= 0');
  }

  try {
    const result = await query(
      `INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
       VALUES ($1, $2, $3, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.item_id,
        data.lot_code,
        data.quantity_total,
        data.purchased_at || null,
        data.expires_at || null,
        data.notes || null,
      ]
    );
    return result.rows[0];
  } catch (err: any) {
    if (err.code === '23505') {
      throw new ConflictError('Lot code already exists for this item');
    }
    throw err;
  }
}

export async function updateLot(
  id: string,
  data: {
    lot_code?: string;
    quantity_total?: number;
    purchased_at?: string | null;
    expires_at?: string | null;
    notes?: string | null;
  }
): Promise<ItemLot> {
  return withTransaction(async (client) => {
    const currentResult = await client.query<ItemLot>(
      `SELECT * FROM item_lots WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (currentResult.rows.length === 0) throw new NotFoundError('Lot not found');

    const current = currentResult.rows[0];
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.lot_code !== undefined) {
      const lotCode = data.lot_code.trim();
      if (!lotCode) throw new ValidationError('lot_code cannot be empty');
      sets.push(`lot_code = $${idx++}`);
      values.push(lotCode);
    }

    if (data.quantity_total !== undefined) {
      const quantityTotal = Number(data.quantity_total);
      if (!Number.isFinite(quantityTotal) || quantityTotal < 0) {
        throw new ValidationError('quantity_total must be a non-negative number');
      }
      if (quantityTotal < current.quantity_out) {
        throw new ValidationError('quantity_total cannot be less than quantity currently checked out');
      }

      const quantityDelta = quantityTotal - current.quantity_total;
      const nextOnHand = current.quantity_on_hand + quantityDelta;
      if (nextOnHand < 0) {
        throw new ValidationError('Cannot reduce total below quantities already consumed or checked out');
      }

      sets.push(`quantity_total = $${idx++}`);
      values.push(quantityTotal);
      sets.push(`quantity_on_hand = $${idx++}`);
      values.push(nextOnHand);
    }

    if (data.purchased_at !== undefined) {
      sets.push(`purchased_at = $${idx++}`);
      values.push(data.purchased_at);
    }
    if (data.expires_at !== undefined) {
      sets.push(`expires_at = $${idx++}`);
      values.push(data.expires_at);
    }
    if (data.notes !== undefined) {
      sets.push(`notes = $${idx++}`);
      values.push(data.notes);
    }
    if (sets.length === 0) throw new ValidationError('No fields to update');

    sets.push(`updated_at = now()`);
    values.push(id);

    try {
      const result = await client.query<ItemLot>(
        `UPDATE item_lots SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictError('Lot code already exists for this item');
      }
      throw err;
    }
  });
}

export async function deleteLotById(id: string): Promise<ItemLot> {
  return withTransaction(async (client) => {
    const lotResult = await client.query<ItemLot>(
      `SELECT * FROM item_lots WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (lotResult.rows.length === 0) throw new NotFoundError('Lot not found');

    const lot = lotResult.rows[0];
    if (lot.quantity_out > 0) {
      throw new ValidationError('Cannot delete lot with quantity currently checked out');
    }

    const historyResult = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM checkout_transaction_items WHERE lot_id = $1`,
      [id]
    );
    if (Number(historyResult.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete lot with checkout history');
    }

    await client.query(`DELETE FROM item_lots WHERE id = $1`, [id]);
    return lot;
  });
}

export interface CheckoutLine {
  lot_id: string;
  quantity: number;
}

export async function createCheckout(
  checkedOutBy: string,
  lines: CheckoutLine[],
  notes?: string,
  isAdminOrStaff: boolean = false
): Promise<{ transaction: CheckoutTransaction; items: CheckoutTransactionItem[] }> {
  if (!lines || lines.length === 0) {
    throw new ValidationError('At least one checkout line is required');
  }

  const status = isAdminOrStaff ? 'open' : 'pending_approval';
  const normalizedLines = Array.from(
    lines.reduce((byLot, line) => {
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new ValidationError('Quantity must be greater than 0');
      }
      byLot.set(line.lot_id, (byLot.get(line.lot_id) ?? 0) + quantity);
      return byLot;
    }, new Map<string, number>())
  ).map(([lot_id, quantity]) => ({ lot_id, quantity }));

  return withTransaction(async (client) => {
    // Create transaction
    const txnResult = await client.query(
      `INSERT INTO checkout_transactions (checked_out_by, status, notes, tracking_status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [checkedOutBy, status, notes || null, status === 'open' ? 'approved' : 'pending']
    );
    const transaction: CheckoutTransaction = txnResult.rows[0];

    const items: CheckoutTransactionItem[] = [];

    for (const line of normalizedLines) {
      // Lock lot row
      const lotResult = await client.query(
        `SELECT * FROM item_lots WHERE id = $1 FOR UPDATE`,
        [line.lot_id]
      );
      if (lotResult.rows.length === 0) {
        throw new NotFoundError(`Lot ${line.lot_id} not found`);
      }
      const lot: ItemLot = lotResult.rows[0];

      // Verify item is quantifiable and active
      const itemResult = await client.query(
        `SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL`,
        [lot.item_id]
      );
      if (itemResult.rows.length === 0) {
        throw new NotFoundError(`Item for lot ${line.lot_id} not found`);
      }
      const item: Item = itemResult.rows[0];
      if (item.item_type !== 'quantifiable') {
        throw new ValidationError('Checkout is only allowed for quantifiable items');
      }
      if (item.status !== 'active') {
        throw new ValidationError(`Item ${item.name} is not active`);
      }

      // Stock validation (always validate, even for pending)
      if (lot.quantity_on_hand < line.quantity) {
        throw new ValidationError(
          `Insufficient stock for lot ${lot.lot_code}: available ${lot.quantity_on_hand}, requested ${line.quantity}`
        );
      }

      // Only deduct stock for admin/staff immediate checkouts
      if (status === 'open') {
        await client.query(
          `UPDATE item_lots
           SET quantity_on_hand = quantity_on_hand - $1,
               quantity_out = quantity_out + $1
           WHERE id = $2`,
          [line.quantity, line.lot_id]
        );
      }

      // Create checkout line
      const ctiResult = await client.query(
        `INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [transaction.id, lot.item_id, lot.id, line.quantity]
      );
      items.push(ctiResult.rows[0]);
    }

    return { transaction, items };
  });
}

export async function getCheckoutById(id: string): Promise<{
  transaction: CheckoutTransaction;
  items: (CheckoutTransactionItem & { item_name: string; lot_code: string })[];
}> {
  const txnResult = await query(
    `SELECT * FROM checkout_transactions WHERE id = $1`,
    [id]
  );
  if (txnResult.rows.length === 0) throw new NotFoundError('Checkout transaction not found');
  const transaction: CheckoutTransaction = txnResult.rows[0];

  const itemsResult = await query(
    `SELECT cti.*, i.name as item_name, il.lot_code
     FROM checkout_transaction_items cti
     JOIN items i ON i.id = cti.item_id
     JOIN item_lots il ON il.id = cti.lot_id
     WHERE cti.transaction_id = $1`,
    [id]
  );

  return { transaction, items: itemsResult.rows };
}

export async function approveCheckout(
  checkoutId: string,
  approvedBy: string
): Promise<CheckoutTransaction> {
  return withTransaction(async (client) => {
    const txnResult = await client.query(
      `SELECT * FROM checkout_transactions WHERE id = $1 FOR UPDATE`,
      [checkoutId]
    );
    if (txnResult.rows.length === 0) {
      throw new NotFoundError('Checkout transaction not found');
    }
    const checkout: CheckoutTransaction = txnResult.rows[0];

    if (checkout.status !== 'pending_approval') {
      throw new ConflictError('Only pending checkouts can be approved');
    }

    // Deduct stock for each line
    const itemsResult = await client.query(
      `SELECT * FROM checkout_transaction_items WHERE transaction_id = $1`,
      [checkoutId]
    );
    for (const cti of itemsResult.rows) {
      const lotResult = await client.query(
        `SELECT * FROM item_lots WHERE id = $1 FOR UPDATE`,
        [cti.lot_id]
      );
      const lot: ItemLot = lotResult.rows[0];
      if (lot.quantity_on_hand < cti.quantity_out) {
        throw new ConflictError(
          `Cannot approve: insufficient stock for lot. Available ${lot.quantity_on_hand}, requested ${cti.quantity_out}`
        );
      }
      await client.query(
        `UPDATE item_lots
         SET quantity_on_hand = quantity_on_hand - $1,
             quantity_out = quantity_out + $1
         WHERE id = $2`,
        [cti.quantity_out, cti.lot_id]
      );
    }

    const updated = await client.query(
      `UPDATE checkout_transactions
       SET status = 'open', processed_by = $1, updated_at = now(),
           tracking_status = 'approved', approved_at = now()
       WHERE id = $2
       RETURNING *`,
      [approvedBy, checkoutId]
    );

    return updated.rows[0];
  });
}

export async function rejectCheckout(
  checkoutId: string,
  rejectedBy: string
): Promise<CheckoutTransaction> {
  const txnResult = await query(
    `SELECT * FROM checkout_transactions WHERE id = $1`,
    [checkoutId]
  );
  if (txnResult.rows.length === 0) {
    throw new NotFoundError('Checkout transaction not found');
  }
  const checkout: CheckoutTransaction = txnResult.rows[0];

  if (checkout.status !== 'pending_approval') {
    throw new ConflictError('Only pending checkouts can be rejected');
  }

const updated = await query(
      `UPDATE checkout_transactions
       SET status = 'rejected', processed_by = $1, updated_at = now(),
           tracking_status = 'rejected', rejected_at = now()
       WHERE id = $2
       RETURNING *`,
      [rejectedBy, checkoutId]
    );

  return updated.rows[0];
}

export async function listCheckouts(filters: {
  userId?: string;
  status?: string;
  itemId?: string;
}): Promise<CheckoutTransaction[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (filters.userId) {
    conditions.push(`checked_out_by = $${idx++}`);
    values.push(filters.userId);
  }
  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }

  let joinClause = '';
  if (filters.itemId) {
    joinClause = `JOIN checkout_transaction_items cti ON cti.transaction_id = ct.id`;
    conditions.push(`cti.item_id = $${idx++}`);
    values.push(filters.itemId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT DISTINCT
        ct.*,
        u.display_name as checked_out_by_name,
        u.email as user_email,
        checkout_summary.borrowed_item_names,
        checkout_summary.returned_at
     FROM checkout_transactions ct
     ${joinClause}
     LEFT JOIN users u ON u.id = ct.checked_out_by
     LEFT JOIN LATERAL (
       SELECT
         STRING_AGG(DISTINCT i.name, ', ' ORDER BY i.name) AS borrowed_item_names,
         MAX(rt.created_at) AS returned_at
       FROM checkout_transaction_items cti_summary
       JOIN items i ON i.id = cti_summary.item_id
       LEFT JOIN return_transaction_items rti ON rti.checkout_item_id = cti_summary.id
       LEFT JOIN return_transactions rt ON rt.id = rti.return_transaction_id
       WHERE cti_summary.transaction_id = ct.id
     ) checkout_summary ON true
     ${whereClause} ORDER BY ct.created_at DESC`,
    values
  );
  return result.rows;
}

// --- Return ---

export interface ReturnLine {
  checkout_item_id: string;
  quantity: number;
}

export async function createReturn(
  checkoutId: string,
  returnedBy: string,
  lines: ReturnLine[],
  notes?: string
): Promise<{ returnTxn: ReturnTransaction; items: ReturnTransactionItem[] }> {
  if (!lines || lines.length === 0) {
    throw new ValidationError('At least one return line is required');
  }

  return withTransaction(async (client) => {
    // Lock and fetch checkout
    const txnResult = await client.query(
      `SELECT * FROM checkout_transactions WHERE id = $1 FOR UPDATE`,
      [checkoutId]
    );
    if (txnResult.rows.length === 0) {
      throw new NotFoundError('Checkout transaction not found');
    }
    const checkout: CheckoutTransaction = txnResult.rows[0];

    if (checkout.status === 'cancelled') {
      throw new ConflictError('Cannot return items from a cancelled checkout');
    }
    if (checkout.status === 'closed') {
      throw new ConflictError('Checkout is already closed');
    }

    // Create return transaction
    const retResult = await client.query(
      `INSERT INTO return_transactions (checkout_transaction_id, returned_by, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [checkoutId, returnedBy, notes || null]
    );
    const returnTxn: ReturnTransaction = retResult.rows[0];

    const returnItems: ReturnTransactionItem[] = [];

    for (const line of lines) {
      if (line.quantity <= 0) {
        throw new ValidationError('Return quantity must be greater than 0');
      }

      // Lock checkout item
      const ctiResult = await client.query(
        `SELECT * FROM checkout_transaction_items WHERE id = $1 FOR UPDATE`,
        [line.checkout_item_id]
      );
      if (ctiResult.rows.length === 0) {
        throw new NotFoundError(`Checkout item ${line.checkout_item_id} not found`);
      }
      const cti: CheckoutTransactionItem = ctiResult.rows[0];

      if (cti.transaction_id !== checkoutId) {
        throw new ValidationError('Checkout item does not belong to this transaction');
      }

      const remaining = cti.quantity_out - cti.quantity_returned;
      if (line.quantity > remaining) {
        throw new ValidationError(
          `Cannot return ${line.quantity} of item; only ${remaining} remaining to return`
        );
      }

      // Update checkout item
      await client.query(
        `UPDATE checkout_transaction_items
         SET quantity_returned = quantity_returned + $1
         WHERE id = $2`,
        [line.quantity, line.checkout_item_id]
      );

      // Restore lot stock
      await client.query(
        `UPDATE item_lots
         SET quantity_on_hand = quantity_on_hand + $1,
             quantity_out = quantity_out - $1
         WHERE id = $2`,
        [line.quantity, cti.lot_id]
      );

      // Create return item record
      const rtiResult = await client.query(
        `INSERT INTO return_transaction_items (return_transaction_id, checkout_item_id, quantity_returned)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [returnTxn.id, line.checkout_item_id, line.quantity]
      );
      returnItems.push(rtiResult.rows[0]);
    }

    // Update checkout status
    const allItemsResult = await client.query(
      `SELECT * FROM checkout_transaction_items WHERE transaction_id = $1`,
      [checkoutId]
    );
    const allItems: CheckoutTransactionItem[] = allItemsResult.rows;
    const fullyReturned = allItems.every(
      (i) => i.quantity_out === i.quantity_returned
    );
    const anyReturned = allItems.some(
      (i) => i.quantity_returned > 0
    );

    let newStatus: any = checkout.status;
    if (fullyReturned) {
      newStatus = 'closed';
    } else if (anyReturned) {
      newStatus = 'partially_returned';
    }

    if (newStatus !== checkout.status) {
      await client.query(
        `UPDATE checkout_transactions SET status = $1, updated_at = now() WHERE id = $2`,
        [newStatus, checkoutId]
      );
      (returnTxn as any).status = newStatus;
    }

    return { returnTxn, items: returnItems };
  });
}

// --- Cancel ---

export async function cancelCheckout(
  checkoutId: string
): Promise<CheckoutTransaction> {
  return withTransaction(async (client) => {
    const txnResult = await client.query(
      `SELECT * FROM checkout_transactions WHERE id = $1 FOR UPDATE`,
      [checkoutId]
    );
    if (txnResult.rows.length === 0) {
      throw new NotFoundError('Checkout transaction not found');
    }
    const checkout: CheckoutTransaction = txnResult.rows[0];

    // Can cancel open or pending_approval checkouts
    if (checkout.status !== 'open' && checkout.status !== 'pending_approval') {
      throw new ConflictError('Only open or pending checkouts can be cancelled');
    }

    // Check for any returns
    const returnCheck = await client.query(
      `SELECT id FROM return_transactions WHERE checkout_transaction_id = $1 LIMIT 1`,
      [checkoutId]
    );
    if (returnCheck.rows.length > 0) {
      throw new ConflictError('Cannot cancel checkout with existing returns');
    }

    // Restore stock only for already-open checkouts (not pending_approval)
    if (checkout.status === 'open') {
      const itemsResult = await client.query(
        `SELECT * FROM checkout_transaction_items WHERE transaction_id = $1`,
        [checkoutId]
      );
      for (const cti of itemsResult.rows) {
        await client.query(
          `UPDATE item_lots
           SET quantity_on_hand = quantity_on_hand + $1,
               quantity_out = quantity_out - $1
           WHERE id = $2`,
          [cti.quantity_out, cti.lot_id]
        );
      }
    }

    // Mark cancelled
    const updated = await client.query(
      `UPDATE checkout_transactions
       SET status = 'cancelled', updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [checkoutId]
    );

    return updated.rows[0];
  });
}

// --- Scan ---

export async function scanCode(code: string): Promise<{
  type: 'item' | 'lot';
  item?: Item;
  lot?: ItemLot;
}> {
  const trimmed = (code || '').trim();
  if (!trimmed) {
    throw new ValidationError('code is required');
  }

  // Try lot code first (most specific)
  const lotResult = await query(
    `SELECT * FROM item_lots WHERE lot_code = $1`,
    [trimmed]
  );
  if (lotResult.rows.length > 0) {
    const lot: ItemLot = lotResult.rows[0];
    const item = await getItemById(lot.item_id);
    return { type: 'lot', item, lot };
  }

  // Try exact SKU
  const skuResult = await query(
    `SELECT * FROM items WHERE sku = $1 AND deleted_at IS NULL`,
    [trimmed]
  );
  if (skuResult.rows.length > 0) {
    return { type: 'item', item: skuResult.rows[0] };
  }

  // Try item name (ILIKE) — match as a prefix so partial / typed values
  // hit the right row. No UUID comparison here: passing a UUID text to
  // `id = $1` (uuid column) raises `operator does not exist: uuid = text`.
  const nameResult = await query(
    `SELECT * FROM items WHERE name ILIKE $1 AND deleted_at IS NULL LIMIT 1`,
    [`${trimmed}%`]
  );
  if (nameResult.rows.length > 0) {
    return { type: 'item', item: nameResult.rows[0] };
  }

  throw new NotFoundError(`No item or lot found for scanned code "${trimmed}"`);
}

// --- Audit logging helper ---

export async function logInventoryActivity(data: {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_state)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      data.actor_id,
      data.action,
      data.entity_type,
      data.entity_id || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
}
