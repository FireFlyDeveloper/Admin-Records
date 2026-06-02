import { query } from '../../utils/db';
import { 
  getFolderTree, 
  getFolderPath, 
  validateFolderMove, 
  getVisibleFolderTree,
  getFolderDescendants,
  FolderWithChildren 
} from '../folderTreeService';
import { ConflictError, NotFoundError } from '../../utils/errors';

// Mock the query function
jest.mock('../../utils/db', () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('folderTreeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFolderTree', () => {
    it('should return a hierarchical tree structure', async () => {
      const mockFolders = [
        { id: '1', parent_id: null, name: 'Root Folder', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: '2', parent_id: '1', name: 'Child Folder 1', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: '3', parent_id: '1', name: 'Child Folder 2', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: '4', parent_id: '2', name: 'Grandchild Folder', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockFolders });

      const result = await getFolderTree();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY name'
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children?.[0].id).toBe('2');
      expect(result[0].children?.[0].children?.[0].id).toBe('4');
      expect(result[0].children?.[1].id).toBe('3');
    });

    it('should handle empty folder list', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getFolderTree();

      expect(result).toEqual([]);
    });
  });

  describe('getFolderPath', () => {
    it('should return path from root to folder', async () => {
      const mockPath = [
        { id: '1', parent_id: null, name: 'Root', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: '2', parent_id: '1', name: 'Child', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: '3', parent_id: '2', name: 'Grandchild', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockPath });

      const result = await getFolderPath('3');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE ancestor_path AS'),
        ['3']
      );
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(result[2].id).toBe('3');
    });

    it('should throw NotFoundError for non-existent folder', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(getFolderPath('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('validateFolderMove', () => {
    it('should return true for valid move to root', async () => {
      const result = await validateFolderMove('1', null);
      expect(result).toBe(true);
    });

    it('should throw error when moving folder into itself', async () => {
      await expect(validateFolderMove('1', '1')).rejects.toThrow(ConflictError);
      await expect(validateFolderMove('1', '1')).rejects.toThrow('Cannot move folder into itself');
    });

    it('should throw error when moving folder into its descendant', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '2' }] });

      await expect(validateFolderMove('1', '2')).rejects.toThrow(ConflictError);
      await expect(validateFolderMove('1', '2')).rejects.toThrow('Cannot move folder into its own descendant');
    });

    it('should return true for valid move to non-descendant', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await validateFolderMove('1', '2');
      expect(result).toBe(true);
    });
  });

  describe('getFolderDescendants', () => {
    it('should return all descendants of a folder', async () => {
      const mockDescendants = [
        { id: '1', parent_id: null, name: 'Root', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: '2', parent_id: '1', name: 'Child 1', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: '3', parent_id: '1', name: 'Child 2', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: '4', parent_id: '2', name: 'Grandchild', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDescendants });

      const result = await getFolderDescendants('1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE descendants AS'),
        ['1']
      );
      expect(result).toHaveLength(4);
      expect(result.map(f => f.id)).toEqual(['1', '2', '3', '4']);
    });
  });

  describe('getVisibleFolderTree', () => {
    it('should return full tree for admin', async () => {
      const mockFolders = [
        { id: '1', parent_id: null, name: 'Root', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockFolders });

      const result = await getVisibleFolderTree('user1', [], true);

      // Should call getFolderTree which is the admin path
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY name'
      );
      expect(result).toHaveLength(1);
    });

    it('should return visible tree for non-admin', async () => {
      const mockVisibleFolders = [
        { id: '1', parent_id: null, name: 'Root', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: '2', parent_id: '1', name: 'Visible Child', created_by: 'user1', created_at: new Date(), updated_at: new Date(), deleted_at: null },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockVisibleFolders });

      const result = await getVisibleFolderTree('user1', ['role1'], false);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE accessible AS'),
        ['user1', ['role1']]
      );
      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children?.[0].id).toBe('2');
    });
  });
});