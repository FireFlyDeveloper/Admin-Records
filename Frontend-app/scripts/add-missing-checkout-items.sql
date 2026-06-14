-- Add checkout items to transactions that are missing them
DO $$
DECLARE
    txn_id UUID;
    v_item_id UUID;
    v_lot_id UUID;
    v_on_hand INTEGER;
    v_out INTEGER;
BEGIN
    -- Get first transaction that has no checkout items
    SELECT ct.id INTO txn_id FROM checkout_transactions ct 
    WHERE NOT EXISTS (
        SELECT 1 FROM checkout_transaction_items cti WHERE cti.transaction_id = ct.id
    ) LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'All transactions already have checkout items';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Adding checkout items to transaction: %', txn_id;
    
    -- Get item with available stock
    v_item_id := NULL;
    v_lot_id := NULL;
    
    SELECT il.item_id, il.id, il.quantity_on_hand, il.quantity_out 
    INTO v_item_id, v_lot_id, v_on_hand, v_out
    FROM item_lots il 
    WHERE il.quantity_on_hand > 0
    LIMIT 1;
    
    RAISE NOTICE 'Found: item_id=%, lot_id=%, on_hand=%, out=%', v_item_id, v_lot_id, v_on_hand, v_out;
    
    IF v_lot_id IS NULL THEN
        RAISE EXCEPTION 'No item lots available';
    END IF;
    
    -- Add checkout item
    INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out, quantity_returned)
    VALUES (txn_id, v_item_id, v_lot_id, 1, 0);
    
    RAISE NOTICE 'Added checkout item';
END $$;
