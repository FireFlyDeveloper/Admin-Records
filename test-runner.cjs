#!/usr/bin/env node

/**
 * Test Runner for Admin-Records
 * 
 * This runner can execute tests in different modes:
 * 1. Server Required: Tests that need a running backend (default)
 * 2. Offline: Tests that can run without server
 * 3. Lint Only: Just run linting checks
 * 
 * Usage:
 *   node test-runner.cjs [mode] [options]
 *   
 * Modes:
 *   --server      Run tests that require server (default)
 *   --offline     Run tests that don't require server
 *   --lint        Run only linting
 *   --all         Run everything (lint + tests)
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(color, prefix, message) {
  console.log(`${color}${prefix}:${colors.reset} ${message}`)
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(code)
      }
    })
  })
}

async function lintFrontend() {
  log(colors.blue, 'LINT', 'Running frontend linting...')
  try {
    await runCommand('npm', ['run', 'lint'], { cwd: path.join(__dirname, 'Frontend-app') })
    log(colors.green, 'LINT', 'Frontend linting passed!')
    return true
  } catch (code) {
    log(colors.red, 'LINT', `Frontend linting failed with code ${code}`)
    return false
  }
}

async function lintBackend() {
  log(colors.blue, 'LINT', 'Running backend linting...')
  try {
    // Check if TypeScript compiles
    await runCommand('npm', ['run', 'build'], { cwd: path.join(__dirname, 'Backend-app') })
    log(colors.green, 'LINT', 'Backend TypeScript compilation passed!')
    return true
  } catch (code) {
    log(colors.red, 'LINT', `Backend compilation failed with code ${code}`)
    return false
  }
}

async function runFrontendTests() {
  log(colors.blue, 'TEST', 'Running frontend build test...')
  try {
    await runCommand('npm', ['run', 'build'], { cwd: path.join(__dirname, 'Frontend-app') })
    log(colors.green, 'TEST', 'Frontend build successful!')
    return true
  } catch (code) {
    log(colors.red, 'TEST', `Frontend build failed with code ${code}`)
    return false
  }
}

async function runBackendTests() {
  log(colors.blue, 'TEST', 'Running backend build test...')
  try {
    await runCommand('npm', ['run', 'build'], { cwd: path.join(__dirname, 'Backend-app') })
    log(colors.green, 'TEST', 'Backend build successful!')
    return true
  } catch (code) {
    log(colors.red, 'TEST', `Backend build failed with code ${code}`)
    return false
  }
}

async function runOfflineTests() {
  log(colors.blue, 'TEST', 'Running offline tests...')
  const offlineTests = [
    'simple_api_test.cjs',
    'test_auth_users.cjs',
    'test_inventory_api.cjs',
    'verify_rbac.cjs',
    'verify_rbac_patterns.cjs',
    'verify_rbac_simple.cjs',
    'verify_schema.cjs',
    'verify_excel_export.cjs',
    'comprehensive_test.cjs',
    'rbac_test.cjs',
    'test_excel_export.cjs',
    'quick_verify.cjs',
    'test_api_enhancements.cjs',
    'test-lot-selection.cjs'
  ]

  let passed = 0
  let failed = 0

  for (const testFile of offlineTests) {
    const testPath = path.join(__dirname, testFile)
    if (!fs.existsSync(testPath)) {
      log(colors.yellow, 'WARN', `Test file not found: ${testFile}`)
      continue
    }

    try {
      log(colors.blue, 'RUN', `Executing ${testFile}...`)
      await runCommand('node', [testPath])
      log(colors.green, 'PASS', testFile)
      passed++
    } catch (code) {
      log(colors.red, 'FAIL', `${testFile} (exit code ${code})`)
      failed++
    }
  }

  log(colors.blue, 'SUMMARY', `${passed} passed, ${failed} failed`)
  return failed === 0
}

async function checkServer() {
  return new Promise((resolve) => {
    const http = require('http')
    const req = http.get('http://localhost:3080/health', (res) => {
      if (res.statusCode === 200) {
        log(colors.green, 'SERVER', 'Backend server is running')
        resolve(true)
      } else {
        log(colors.yellow, 'SERVER', `Server responded with ${res.statusCode}, but may be available`)
        resolve(true)
      }
    })
    
    req.on('error', () => {
      log(colors.yellow, 'SERVER', 'Backend server not detected at localhost:3080')
      log(colors.yellow, 'SERVER', 'Tests will fail without server - start with: cd Backend-app && npm run dev')
      resolve(false)
    })
    
    req.setTimeout(2000, () => {
      req.destroy()
      log(colors.yellow, 'SERVER', 'Server timeout - may be slow to respond')
      resolve(false)
    })
  })
}

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] || '--server'

  log(colors.blue, 'RUNNER', `Starting test runner in ${mode} mode`)
  log(colors.blue, 'RUNNER', new Date().toISOString())
  console.log()

  let results = {
    lint: { frontend: false, backend: false },
    tests: { frontend: false, backend: false, offline: false }
  }

  try {
    switch (mode) {
      case '--lint':
        results.lint.frontend = await lintFrontend()
        results.lint.backend = await lintBackend()
        break

      case '--offline':
        results.tests.offline = await runOfflineTests()
        break

      case '--server':
        const serverReady = await checkServer()
        if (!serverReady) {
          log(colors.yellow, 'WARN', 'Server not ready - running offline tests only')
          results.tests.offline = await runOfflineTests()
        } else {
          results.tests.offline = await runOfflineTests()
        }
        break

      case '--all':
      default:
        results.lint.frontend = await lintFrontend()
        results.lint.backend = await lintBackend()
        results.tests.frontend = await runFrontendTests()
        results.tests.backend = await runBackendTests()
        
        const serverIsReady = await checkServer()
        if (serverIsReady) {
          results.tests.offline = await runOfflineTests()
        }
        break
    }

    // Summary
    console.log()
    console.log('='.repeat(60))
    log(colors.blue, 'SUMMARY', 'Test Run Complete')
    console.log('='.repeat(60))
    
    const allPassed = Object.values(results).every(r => 
      typeof r === 'boolean' ? r : Object.values(r).every(v => v)
    )
    
    if (allPassed) {
      log(colors.green, 'SUCCESS', 'All checks passed!')
      process.exit(0)
    } else {
      log(colors.red, 'FAILURE', 'Some checks failed - see details above')
      process.exit(1)
    }

  } catch (error) {
    log(colors.red, 'ERROR', `Test runner failed: ${error.message}`)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}

// Export for potential module usage
module.exports = { runCommand, lintFrontend, lintBackend, runOfflineTests }