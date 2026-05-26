// Test for Request API Enhancements
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3080,
  path: '/checkout',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // Note: No auth header - expecting 401 unauthorized
  }
};

console.log('Testing Request API Enhancements...');
console.log('1. Testing endpoint without auth (expecting 401 unauthorized)');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', data);
    
    // Check if we got 401 as expected
    if (res.statusCode === 401) {
      console.log('✓ Pass: Got expected 401 unauthorized (authentication required)');
    } else {
      console.log(`✗ Fail: Expected 401 but got ${res.statusCode}`);
    }
    
    // Also check for any headers that might indicate API enhancements
    if (res.headers['access-control-allow-methods'] && 
        res.headers['access-control-allow-methods'].includes('GET, POST, OPTIONS')) {
      console.log('✓ Pass: CORS headers are properly configured');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
