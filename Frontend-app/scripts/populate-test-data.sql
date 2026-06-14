-- Test data population script
-- Run this in the admin_records database

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert quantifiable items
INSERT INTO items (name, sku, category, quantity, min_stock, barcode, item_model, type, status, created_at)
VALUES
  ('HP LaserJet Pro MFP M130a', 'HP-M130a-001', 'Electronics', 15, 5, 'QTY-001-HP-M130', 'M130fw', 'quantifiable', 'Active', NOW()),
  ('Samsung 27" FHD Monitor', 'SN-27F-002', 'Electronics', 8, 3, 'QTY-002-SN-27F', 'C27F390', 'quantifiable', 'Active', NOW()),
  ('Logitech MX Master 3S', 'LG-MX3S-003', 'Accessories', 25, 10, 'QTY-003-LG-MX3S', '920-007888', 'quantifiable', 'Active', NOW()),
  ('USB-C Hub 7-in-1', 'HB-7IN1-004', 'Accessories', 20, 8, 'QTY-004-HB-7IN1', 'CH340', 'quantifiable', 'Active', NOW()),
  ('Wireless Mouse', 'MS-WL-005', 'Accessories', 30, 12, 'QTY-005-MS-WL', 'M185', 'quantifiable', 'Active', NOW()),
  ('Retro Keyboard', 'KB-RETRO-006', 'Accessories', 12, 5, 'QTY-006-KB-RETRO', 'Das Keyboard', 'quantifiable', 'Active', NOW()),
  ('HDMI Cable 2m', 'CB-HDMI-007', 'Cables', 50, 20, 'QTY-007-CB-HDMI', 'Monoprice', 'quantifiable', 'Active', NOW()),
  ('USB flash drive 64GB', 'ST-USBC-008', 'Storage', 35, 15, 'QTY-008-ST-USBC', 'SanDisk', 'quantifiable', 'Active', NOW());

-- Insert trackable items
INSERT INTO items (name, sku, category, quantity, min_stock, barcode, item_model, type, status, created_at)
VALUES
  ('MacBook Pro 16" M3', 'AP-M3-16-001', 'Laptops', 3, 1, 'TRK-001-AP-M3', 'MLX33LL/A', 'trackable', 'Active', NOW()),
  ('Dell Precision 5560', 'DL-5560-002', 'Laptops', 2, 1, 'TRK-002-DL-5560', '92SKY72', 'trackable', 'Active', NOW()),
  ('iPad Air 5th Gen', 'AP-AIR5-003', 'Tablets', 5, 2, 'TRK-003-AP-AIR5', 'MK2D3LL/A', 'trackable', 'Maintenance', NOW()),
  ('Arduino Uno R4', 'MC-ARDU-004', 'Microcontrollers', 8, 3, 'TRK-004-MC-ARDU', '11001', 'trackable', 'Active', NOW()),
  ('Raspberry Pi 4 Model B', 'MC-RPI4-005', 'Microcontrollers', 6, 2, 'TRK-005-MC-RPI4', 'BCM2711', 'trackable', 'Active', NOW());

-- Create test requests
INSERT INTO requests (requestor_name, requestor_email, status, created_at)
VALUES
  ('John Doe', 'john.doe@company.com', 'Approved', NOW() - INTERVAL '2 days'),
  ('Jane Smith', 'jane.smith@company.com', 'Pending', NOW() - INTERVAL '12 hours'),
  ('Bob Wilson', 'bob.wilson@company.com', 'Approved', NOW() - INTERVAL '3 days'),
  ('Alice Brown', 'alice.brown@company.com', 'Approved', NOW() - INTERVAL '4 days'),
  ('Charlie Davis', 'charlie.davis@company.com', 'Cancelled', NOW() - INTERVAL '6 days'),
  ('Emma Garcia', 'emma.garcia@company.com', 'Approved', NOW() - INTERVAL '1 day'),
  ('Frank Miller', 'frank.miller@company.com', 'Approved', NOW() - INTERVAL '5 days');

-- Create checkout items for requests
INSERT INTO checkout_transaction_items (request_id, item_id, quantity, condition, notes, created_at)
VALUES
  -- Request 1: John Doe - Electronics for office
  (1, 1, 2, 'Good', 'For office printing needs', NOW() - INTERVAL '2 days'),
  (1, 3, 1, 'Good', 'Main office mouse', NOW() - INTERVAL '2 days'),
  
  -- Request 3: Bob Wilson - Laptop development
  (3, 9, 1, 'Excellent', 'Development workstation', NOW() - INTERVAL '3 days'),
  
  -- Request 4: Alice Brown - Tablet presentation
  (4, 11, 2, 'Good', 'Event presentations', NOW() - INTERVAL '4 days'),
  
  -- Request 6: Emma Garcia - Multiple accessories
  (6, 4, 3, 'Good', 'USB hubs for team', NOW() - INTERVAL '1 day'),
  (6, 7, 5, 'Good', 'HDMI cables for setup', NOW() - INTERVAL '1 day'),
  
  -- Request 7: Frank Miller - Microcontrollers
  (7, 12, 2, 'Good', 'IoT prototype development', NOW() - INTERVAL '5 days');

-- Create public borrow requests (simulating PublicBorrowPage)
INSERT INTO checkout_transactions (item_id, quantity, condition, return_date, notes, created_at)
VALUES
  (1, 1, 'Good', NOW() + INTERVAL '7 days', 'For semester project - student A', NOW() - INTERVAL '1 day'),
  (3, 1, 'Fair', NOW() + INTERVAL '15 days', 'Research project - student B', NOW() - INTERVAL '2 days'),
  (9, 1, 'Good', NOW() + INTERVAL '30 days', 'Thesis work - student C', NOW() - INTERVAL '3 days');

-- Update item quantities (subtract borrowed items)
UPDATE items SET quantity = quantity - 2 WHERE id = 1;  -- HP M130a
UPDATE items SET quantity = quantity - 1 WHERE id = 3;  -- MX Master 3S
UPDATE items SET quantity = quantity - 1 WHERE id = 9;  -- MacBook Pro M3
UPDATE items SET quantity = quantity - 2 WHERE id = 11; -- iPad Air
UPDATE items SET quantity = quantity - 3 WHERE id = 4;  -- USB-C Hub
UPDATE items SET quantity = quantity - 5 WHERE id = 7;  -- HDMI Cable
UPDATE items SET quantity = quantity - 2 WHERE id = 12; -- Arduino Uno
UPDATE items SET quantity = quantity - 1 WHERE id = 1;  -- Public borrow
UPDATE items SET quantity = quantity - 1 WHERE id = 3;  -- Public borrow
UPDATE items SET quantity = quantity - 1 WHERE id = 9;  -- Public borrow

-- Add some "exponential" items (for testing expiration dashboard)
INSERT INTO items (name, sku, category, quantity, min_stock, barcode, item_model, type, status, expiry_date, created_at)
VALUES
  ('AA Batteries (Pack of 20)', 'BAT-AA-20-001', 'Consumables', 100, 25, 'EXP-001-BAT-AA', 'Energizer', 'quantifiable', 'Active', NOW() + INTERVAL '6 months', NOW()),
  ('Laptop Adapters', 'AC-ADPT-002', 'Accessories', 20, 8, 'EXP-002-AC-ADPT', 'Universal', 'quantifiable', 'Active', NOW() + INTERVAL '3 months', NOW()),
  ('Office Chair Wheels', 'PT-WHL-003', 'Parts', 50, 15, 'EXP-003-PT-WHL', 'Standard', 'quantifiable', 'Active', NOW() + INTERVAL '1 month', NOW());
