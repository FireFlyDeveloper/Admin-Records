// Authentication & User Management Endpoints Test
// Tests for Erica Inventory System

const http = require('http');

const BASE_URL = 'http://localhost:3080';
let authToken = null;
let refreshToken = null;
let testUserId = null;

async function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
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

async function runTests() {
  console.log('🧪 AUTHENTICATION & USER MANAGEMENT ENDPOINTS TEST\n');
  console.log('='.repeat(80));

  const results = [];

  // 1. Test login endpoint without credentials
  console.log('1. Testing /auth/login (no credentials)...');
  const loginNoCreds = await makeRequest('POST', '/auth/login', {});
  results.push({
    test: 'Login without credentials',
    passed: loginNoCreds.status === 401,
    expected: 401,
    actual: loginNoCreds.status,
    message: loginNoCreds.body?.error || 'No error message'
  });

  // 2. Test login with invalid credentials
  console.log('2. Testing /auth/login (invalid credentials)...');
  const loginInvalid = await makeRequest('POST', '/auth/login', {
    email: 'nonexistent@test.com',
    password: 'wrongpassword'
  });
  results.push({
    test: 'Login with invalid credentials',
    passed: loginInvalid.status === 401,
    expected: 401,
    actual: loginInvalid.status,
    message: loginInvalid.body?.error || 'No error message'
  });

  // 3. Test creating a user (should fail without auth)
  console.log('3. Testing /users POST (unauthorized)...');
  const createUserUnauth = await makeRequest('POST', '/users', {
    email: 'testuser@example.com',
    display_name: 'Test User',
    password: 'password123',
    is_active: true
  });
  results.push({
    test: 'Create user without authentication',
    passed: createUserUnauth.status === 401,
    expected: 401,
    actual: createUserUnauth.status,
    message: 'Should require authentication'
  });

  // 4. Test getting users (should fail without auth)
  console.log('4. Testing /users GET (unauthorized)...');
  const getUsersUnauth = await makeRequest('GET', '/users');
  results.push({
    test: 'Get users without authentication',
    passed: getUsersUnauth.status === 401,
    expected: 401,
    actual: getUsersUnauth.status,
    message: 'Should require authentication'
  });

  // 5. Test user status endpoints (unauthorized)
  console.log('5. Testing /user-status/status (unauthorized)...');
  const userStatusUnauth = await makeRequest('GET', '/user-status/status');
  results.push({
    test: 'Get user status without authentication',
    passed: userStatusUnauth.status === 401,
    expected: 401,
    actual: userStatusUnauth.status,
    message: 'Should require authentication'
  });

  // 6. Test refresh token endpoint without token
  console.log('6. Testing /auth/refresh (no token)...');
  const refreshNoToken = await makeRequest('POST', '/auth/refresh', {});
  results.push({
    test: 'Refresh token without token',
    passed: refreshNoToken.status === 401,
    expected: 401,
    actual: refreshNoToken.status,
    message: refreshNoToken.body?.error || 'No error message'
  });

  // 7. Test logout endpoint
  console.log('7. Testing /auth/logout (unauthenticated but allowed)...');
  const logoutTest = await makeRequest('POST', '/auth/logout', {});
  results.push({
    test: 'Logout endpoint',
    passed: logoutTest.status === 200 || logoutTest.status === 401,
    actual: logoutTest.status,
    message: 'Logout endpoint should be accessible'
  });

  // 8. Test me endpoint without auth
  console.log('8. Testing /auth/me (unauthorized)...');
  const meUnauth = await makeRequest('GET', '/auth/me');
  results.push({
    test: 'Get current user without authentication',
    passed: meUnauth.status === 401,
    expected: 401,
    actual: meUnauth.status,
    message: 'Should require authentication'
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY:');
  console.log('='.repeat(80));

  let passed = 0;
  results.forEach((result, i) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${i + 1}. ${status} - ${result.test}`);
    if (!result.passed) {
      console.log(`   Expected: ${result.expected}, Got: ${result.actual}`);
      console.log(`   Message: ${result.message}`);
    }
    if (result.passed) passed++;
  });

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${passed}/${results.length} passed (${Math.round((passed/results.length)*100)}%)`);
  console.log('='.repeat(80));

  // Check if backend is properly secured
  const allSecured = results.every(r => 
    r.test.includes('unauthorized') || r.test.includes('without') 
    ? r.actual === 401 
    : r.passed
  );

  if (allSecured) {
    console.log('\n✅ SECURITY CHECK PASSED: All endpoints properly secured');
  } else {
    console.log('\n⚠️  SECURITY WARNING: Some endpoints may not be properly secured');
  }

  return results;
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});