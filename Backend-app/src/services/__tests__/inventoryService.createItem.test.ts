import { query } from '../../utils/db';
import { createItem } from '../inventoryService';
import { ConflictError } from '../../utils/errors';

jest.mock('../../utils/db', () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('inventoryService.createItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseData = {
    item_type: 'trackable' as const,
    name: 'Test Item',
    sku: 'TEST-SKU-001',
    created_by: 'user-1',
  };

  it('inserts a new item when no SKU collision exists', async () => {
    // SELECT for existing SKU returns empty
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);
    // INSERT succeeds
    const inserted = {
      id: 'item-1',
      ...baseData,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [inserted] } as any);

    const result = await createItem(baseData);

    expect(result.restored).toBe(false);
    expect(result.item).toEqual(inserted);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('throws ConflictError when an active item with the same SKU exists', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'existing-id', deleted_at: null }],
    } as any);

    await expect(createItem(baseData)).rejects.toThrow(ConflictError);
    await expect(createItem(baseData)).rejects.toThrow(/already exists and is active/);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('restores a soft-deleted item when its SKU is reused', async () => {
    // SELECT finds a soft-deleted row
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'deleted-id', deleted_at: new Date('2026-01-01') }],
    } as any);
    // UPDATE restores + overwrites fields
    const restored = {
      id: 'deleted-id',
      ...baseData,
      deleted_at: null,
      created_at: new Date('2025-12-01'),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [restored] } as any);

    const result = await createItem(baseData);

    expect(result.restored).toBe(true);
    expect(result.item).toEqual(restored);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('converts a 23505 race-condition into a ConflictError', async () => {
    // No row found in SELECT
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);
    // INSERT races and hits the unique constraint
    const pgErr: any = new Error('duplicate key');
    pgErr.code = '23505';
    mockQuery.mockRejectedValueOnce(pgErr);

    await expect(createItem(baseData)).rejects.toThrow(ConflictError);
    await expect(createItem(baseData)).rejects.toThrow(/just created by another request/);
  });

  it('rethrows non-23505 errors unchanged', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);
    const otherErr = new Error('connection reset');
    mockQuery.mockRejectedValueOnce(otherErr);

    await expect(createItem(baseData)).rejects.toBe(otherErr);
  });

  it('skips the SKU check entirely when sku is null/undefined', async () => {
    const inserted = {
      id: 'item-no-sku',
      ...baseData,
      sku: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [inserted] } as any);

    const result = await createItem({ ...baseData, sku: null });

    expect(result.restored).toBe(false);
    expect(result.item).toEqual(inserted);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
