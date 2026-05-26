import { AppError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError } from '@/utils/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with message, code, and default status code', () => {
      const error = new AppError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('Error'); // Extends Error, so name is Error
    });

    it('should create an error with custom status code', () => {
      const error = new AppError('Custom error', 'CUSTOM_ERROR', 400);

      expect(error.statusCode).toBe(400);
    });

    it('should be instance of Error', () => {
      const error = new AppError('Test', 'TEST');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error with default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create a 404 error with custom message', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create a 401 error with default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('should create a 403 error with default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('ValidationError', () => {
    it('should create a 400 error with default message', () => {
      const error = new ValidationError();

      expect(error.message).toBe('Validation error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });
});
