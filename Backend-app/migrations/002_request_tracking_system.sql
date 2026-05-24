-- =============================================================================
-- Request Tracking System Migration
-- Add status tracking, automatic lot selection, and request numbering
-- =============================================================================

-- 1. Add status tracking to checkouts table
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(50); -- For custom tracking: processing, ready, etc.
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS request_number SERIAL; -- Auto-incrementing request number
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_checkouts_status ON checkouts(status);
CREATE INDEX IF NOT EXISTS idx_checkouts_request_number ON checkouts(request_number DESC);

-- 2. Add automatic lot tracking to checkout_items
ALTER TABLE checkout_items ADD COLUMN IF NOT EXISTS lot_selected_automatically BOOLEAN DEFAULT FALSE;
ALTER TABLE checkout_items ADD COLUMN IF NOT EXISTS available_lot_count INTEGER;
ALTER TABLE checkout_items ADD COLUMN IF NOT EXISTS selection_method VARCHAR(50); -- 'manual', 'auto_first', 'auto_fifo', 'auto_lifo'

-- 3. Create request_status_history table for audit trail
CREATE TABLE IF NOT EXISTS request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id UUID NOT NULL REFERENCES checkouts(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by_user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_status_history_checkout_id ON request_status_history(checkout_id);
CREATE INDEX IF NOT EXISTS idx_request_status_history_created_at ON request_status_history(created_at DESC);

-- 4. Create or replace function to update checkout status with history
CREATE OR REPLACE FUNCTION update_checkout_status(
  p_checkout_id UUID,
  p_new_status VARCHAR(20),
  p_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_old_status VARCHAR(20);
BEGIN
  -- Get current status
  SELECT status INTO v_old_status FROM checkouts WHERE id = p_checkout_id;
  
  -- Update checkout
  UPDATE checkouts 
  SET 
    status = p_new_status,
    status_changed_at = now(),
    updated_at = now()
  WHERE id = p_checkout_id;
  
  -- Record in history
  INSERT INTO request_status_history (
    checkout_id, old_status, new_status, changed_by_user_id, notes
  ) VALUES (
    p_checkout_id, v_old_status, p_new_status, p_user_id, p_notes
  );
  
  -- Auto-update checkout_items status based on checkout status
  IF p_new_status = 'returned' THEN
    UPDATE checkout_items ci
    SET returned_at = now()
    WHERE ci.checkout_id = p_checkout_id AND ci.returned_at IS NULL;
  ELSIF p_new_status = 'approved' THEN
    UPDATE checkout_items ci
    SET status = 'approved'
    WHERE ci.checkout_id = p_checkout_id AND ci.status IS DISTINCT FROM 'approved';
  ELSIF p_new_status = 'borrowed' THEN
    UPDATE checkout_items ci
    SET status = 'borrowed', borrowed_at = now()
    WHERE ci.checkout_id = p_checkout_id AND ci.status IS DISTINCT FROM 'borrowed';
  ELSIF p_new_status IN ('rejected', 'cancelled') THEN
    UPDATE checkout_items ci
    SET status = p_new_status
    WHERE ci.checkout_id = p_checkout_id AND ci.status IS DISTINCT FROM p_new_status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function for automatic lot selection
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
      il.quantity_on_hand - COALESCE(SUM(ci.quantity), 0) as available
    FROM item_lots il
    LEFT JOIN checkout_items ci ON ci.lot_id = il.id 
      AND ci.returned_at IS NULL 
      AND ci.status NOT IN ('returned', 'rejected', 'cancelled')
    WHERE il.item_id = p_item_id 
      AND il.quantity_on_hand > 0
      AND il.present = true
      AND (il.expires_at IS NULL OR il.expires_at > now())
    GROUP BY il.id, il.quantity_on_hand
    HAVING (il.quantity_on_hand - COALESCE(SUM(ci.quantity), 0)) > 0
    ORDER BY 
      CASE p_selection_method
        WHEN 'auto_fifo' THEN il.created_at -- First In First Out
        WHEN 'auto_lifo' THEN il.created_at DESC -- Last In First Out  
        WHEN 'auto_expiry' THEN COALESCE(il.expires_at, 'infinity'::TIMESTAMPTZ) -- Earliest expiry first
        ELSE il.created_at
      END
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

-- 6. Create trigger to auto-update status_changed_at
CREATE OR REPLACE FUNCTION trigger_update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_checkouts_status_changed ON checkouts;
CREATE TRIGGER trigger_checkouts_status_changed
  BEFORE UPDATE ON checkouts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_status_changed_at();

-- 7. Update existing checkouts to have proper status
UPDATE checkouts 
SET 
  status = CASE 
    WHEN returned_at IS NOT NULL THEN 'returned'
    WHEN borrowed_at IS NOT NULL THEN 'borrowed'
    WHEN approved_at IS NOT NULL THEN 'approved'
    WHEN rejected_at IS NOT NULL THEN 'rejected'
    ELSE 'pending'
  END,
  status_changed_at = COALESCE(returned_at, borrowed_at, approved_at, rejected_at, created_at);

-- 8. Populate request_number for existing checkouts based on creation order
WITH numbered_checkouts AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM checkouts
  WHERE request_number IS NULL
)
UPDATE checkouts c
SET request_number = nc.rn
FROM numbered_checkouts nc
WHERE c.id = nc.id;

-- 9. Create view for request tracking dashboard
CREATE OR REPLACE VIEW request_tracking_view AS
SELECT 
  c.id,
  c.request_number,
  c.status,
  c.status_changed_at,
  c.tracking_status,
  c.admin_notes,
  c.rejection_reason,
  c.user_id,
  u.display_name as user_name,
  u.email as user_email,
  u.sr_code,
  c.borrowed_at,
  c.due_at,
  c.returned_at,
  c.created_at,
  c.updated_at,
  COUNT(ci.id) as item_count,
  SUM(ci.quantity) as total_quantity,
  STRING_AGG(DISTINCT i.name, ', ') as item_names
FROM checkouts c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN checkout_items ci ON c.id = ci.checkout_id
LEFT JOIN items i ON ci.item_id = i.id
GROUP BY c.id, u.display_name, u.email, u.sr_code;

-- 10. Create notification triggers for status changes
-- (These will work with the notification system already implemented)

COMMENT ON COLUMN checkouts.status IS 'Request status: pending, approved, borrowed, returned, rejected';
COMMENT ON COLUMN checkouts.request_number IS 'Auto-incrementing request number (Request #1, #2, etc.)';
COMMENT ON COLUMN checkouts.tracking_status IS 'Additional tracking status: processing, ready_for_pickup, etc.';
COMMENT ON COLUMN checkout_items.lot_selected_automatically IS 'Whether lot was selected automatically by system';
COMMENT ON COLUMN checkout_items.selection_method IS 'How lot was selected: manual, auto_first, auto_fifo, auto_lifo';

-- =============================================================================
-- Migration Complete
-- =============================================================================