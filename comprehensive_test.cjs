// Comprehensive Test Suite for Erica Inventory System
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor(baseUrl = 'http://localhost:3080') {
    this.baseUrl = baseUrl;
    this.results = [];
    this.authToken = null;
    this.testUser = {
      email: 'test@example.com',
      password: 'testpassword123',
      display_name: 'Test User'
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
              headers: res.headers,
              body: parsed,
              raw: responseData
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
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

  getOptions(path, method = 'GET', auth = true) {
    const options = {
      hostname: 'localhost',
      port: 3080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (auth && this.authToken) {
      options.headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return options;
  }

  async testEndpoint(name, options, expectedStatus = 200, data = null) {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`   ${options.method} ${options.path}`);
    
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
        console.log(`   ✅ PASSED (${result.statusCode})`);
      } else {
        console.log(`   ❌ FAILED: Expected ${expectedStatus}, got ${result.statusCode}`);
        if (result.body && result.body.error) {
          console.log(`      Error: ${result.body.error}`);
        }
      }

      return result;
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      this.results.push({
        name,
        passed: false,
        error: error.message
      });
      return null;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
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
    
    console.log('\nPassed Tests:');
    this.results.filter(r => r.passed).forEach(test => {
      console.log(`  ✅ ${test.name}`);
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite for Erica Inventory System');
    console.log('='.repeat(60));

    // 1. Health Check
    await this.testEndpoint('Health Check', this.getOptions('/health', 'GET', false));

    // 2. Authentication Tests
    await this.runAuthTests();

    if (this.authToken) {
      // 3. User Management Tests
      await this.runUserTests();

      // 4. Document & Folder Tests
      await this.runDocumentTests();

      // 5. Inventory Tests
      await this.runInventoryTests();

      // 6. BLE/Scanner Tests
      await this.runBLETests();

      // 7. Dashboard & Report Tests
      await this.runDashboardTests();

      // 8. Audit & Notification Tests
      await this.runAuditTests();
    }

    this.printSummary();
    return this.results;
  }

  async runAuthTests() {
    console.log('\n🔐 AUTHENTICATION TESTS');
    console.log('-'.repeat(40));

    // Try to register (might fail if user exists)
    await this.testEndpoint(
      'User Registration',
      this.getOptions('/auth/register', 'POST', false),
      201,
      this.testUser
    );

    // Login
    const loginResult = await this.testEndpoint(
      'User Login',
      this.getOptions('/auth/login', 'POST', false),
      200,
      {
        email: this.testUser.email,
        password: this.testUser.password
      }
    );

    if (loginResult && loginResult.body.token) {
      this.authToken = loginResult.body.token;
      console.log(`   🔑 Token obtained: ${this.authToken.substring(0, 20)}...`);
    }

    // Get current user
    if (this.authToken) {
      await this.testEndpoint(
        'Get Current User',
        this.getOptions('/users/me')
      );
    }
  }

  async runUserTests() {
    console.log('\n👥 USER MANAGEMENT TESTS');
    console.log('-'.repeat(40));

    // Get all users
    await this.testEndpoint(
      'Get All Users',
      this.getOptions('/users')
    );

    // Note: We'd need admin privileges for user management
    // For now, just test basic endpoints
    await this.testEndpoint(
      'Get User Status',
      this.getOptions('/user-status')
    );
  }

  async runDocumentTests() {
    console.log('\n📄 DOCUMENT & FOLDER TESTS');
    console.log('-'.repeat(40));

    // Get all folders
    const foldersResult = await this.testEndpoint(
      'Get All Folders',
      this.getOptions('/folders')
    );

    // Create a test folder if we can
    if (foldersResult && foldersResult.statusCode === 200) {
      await this.testEndpoint(
        'Create Folder',
        this.getOptions('/folders', 'POST'),
        201,
        {
          name: 'Test Folder ' + Date.now(),
          parent_id: null
        }
      );
    }

    // Get documents
    await this.testEndpoint(
      'Get All Documents',
      this.getOptions('/documents')
    );
  }

  async runInventoryTests() {
    console.log('\n📦 INVENTORY TESTS');
    console.log('-'.repeat(40));

    // Get all items
    const itemsResult = await this.testEndpoint(
      'Get All Items',
      this.getOptions('/items')
    );

    // Test item creation if we got items list
    if (itemsResult && itemsResult.statusCode === 200) {
      const testItem = {
        name: `Test Item ${Date.now()}`,
        description: 'Test item for automated testing',
        item_type: 'quantifiable', // or 'trackable'
        category: 'test',
        min_quantity: 1,
        current_quantity: 10,
        location: 'Test Storage'
      };

      await this.testEndpoint(
        'Create Item',
        this.getOptions('/items', 'POST'),
        201,
        testItem
      );
    }

    // Test inventory stats
    await this.testEndpoint(
      'Get Inventory Stats',
      this.getOptions('/items/stats')
    );

    // Test search/filter
    await this.testEndpoint(
      'Search Items',
      this.getOptions('/items/search?q=test')
    );
  }

  async runBLETests() {
    console.log('\n📡 BLE/SCANNER TESTS');
    console.log('-'.repeat(40));

    // Get BLE tags
    await this.testEndpoint(
      'Get BLE Tags',
      this.getOptions('/ble/tags')
    );

    // Get rooms
    await this.testEndpoint(
      'Get Rooms',
      this.getOptions('/ble/rooms')
    );

    // Get devices
    await this.testEndpoint(
      'Get Devices',
      this.getOptions('/devices')
    );

    // Test BLE presence endpoint
    await this.testEndpoint(
      'BLE System Status',
      this.getOptions('/ble/status')
    );
  }

  async runDashboardTests() {
    console.log('\n📊 DASHBOARD & REPORT TESTS');
    console.log('-'.repeat(40));

    // Dashboard stats
    await this.testEndpoint(
      'Dashboard Stats',
      this.getOptions('/dashboard/stats')
    );

    // Reports
    await this.testEndpoint(
      'Available Reports',
      this.getOptions('/reports')
    );

    // Test export endpoints
    await this.testEndpoint(
      'Export Inventory CSV',
      this.getOptions('/reports/export/inventory?format=csv')
    );
  }

  async runAuditTests() {
    console.log('\n📝 AUDIT & NOTIFICATION TESTS');
    console.log('-'.repeat(40));

    // Get audit logs
    await this.testEndpoint(
      'Get Audit Logs',
      this.getOptions('/audit-logs')
    );

    // Get notifications (if endpoint exists)
    await this.testEndpoint(
      'Get Notifications',
      this.getOptions('/notifications'),
      200 // or 404 if endpoint doesn't exist
    );
  }
}

// Run tests
const runner = new TestRunner();
runner.runAllTests().then(results => {
  // Save results to file
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests: results.filter(r => r.passed).length,
    failedTests: results.filter(r => !r.passed).length,
    details: results
  };

  fs.writeFileSync(
    path.join(__dirname, 'test_results.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n📋 Test results saved to test_results.json');
  
  // Exit with appropriate code
  const exitCode = summary.failedTests > 0 ? 1 : 0;
  process.exit(exitCode);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});