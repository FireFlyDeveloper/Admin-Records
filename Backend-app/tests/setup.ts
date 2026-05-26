import { Pool } from 'pg';
// Test setup file - Currently minimal to avoid hanging connections

// Global test timeout
jest.setTimeout(30000);

// Gracefully exit after tests complete
process.on('exit', () => {
  // Cleanup for any remaining handles
});
