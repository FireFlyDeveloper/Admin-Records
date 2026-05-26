# Test Suite Improvement Roadmap

## Priority 1 Actions (Do This Next)

### 1. Fix Failing Tests Immediately
**File:** `/root/tmp/Admin-Records/test_results.json` shows 0% pass rate

**Problems:**
1. Health check expects 200, gets 401 (requires auth)
2. User registration expects 201, gets 401 (requires auth)
3. User login expects 200, gets 500 (server error)

**Solution:**
```bash
# Create mock auth tokens for tests
cd /root/tmp/Admin-Records

# Edit test files to use test fixtures
```

**Action Steps:**
1. Create `test/fixtures/auth.js` with test tokens
2. Update `simple_api_test.cjs` to use test auth
3. Add database seeding for test users
4. Run tests with: `node test-runner.cjs --server`

### 2. Install Jest for Backend Unit Tests

```bash
cd /root/tmp/Admin-Records/Backend-app

npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
}
```

Update `package.json`:
```json
{
  "scripts": {
    ...
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    ...
  }
}
```

### 3. Write First Unit Test

Create `src/middleware/__tests__/auth.test.ts`:
```typescript
import { Request, Response, NextFunction } from 'express'
import { authenticateToken } from '../auth'
import { UnauthorizedError } from '../../utils/errors'

describe('authenticateToken middleware', () => {
  it('should throw UnauthorizedError when no token provided', () => {
    const req = { headers: {} } as Request
    const res = {} as Response
    const next = jest.fn() as NextFunction

    authenticateToken(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
  })

  it('should call next() when valid token provided', () => {
    const req = {
      headers: {
        authorization: 'Bearer valid-test-token'
      }
    } as Request
    const res = {} as Response
    const next = jest.fn() as NextFunction

    authenticateToken(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })
})
```

### 4. Set Up Coverage Reporting

```bash
cd /root/tmp/Admin-Records/Backend-app
npm install --save-dev c8

# Add to package.json
"test:coverage": "c8 npm test"
```

### 5. Install Playwright for E2E

```bash
cd /root/tmp/Admin-Records
npm install --save-dev @playwright/test
npx playwright install

# Create basic config
mkdir -p e2e
```

Create `e2e/auth-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test('user can register and login', async ({ page }) => {
  // Registration
  await page.goto('http://localhost:3080/register')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'test123')
  await page.click('button[type="submit"]')
  
  // Login
  await page.goto('http://localhost:3080/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'test123')
  await page.click('button[type="submit"]')
  
  // Verify dashboard access
  await expect(page).toHaveURL('http://localhost:3080/dashboard')
})
```

## Quick Start Commands

### Run What Exists Now (Fix These First)
```bash
cd /root/tmp/Admin-Records
node test-runner.cjs --all  # See current failures
```

### Run Unit Tests (After Installing Jest)
```bash
cd /root/tmp/Admin-Records/Backend-app
npm run test:coverage  # See coverage gaps
```

### Run E2E Tests (After Installing Playwright)
```bash
cd /root/tmp/Admin-Records
npx playwright test e2e/auth-flow.spec.ts
```

### CI/CD Integration
Add to GitHub Actions:
```yaml
- name: Run Tests
  run: |
    cd Backend-app && npm run test:coverage
    cd Frontend-app && npm run test
    cd .. && node test-runner.cjs --all
```

## Success Criteria (2 Week Sprint)

### Week 1 Goals:
- [ ] 3 failing tests fixed and passing
- [ ] Jest installed and configured
- [ ] 5 unit tests written (middleware + auth service)
- [ ] 30% backend unit test coverage
- [ ] Coverage reporting functional
- [ ] PR template includes checkboxes for tests

### Week 2 Goals:
- [ ] 50% backend unit test coverage
- [ ] All middleware tested
- [ ] Auth service fully tested
- [ ] Playwright installed with 2 E2E flows
- [ ] Integration tests organized (remove duplicates)
- [ ] Test data management in place

### Month End Goals (4 weeks):
- [ ] 80% backend unit test coverage
- [ ] 50% frontend component coverage
- [ ] 5 core E2E user flows
- [ ] Performance tests for critical paths
- [ ] Security tests for OWASP Top 10
- [ ] CI/CD gating functional
- [ ] Pass rate >= 95%

## Next Immediate Actions

1. **Today:**
   - Install Jest and dependencies
   - Create test runner config
   - Fix mock authentication for integration tests

2. **Tomorrow:**
   - Write auth middleware unit tests
   - Fix failing integration tests
   - Set up coverage reporting

3. **This Week:**
   - Blitz all backend middleware
   - Install Playwright
   - Create first E2E flow

## Resources Created

This analysis produced:
- Comprehensive architecture assessment
- Coverage gap analysis with specific numbers
- Risk analysis with clear priorities
- Step-by-step implementation guide
- 4-week sprint plan
- Concrete action items for immediate execution

**Next:** Execute Priority 1 items immediately