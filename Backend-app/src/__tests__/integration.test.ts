import request from 'supertest';
import express from 'express';
import { AppError, NotFoundError } from '@/utils/errors';
import { errorHandler } from '@/middleware/errorHandler';

// Create a minimal test app with error handling
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Test routes
  app.get('/test/health', (req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/test/users/:id', (req: any, res: any, next: any) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError('Invalid user ID', 'VALIDATION_ERROR', 400));
    }
    if (id === 999) {
      return next(new NotFoundError('User not found'));
    }
    res.json({ id, name: 'Test User', email: 'test@example.com' });
  });

  app.post('/test/users', (req: any, res: any, next: any) => {
    const { name, email } = req.body;
    if (!name || !email) {
      return next(new AppError('Name and email are required', 'VALIDATION_ERROR', 400));
    }
    res.status(201).json({ id: 1, name, email });
  });

  app.use(errorHandler);

  return app;
};

describe('Application Integration Tests', () => {
  const app = createTestApp();

  describe('Health Check', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/test/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /test/users/:id', () => {
    it('should return user data for valid ID', async () => {
      const response = await request(app).get('/test/users/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.name).toBe('Test User');
      expect(response.body.email).toBe('test@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/test/users/999');

      expect(response.status).toBe(404);
      expect(response.text).toContain('User not found');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app).get('/test/users/invalid');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid user ID');
    });
  });

  describe('POST /test/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/test/users')
        .send({ name: 'John Doe', email: 'john@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('John Doe');
      expect(response.body.email).toBe('john@example.com');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/test/users')
        .send({ email: 'john@example.com' });

      expect(response.status).toBe(400);
      expect(response.text).toContain('Name and email are required');
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/test/users')
        .send({ name: 'John Doe' });

      expect(response.status).toBe(400);
      expect(response.text).toContain('Name and email are required');
    });

    it('should return 400 when both name and email are missing', async () => {
      const response = await request(app)
        .post('/test/users')
        .send({});

      expect(response.status).toBe(400);
      expect(response.text).toContain('Name and email are required');
    });
  });
});
