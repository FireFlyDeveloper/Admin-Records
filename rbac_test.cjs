// Role-Based Access Control Test for Erica Inventory System
const http = require('http');

class RBACTest {
  constructor(baseUrl = 'http://localhost:3080') {
    this.baseUrl = baseUrl;
    this.results = [];
    this.adminToken = null;
    this.staffToken = null;
    this.studentToken = null;
    
    // Test users (assuming these exist in the system)
    this.users = {
      admin: {
        email: 'admin@example.com',
        password: 'admin123'
      },
      staff: {
        email: 'staff@example.com',
        password: 'staff123'
      },
      student: {
        email: 'student@example.com',
        password: 'student123'
      }
    };
  }

  makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({
              statusCode: res.statusCode,
              body: parsed,
              raw: responseData
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              body: responseData,
              raw: responseData,
              parseError: e.message
            });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  getOptions(path, method = 'GET', token = null) {
    const options = {
      hostname: 'localhost',
      port: 3080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    return options;
  }

  async login(email, password) {
    const result = await this.makeRequest(
      this.getOptions('/auth/login', 'POST', false),
      { email, password }
    );

    if (result.statusCode === 200 && result.body.token) {
      return result.body.token;
    }
    return null;
  }

  async testEndpoint(name, options, expectedStatus = 200, data = null) {
    console.log(`Testing: ${name}`);
    
    try {
      const result = await this.makeRequest(options, data);
      
      const passed = result.statusCode === expectedStatus;
      
      this.results.push({
        name,
        passed,
        expectedStatus,
        actualStatus: result.statusCode,
        response: result.body,
        error: !passed ? `Expected ${expectedStatus}, got ${result.statusCode}` : null
      });

      if (passed) {
        console.log(`  ✅ PASSED (${result.statusCode})`);
      } else {
        console.log(`  ❌ FAILED: Expected ${expectedStatus}, got ${result.statusCode}`);
        if (result.body && result.body.error) {
          console.log(`     Error: ${result.body.error}`);
        }
      }

      return result;
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      this.results.push({
        name,
        passed: false,
        error: error.message
      });
      return null;
    }
  }

  async authenticateAllUsers() {
    console.log('🔐 Authenticating test users...');
    
    // Try to login as admin
    this.adminToken = await this.login(this.users.admin.email, this.users.admin.password);
    console.log(`Admin token: ${this.adminToken ? '✅' : '❌'}`);
    
    // Try to login as staff
    this.staffToken = await this.login(this.users.staff.email, this.users.staff.password);
    console.log(`Staff token: ${this.staffToken ? '✅' : '❌'}`);
    
    // Try to login as student
    this.studentToken = await this.login(this.users.student.email, this.users.student.password);
    console.log(`Student token: ${this.studentToken ? '✅' : '❌'}`);
  }

  async testInventoryRoleAccess() {
    console.log('\n📦 Testing Inventory Controller Role-Based Access');
    console.log('='.repeat(50));
    
    // 1. Test GET /items - should be accessible to all authenticated users
    console.log('\n1. GET /items - Access for all roles');
    await this.testEndpoint('Admin GET /items', this.getOptions('/items', 'GET', this.adminToken));
    await this.testEndpoint('Staff GET /items', this.getOptions('/items', 'GET', this.staffToken));
    await this.testEndpoint('Student GET /items', this.getOptions('/items', 'GET', this.studentToken));
    
    // 2. Test POST /items - should only be accessible to admin/staff
    console.log('\n2. POST /items - Admin/Staff only');
    const testItem = {
      name: `RBAC Test Item ${Date.now()}`,
      item_type: 'quantifiable',
      category: 'test'
    };
    
    await this.testEndpoint('Admin POST /items', this.getOptions('/items', 'POST', this.adminToken), 201, testItem);
    await this.testEndpoint('Staff POST /items', this.getOptions('/items', 'POST', this.staffToken), 201, testItem);
    await this.testEndpoint('Student POST /items', this.getOptions('/items', 'POST', this.studentToken), 403, testItem);
    
    // 3. Test GET /checkouts - should show role-based filtering
    console.log('\n3. GET /checkouts - Role-based filtering');
    await this.testEndpoint('Admin GET /checkouts', this.getOptions('/checkouts', 'GET', this.adminToken));
    await this.testEndpoint('Staff GET /checkouts', this.getOptions('/checkouts', 'GET', this.staffToken));
    await this.testEndpoint('Student GET /checkouts', this.getOptions('/checkouts', 'GET', this.studentToken));
    
    // 4. Test checkout approval - admin/staff only
    console.log('\n4. POST /checkouts/:id/approve - Admin/Staff only');
    // First, we need to create a pending checkout (simulate student creating one)
    if (this.studentToken) {
      const checkoutResult = await this.makeRequest(
        this.getOptions('/checkouts', 'POST', this.studentToken),
        {
          lines: [{ lot_id: 'test-lot', quantity: 1 }],
          notes: 'RBAC test checkout'
        }
      );
      
      if (checkoutResult.statusCode === 201 && checkoutResult.body.transaction) {
        const checkoutId = checkoutResult.body.transaction.id;
        
        console.log(`Created pending checkout: ${checkoutId}`);
        
        // Test who can approve it
        await this.testEndpoint('Admin approve checkout', 
          this.getOptions(`/checkouts/${checkoutId}/approve`, 'POST', this.adminToken), 200);
        await this.testEndpoint('Staff approve checkout', 
          this.getOptions(`/checkouts/${checkoutId}/approve`, 'POST', this.staffToken), 200);
        await this.testEndpoint('Student approve checkout', 
          this.getOptions(`/checkouts/${checkoutId}/approve`, 'POST', this.studentToken), 403);
      }
    }
  }

  async testReportRoleAccess() {
    console.log('\n📊 Testing Report Controller Role-Based Access');
    console.log('='.repeat(50));
    
    // 1. Test GET /reports/checkout-history - should show role-based data
    console.log('\n1. GET /reports/checkout-history - Role-based data visibility');
    await this.testEndpoint('Admin checkout history', 
      this.getOptions('/reports/checkout-history', 'GET', this.adminToken));
    await this.testEndpoint('Staff checkout history', 
      this.getOptions('/reports/checkout-history', 'GET', this.staffToken));
    await this.testEndpoint('Student checkout history', 
      this.getOptions('/reports/checkout-history', 'GET', this.studentToken));
    
    // 2. Test GET /reports/inventory-movement - admin only
    console.log('\n2. GET /reports/inventory-movement - Admin only');
    await this.testEndpoint('Admin inventory movement', 
      this.getOptions('/reports/inventory-movement', 'GET', this.adminToken));
    await this.testEndpoint('Staff inventory movement', 
      this.getOptions('/reports/inventory-movement', 'GET', this.staffToken), 403);
    await this.testEndpoint('Student inventory movement', 
      this.getOptions('/reports/inventory-movement', 'GET', this.studentToken), 403);
    
    // 3. Test GET /reports/missing-history - admin only
    console.log('\n3. GET /reports/missing-history - Admin only');
    await this.testEndpoint('Admin missing history', 
      this.getOptions('/reports/missing-history', 'GET', this.adminToken));
    await this.testEndpoint('Staff missing history', 
      this.getOptions('/reports/missing-history', 'GET', this.staffToken), 403);
    await this.testEndpoint('Student missing history', 
      this.getOptions('/reports/missing-history', 'GET', this.studentToken), 403);
    
    // 4. Test GET /reports/device-health - admin only
    console.log('\n4. GET /reports/device-health - Admin only');
    await this.testEndpoint('Admin device health', 
      this.getOptions('/reports/device-health', 'GET', this.adminToken));
    await this.testEndpoint('Staff device health', 
      this.getOptions('/reports/device-health', 'GET', this.staffToken), 403);
    await this.testEndpoint('Student device health', 
      this.getOptions('/reports/device-health', 'GET', this.studentToken), 403);
  }

  async testNotesSanitization() {
    console.log('\n📝 Testing Notes Field Sanitization by Role');
    console.log('='.repeat(50));
    
    // Create a checkout with sensitive notes
    if (this.studentToken) {
      const sensitiveNotes = JSON.stringify({
        created_at: new Date().toISOString(),
        returned_at: null,
        item_name: 'Test Item',
        status: 'pending',
        sensitive_info: 'This should not be visible to students',
        admin_notes: 'Internal admin notes',
        user_ssn: '123-45-6789'
      });
      
      const checkoutResult = await this.makeRequest(
        this.getOptions('/checkouts', 'POST', this.studentToken),
        {
          lines: [{ lot_id: 'test-lot-2', quantity: 1 }],
          notes: sensitiveNotes
        }
      );
      
      if (checkoutResult.statusCode === 201 && checkoutResult.body.transaction) {
        const checkoutId = checkoutResult.body.transaction.id;
        
        console.log(`Created checkout with sensitive notes: ${checkoutId}`);
        
        // Test how different roles see the notes
        const adminCheck = await this.makeRequest(
          this.getOptions(`/checkouts/${checkoutId}`, 'GET', this.adminToken)
        );
        
        const studentCheck = await this.makeRequest(
          this.getOptions(`/checkouts/${checkoutId}`, 'GET', this.studentToken)
        );
        
        console.log('\nNotes visibility test:');
        
        if (adminCheck.statusCode === 200 && adminCheck.body.transaction) {
          const adminNotes = JSON.parse(adminCheck.body.transaction.notes || '{}');
          console.log(`Admin sees notes with keys: ${Object.keys(adminNotes).join(', ')}`);
          console.log(`Admin sees sensitive_info: ${'sensitive_info' in adminNotes ? '✅' : '❌'}`);
        }
        
        if (studentCheck.statusCode === 200 && studentCheck.body.transaction) {
          const studentNotes = JSON.parse(studentCheck.body.transaction.notes || '{}');
          console.log(`Student sees notes with keys: ${Object.keys(studentNotes).join(', ')}`);
          console.log(`Student sees sensitive_info: ${'sensitive_info' in studentNotes ? '❌ (BAD)' : '✅ (GOOD)'}`);
        }
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('RBAC TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log(`Passed: ${passed}/${total} (${Math.round((passed/total)*100)}%)`);
    
    console.log('\nFailed Tests:');
    this.results.filter(r => !r.passed).forEach(test => {
      console.log(`  ❌ ${test.name}`);
      if (test.error) console.log(`     ${test.error}`);
      if (test.expectedStatus && test.actualStatus) {
        console.log(`     Expected: ${test.expectedStatus}, Got: ${test.actualStatus}`);
      }
    });
    
    return { passed, total, results: this.results };
  }

  async runAllTests() {
    console.log('🚀 Starting Role-Based Access Control Tests');
    console.log('='.repeat(60));
    
    await this.authenticateAllUsers();
    
    if (this.adminToken && this.staffToken && this.studentToken) {
      await this.testInventoryRoleAccess();
      await this.testReportRoleAccess();
      await this.testNotesSanitization();
    } else {
      console.log('❌ Could not authenticate all test users. Skipping RBAC tests.');
      console.log('Note: Make sure test users (admin@example.com, staff@example.com, student@example.com) exist in the system.');
    }
    
    return this.printSummary();
  }
}

// Run the tests
const rbacTest = new RBACTest();
rbacTest.runAllTests().then(summary => {
  console.log('\n📋 RBAC verification complete.');
  process.exit(summary.passed === summary.total ? 0 : 1);
}).catch(error => {
  console.error('❌ RBAC test suite failed:', error);
  process.exit(1);
});