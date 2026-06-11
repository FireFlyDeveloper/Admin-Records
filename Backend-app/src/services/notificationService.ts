import { query, withTransaction } from '../utils/db';
import { Notification, NotificationCounts, NotificationType } from '../types';

export async function createNotification(data: {
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> {
  const result = await query(
    `SELECT create_notification($1, $2, $3, $4, $5, $6, $7) as id`,
    [
      data.user_id,
      data.type,
      data.title,
      data.message || null,
      data.entity_type || null,
      data.entity_id || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    ]
  );
  
  // Get the full notification
  const notification = await getNotification(result.rows[0].id);
  if (!notification) {
    throw new Error('Failed to create notification');
  }
  
  return notification;
}

export async function getNotification(id: string): Promise<Notification | null> {
  const result = await query(
    `SELECT * FROM notifications WHERE id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    type?: NotificationType;
  } = {}
): Promise<{ notifications: Notification[]; total: number }> {
  const conditions: string[] = ['user_id = $1'];
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (options.unreadOnly) {
    conditions.push('NOT is_read');
  }
  
  if (options.type) {
    conditions.push(`type = $${paramIndex}`);
    params.push(options.type);
    paramIndex++;
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
    params
  );
  
  const total = parseInt(countResult.rows[0].total, 10);
  
  const pageParams = [...params];
  const paginationClauses: string[] = [];
  if (options.limit !== undefined) {
    paginationClauses.push(`LIMIT $${paramIndex}`);
    pageParams.push(options.limit);
    paramIndex++;
  }
  if (options.offset !== undefined) {
    paginationClauses.push(`OFFSET $${paramIndex}`);
    pageParams.push(options.offset);
  }

  // Get notifications
  const notificationsResult = await query(
    `SELECT * FROM notifications 
     ${whereClause}
     ORDER BY created_at DESC
     ${paginationClauses.join('\n     ')}`,
    pageParams
  );
  
  return {
    notifications: notificationsResult.rows,
    total
  };
}

export async function getNotificationCounts(userId: string, userRoles: string[] = []): Promise<NotificationCounts> {
  const result = await query(
    `SELECT * FROM notification_counts WHERE user_id = $1`,
    [userId]
  );

  const counts: NotificationCounts = result.rows.length === 0
    ? {
      total_unread: 0,
      pending_requests: 0,
      missing_items: 0,
      expiring_items: 0,
      alerts: 0,
      latest_unread: null
    }
    : result.rows[0];

  // Sidebar badges must reflect live operational state, not stale unread notification rows.
  if (userRoles.includes('admin') || userRoles.includes('staff')) {
    const pendingResult = await query(
      `SELECT COUNT(*)::int as pending_requests
       FROM checkout_transactions
       WHERE status = 'pending_approval'`,
      []
    );
    counts.pending_requests = pendingResult.rows[0]?.pending_requests ?? 0;
  }

  const expiringResult = await query(
    `WITH live_expiring AS (
       SELECT COUNT(*)::int as expiring_items
       FROM item_lots il
       JOIN items i ON i.id = il.item_id
       WHERE i.deleted_at IS NULL
         AND i.item_type = 'quantifiable'
         AND il.quantity_on_hand > 0
         AND il.expires_at >= CURRENT_DATE
         AND il.expires_at < CURRENT_DATE + INTERVAL '30 days'
     ), unread_expiring_notifications AS (
       SELECT COUNT(*)::int as stale_expiring_notifications
       FROM notifications
       WHERE user_id = $1
         AND type = 'expiring_item'
         AND NOT is_read
     )
     SELECT live_expiring.expiring_items, unread_expiring_notifications.stale_expiring_notifications
     FROM live_expiring CROSS JOIN unread_expiring_notifications`,
    [userId]
  );

  const liveExpiringItems = expiringResult.rows[0]?.expiring_items ?? 0;
  const staleExpiringNotifications = expiringResult.rows[0]?.stale_expiring_notifications ?? 0;
  counts.total_unread = Math.max(0, Number(counts.total_unread || 0) - Number(staleExpiringNotifications) + Number(liveExpiringItems));
  counts.expiring_items = liveExpiringItems;

  return counts;
}

export async function markPendingRequestNotificationsResolved(checkoutId: string): Promise<void> {
  await query(
    `UPDATE notifications
     SET is_read = true, read_at = COALESCE(read_at, now())
     WHERE type = 'pending_request'
       AND entity_type = 'checkout'
       AND entity_id = $1
       AND NOT is_read`,
    [checkoutId]
  );
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await query(
    `UPDATE notifications 
     SET is_read = true, read_at = now() 
     WHERE id = $1 AND NOT is_read`,
    [id]
  );
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await query(
    `UPDATE notifications 
     SET is_read = true, read_at = now() 
     WHERE user_id = $1 AND NOT is_read`,
    [userId]
  );
}

export async function deleteNotification(id: string): Promise<void> {
  await query(
    `DELETE FROM notifications WHERE id = $1`,
    [id]
  );
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  await query(
    `DELETE FROM notifications WHERE user_id = $1`,
    [userId]
  );
}

export async function createPendingRequestNotification(
  checkoutId: string,
  itemName: string,
  requestedBy: string
): Promise<void> {
  // Get all admin and staff users
  const usersResult = await query(
    `SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name IN ('admin', 'staff')
     AND u.is_active = true
     AND u.deleted_at IS NULL`,
    []
  );
  
  // Create notifications for each admin/staff
  for (const user of usersResult.rows) {
    await createNotification({
      user_id: user.id,
      type: 'pending_request',
      title: 'New Checkout Request',
      message: `${requestedBy} requested checkout for ${itemName}`,
      entity_type: 'checkout',
      entity_id: checkoutId,
      metadata: {
        checkout_id: checkoutId,
        item_name: itemName,
        requested_by: requestedBy,
        requested_at: new Date().toISOString()
      }
    });
  }
}

export async function createMissingItemNotification(
  itemId: string,
  itemName: string
): Promise<void> {
  // Get all admin and staff users
  const usersResult = await query(
    `SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name IN ('admin', 'staff')
     AND u.is_active = true
     AND u.deleted_at IS NULL`,
    []
  );
  
  // Create notifications for each admin/staff
  for (const user of usersResult.rows) {
    await createNotification({
      user_id: user.id,
      type: 'missing_item',
      title: 'Missing Item',
      message: `Item ${itemName} is marked as missing`,
      entity_type: 'item',
      entity_id: itemId,
      metadata: {
        item_id: itemId,
        item_name: itemName,
        reported_at: new Date().toISOString()
      }
    });
  }
}

export async function createExpiringItemNotification(
  itemId: string,
  itemName: string,
  expiresAt: Date,
  quantity: number
): Promise<void> {
  // Get all admin and staff users
  const usersResult = await query(
    `SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name IN ('admin', 'staff')
     AND u.is_active = true
     AND u.deleted_at IS NULL`,
    []
  );
  
  const expiresInDays = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  // Create notifications for each admin/staff
  for (const user of usersResult.rows) {
    await createNotification({
      user_id: user.id,
      type: 'expiring_item',
      title: 'Item Expiring Soon',
      message: `${itemName} (${quantity} units) expires in ${expiresInDays} days`,
      entity_type: 'item',
      entity_id: itemId,
      metadata: {
        item_id: itemId,
        item_name: itemName,
        quantity: quantity,
        expires_at: expiresAt.toISOString(),
        expires_in_days: expiresInDays
      }
    });
  }
}