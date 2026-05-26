// Verify database schema for request API enhancements
const { Client } = require('pg');

async function verifySchema() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'erica_db',
    user: 'erica_user',
    password: 'erica_password'
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // 1. Check if request_number column exists in checkout_transactions
    console.log('\n1. Checking request_number column in checkout_transactions:');
    const result1 = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'checkout_transactions' 
      AND column_name = 'request_number'
    `);
    
    if (result1.rows.length > 0) {
      console.log('✓ Found request_number column:');
      console.log('  - Data type:', result1.rows[0].data_type);
      console.log('  - Default:', result1.rows[0].column_default);
      console.log('  - Nullable:', result1.rows[0].is_nullable);
    } else {
      console.log('✗ request_number column not found in checkout_transactions');
    }
    
    // 2. Check tracking_status column
    console.log('\n2. Checking tracking_status column in checkout_transactions:');
    const result2 = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'checkout_transactions' 
      AND column_name = 'tracking_status'
    `);
    
    if (result2.rows.length > 0) {
      console.log('✓ Found tracking_status column:');
      console.log('  - Data type:', result2.rows[0].data_type);
      console.log('  - Default:', result2.rows[0].column_default);
      console.log('  - Nullable:', result2.rows[0].is_nullable);
      
      // Check allowed values for tracking_status
      const checkResult = await client.query(`
        SELECT conname, pg_get_constraintdef(oid) 
        FROM pg_constraint 
        WHERE conrelid = 'checkout_transactions'::regclass 
        AND conname LIKE '%tracking_status%'
      `);
      
      if (checkResult.rows.length > 0) {
        console.log('  - Constraint:', checkResult.rows[0].pg_get_constraintdef);
      }
    } else {
      console.log('✗ tracking_status column not found in checkout_transactions');
    }
    
    // 3. Check automatic lot selection function
    console.log('\n3. Checking auto lot selection functions:');
    const result3 = await client.query(`
      SELECT routine_name, routine_type, data_type
      FROM information_schema.routines
      WHERE routine_name = 'select_available_lot_for_item'
      AND routine_schema = 'public'
    `);
    
    if (result3.rows.length > 0) {
      console.log('✓ Found select_available_lot_for_item function:');
      console.log('  - Type:', result3.rows[0].routine_type);
      console.log('  - Returns:', result3.rows[0].data_type);
    } else {
      console.log('✗ select_available_lot_for_item function not found');
    }
    
    // 4. Check lot selection tracking fields in checkout_transaction_items
    console.log('\n4. Checking lot selection tracking fields:');
    const result4 = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'checkout_transaction_items' 
      AND column_name IN ('lot_selected_automatically', 'selection_method')
    `);
    
    if (result4.rows.length > 0) {
      console.log('✓ Found lot selection tracking fields:');
      result4.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('✗ Lot selection tracking fields not found');
    }
    
    // 5. Check if there are any checkout transactions with request numbers
    console.log('\n5. Checking existing checkout transactions:');
    const result5 = await client.query(`
      SELECT COUNT(*) as total, 
             COUNT(request_number) as with_request_number,
             MIN(request_number) as min_request,
             MAX(request_number) as max_request
      FROM checkout_transactions
    `);
    
    if (result5.rows.length > 0) {
      const stats = result5.rows[0];
      console.log(`  - Total transactions: ${stats.total}`);
      console.log(`  - With request number: ${stats.with_request_number}`);
      console.log(`  - Request number range: ${stats.min_request || 'N/A'} to ${stats.max_request || 'N/A'}`);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

verifySchema();
