-- ========================================================================
-- Database Optimization for Admin-Records System
-- ========================================================================
-- This file adds performance-enhancing indexes based on query patterns
-- identified in the codebase. Run this AFTER the main schema is applied.
-- ========================================================================

-- ========================================================================
-- 1. USERS & ROLES OPTIMIZATION
-- ========================================================================

-- Composite index for common user filtering patterns
-- Used by: listUsers() with search, role, and is_active filters
CREATE INDEX IF NOT EXISTS idx_users_search_active ON users(deleted_at, is_active, email, display_name);

-- Covering index for user listing queries with roles
-- Reduces the need for separate lookups in role aggregation
CREATE INDEX IF NOT EXISTS idx_users_with_roles ON users(deleted_at, is_active, created_at DESC);

-- ========================================================================
-- 2. DOCUMENT PERMISSIONS OPTIMIZATION
-- ========================================================================

-- These are critical for resolveDocumentPermission() and resolveFolderPermission()
-- which make multiple recursive queries

-- Composite indexes for direct permission lookups
CREATE INDEX IF NOT EXISTS idx_doc_perm_document_user_inherit ON document_permissions(document_id, user_id, inherit) WHERE document_id IS NOT NULL AND user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_perm_document_role_inherit ON document_permissions(document_id, role_id, inherit) WHERE document_id IS NOT NULL AND role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_perm_folder_user_inherit ON document_permissions(folder_id, user_id, inherit) WHERE folder_id IS NOT NULL AND user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_perm_folder_role_inherit ON document_permissions(folder_id, role_id, inherit) WHERE folder_id IS NOT NULL AND role_id IS NOT NULL;

-- Index for permission level comparison (used in higherPermission function)
CREATE INDEX IF NOT EXISTS idx_doc_perm_permission ON document_permissions(permission) WHERE deleted_at IS NULL;

-- ========================================================================
-- 3. DOCUMENTS & FOLDERS OPTIMIZATION
-- ========================================================================

-- Composite index for folder hierarchy navigation (used in recursive CTE)
CREATE INDEX IF NOT EXISTS idx_folders_hierarchy ON folders(id, parent_id, deleted_at) WHERE deleted_at IS NULL;

-- Index for listing visible documents with permission checks
CREATE INDEX IF NOT EXISTS idx_documents_listing ON documents(folder_id, deleted_at, created_at DESC) WHERE deleted_at IS NULL;

-- Covering index for document search with folder information
CREATE INDEX IF NOT EXISTS idx_documents_folder_search ON documents(folder_id, name, mime_type) WHERE deleted_at IS NULL;

-- ========================================================================
-- 4. CHECKOUT TRANSACTIONS OPTIMIZATION
-- ========================================================================

-- Critical for request tracking dashboard and status queries
CREATE INDEX IF NOT EXISTS idx_checkout_transactions_status ON checkout_transactions(status, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checkout_transactions_tracking ON checkout_transactions(tracking_status, deleted_at) WHERE deleted_at IS NULL;

-- Composite index for user-based checkout queries (users checking their requests)
CREATE INDEX IF NOT EXISTS idx_checkout_transactions_user ON checkout_transactions(checked_out_by, status, created_at DESC) WHERE deleted_at IS NULL;

-- Index for request number lookups
CREATE INDEX IF NOT EXISTS idx_checkout_transactions_request_number ON checkout_transactions(request_number DESC) WHERE deleted_at IS NULL;

-- Covering index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_checkout_transactions_dashboard ON checkout_transactions(status, tracking_status, status_changed_at DESC, borrowed_at, returned_at) WHERE deleted_at IS NULL;

-- ========================================================================
-- 5. CHECKOUT TRANSACTION ITEMS OPTIMIZATION
-- ========================================================================

-- Critical for join queries in checkout transactions
CREATE INDEX IF NOT EXISTS idx_checkout_transaction_items_all ON checkout_transaction_items(transaction_id, item_id, lot_id) WHERE deleted_at IS NULL;

-- Index for quantity calculations and availability checks
CREATE INDEX IF NOT EXISTS idx_checkout_transaction_items_status ON checkout_transaction_items(transaction_id, quantity_out, quantity_returned, status) WHERE deleted_at IS NULL;

-- Index for items with pending checkouts (used in lot selection)
CREATE INDEX IF NOT EXISTS idx_items_pending_checkouts ON checkout_transaction_items(item_id, returned_at, deleted_at) WHERE returned_at IS NULL AND deleted_at IS NULL;

-- ========================================================================
-- 6. NOTIFICATIONS OPTIMIZATION
-- ========================================================================

-- Critical for sidebar badge queries
CREATE INDEX IF NOT EXISTS idx_notifications_unread_badge ON notifications(user_id, is_read, type, created_at DESC) WHERE deleted_at IS NULL;

-- Covering index for notification count queries
CREATE INDEX IF NOT EXISTS idx_notifications_count ON notifications(user_id, type, is_read, created_at) WHERE deleted_at IS NULL;

-- ========================================================================
-- 7. ITEM_LOTS OPTIMIZATION
-- ========================================================================

-- Critical for automatic lot selection function
-- The function loops through lots in FIFO/LIFO/expiry order
CREATE INDEX IF NOT EXISTS idx_item_lots_selection ON item_lots(item_id, quantity_on_hand, created_at, expires_at) WHERE quantity_on_hand > 0 AND deleted_at IS NULL;

-- Index for expiring items notification trigger
CREATE INDEX IF NOT EXISTS idx_item_lots_expiring ON item_lots(expires_at, quantity_on_hand) WHERE expires_at IS NOT NULL AND quantity_on_hand > 0 AND deleted_at IS NULL;

-- Composite index for quantity availability calculations
CREATE INDEX IF NOT EXISTS idx_item_lots_availability ON item_lots(item_id, quantity_on_hand, quantity_out, deleted_at) WHERE deleted_at IS NULL;

-- ========================================================================
-- 8. USER_SESSIONS OPTIMIZATION
-- ========================================================================

-- Critical for online status checking (runs every 5 minutes via view)
CREATE INDEX IF NOT EXISTS idx_user_sessions_online ON user_sessions(user_id, expires_at, last_active DESC);

-- Index for cleanup operations (removes expired sessions)
CREATE INDEX IF NOT EXISTS idx_user_sessions_expired ON user_sessions(expires_at);

-- ========================================================================
-- 9. ITEM_PRESENCE_STATE OPTIMIZATION
-- ========================================================================

-- Critical for BLE tracking queries
CREATE INDEX IF NOT EXISTS idx_item_presence_status_room ON item_presence_state(presence_status, current_room_id) WHERE deleted_at IS NULL;

-- Index for missing items tracking
CREATE INDEX IF NOT EXISTS idx_item_presence_missing ON item_presence_state(item_id, missing_since) WHERE presence_status = 'missing' AND deleted_at IS NULL;

-- ========================================================================
-- 10. AUDIT_LOGS OPTIMIZATION
-- ========================================================================

-- Critical for entity-based audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC) WHERE deleted_at IS NULL;

-- Index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(actor_id, action, created_at DESC) WHERE deleted_at IS NULL;

-- ========================================================================
-- 11. REPORT_EXPORTS OPTIMIZATION
-- ========================================================================

-- Index for user export history
CREATE INDEX IF NOT EXISTS idx_report_exports_user ON report_exports(user_id, status, created_at DESC) WHERE deleted_at IS NULL;

-- Index for pending exports
CREATE INDEX IF NOT EXISTS idx_report_exports_pending ON report_exports(status, created_at) WHERE status = 'processing' AND deleted_at IS NULL;

-- ========================================================================
-- 12. DEVICE_EVENTS OPTIMIZATION  
-- ========================================================================

-- Critical for real-time BLE tracking
CREATE INDEX IF NOT EXISTS idx_device_events_realtime ON device_events(device_id, tag_code, recorded_at DESC) WHERE deleted_at IS NULL;

-- Index for tag-based event queries
CREATE INDEX IF NOT EXISTS idx_device_events_tag ON device_events(tag_id, tag_code, recorded_at DESC) WHERE deleted_at IS NULL;

-- ========================================================================
-- 13. DOCUMENT_ACTIVITY_LOGS OPTIMIZATION
-- ========================================================================

-- Index for document audit trails
CREATE INDEX IF NOT EXISTS idx_doc_activity_document ON document_activity_logs(document_id, created_at DESC) WHERE deleted_at IS NULL;

-- Index for folder activity tracking
CREATE INDEX IF NOT EXISTS idx_doc_activity_folder ON document_activity_logs(folder_id, created_at DESC) WHERE folder_id IS NOT NULL AND deleted_at IS NULL;

-- ========================================================================
-- 14. SCANNER_SESSIONS OPTIMIZATION
-- ========================================================================

-- Index for active scanner session queries
CREATE INDEX IF NOT EXISTS idx_scanner_sessions_active ON scanner_sessions(user_id, last_used DESC) WHERE deleted_at IS NULL;

-- ========================================================================
-- OPTIMIZATION COMPLETE
-- ========================================================================
