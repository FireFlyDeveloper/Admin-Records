-- Add remaining checkout items manually
-- Item IDs from earlier query
-- HP-M130a-001: 39be6f8d-1f4f-4ff5-92af-0391f06257e1
-- SN-27F-002: 022be4ff-bc1d-4498-9a95-23dd7c8ff0f4
-- LG-MX3S-003: ed5db32a-4115-4c46-81e2-fb3abc013da8
-- HB-7IN1-004: bc2ca77f-f6b6-4d36-8b35-b3b4cf3296cc
-- MS-WL-005: 93fbef18-beeb-4a8a-9fbd-4d09081bdb33
-- KB-RETRO-006: 45a1ea51-17f6-436e-8a2d-c0f474d0bd4e
-- CB-HDMI-007: cd31cf84-748d-4c0a-8de2-5d3a9ae09afd
-- ST-USBC-008: 2af5ef46-dc3f-4936-8e06-c3637fd5f809
-- BAT-AA-20-001: 4f4fd13b-85e4-456a-b37a-2890c61b646b
-- AC-ADPT-002: b789e6b9-8f08-4e60-8cc2-f170f7189971
-- AP-M3-16-001: defb4d4c-b06f-45ce-bb6b-5fa0ff40b26f
-- DL-5560-002: 383e721d-e369-4b57-ae47-0ebb534edaf4
-- AP-AIR5-003: 9864866a-b470-481b-aa16-723ccb05bcf1
-- MC-ARDU-004: 0db2faf5-dad5-455c-91dd-3113c55f44d2
-- MC-RPI4-005: 91779ba0-18d4-402d-a644-e57277230d53

-- Lot IDs
-- HP-M130a-001: 2b2c15fd-6d3e-41cc-85e9-63840f7f31b3
-- LG-MX3S-003: 8417ae75-d284-445a-b89d-d674c531bfbd
-- HB-7IN1-004: 4ae73042-2543-46bc-95b8-839593354f2e
-- CB-HDMI-007: e83e7a0f-704d-4592-901a-edf3f70ff85b
-- MC-ARDU-004: 195694ce-455c-4b4b-be89-3ba6403d8a48
-- AP-M3-16-001: ea37f5e6-a0fe-41d9-ad47-4af2190ad55e
-- AP-AIR5-003: e09a768a-b6af-4b0e-a207-8a0966e1a6bc
-- ST-USBC-008: fa2972f7-0f00-45be-8246-98c0a2a3c27c
-- MS-WL-005: ca8ef62f-ac9d-46b7-accf-d7179ec71e12
-- KB-RETRO-006: 142c81b3-a57e-4e82-8fc3-f89dfaed3927
-- SN-27F-002: daba3bc8-723a-4762-a620-54410d1ecdde

-- Transaction IDs (from checkout_transactions)
-- 1st (closed, 2 days ago): b9c93bac-5c41-4ce9-88e5-67d287e7236b
-- 2nd (pending): ae349018-d19d-4a4e-98ba-904fdc739206
-- 3rd (closed, 3 days ago): 6bed4b49-6375-460a-87ba-35217eff64ec
-- 4th (closed, 4 days ago): 8d3c0f2a-1b5d-4f8e-9a23-f7c4e9b0d1a2
-- 5th (cancelled): f1a2b3c4-d5e6-7f89-a0b1-c2d3e4f5a6b7
-- 6th (closed, 1 day ago): 9e8d7c6b-5a4f-3e2d-1c0b-9a8f7e6d5c4b
-- 7th (closed, 5 days ago): 1a2b3c4d-5e6f-7890-abcd-ef0123456789

-- Get actual transaction IDs
DO $$
DECLARE
    t1 UUID := 'b9c93bac-5c41-4ce9-88e5-67d287e7236b';
    t3 UUID := '6bed4b49-6375-460a-87ba-35217eff64ec';
    t4 UUID := '79440ead-a9e3-44a2-8ad4-8922a004c1b0';
    t6 UUID := '89c8d098-7638-4045-ba73-62504ae272d2';
    t7 UUID := '8e6072a8-ae55-43a9-89b7-96d6eaabc055';
BEGIN
    INSERT INTO checkout_transaction_items (transaction_id, item_id, lot_id, quantity_out)
    VALUES
      (t1, 'ed5db32a-4115-4c46-81e2-fb3abc013da8', '8417ae75-d284-445a-b89d-d674c531bfbd', 1),
      (t1, 'bc2ca77f-f6b6-4d36-8b35-b3b4cf3296cc', '4ae73042-2543-46bc-95b8-839593354f2e', 3),
      (t1, 'cd31cf84-748d-4c0a-8de2-5d3a9ae09afd', 'e83e7a0f-704d-4592-901a-edf3f70ff85b', 5),
      (t3, 'defb4d4c-b06f-45ce-bb6b-5fa0ff40b26f', 'ea37f5e6-a0fe-41d9-ad47-4af2190ad55e', 1),
      (t4, '9864866a-b470-481b-aa16-723ccb05bcf1', 'e09a768a-b6af-4b0e-a207-8a0966e1a6bc', 2),
      (t6, 'bc2ca77f-f6b6-4d36-8b35-b3b4cf3296cc', '4ae73042-2543-46bc-95b8-839593354f2e', 2),
      (t6, '2af5ef46-dc3f-4936-8e06-c3637fd5f809', 'fa2972f7-0f00-45be-8246-98c0a2a3c27c', 3),
      (t7, '0db2faf5-dad5-455c-91dd-3113c55f44d2', '195694ce-455c-4b4b-be89-3ba6403d8a48', 2);
    RAISE NOTICE 'Inserted remaining checkout items';
END $$;
