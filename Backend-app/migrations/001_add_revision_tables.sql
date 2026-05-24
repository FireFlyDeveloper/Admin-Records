-- =============================================================================
-- Add tables for Inventory Management System Revisions
-- User sessions, notifications, and tracking enhancements
-- =============================================================================

-- =============================================================================
-- USER SESSIONS - For real-time user status tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  last_active   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);

COMMENT ON TABLE user_sessions IS 'Active user sessions for tracking online status';

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(last_active) WHERE expires_at > now();

-- Function to update user activity
CREATE OR REPLACE FUNCTION update_user_activity(user_uuid UUID, token TEXT, ip TEXT DEFAULT NULL, agent TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent)
  VALUES (user_uuid, token, ip, agent)
  ON CONFLICT (session_token) DO UPDATE
  SET last_active = now(),
      ip_address = COALESCE(EXCLUDED.ip_address, user_sessions.ip_address),
      user_agent = COALESCE(EXCLUDED.user_agent, user_sessions.user_agent),
      expires_at = now() + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- View for user online status
CREATE OR REPLACE VIEW user_online_status AS
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.is_active,
  CASE 
    WHEN NOT u.is_active THEN 'inactive'
    WHEN EXISTS (
      SELECT 1 FROM user_sessions us 
      WHERE us.user_id = u.id 
      AND us.expires_at > now() 
      AND us.last_active > now() - INTERVAL '5 minutes'
    ) THEN 'online'
    ELSE 'offline'
  END as status,
  MAX(us.last_active) as last_seen
FROM users u
LEFT JOIN user_sessions us ON us.user_id = u.id AND us.expires_at > now()
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.display_name, u.is_active;

-- =============================================================================
-- NOTIFICATIONS - For sidebar notification badges
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('pending_request', 'missing_item', 'expiring_item', 'alert', 'system')),
  title         TEXT NOT NULL,
  message       TEXT,
  entity_type   TEXT, -- 'checkout', 'item', 'document', etc.
  entity_id     UUID, -- ID of the related entity
  is_read       BOOLEAN NOT NULL DEFAULT false,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at       TIMESTAMPTZ
);

COMMENT ON TABLE notifications IS 'User notifications for sidebar badges and alerts';

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- View for notification counts by type (for sidebar badges)
CREATE OR REPLACE VIEW notification_counts AS
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE NOT is_read) as total_unread,
  COUNT(*) FILTER (WHERE type = 'pending_request' AND NOT is_read) as pending_requests,
  COUNT(*) FILTER (WHERE type = 'missing_item' AND NOT is_read) as missing_items,
  COUNT(*) FILTER (WHERE type = 'expiring_item' AND NOT is_read) as expiring_items,
  COUNT(*) FILTER (WHERE type = 'alert' AND NOT is_read) as alerts,
  MAX(created_at) FILTER (WHERE NOT is_read) as latest_unread
FROM notifications
GROUP BY user_id;

-- =============================================================================
-- EXCEL EXPORTS TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS report_exports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type   TEXT NOT NULL CHECK (report_type IN ('audit', 'inventory', 'checkout', 'user', 'custom')),
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  format        TEXT NOT NULL DEFAULT 'xlsx',
  filters       JSONB, -- Store filter criteria used
  status        TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE report_exports IS 'Track Excel report exports';

CREATE INDEX IF NOT EXISTS idx_report_exports_user ON report_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_type ON report_exports(report_type);
CREATE INDEX IF NOT EXISTS idx_report_exports_status ON report_exports(status);

-- =============================================================================
-- ENHANCE EXISTING TABLES FOR TRACKING
-- =============================================================================

-- Add tracking fields to checkout_transactions if not exists
DO $$ 
BEGIN
  -- Check if tracking fields exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkout_transactions' AND column_name = 'tracking_status'
  ) THEN
    -- Add tracking status with more granular states
    ALTER TABLE checkout_transactions 
    ADD COLUMN tracking_status TEXT DEFAULT 'pending' 
    CHECK (tracking_status IN ('pending', 'approved', 'borrowed', 'returned', 'rejected', 'cancelled'));
    
    -- Add tracking notes
    ALTER TABLE checkout_transactions 
    ADD COLUMN tracking_notes TEXT;
    
    -- Add tracking timestamps
    ALTER TABLE checkout_transactions 
    ADD COLUMN approved_at TIMESTAMPTZ;
    
    ALTER TABLE checkout_transactions 
    ADD COLUMN borrowed_at TIMESTAMPTZ;
    
    ALTER TABLE checkout_transactions 
    ADD COLUMN returned_at TIMESTAMPTZ;
    
    ALTER TABLE checkout_transactions 
    ADD COLUMN rejected_at TIMESTAMPTZ;
  END IF;
END $$;

-- Update existing statuses to tracking_status
UPDATE checkout_transactions 
SET tracking_status = 
  CASE 
    WHEN status = 'pending_approval' THEN 'pending'
    WHEN status = 'open' THEN 'approved'
    WHEN status = 'partially_returned' THEN 'borrowed'
    WHEN status = 'closed' THEN 'returned'
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END
WHERE tracking_status IS NULL;

-- =============================================================================
-- SCANNER INTEGRATION SUPPORT
-- =============================================================================

CREATE TABLE IF NOT EXISTS scanner_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id    TEXT NOT NULL UNIQUE,
  scanner_type  TEXT CHECK (scanner_type IN ('qr', 'barcode', 'camera')),
  focused_field TEXT CHECK (focused_field IN ('search', 'scanner', 'cart')),
  last_scan     TEXT,
  scan_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used     TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata      JSONB
);

COMMENT ON TABLE scanner_sessions IS 'Track scanner sessions and focus state for QR/barcode scanner integration';

CREATE INDEX IF NOT EXISTS idx_scanner_sessions_user ON scanner_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scanner_sessions_active ON scanner_sessions(last_used) WHERE last_used > now() - INTERVAL '1 hour';

-- =============================================================================
-- MULTIPLE FILE UPLOAD SUPPORT
-- =============================================================================

-- Add batch_id to documents table for grouping multiple uploads
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'upload_batch_id'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN upload_batch_id UUID;
    
    CREATE INDEX IF NOT EXISTS idx_documents_batch ON documents(upload_batch_id);
  END IF;
END $$;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC NOTIFICATIONS
-- =============================================================================

-- Function to create notification when checkout is pending approval
CREATE OR REPLACE FUNCTION notify_pending_checkout()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for new pending approvals
  IF NEW.status = 'pending_approval' AND (OLD.status IS NULL OR OLD.status != 'pending_approval') THEN
    -- Create notification for admins
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
    SELECT 
      u.id,
      'pending_request',
      'New Checkout Request',
      'A new checkout request requires approval',
      'checkout',
      NEW.id
    FROM users u
    WHERE u.id IN (
      SELECT ur.user_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE r.name IN ('admin', 'staff')
    )
    AND u.is_active = true
    AND u.deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS checkout_pending_notification ON checkout_transactions;
CREATE TRIGGER checkout_pending_notification
  AFTER INSERT OR UPDATE ON checkout_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_pending_checkout();

-- Function to create notification for expiring items
CREATE OR REPLACE FUNCTION notify_expiring_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if item is expiring soon (less than 7 days)
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < now() + INTERVAL '7 days' AND NEW.quantity_on_hand > 0 THEN
    -- Create notification for item managers/admins
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, metadata)
    SELECT 
      u.id,
      'expiring_item',
      'Item Expiring Soon',
      'Item ' || i.name || ' is expiring on ' || TO_CHAR(NEW.expires_at, 'YYYY-MM-DD'),
      'item',
      NEW.item_id,
      jsonb_build_object('item_name', i.name, 'expires_at', NEW.expires_at, 'quantity', NEW.quantity_on_hand)
    FROM users u
    CROSS JOIN items i
    WHERE u.id IN (
      SELECT ur.user_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE r.name IN ('admin', 'staff')
    )
    AND u.is_active = true
    AND u.deleted_at IS NULL
    AND i.id = NEW.item_id
    AND i.deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expiring items
DROP TRIGGER IF EXISTS item_expiring_notification ON item_lots;
CREATE TRIGGER item_expiring_notification
  AFTER INSERT OR UPDATE ON item_lots
  FOR EACH ROW
  EXECUTE FUNCTION notify_expiring_items();

-- =============================================================================
-- SCHEMA UPDATES COMPLETE
-- =============================================================================