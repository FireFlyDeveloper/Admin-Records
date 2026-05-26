import request from 'supertest';
import express from 'express';
import { AppError, NotFoundError } from '@/utils/errors';
import { errorHandler } from '@/middleware/errorHandler';

// Simple app for testing error handling
const testApp = express();
testApp.use(express.json());

// Test routes that intentionally throw errors
testApp.get('/test/not-found', (req: any, res: any, next: any) => {
  next(new NotFoundError('Resource not found'));
});

testApp.get('/test/app-error', (req: any, res: any, next: any) => {
  next(new AppError('Custom error', 'CUSTOM_ERROR', 400));
});

testApp.get('/test/unknown-error', (req: any, res: any, next: any) => {
  next(new Error('Unknown error'));
});

testApp.use(errorHandler);

describe('Error Handler Middleware', () => {
  describe('AppError handling', () => {
    it('should handle NotFoundError with 404 status', async () => {
      const response = await request(testApp)
        .get('/test/not-found')
        .expect(404);

      expect(response.body.error).toBe('Resource not found');
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should handle custom AppError with correct status code', async () => {
      const response = await request(testApp)
        .get('/test/app-error')
        .expect(400);

      expect(response.body.error).toBe('Custom error');
      expect(response.body.code).toBe('CUSTOM_ERROR');
    });
  });

  describe('Unknown error handling', () => {
    it('should handle unknown errors with 500 status and default message', async () => {
      const response = await request(testApp)
        .get('/test/unknown-error')
        .expect(500);

      // Unknown errors get caught and transformed to INTERNAL_ERROR with default message
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('404 route handling', () => {
    it('should return 404 when route explicitly throws NotFoundError', async () => {
      // Test that error handler properly processes NotFoundError thrown by routes
      const response = await request(testApp)
        .get('/test/not-found')
        .expect(404);

      expect(response.body.error).toBe('Resource not found');
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });
});
