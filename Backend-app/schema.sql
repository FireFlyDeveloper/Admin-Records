-- =============================================================================
-- Dragonfly Core: Document + Hybrid Inventory Platform
-- Complete Database Schema
-- =============================================================================
-- This is a self-contained schema file that creates the entire database from
-- scratch. It is idempotent where possible (IF NOT EXISTS, ON CONFLICT DO NOTHING).
-- Run this file against a fresh PostgreSQL database with the pgcrypto extension.
-- =============================================================================

-- =============================================================================
-- 1. UTILITY: updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. USERS & ROLES
-- =============================================================================

-- Roles define permission sets within the platform.
CREATE TABLE IF NOT EXISTS roles (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                       TEXT NOT NULL UNIQUE,
  description                TEXT,
  can_checkout_quantifiable  BOOLEAN NOT NULL DEFAULT false,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE roles IS 'Platform roles controlling access and checkout privileges.';

-- Users are the core identity for all actors in the system.
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE users IS 'Platform users with soft-delete support.';

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Junction table linking users to their assigned roles.
CREATE TABLE IF NOT EXISTS user_roles (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id      UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by  UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Seed default roles
INSERT INTO roles (name, description, can_checkout_quantifiable) VALUES
  ('admin',   'Full system access',                    true),
  ('staff',   'Inventory and document management',     true)
ON CONFLICT (name) DO NOTHING;

-- Trigger: auto-update users.updated_at
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. DOCUMENTS MODULE
-- =============================================================================

-- Hierarchical folder structure for document organization.
CREATE TABLE IF NOT EXISTS folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES folders(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (parent_id, name)
);

COMMENT ON TABLE folders IS 'Hierarchical document folders with soft-delete.';

CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_deleted_at ON folders(deleted_at) WHERE deleted_at IS NOT NULL;

-- Documents stored in the platform with versioning support.
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id     UUID REFERENCES folders(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  storage_path  TEXT NOT NULL UNIQUE,
  version       INT NOT NULL DEFAULT 1,
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE documents IS 'Stored documents with versioning and soft-delete.';

CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NOT NULL;

-- Document version history for audit and rollback.
CREATE TABLE IF NOT EXISTS document_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version       INT NOT NULL,
  storage_path  TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);

-- Granular permissions on documents or folders, assigned to users or roles.
CREATE TABLE IF NOT EXISTS document_permissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID REFERENCES documents(id) ON DELETE CASCADE,
  folder_id    UUID REFERENCES folders(id)   ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id)     ON DELETE CASCADE,
  role_id      UUID REFERENCES roles(id)     ON DELETE CASCADE,
  permission   TEXT NOT NULL CHECK (permission IN ('viewer', 'editor', 'manager')),
  inherit      BOOLEAN NOT NULL DEFAULT true,
  granted_by   UUID NOT NULL REFERENCES users(id),
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT target_xor CHECK (
    (document_id IS NOT NULL)::int + (folder_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT subject_xor CHECK (
    (user_id IS NOT NULL)::int + (role_id IS NOT NULL)::int = 1
  )
);

COMMENT ON TABLE document_permissions IS 'Permissions scoped to document or folder, granted to user or role.';

CREATE INDEX IF NOT EXISTS idx_doc_perm_document_id ON document_permissions(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_perm_folder_id ON document_permissions(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_perm_user_id ON document_permissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_perm_role_id ON document_permissions(role_id) WHERE role_id IS NOT NULL;

-- One permission per subject+scope. Duplicates trigger ON CONFLICT in grantPermission().
CREATE UNIQUE INDEX IF NOT EXISTS uq_doc_perm_doc_user ON document_permissions(document_id, user_id) WHERE document_id IS NOT NULL AND user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_doc_perm_doc_role ON document_permissions(document_id, role_id) WHERE document_id IS NOT NULL AND role_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_doc_perm_folder_user ON document_permissions(folder_id, user_id) WHERE folder_id IS NOT NULL AND user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_doc_perm_folder_role ON document_permissions(folder_id, role_id) WHERE folder_id IS NOT NULL AND role_id IS NOT NULL;

-- Activity log for document and folder events.
CREATE TABLE IF NOT EXISTS document_activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  folder_id    UUID REFERENCES folders(id)   ON DELETE SET NULL,
  actor_id     UUID NOT NULL REFERENCES users(id),
  action       TEXT NOT NULL
               CHECK (action IN (
                 'upload', 'download', 'delete', 'move',
                 'rename', 'permission_change', 'version_upload', 'create_folder'
               )),
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_activity_document_id ON document_activity_logs(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_activity_folder_id ON document_activity_logs(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_activity_actor_id ON document_activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_doc_activity_created_at ON document_activity_logs(created_at);

-- Triggers for updated_at in documents module
CREATE TRIGGER trg_folders_updated_at
BEFORE UPDATE ON folders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. INVENTORY BASE
-- =============================================================================

-- Master items table supporting both trackable (BLE-tagged) and quantifiable (lot-based) items.
CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type   TEXT NOT NULL CHECK (item_type IN ('trackable', 'quantifiable')),
  sku         TEXT UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

COMMENT ON TABLE items IS 'Master inventory items: trackable (BLE) or quantifiable (lot-based).';

CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sku ON items(sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_items_updated_at
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. TRACKABLE INVENTORY (BLE / Real-time Presence)
-- =============================================================================

-- Physical rooms where devices and items are located.
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  building    TEXT,
  floor       INT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

COMMENT ON TABLE rooms IS 'Physical rooms for trackable item presence tracking.';

-- BLE gateway / scanner devices deployed in rooms.
CREATE TABLE IF NOT EXISTS devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code     TEXT NOT NULL UNIQUE,
  room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,
  name            TEXT,
  label           TEXT,
  rssi_range      INT DEFAULT -70,
  last_heartbeat  TIMESTAMPTZ,
  offline_since   TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE devices IS 'BLE gateway devices for scanning tags.';

CREATE INDEX IF NOT EXISTS idx_devices_room_id ON devices(room_id);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);

-- BLE tags assigned to trackable items.
CREATE TABLE IF NOT EXISTS ble_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_code    TEXT NOT NULL UNIQUE,
  item_id     UUID REFERENCES items(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES users(id),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ble_tags IS 'BLE tags linked to trackable inventory items.';

CREATE INDEX IF NOT EXISTS idx_ble_tags_item_id ON ble_tags(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ble_tags_code ON ble_tags(tag_code);

-- Current presence state of each trackable item (latest known location/status).
CREATE TABLE IF NOT EXISTS item_presence_state (
  item_id          UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  current_room_id  UUID REFERENCES rooms(id) ON DELETE SET NULL,
  presence_status  TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (presence_status IN (
                     'present', 'missing', 'inactive', 'maintenance', 'unknown', 'transporting'
                   )),
  last_seen_at     TIMESTAMPTZ,
  last_device_id   UUID REFERENCES devices(id) ON DELETE SET NULL,
  last_rssi        INT,
  missing_since    TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE item_presence_state IS 'Real-time presence state for trackable items.';

CREATE INDEX IF NOT EXISTS idx_presence_status ON item_presence_state(presence_status);
CREATE INDEX IF NOT EXISTS idx_presence_room ON item_presence_state(current_room_id);

-- Historical location/presence records for trackable items.
CREATE TABLE IF NOT EXISTS item_location_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,
  device_id       UUID REFERENCES devices(id) ON DELETE SET NULL,
  presence_status TEXT NOT NULL,
  rssi            INT,
  conflict_meta   JSONB,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE item_location_history IS 'Audit trail of trackable item location changes.';

CREATE INDEX IF NOT EXISTS idx_location_history_item_id ON item_location_history(item_id);
CREATE INDEX IF NOT EXISTS idx_location_history_recorded_at ON item_location_history(recorded_at);

-- =============================================================================
-- 6. QUANTIFIABLE INVENTORY (Lots, Checkout, Returns)
-- =============================================================================

-- Lot-based inventory for consumable/quantifiable items.
CREATE TABLE IF NOT EXISTS item_lots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  lot_code         TEXT NOT NULL,
  quantity_total   INT NOT NULL CHECK (quantity_total >= 0),
  quantity_on_hand INT NOT NULL CHECK (quantity_on_hand >= 0),
  quantity_out     INT NOT NULL DEFAULT 0 CHECK (quantity_out >= 0),
  purchased_at     DATE,
  expires_at       DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, lot_code),
  CONSTRAINT quantities_valid CHECK (quantity_on_hand + quantity_out <= quantity_total)
);

COMMENT ON TABLE item_lots IS 'Lot-based stock records for quantifiable items.';

CREATE INDEX IF NOT EXISTS idx_item_lots_item_id ON item_lots(item_id);

-- Checkout transactions for quantifiable items.
CREATE TABLE IF NOT EXISTS checkout_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_out_by  UUID NOT NULL REFERENCES users(id),
  processed_by    UUID REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('pending_approval', 'open', 'approved', 'partially_returned', 'closed', 'cancelled', 'rejected')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE checkout_transactions IS 'Checkout transactions for quantifiable inventory.';

CREATE INDEX IF NOT EXISTS idx_checkout_status ON checkout_transactions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_user ON checkout_transactions(checked_out_by);

-- Individual line items within a checkout transaction.
CREATE TABLE IF NOT EXISTS checkout_transaction_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    UUID NOT NULL REFERENCES checkout_transactions(id) ON DELETE CASCADE,
  item_id           UUID NOT NULL REFERENCES items(id),
  lot_id            UUID NOT NULL REFERENCES item_lots(id),
  quantity_out      INT NOT NULL CHECK (quantity_out > 0),
  quantity_returned INT NOT NULL DEFAULT 0 CHECK (quantity_returned >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT return_not_exceed_out CHECK (quantity_returned <= quantity_out)
);

CREATE INDEX IF NOT EXISTS idx_cti_transaction ON checkout_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cti_item ON checkout_transaction_items(item_id);

-- Return transactions linked to a prior checkout.
CREATE TABLE IF NOT EXISTS return_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_transaction_id  UUID NOT NULL REFERENCES checkout_transactions(id),
  returned_by              UUID NOT NULL REFERENCES users(id),
  processed_by             UUID REFERENCES users(id),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_txn_checkout ON return_transactions(checkout_transaction_id);

-- Individual line items within a return transaction.
CREATE TABLE IF NOT EXISTS return_transaction_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_transaction_id UUID NOT NULL REFERENCES return_transactions(id) ON DELETE CASCADE,
  checkout_item_id      UUID NOT NULL REFERENCES checkout_transaction_items(id),
  quantity_returned     INT NOT NULL CHECK (quantity_returned > 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for updated_at in quantifiable inventory
CREATE TRIGGER trg_item_lots_updated_at
BEFORE UPDATE ON item_lots
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_checkout_transactions_updated_at
BEFORE UPDATE ON checkout_transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. AUDITING & DEVICE EVENTS
-- =============================================================================

-- General-purpose audit log for entity state changes.
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  before_state JSONB,
  after_state  JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'General audit trail for entity mutations.';

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- Raw device events from BLE gateways (sightings, heartbeats, errors).
CREATE TABLE IF NOT EXISTS device_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  tag_id      UUID REFERENCES ble_tags(id) ON DELETE SET NULL,
  tag_code    TEXT NOT NULL,
  room_id     UUID REFERENCES rooms(id) ON DELETE SET NULL,
  rssi        INT,
  event_type  TEXT NOT NULL DEFAULT 'sighting'
              CHECK (event_type IN ('sighting', 'heartbeat', 'error')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE device_events IS 'Raw events from BLE gateway devices.';

CREATE INDEX IF NOT EXISTS idx_device_events_device ON device_events(device_id);
CREATE INDEX IF NOT EXISTS idx_device_events_tag ON device_events(tag_code);
CREATE INDEX IF NOT EXISTS idx_device_events_recorded ON device_events(recorded_at);

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
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(expires_at, last_active);

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
  
  -- Add request_number column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkout_transactions' AND column_name = 'request_number'
  ) THEN
    -- Add auto-incrementing request number
    ALTER TABLE checkout_transactions 
    ADD COLUMN request_number SERIAL;
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_checkout_request_number ON checkout_transactions(request_number DESC);
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

-- Add automatic lot selection tracking to checkout_transaction_items
DO $$ 
BEGIN
  -- Check if lot selection tracking fields exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkout_transaction_items' AND column_name = 'lot_selected_automatically'
  ) THEN
    ALTER TABLE checkout_transaction_items 
    ADD COLUMN lot_selected_automatically BOOLEAN DEFAULT FALSE;
    
    ALTER TABLE checkout_transaction_items 
    ADD COLUMN selection_method VARCHAR(50) DEFAULT 'manual' CHECK (selection_method IN ('manual', 'auto_fifo', 'auto_lifo', 'auto_expiry'));
  END IF;
END $$;

-- =============================================================================
-- AUTOMATIC LOT SELECTION FUNCTIONS
-- =============================================================================

-- Function for automatic lot selection (FIFO, LIFO, expiry-based)
CREATE OR REPLACE FUNCTION select_available_lot_for_item(
  p_item_id UUID,
  p_quantity_needed INTEGER,
  p_selection_method VARCHAR(50) DEFAULT 'auto_fifo'
) RETURNS TABLE (
  lot_id UUID,
  quantity_available INTEGER,
  quantity_to_take INTEGER
) AS $$
DECLARE
  v_remaining_needed INTEGER := p_quantity_needed;
  v_lot_record RECORD;
  v_quantity_to_take INTEGER;
BEGIN
  -- Get available lots based on selection method
  FOR v_lot_record IN 
    SELECT 
      il.id,
      il.quantity_on_hand - COALESCE(SUM(CASE 
        WHEN cti.transaction_id IS NOT NULL AND ct.status NOT IN ('cancelled', 'rejected', 'closed')
        THEN cti.quantity_out - cti.quantity_returned
        ELSE 0
      END), 0) as available
    FROM item_lots il
    LEFT JOIN checkout_transaction_items cti ON cti.lot_id = il.id 
    LEFT JOIN checkout_transactions ct ON ct.id = cti.transaction_id
    WHERE il.item_id = p_item_id 
      AND il.quantity_on_hand > 0
    GROUP BY il.id, il.quantity_on_hand, il.created_at, il.expires_at
    HAVING (il.quantity_on_hand - COALESCE(SUM(CASE 
      WHEN cti.transaction_id IS NOT NULL AND ct.status NOT IN ('cancelled', 'rejected', 'closed')
      THEN cti.quantity_out - cti.quantity_returned
      ELSE 0
    END), 0)) > 0
    ORDER BY
      CASE
        WHEN p_selection_method = 'auto_expiry' THEN COALESCE(il.expires_at, 'infinity'::TIMESTAMPTZ)
        WHEN p_selection_method <> 'auto_lifo' THEN il.created_at
      END ASC,
      CASE WHEN p_selection_method = 'auto_lifo' THEN il.created_at END DESC
  LOOP
    IF v_remaining_needed <= 0 THEN
      EXIT;
    END IF;
    
    v_quantity_to_take := LEAST(v_lot_record.available, v_remaining_needed);
    v_remaining_needed := v_remaining_needed - v_quantity_to_take;
    
    lot_id := v_lot_record.id;
    quantity_available := v_lot_record.available;
    quantity_to_take := v_quantity_to_take;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

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
CREATE INDEX IF NOT EXISTS idx_scanner_sessions_active ON scanner_sessions(last_used);

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

-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================
