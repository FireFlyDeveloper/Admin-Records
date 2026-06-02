import { query } from '../utils/db';
import { Folder } from '../types';
import { NotFoundError, ConflictError } from '../utils/errors';

export interface FolderWithChildren extends Folder {
  children?: FolderWithChildren[];
}

/**
 * Build a hierarchical tree of folders
 */
export async function getFolderTree(): Promise<FolderWithChildren[]> {
  const dbResult = await query<Folder>(
    `SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY name`
  );
  
  const folders: FolderWithChildren[] = dbResult.rows;
  return buildTree(folders);
}

/**
 * Get the path from root to a specific folder
 */
export async function getFolderPath(folderId: string): Promise<Folder[]> {
  const pathResult = await query<Folder>(
    `WITH RECURSIVE ancestor_path AS (
      SELECT *, 0 as depth FROM folders WHERE id = $1 AND deleted_at IS NULL
      UNION
      SELECT f.*, ap.depth + 1 as depth FROM folders f
      JOIN ancestor_path ap ON f.id = ap.parent_id
      WHERE f.deleted_at IS NULL
    )
    SELECT * FROM ancestor_path ORDER BY depth DESC`,
    [folderId]
  );
  
  if (pathResult.rows.length === 0) {
    throw new NotFoundError('Folder not found');
  }
  
  return pathResult.rows;
}

/**
 * Validate that moving a folder to a new parent won't create a circular reference
 */
export async function validateFolderMove(folderId: string, newParentId: string | null): Promise<boolean> {
  if (newParentId === null) {
    return true; // Moving to root is always valid
  }
  
  // Check if new parent is the folder itself
  if (newParentId === folderId) {
    throw new ConflictError('Cannot move folder into itself');
  }
  
  // Check if new parent is a descendant of the folder using a single query
  const descendantCheck = await query<{id: string}>(
    `WITH RECURSIVE descendants AS (
      SELECT id FROM folders WHERE id = $1 AND deleted_at IS NULL
      UNION
      SELECT f.id FROM folders f
      INNER JOIN descendants d ON f.parent_id = d.id
      WHERE f.deleted_at IS NULL
    )
    SELECT id FROM descendants WHERE id = $2`,
    [folderId, newParentId]
  );
  
  if (descendantCheck.rows.length > 0) {
    throw new ConflictError('Cannot move folder into its own descendant');
  }
  
  return true;
}

/**
 * Helper function to build a hierarchical tree from a flat list of folders
 * @param folders - Flat array of folders with children property
 * @param parentId - ID of the parent folder to build subtree for (null for root)
 * @returns Hierarchical tree structure with nested children
 */
function buildTree(folders: FolderWithChildren[], parentId: string | null = null): FolderWithChildren[] {
  const tree: FolderWithChildren[] = [];
  
  for (const folder of folders) {
    if (folder.parent_id === parentId) {
      const children = buildTree(folders, folder.id);
      if (children.length > 0) {
        folder.children = children;
      }
      tree.push(folder);
    }
  }
  
  return tree;
}

/**
 * Get all descendant folders of a given folder (including the folder itself)
 */
export async function getFolderDescendants(folderId: string): Promise<Folder[]> {
  const descendantsResult = await query(
    `WITH RECURSIVE descendants AS (
      SELECT *, 0 as depth FROM folders WHERE id = $1 AND deleted_at IS NULL
      UNION
      SELECT f.*, d.depth + 1 as depth FROM folders f
      INNER JOIN descendants d ON f.parent_id = d.id
      WHERE f.deleted_at IS NULL
    )
    SELECT * FROM descendants ORDER BY depth, name`,
    [folderId]
  );
  
  return descendantsResult.rows;
}

/**
 * Get a folder tree for a specific user with permissions
 */
export async function getVisibleFolderTree(
  userId: string, 
  userRoles: string[], 
  isAdmin: boolean
): Promise<FolderWithChildren[]> {
  if (isAdmin) {
    return await getFolderTree();
  }
  
  // Get all visible folders (same logic as listVisibleFolders)
  const visibleFoldersResult = await query(
    `WITH RECURSIVE accessible AS (
      SELECT f.* FROM folders f
      JOIN document_permissions dp ON dp.folder_id = f.id
      WHERE f.deleted_at IS NULL
        AND (
          (dp.user_id = $1) OR
          (dp.role_id IN (SELECT id FROM roles WHERE name = ANY($2)))
        )
      UNION
      SELECT f.* FROM folders f
      JOIN documents d ON d.folder_id = f.id AND d.deleted_at IS NULL
      JOIN document_permissions dp ON dp.document_id = d.id
      WHERE f.deleted_at IS NULL
        AND (
          (dp.user_id = $1) OR
          (dp.role_id IN (SELECT id FROM roles WHERE name = ANY($2)))
        )
      UNION
      SELECT f.* FROM folders f
      JOIN accessible a ON a.parent_id = f.id
      WHERE f.deleted_at IS NULL
    )
    SELECT DISTINCT * FROM accessible`,
    [userId, userRoles]
  );
  
  const folders: FolderWithChildren[] = visibleFoldersResult.rows;
  return buildTree(folders);
}