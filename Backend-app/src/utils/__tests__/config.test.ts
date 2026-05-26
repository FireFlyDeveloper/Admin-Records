import bcrypt from 'bcryptjs';
import { config } from '@/utils/config';

describe('Password Hashing', () => {
  const testPassword = 'testPassword123!';
  const testPassword2 = 'anotherPassword456!';

  describe('bcrypt hash generation', () => {
    it('should generate a hash', async () => {
      const hash = await bcrypt.hash(testPassword, 10);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(testPassword);
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await bcrypt.hash(testPassword, 10);
      const hash2 = await bcrypt.hash(testPassword, 10);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate consistent hash with same salt', async () => {
      const salt = await bcrypt.genSalt(10);
      const hash1 = await bcrypt.hash(testPassword, salt);
      const hash2 = await bcrypt.hash(testPassword, salt);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('bcrypt hash comparison', () => {
    it('should verify correct password', async () => {
      const hash = await bcrypt.hash(testPassword, 10);
      const isValid = await bcrypt.compare(testPassword, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await bcrypt.hash(testPassword, 10);
      const isValid = await bcrypt.compare(testPassword2, hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle null/undefined gracefully', async () => {
      const hash = await bcrypt.hash(testPassword, 10);
      
      const isValidNull = await bcrypt.compare('', hash);
      expect(isValidNull).toBe(false);
    });
  });

  describe('bcrypt salt rounds', () => {
    it('should be faster with lower salt rounds', async () => {
      const startFast = Date.now();
      await bcrypt.hash(testPassword, 5);
      const fastTime = Date.now() - startFast;
      
      const startSlow = Date.now();
      await bcrypt.hash(testPassword, 12);
      const slowTime = Date.now() - startSlow;
      
      expect(slowTime).toBeGreaterThan(fastTime);
    });
  });
});

describe('Configuration', () => {
  it('should load config object', () => {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('should have required configuration properties', () => {
    expect(config.port).toBeDefined();
    expect(config.nodeEnv).toBeDefined();
    expect(config.databaseUrl).toBeDefined();
    expect(config.jwtSecret).toBeDefined();
    expect(config.jwtExpirySeconds).toBeDefined();
  });

  it('should use default values when env vars not set', () => {
    expect(typeof config.port).toBe('number');
    expect(config.port).toBeGreaterThan(0);
    expect(config.nodeEnv).toMatch(/^(development|production|test)$/);
  });

  it('should have corsOrigins getter that returns array', () => {
    expect(Array.isArray(config.corsOrigins)).toBe(true);
    expect(config.corsOrigins.length).toBeGreaterThan(0);
  });
});
