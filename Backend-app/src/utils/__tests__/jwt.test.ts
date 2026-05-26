import jwt from 'jsonwebtoken';
import { config } from '@/utils/config';

describe('JWT Utilities', () => {
  const testPayload = { userId: 1, username: 'testuser' };
  const testSecret = 'test-secret';

  describe('Token Generation', () => {
    it('should generate a valid JWT token', () => {
      const token = jwt.sign(testPayload, testSecret, { expiresIn: '1h' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate token with correct payload', () => {
      const token = jwt.sign(testPayload, testSecret, { expiresIn: '1h' });
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.username).toBe(testPayload.username);
    });

    it('should respect expiration time', async () => {
      const token = jwt.sign(testPayload, testSecret, { expiresIn: '1s' });
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(() => {
        jwt.verify(token, testSecret);
      }).toThrow(jwt.JsonWebTokenError);
    });
  });

  describe('Token Verification', () => {
    it('should verify a valid token', () => {
      const token = jwt.sign(testPayload, testSecret, { expiresIn: '1h' });
      const decoded = jwt.verify(token, testSecret) as any;
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.username).toBe(testPayload.username);
    });

    it('should fail verification with wrong secret', () => {
      const token = jwt.sign(testPayload, testSecret, { expiresIn: '1h' });
      
      expect(() => {
        jwt.verify(token, 'wrong-secret');
      }).toThrow(jwt.JsonWebTokenError);
    });

    it('should fail verification of malformed token', () => {
      expect(() => {
        jwt.verify('not-a-valid-token', testSecret);
      }).toThrow(jwt.JsonWebTokenError);
    });
  });

  describe('Token Decoding', () => {
    it('should decode token without verification', () => {
      const token = jwt.sign(testPayload, testSecret, { expiresIn: '1h' });
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.username).toBe(testPayload.username);
    });

    it('should handle malformed token gracefully', () => {
      const decoded = jwt.decode('invalid-token');
      expect(decoded).toBeNull();
    });
  });
});
