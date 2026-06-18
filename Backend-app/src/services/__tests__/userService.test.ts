import { query } from '../../utils/db';
import { createUser } from '../userService';
import { ConflictError } from '../../utils/errors';
import { QueryResult } from 'pg';

// Mock all dependencies
jest.mock('../../utils/db');
jest.mock('../../utils/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password_xyz'),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

function makeQueryResult(rows: any[]): QueryResult {
  return {
    rows,
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    describe('soft-delete resurrection', () => {
      it('should resurrect a soft-deleted user when creating with the same email', async () => {
        const softDeletedUserId = '11111111-1111-1111-1111-111111111111';
        const now = new Date();

        // 1st call: getUserById inside createUser (line 165 return) — user was just undeleted
        // 2nd call: getUserByEmail inside getUserById
        mockQuery
          .mockResolvedValueOnce(
            makeQueryResult([{ id: softDeletedUserId, deleted_at: now.toISOString() }])
          ) // SELECT finds soft-deleted user
          .mockResolvedValueOnce(
            makeQueryResult([
              {
                id: softDeletedUserId,
                email: 'soft-deleted@example.com',
                display_name: 'Test User',
                is_active: true,
                created_at: now,
                updated_at: now,
                deleted_at: null,
                roles: [],
              },
            ])
          ) // UPDATE + RETURNING
          .mockResolvedValueOnce(
            makeQueryResult([
              {
                id: softDeletedUserId,
                email: 'soft-deleted@example.com',
                display_name: 'Test User',
                is_active: true,
                created_at: now,
                updated_at: now,
                deleted_at: null,
                roles: [],
              },
            ])
          ); // getUserById (after return)

        const result = await createUser({
          email: 'soft-deleted@example.com',
          display_name: 'Test User',
          password: 'T3st@Pass!',
        });

        expect(result.email).toBe('soft-deleted@example.com');

        // Verify the UPDATE was called (not INSERT)
        const updateCall = mockQuery.mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('UPDATE users')
        );
        expect(updateCall).toBeDefined();

        const insertCall = mockQuery.mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO users')
        );
        expect(insertCall).toBeUndefined();
      });

      it('should throw ConflictError when creating a user with an active (non-deleted) email', async () => {
        const activeUserId = '22222222-2222-2222-2222-222222222222';

        // getUserByEmail in createUser
        mockQuery.mockResolvedValueOnce(
          makeQueryResult([{ id: activeUserId, deleted_at: null }]) // active user exists
        );

        await expect(
          createUser({
            email: 'active@example.com',
            display_name: 'Another User',
            password: 'T3st@Pass!',
          })
        ).rejects.toThrow(ConflictError);

        // Verify no INSERT was called
        const insertCall = mockQuery.mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO users')
        );
        expect(insertCall).toBeUndefined();
      });

      it('should create a new user when email does not exist', async () => {
        const newUserId = '33333333-3333-3333-3333-333333333333';
        const now = new Date();

        mockQuery
          .mockResolvedValueOnce(makeQueryResult([])) // no existing user
          .mockResolvedValueOnce(
            makeQueryResult([
              {
                id: newUserId,
                email: 'brandnew@example.com',
                display_name: 'Brand New',
                is_active: true,
                created_at: now,
                updated_at: now,
                deleted_at: null,
                roles: [],
              },
            ])
          ) // INSERT RETURNING
          .mockResolvedValueOnce(
            makeQueryResult([
              {
                id: newUserId,
                email: 'brandnew@example.com',
                display_name: 'Brand New',
                is_active: true,
                created_at: now,
                updated_at: now,
                deleted_at: null,
                roles: [],
              },
            ])
          ); // getUserById (after return)

        const result = await createUser({
          email: 'brandnew@example.com',
          display_name: 'Brand New',
          password: 'T3st@Pass!',
        });

        expect(result.email).toBe('brandnew@example.com');

        // Verify INSERT was called
        const insertCall = mockQuery.mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO users')
        );
        expect(insertCall).toBeDefined();
      });
    });
  });
});
