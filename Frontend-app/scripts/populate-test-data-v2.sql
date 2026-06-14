-- Test data population script (correct schema)
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
    
    -- Insert quantifiable items with lots
    INSERT INTO items (item_type, sku, name, category, description, status, created_by, item_model)
    VALUES
        ('quantifiable', 'HP-M130a-001', 'HP LaserJet Pro MFP M130a', 'Electronics', 'Multifunction printer', 'active', admin_user_id, 'M130fw'),
        ('quantifiable', 'SN-27F-002', 'Samsung 27" FHD Monitor', 'Electronics', 'Monitor for office', 'active', admin_user_id, 'C27F390'),
        ('quantifiable', 'LG-MX3S-003', 'Logitech MX Master 3S', 'Accessories', 'Premium wireless mouse', 'active', admin_user_id, '920-007888'),
        ('quantifiable', 'HB-7IN1-004', 'USB-C Hub 7-in-1', 'Accessories', 'Multi-port adapter', 'active', admin_user_id, 'CH340'),
        ('quantifiable', 'MS-WL-005', 'Wireless Mouse', 'Accessories', 'Standard wireless mouse', 'active', admin_user_id, 'M185'),
        ('quantifiable', 'KB-RETRO-006', 'Retro Keyboard', 'Accessories', 'Mechanical keyboard', 'active', admin_user_id, 'Das Keyboard'),
        ('quantifiable', 'CB-HDMI-007', 'HDMI Cable 2m', 'Cables', 'High-speed HDMI cable', 'active', admin_user_id, 'Monoprice'),
        ('quantifiable', 'ST-USBC-008', 'USB flash drive 64GB', 'Storage', 'Portable storage', 'active', admin_user_id, 'SanDisk');
    
    -- Create lots for quantifiable items
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-001', 15, 15, 0, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'HP-M130a-001';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-002', 8, 8, 0, CURRENT_DATE - INTERVAL '3 months', NULL, 'Initial stock' FROM items WHERE sku = 'SN-27F-002';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-003', 25, 25, 0, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'LG-MX3S-003';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-004', 20, 20, 0, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'HB-7IN1-004';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-005', 30, 30, 0, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'MS-WL-005';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-006', 12, 12, 0, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'KB-RETRO-006';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-007', 50, 50, 0, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'CB-HDMI-007';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-QTY-008', 35, 35, 0, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'ST-USBC-008';
    
    -- Insert trackable items
    INSERT INTO items (item_type, sku, name, category, description, status, created_by, item_model)
    VALUES
        ('trackable', 'AP-M3-16-001', 'MacBook Pro 16" M3', 'Laptops', 'Professional laptop', 'active', admin_user_id, 'MLX33LL/A'),
        ('trackable', 'DL-5560-002', 'Dell Precision 5560', 'Laptops', 'Mobile workstation', 'active', admin_user_id, '92SKY72'),
        ('trackable', 'AP-AIR5-003', 'iPad Air 5th Gen', 'Tablets', 'Tablet for presentations', 'maintenance', admin_user_id, 'MK2D3LL/A'),
        ('trackable', 'MC-ARDU-004', 'Arduino Uno R4', 'Microcontrollers', 'Microcontroller board', 'active', admin_user_id, '11001'),
        ('trackable', 'MC-RPI4-005', 'Raspberry Pi 4 Model B', 'Microcontrollers', 'Single-board computer', 'active', admin_user_id, 'BCM2711');
    
    -- Create lots for trackable items
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-001', 3, 3, 0, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'AP-M3-16-001';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-002', 2, 2, 0, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'DL-5560-002';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-003', 5, 5, 0, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'AP-AIR5-003';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-004', 8, 8, 0, CURRENT_DATE - INTERVAL '1 year', NULL, 'Initial stock' FROM items WHERE sku = 'MC-ARDU-004';
    INSERT INTO item_lots (item_id, lot_code, quantity_total, quantity_on_hand, quantity_out, purchased_at, expires_at, notes)
    SELECT id, 'LOT-TRK-005', 6, 6, 0, CURRENT_DATE - INTERVAL '6 months', NULL, 'Initial stock' FROM items WHERE sku = 'MC-RPI4-005';
    
    -- Insert checkout transactions (requests)
    INSERT INTO checkout_transactions (checked_out_by, status, notes, created_at)
    VALUES
        (admin_user_id, 'closed', 'John Doe request - office printing', NOW() - INTERVAL '2 days'),
        (admin_user_id, 'pending_approval', 'Jane Smith request - pending', NOW() - INTERVAL '12 hours'),
        (admin_user_id, 'closed', 'Bob Wilson request - development', NOW() - INTERVAL '3 days'),
        (admin_user_id, 'closed', 'Alice Brown request - presentations', NOW() - INTERVAL '4 days'),
        (admin_user_id, 'cancelled', 'Charlie Davis request - cancelled', NOW() - INTERVAL '6 days'),
        (admin_user_id, 'closed', 'Emma Garcia request - team USB hubs', NOW() - INTERVAL '1 day'),
        (admin_user_id, 'closed', 'Frank Miller request - IoT development', NOW() - INTERVAL '5 days');
    
    -- Insert checkout transaction items
    -- Request 1: John Doe
    INSERT INTO checkout_transaction_items (transaction_id, lot_id, quantity, condition, notes)
    SELECT ct.id, il.id, 2, 'Good', 'For office printing needs' 
    FROM checkout_transactions ct, item_lots il, items i 
    WHERE ct.notes = 'John Doe request - office printing' AND i.sku = 'HP-M130a-001' AND il.item_id = i.id;
    
    INSERT INTO checkout_transaction_items (transaction_id, lot_id, quantity, condition, notes)
    SELECT ct.id, il.id, 1, 'Good', 'Main office mouse'
    FROM checkout_transactions ct, item_lots il, items i 
    WHERE ct.notes = 'John Doe request - office printing' AND i.sku = 'LG-MX3S-003' AND il.item_id = i.id;
    
    -- Request 3: Bob Wilson
    INSERT INTO checkout_transaction_items (transaction_id, lot_id, quantity, condition, notes)
    SELECT ct.id, il.id, 1, 'Excellent', 'Development workstation'
    FROM checkout_transactions ct, item_lots il, items i 
    WHERE ct.notes = 'Bob Wilson request - development' AND i.sku = 'AP-M3-16-001' AND il.item_id = i.id;
    
    -- Request 4: Alice Brown
    INSERT INTO checkout_transaction_items (transaction_id, lot_id, quantity, condition, notes)
    SELECT ct.id, il.id, 2, 'Good', 'Event presentations'
    FROM checkout_transactions ct, item_lots il, items i 
    WHERE ct.notes = 'Alice Brown request - presentations' AND i.sku = 'AP-AIR5-003' AND il.item_id = i.id;
    
    -- Request 6: Emma Garcia
    INSERT INTO checkout_transaction_items (transaction_id, lot_id, quantity, condition, notes)
    SELECT ct.id, il.id, 3, 'Good', 'USB hubs for team'
    FROM checkout_transactions ct, item_lots il, items i 
    WHERE ct.notes = 'Emma Garcia request - team USB hubs' AND i.sku = 'HB-7IN1-004' AND il.item_id = i.id;
    
    INSERT INTO checkout_transaction_items (transaction_id, lot_id, quantity, condition, notes)
    SELECT ct.id, il.id, 5, 'Good', 'HDMI cables for setup'
    FROM checkout_transactions ct, item_lots il, items i 
    WHERE ct.notes = 'Emma Garcia request - team USB hubs' AND i.sku = 'CB-HDMI-007' AND il.item_id = i.id;
    
    -- Request 7: Frank Miller
    INSERT INTO checkout_transaction_items (transaction_id, lot_id, quantity, condition, notes)
    SELECT ct.id, il.id, 2, 'Good', 'IoT prototype development'
    FROM checkout_transactions ct, item_lots il, items i 
    WHERE ct.notes = 'Frank Miller request - IoT development' AND i.sku = 'MC-ARDU-004' AND il.item_id = i.id;
    
    -- Update item_lots quantities for checked out items
    UPDATE item_lots SET quantity_out = quantity_out + 2 WHERE id = (SELECT il.id FROM item_lots il, items i WHERE i.sku = 'HP-M130a-001' AND il.item_id = i.id LIMIT 1);
    UPDATE item_lots SET quantity_out = quantity_out + 1 WHERE id = (SELECT il.id FROM item_lots il, items i WHERE i.sku = 'LG-MX3S-003' AND il.item_id = i.id LIMIT 1);
    UPDATE item_lots SET quantity_out = quantity_out + 1 WHERE id = (SELECT il.id FROM item_lots il, items i WHERE i.sku = 'AP-M3-16-001' AND il.item_id = i.id LIMIT 1);
    UPDATE item_lots SET quantity_out = quantity_out + 2 WHERE id = (SELECT il.id FROM item_lots il, items i WHERE i.sku = 'AP-AIR5-003' AND il.item_id = i.id LIMIT 1);
    UPDATE item_lots SET quantity_out = quantity_out + 3 WHERE id = (SELECT il.id FROM item_lots il, items i WHERE i.sku = 'HB-7IN1-004' AND il.item_id = i.id LIMIT 1);
    UPDATE item_lots SET quantity_out = quantity_out + 5 WHERE id = (SELECT il.id FROM item_lots il, items i WHERE i.sku = 'CB-HDMI-007' AND il.item_id = i.id LIMIT 1);
    UPDATE item_lots SET quantity_out = quantity_out + 2 WHERE id = (SELECT il.id FROM item_lots il, items i WHERE i.sku = 'MC-ARDU-004' AND il.item_id = i.id LIMIT 1);
    
    RAISE NOTICE 'Test data populated successfully!';
END $$;
