import { createPool } from './src/database';
import { insertItem, insertRequest, insertCheckout } from '../src/services/itemsService';

const pool = createPool();

async function createTestItems() {
  const quantifiableItems = [
    {
      name: 'HP LaserJet Pro MFP M130a',
      sku: 'HP-M130a-001',
      category: 'Electronics',
      quantity: 15,
      min_stock: 5,
      barcode: 'QTY-001-HP-M130',
      item_model: 'M130fw'
    },
    {
      name: 'Samsung 27" FHD Monitor',
      sku: 'SN-27F-002',
      category: 'Electronics',
      quantity: 8,
      min_stock: 3,
      barcode: 'QTY-002-SN-27F',
      item_model: 'C27F390'
    },
    {
      name: 'Logitech MX Master 3S',
      sku: 'LG-MX3S-003',
      category: 'Accessories',
      quantity: 25,
      min_stock: 10,
      barcode: 'QTY-003-LG-MX3S',
      item_model: '920-007888'
    },
    {
      name: 'USB-C Hub 7-in-1',
      sku: 'HB-7IN1-004',
      category: 'Accessories',
      quantity: 20,
      min_stock: 8,
      barcode: 'QTY-004-HB-7IN1',
      item_model: 'CH340'
    },
    {
      name: 'Wireless Mouse',
      sku: 'MS-WL-005',
      category: 'Accessories',
      quantity: 30,
      min_stock: 12,
      barcode: 'QTY-005-MS-WL',
      item_model: 'M185'
    },
  ];

  const trackableItems = [
    {
      name: 'MacBook Pro 16" M3',
      sku: 'AP-M3-16-001',
      category: 'Laptops',
      quantity: 3,
      min_stock: 1,
      barcode: 'TRK-001-AP-M3',
      item_model: 'MLX33LL/A',
      status: 'Active'
    },
    {
      name: 'Dell Precision 5560',
      sku: 'DL-5560-002',
      category: 'Laptops',
      quantity: 2,
      min_stock: 1,
      barcode: 'TRK-002-DL-5560',
      item_model: '92SKY72',
      status: 'Active'
    },
    {
      name: 'iPad Air 5th Gen',
      sku: 'AP-AIR5-003',
      category: 'Tablets',
      quantity: 5,
      min_stock: 2,
      barcode: 'TRK-003-AP-AIR5',
      item_model: 'MK2D3LL/A',
      status: 'Maintenance'
    },
  ];

  for (const item of quantifiableItems) {
    await insertItem(pool, {
      ...item,
      type: 'quantifiable',
    });
    console.log(`Inserted quantifiable: ${item.name}`);
  }

  for (const item of trackableItems) {
    await insertItem(pool, {
      ...item,
      type: 'trackable',
    });
    console.log(`Inserted trackable: ${item.name}`);
  }
}

async function createTestRequests() {
  // Create 5 test requests
  const testRequests = [
    {
      requestor_name: 'John Doe',
      requestor_email: 'john.doe@company.com',
      status: 'Approved',
      created_at: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      requestor_name: 'Jane Smith',
      requestor_email: 'jane.smith@company.com',
      status: 'Pending',
      created_at: new Date(Date.now() - 43200000), // 12 hours ago
    },
    {
      requestor_name: 'Bob Wilson',
      requestor_email: 'bob.wilson@company.com',
      status: 'Approved',
      created_at: new Date(Date.now() - 172800000), // 2 days ago
    },
    {
      requestor_name: 'Alice Brown',
      requestor_email: 'alice.brown@company.com',
      status: 'Approved',
      created_at: new Date(Date.now() - 259200000), // 3 days ago
    },
    {
      requestor_name: 'Charlie Davis',
      requestor_email: 'charlie.davis@company.com',
      status: 'Cancelled',
      created_at: new Date(Date.now() - 518400000), // 6 days ago
    },
  ];

  for (const req of testRequests) {
    const request = await insertRequest(pool, req);
    console.log(`Created request #${request.id}`);
    
    // Add items to some requests
    if (request.id === 1) {
      await insertCheckout(pool, {
        request_id: request.id,
        item_id: 1,
        quantity: 2,
        condition: 'Good',
        notes: 'For office use',
      });
    }
    if (request.id === 2) {
      await insertCheckout(pool, {
        request_id: request.id,
        item_id: 3,
        quantity: 1,
        condition: 'Good',
        notes: 'Presentations',
      });
    }
    if (request.id === 3) {
      await insertCheckout(pool, {
        request_id: request.id,
        item_id: 6,
        quantity: 1,
        condition: 'Excellent',
        notes: 'Development work',
      });
    }
  }
}

async function createPublicBorrowRequests() {
  // Create public borrow requests (PublicBorrowPage scenario)
  const publicBorrows = [
    {
      barcode: 'BWR-001-STU',
      item_id: 1,
      condition: 'Good',
      return_date: new Date(Date.now() + 604800000), // 7 days from now
      notes: 'For semester project',
    },
    {
      barcode: 'BWR-002-STU',
      item_id: 3,
      condition: 'Fair',
      return_date: new Date(Date.now() + 1296000000), // 15 days from now
      notes: 'Research purposes',
    },
    {
      barcode: 'BWR-003-STU',
      item_id: 6,
      condition: 'Good',
      return_date: new Date(Date.now() + 259200000), // 3 days from now
      notes: 'Quick project',
    },
  ];

  for (const borrow of publicBorrows) {
    // Find item by barcode
    const itemResult = await pool.query(
      'SELECT id, name, type FROM items WHERE barcode = $1',
      [borrow.barcode]
    );
    
    if (itemResult.rowCount > 0) {
      await insertCheckout(pool, {
        item_id: itemResult.rows[0].id,
        quantity: 1,
        condition: borrow.condition,
        notes: borrow.notes,
      });
      console.log(`Created public borrow: ${borrow.barcode}`);
    }
  }
}

async function main() {
  try {
    console.log('Creating test items...');
    await createTestItems();
    
    console.log('\nCreating test requests...');
    await createTestRequests();
    
    console.log('\nCreating public borrow requests...');
    await createPublicBorrowRequests();
    
    console.log('\n✅ Test data populated successfully!');
  } catch (error) {
    console.error('Error populating test data:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
