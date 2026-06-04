import { query } from '../utils/db';

async function createTestNotifications() {
  try {
    // Get admin user ID
    const userResult = await query(`SELECT id FROM users WHERE email LIKE '%admin%' LIMIT 1`);
    if (userResult.rows.length === 0) {
      console.error('No admin user found. Please run seed.ts first.');
      process.exit(1);
    }

    const userId = userResult.rows[0].id;

    // Create test notifications
    await query(`
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, metadata, is_read)
      VALUES
        ($1, 'pending_request', 'New Checkout Request', 'John Doe requested checkout for Wireless Mouse', 'checkout', gen_random_uuid(), '{"checkout_id": "test-1", "item_name": "Wireless Mouse", "requested_by": "John Doe"}'::jsonb, false),
        ($1, 'missing_item', 'Missing Item', 'Wireless Keyboard is marked as missing', 'item', gen_random_uuid(), '{"item_id": "test-2", "item_name": "Wireless Keyboard"}'::jsonb, false),
        ($1, 'expiring_item', 'Item Expiring Soon', 'AA Batteries (50 units) expires in 5 days', 'item', gen_random_uuid(), '{"item_id": "test-3", "item_name": "AA Batteries", "quantity": 50, "expires_in_days": 5}'::jsonb, false),
        ($1, 'alert', 'System Alert', 'Database backup completed successfully', 'system', gen_random_uuid(), '{"alert_type": "backup", "status": "success"}'::jsonb, false),
        ($1, 'system', 'System Update', 'Platform updated to version 1.2.0', 'system', gen_random_uuid(), '{"version": "1.2.0", "update_type": "minor"}'::jsonb, true)
    `, [userId]);

    console.log('✅ Created 5 test notifications for admin user');

    // Query notification counts to verify
    const countsResult = await query(`
      SELECT * FROM notification_counts WHERE user_id = $1
    `, [userId]);

    if (countsResult.rows.length > 0) {
      const counts = countsResult.rows[0];
      console.log('📊 Notification counts:', {
        total_unread: counts.total_unread,
        pending_requests: counts.pending_requests,
        missing_items: counts.missing_items,
        expiring_items: counts.expiring_items,
        alerts: counts.alerts,
      });
    } else {
      console.log('⚠️ No notification counts found');
    }

    // List all notifications
    const notifsResult = await query(`
      SELECT id, type, title, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC
    `, [userId]);

    console.log('📬 All notifications:', notifsResult.rows.length);
    notifsResult.rows.forEach((n: any) => {
      console.log(`  - ${n.type}: ${n.title} (${n.is_read ? 'read' : 'unread'})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create test notifications:', error);
    process.exit(1);
  }
}

createTestNotifications();
