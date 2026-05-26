// Quick endpoint verification script
const http = require('http');

const endpoints = [
  { path: '/health', method: 'GET', auth: false, expected: 200, name: 'Health Check' },
  { path: '/auth/login', method: 'POST', auth: false, expected: 401, name: 'Login (no creds)' },
  { path: '/items', method: 'GET', auth: true, expected: 401, name: 'Items (no auth)' },
  { path: '/documents', method: 'GET', auth: true, expected: 401, name: 'Documents (no auth)' },
  { path: '/folders', method: 'GET', auth: true, expected: 401, name: 'Folders (no auth)' },
  { path: '/dashboard/stats', method: 'GET', auth: true, expected: 401, name: 'Dashboard (no auth)' },
  { path: '/ble/tags', method: 'GET', auth: true, expected: 401, name: 'BLE Tags (no auth)' },
  { path: '/devices', method: 'GET', auth: true, expected: 401, name: 'Devices (no auth)' },
  { path: '/audit-logs', method: 'GET', auth: true, expected: 401, name: 'Audit Logs (no auth)' },
  { path: '/reports', method: 'GET', auth: true, expected: 401, name: 'Reports (no auth)' },
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3080,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (endpoint.auth) {
      options.headers['Authorization'] = 'Bearer invalid-token';
    }

    console.log(`Testing: ${endpoint.name} - ${endpoint.method} ${endpoint.path}`);
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const passed = res.statusCode === endpoint.expected;
        console.log(`  Status: ${res.statusCode} ${passed ? '✅' : '❌'} (expected ${endpoint.expected})`);
        if (!passed && data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) console.log(`  Error: ${parsed.error}`);
          } catch (e) {
            // Not JSON
          }
        }
        console.log('');
        resolve({ ...endpoint, status: res.statusCode, passed, response: data });
      });
    });

    req.on('error', (err) => {
      console.log(`  ❌ Error: ${err.message}`);
      resolve({ ...endpoint, status: 0, passed: false, error: err.message });
    });

    req.end();
  });
}

async function runQuickTests() {
  console.log('🚀 Quick Endpoint Verification');
  console.log('='.repeat(50));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('='.repeat(50));
  console.log(`SUMMARY: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)`);
  
  if (passed === total) {
    console.log('✅ All endpoints are responding as expected!');
  } else {
    console.log('⚠️  Some endpoints failed verification');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: got ${r.status}, expected ${r.expected}`);
    });
  }
}

runQuickTests();