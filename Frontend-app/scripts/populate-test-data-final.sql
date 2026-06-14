-- Test data population script (simplified)
-- Admin-Records database schema

-- First, get the admin user UUID
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No admin user found';
    END IF;
    
    -- Insert quantifiable items
    INSERT INTO items (item_type, sku, name, category, status, created_by, item_model)
    VALUES
        ('quantifiable', 'HP-M130a-001', 'HP LaserJet Pro MFP M130a', 'Electronics', 'active', admin_user_id, 'M130fw'),
        ('quantifiable', 'SN-27F-002', 'Samsung 27" FHD Monitor', 'Electronics', 'active', admin_user_id, 'C27F390'),
        ('quantifiable', 'LG-MX3S-003', 'Logitech MX Master 3S', 'Accessories', 'active', admin_user_id, '920-007888'),
        ('quantifiable', 'HB-7IN1-004', 'USB-C Hub 7-in-1', 'Accessories', 'active', admin_user_id, 'CH340'),
        ('quantifiable', 'MS-WL-005', 'Wireless Mouse', 'Accessories', 'active', admin_user_id, 'M185'),
        ('quantifiable', 'KB-RETRO-006', 'Retro Keyboard', 'Accessories', 'active', admin_user_id, 'Das Keyboard'),
        ('quantifiable', 'CB-HDMI-007', 'HDMI Cable 2m', 'Cables', 'active', admin_user_id, 'Monoprice'),
        ('quantifiable', 'ST-USBC-008', 'USB flash drive 64GB', 'Storage', 'active', admin_user_id, 'SanDisk'),
        ('quantifiable', 'BAT-AA-20-001', 'AA Batteries (Pack of 20)', 'Consumables', 'active', admin_user_id, 'Energizer'),
        ('quantifiable', 'AC-ADPT-002', 'Laptop Adapters', 'Accessories', 'active', admin_user_id, 'Universal');
    
    -- Create lots for quantifiable items
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-001', 15, 15, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'HP-M130a-001';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-002', 8, 8, CURRENT_DATE - INTERVAL '3 months', NULL, 'Initial stock' FROM items WHERE sku = 'SN-27F-002';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-003', 25, 25, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'LG-MX3S-003';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-004', 20, 20, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'HB-7IN1-004';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-005', 30, 30, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'MS-WL-005';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-006', 12, 12, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'KB-RETRO-006';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-007', 50, 50, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'CB-HDMI-007';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-008', 35, 35, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'ST-USBC-008';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-009', 100, 100, CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '6 months', 'Battery stock' FROM items WHERE sku = 'BAT-AA-20-001';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-010', 20, 20, CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '3 months', 'Adapter stock' FROM items WHERE sku = 'AC-ADPT-002';
    
    -- Insert trackable items
    INSERT INTO items (item_type, sku, name, category, status, created_by, item_model)
    VALUES
        ('trackable', 'AP-M3-16-001', 'MacBook Pro 16" M3', 'Laptops', 'active', admin_user_id, 'MLX33LL/A'),
        ('trackable', 'DL-5560-002', 'Dell Precision 5560', 'Laptops', 'active', admin_user_id, '92SKY72'),
        ('trackable', 'AP-AIR5-003', 'iPad Air 5th Gen', 'Tablets', 'maintenance', admin_user_id, 'MK2D3LL/A'),
        ('trackable', 'MC-ARDU-004', 'Arduino Uno R4', 'Microcontrollers', 'active', admin_user_id, '11001'),
        ('trackable', 'MC-RPI4-005', 'Raspberry Pi 4 Model B', 'Microcontrollers', 'active', admin_user_id, 'BCM2711');
    
    -- Create lots for trackable items
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-001', 3, 3, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'AP-M3-16-001';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-002', 2, 2, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'DL-5560-002';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-003', 5, 5, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'AP-AIR5-003';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-004', 8, 8, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'MC-ARDU-004';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-005', 6, 6, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'MC-RPI4-005';
    
    -- Insert checkout transactions
    INSERT INTO checkout_transactions (checked_out_by, status, created_at)
    VALUES
        (admin_user_id, 'closed', NOW() - INTERVAL '2 days'),
        (admin_user_id, 'pending_approval', NOW() - INTERVAL '12 hours'),
        (admin_user_id, 'closed', NOW() - INTERVAL '3 days'),
        (admin_user_id, 'closed', NOW() - INTERVAL '4 days'),
        (admin_user_id, 'cancelled', NOW() - INTERVAL '6 days'),
        (admin_user_id, 'closed', NOW() - INTERVAL '1 day'),
        (admin_user_id, 'closed', NOW() - INTERVAL '5 days');
    
    -- Insert checkout transaction items (without notes/condition since not in schema)
    -- Request 1: HP M130a (2) + MX Master 3S (1)
    INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out)
    SELECT ct.id, i.id, il.id, 2 
    FROM checkout_transactions ct, items i, item_lots il 
    WHERE ct.id = (SELECT id FROM checkout_transactions LIMIT 1)
      AND i.sku = 'HP-M130a-001' AND il.item_id = i.id;
      
    INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out)
    SELECT ct.id, i.id, il.id, 1
    FROM checkout_transactions ct, items i, item_lots il 
    WHERE ct.id = (SELECT id FROM checkout_transactions LIMIT 1)
      AND i.sku = 'LG-MX3S-003' AND il.item_id = i.id;
    
    -- Request 3: MacBook Pro (1)
    INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out)
    SELECT ct.id, i.id, il.id, 1
    FROM checkout_transactions ct, items i, item_lots il 
    WHERE ct.id = (SELECT id FROM checkout_transactions WHERE status = 'closed' ORDER BY created_at OFFSET 2 LIMIT 1)
      AND i.sku = 'AP-M3-16-001' AND il.item_id = i.id;
    
    -- Request 4: iPad Air (2)
    INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out)
    SELECT ct.id, i.id, il.id, 2
    FROM checkout_transactions ct, items i, item_lots il 
    WHERE ct.id = (SELECT id FROM checkout_transactions WHERE status = 'closed' ORDER BY created_at OFFSET 3 LIMIT 1)
      AND i.sku = 'AP-AIR5-003' AND il.item_id = i.id;
    
    -- Request 6: USB-C Hub (3) + HDMI (5)
    INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out)
    SELECT ct.id, i.id, il.id, 3
    FROM checkout_transactions ct, items i, item_lots il 
    WHERE ct.id = (SELECT id FROM checkout_transactions WHERE status = 'closed' ORDER BY created_at OFFSET 5 LIMIT 1)
      AND i.sku = 'HB-7IN1-004' AND il.item_id = i.id;
      
    INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out)
    SELECT ct.id, i.id, il.id, 5
    FROM checkout_transactions ct, items i, item_lots il 
    WHERE ct.id = (SELECT id FROM checkout_transactions WHERE status = 'closed' ORDER BY created_at OFFSET 5 LIMIT 1)
      AND i.sku = 'CB-HDMI-007' AND il.item_id = i.id;
    
    -- Request 7: Arduino Uno (2)
    INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out)
    SELECT ct.id, i.id, il.id, 2
    FROM checkout_transactions ct, items i, item_lots il 
    WHERE ct.id = (SELECT id FROM checkout_transactions WHERE status = 'closed' ORDER BY created_at OFFSET 6 LIMIT 1)
      AND i.sku = 'MC-ARDU-004' AND il.item_id = i.id;
    
    RAISE NOTICE 'Test data populated successfully! % items, % lots, % transactions, % checkout items', 
        (SELECT COUNT(*) FROM items), 
        (SELECT COUNT(*) FROM item_lots),
        (SELECT COUNT(*) FROM checkout_transactions),
        (SELECT COUNT(*) FROM checkout_transaction_items);
END $$;
