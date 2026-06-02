import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../utils/config';
import { query } from '../utils/db';
import {
  listVisibleFolders,
  createFolder,
  renameFolder,
  moveFolder,
  softDeleteFolder,
  listDocumentsInFolder,
  listAllAccessibleDocuments,
  getDocumentById,
  findDocumentByFolderAndName,
  createDocument,
  softDeleteDocument,
  renameDocument,
  createDocumentVersion,
  listDocumentVersions,
  updateDocumentVersion,
  resolveDocumentPermission,
  resolveFolderPermission,
  grantPermission,
  revokePermission,
  listDocumentPermissions,
  listFolderPermissions,
  logActivity,
  listDocumentActivity,
  getStoragePath,
  ensureStorageDir,
  safeMoveFile,
  searchDocuments,
} from '../services/documentService'
import {
  getFolderTree,
  getFolderPath,
  validateFolderMove,
  getVisibleFolderTree,
  FolderWithChildren
} from '../services/folderTreeService'
import { uploadDocumentsBatch } from '../services/batchDocumentService'
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { PermissionLevel } from '../types';

function getUserContext(req: AuthRequest) {
  const user = req.user;
  if (!user) throw new ForbiddenError();
  const isAdmin = user.roles.includes('admin');
  return { userId: user.id, userRoles: user.roles as string[], isAdmin };
}

// --- Folders ---

export async function getFolders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const folders = await listVisibleFolders(ctx.userId, ctx.userRoles, ctx.isAdmin);
    res.json({ folders });
  } catch (err) {
    next(err);
  }
}

export async function getFolderTreeHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const tree = await getVisibleFolderTree(ctx.userId, ctx.userRoles, ctx.isAdmin);
    res.json({ tree });
  } catch (err) {
    next(err);
  }
}

export async function getFolderPathHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const folderId = req.params.id as string;
    
    // Check if user has permission to access this folder
    const perm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, folderId);
    if (!perm && !ctx.isAdmin) {
      throw new ForbiddenError('No permission to access this folder');
    }
    
    const path = await getFolderPath(folderId);
    res.json({ path });
  } catch (err) {
    next(err);
  }
}

export async function validateFolderMoveHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const { folderId, newParentId } = req.body;
    
    if (!folderId) {
      throw new ValidationError('folderId is required');
    }
    
    // Check permission on the folder being moved
    const perm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, folderId);
    if (!perm || (perm !== 'editor' && perm !== 'manager' && !ctx.isAdmin)) {
      throw new ForbiddenError('Editor permission required on folder');
    }
    
    // Check permission on new parent folder if provided
    if (newParentId) {
      const parentPerm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, newParentId);
      if (!parentPerm || (parentPerm !== 'editor' && parentPerm !== 'manager' && !ctx.isAdmin)) {
        throw new ForbiddenError('Editor permission required on new parent folder');
      }
    } else if (!ctx.isAdmin) {
      // Only admins can move folders to root
      throw new ForbiddenError('Only admins can move folders to root');
    }
    
    await validateFolderMove(folderId, newParentId || null);
    res.json({ valid: true, message: 'Folder move is valid' });
  } catch (err) {
    if (err instanceof ConflictError) {
      res.status(409).json({ valid: false, error: err.message });
    } else {
      next(err);
    }
  }
}

export async function postFolder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const { name, parent_id } = req.body;
    if (!name) throw new ValidationError('name is required');

    if (parent_id) {
      const perm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, parent_id as string);
      if (!perm || (perm !== 'editor' && perm !== 'manager' && !ctx.isAdmin)) {
        throw new ForbiddenError('Editor permission required on parent folder');
      }
    } else if (!ctx.isAdmin) {
      throw new ForbiddenError('Only admins can create root folders');
    }

    const folder = await createFolder({ parent_id: parent_id || null, name, created_by: ctx.userId });
    await logActivity({ folder_id: folder.id, actor_id: ctx.userId, action: 'create_folder' });
    res.status(201).json({ folder });
  } catch (err) {
    next(err);
  }
}

export async function patchFolder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const { name, parent_id } = req.body;
    const folderId = req.params.id as string;

    const perm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, folderId);
    if (!perm || (perm !== 'editor' && perm !== 'manager' && !ctx.isAdmin)) {
      throw new ForbiddenError('Editor permission required');
    }

    let folder: any;
    const hasName = name !== undefined;
    const hasParent = parent_id !== undefined;

    if (hasName && !hasParent) {
      folder = await renameFolder(folderId, name);
      await logActivity({ folder_id: folder.id, actor_id: ctx.userId, action: 'rename', metadata: { name } });
    } else if (hasParent && !hasName) {
      folder = await moveFolder(folderId, parent_id || null);
      await logActivity({ folder_id: folder.id, actor_id: ctx.userId, action: 'move', metadata: { parent_id } });
    } else if (hasName && hasParent) {
      await renameFolder(folderId, name);
      folder = await moveFolder(folderId, parent_id || null);
      await logActivity({ folder_id: folder.id, actor_id: ctx.userId, action: 'move', metadata: { name, parent_id } });
    } else {
      throw new ValidationError('No valid fields to update');
    }

    res.json({ folder });
  } catch (err) {
    next(err);
  }
}

export async function deleteFolder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const perm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, req.params.id as string);
    if (!perm || (perm !== 'manager' && !ctx.isAdmin)) {
      throw new ForbiddenError('Manager permission required to delete folder');
    }
    await softDeleteFolder(req.params.id as string);
    await logActivity({ folder_id: req.params.id as string, actor_id: ctx.userId, action: 'delete' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Documents ---

export async function getFolderDocuments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const folderId = req.params.id as string;
    const folderPerm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, folderId);

    const docs = await listDocumentsInFolder(folderId);
    const enriched = [];

    for (const doc of docs) {
      const userPerm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
      if (folderPerm || ctx.isAdmin || userPerm) {
        enriched.push({ ...doc, user_permission: userPerm || 'viewer' });
      }
    }

    res.json({ documents: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getAllDocuments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const docs = await listAllAccessibleDocuments(ctx.userId, ctx.userRoles, ctx.isAdmin);
    // Attach user_permission to each doc
    const enriched = [];
    for (const doc of docs) {
      const userPerm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
      enriched.push({ ...doc, user_permission: userPerm || 'viewer' });
    }
    res.json({ documents: enriched });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate a unique filename when conflict=duplicate by appending (1), (2), etc.
 */
async function getUniqueDocumentName(folderId: string | null, baseName: string): Promise<string> {
  const ext = path.extname(baseName);
  const stem = path.basename(baseName, ext);
  let candidate = baseName;
  let counter = 1;
  while (await findDocumentByFolderAndName(folderId, candidate)) {
    candidate = `${stem} (${counter})${ext}`;
    counter++;
  }
  return candidate;
}

export async function uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const { folder_id, folderId, name } = req.body;
    const folderIdValue = folder_id || folderId;
    const file = (req as any).file;
    if (!file) throw new ValidationError('File is required');

    const conflict = (req.query.conflict as string) || 'replace';

    if (folderIdValue) {
      const perm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, folderIdValue as string);
      if (!perm || (perm !== 'editor' && perm !== 'manager' && !ctx.isAdmin)) {
        throw new ForbiddenError('Editor permission required on folder');
      }

    } else if (!ctx.isAdmin) {
      throw new ForbiddenError('Only admins can upload to root');
    }

    ensureStorageDir();
    const ext = path.extname(file.originalname);
    const storageName = `${uuidv4()}${ext}`;
    const destPath = path.join(getStoragePath(), storageName);
    safeMoveFile(file.path, destPath);

    const document = await createDocument({
      name: file.originalname,
      folder_id: folderIdValue,
      storage_path: storageName,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by: ctx.userId,
      upload_batch_id: null,  // Single file upload, no batch
    });

    await logActivity({
      document_id: document.id,
      actor_id: ctx.userId,
      action: 'upload',
      metadata: {
        folder_id: folderIdValue,
        size: file.size,
        mime_type: file.mimetype,
      },
    });

    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
}
export async function batchUploadDocuments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const { folder_id, folderId } = req.body;
    const folderIdValue = folder_id || folderId;
    const files = (req as any).files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new ValidationError('Files are required');
    }

    const conflict = (req.query.conflict as string) || 'replace';

    if (folderIdValue) {
      const perm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, folderIdValue as string);
      if (!perm || (perm !== 'editor' && perm !== 'manager' && !ctx.isAdmin)) {
        throw new ForbiddenError('Editor permission required on folder');
      }
    } else if (!ctx.isAdmin) {
      throw new ForbiddenError('Only admins can upload to root');
    }

    const results = await uploadDocumentsBatch(
      ctx.userId,
      folderIdValue,
      files,
      conflict as 'replace' | 'rename' | 'skip'
    );

    res.json({
      success: true,
      batch_id: results[0]?.document?.upload_batch_id || null,
      results: results.map(r => ({
        success: r.success,
        file: r.document?.name || '',
        document_id: r.document?.id || null,
        error: r.error || null,
      })),
    });
  } catch (err) {
    next(err);
  }
}
export async function checkDocumentDuplicate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const folderId = (req.query.folder_id as string) || null;
    const name = req.query.name as string;
    if (!name) throw new ValidationError('name query parameter is required');

    const doc = await findDocumentByFolderAndName(folderId, name);
    if (doc) {
      return res.json({
        exists: true,
        document: {
          id: doc.id,
          name: doc.name,
          size_bytes: doc.size_bytes,
          updated_at: doc.updated_at,
        },
      });
    }
    res.json({ exists: false });
  } catch (err) {
    next(err);
  }
}

export async function reuploadDocumentVersion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const docId = req.params.id as string;
    const file = (req as any).file;
    if (!file) throw new ValidationError('File is required');

    const doc = await getDocumentById(docId);

    // Check permission: editor+ or manager
    const perm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, docId);
    if (!perm || (perm !== 'editor' && perm !== 'manager' && !ctx.isAdmin)) {
      throw new ForbiddenError('Editor permission required to upload new version');
    }

    ensureStorageDir();
    const ext = path.extname(file.originalname);
    const storageName = `${uuidv4()}${ext}`;
    const destPath = path.join(getStoragePath(), storageName);
    safeMoveFile(file.path, destPath);

    // Save old version to document_versions
    await createDocumentVersion({
      document_id: doc.id,
      version: doc.version,
      storage_path: doc.storage_path,
      size_bytes: doc.size_bytes,
      uploaded_by: doc.uploaded_by,
    });

    // Update document with new version
    const newVersion = doc.version + 1;
    const updatedDoc = await updateDocumentVersion(docId, {
      storage_path: storageName,
      size_bytes: file.size,
      version: newVersion,
    });

    await logActivity({
      document_id: doc.id,
      actor_id: ctx.userId,
      action: 'version_upload',
      metadata: { version: newVersion, size: file.size, mime_type: file.mimetype },
    });

    res.status(200).json({ document: updatedDoc });
  } catch (err) {
    next(err);
  }
}

export async function downloadDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const doc = await getDocumentById(req.params.id as string);
    const perm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
    if (!perm && !ctx.isAdmin) throw new ForbiddenError('No permission to download');

    const filePath = path.join(getStoragePath(), doc.storage_path);
    if (!fs.existsSync(filePath)) throw new NotFoundError('File not found on disk');

    await logActivity({ document_id: doc.id, actor_id: ctx.userId, action: 'download' });
    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const doc = await getDocumentById(req.params.id as string);
    const perm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
    if (!perm || (perm !== 'manager' && !ctx.isAdmin)) {
      throw new ForbiddenError('Manager permission required to delete');
    }
    await softDeleteDocument(req.params.id as string);
    await logActivity({ document_id: doc.id, actor_id: ctx.userId, action: 'delete' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function patchDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const doc = await getDocumentById(req.params.id as string);
    const perm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
    if (!perm || (perm !== 'editor' && perm !== 'manager' && !ctx.isAdmin)) {
      throw new ForbiddenError('Editor permission required to rename');
    }
    const { name } = req.body;
    if (!name || !name.trim()) throw new ValidationError('name is required');
    const updated = await renameDocument(req.params.id as string, name.trim());
    await logActivity({ document_id: doc.id, actor_id: ctx.userId, action: 'rename', metadata: { name } });
    res.json({ document: updated });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentVersions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const doc = await getDocumentById(req.params.id as string);
    const perm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
    if (!perm && !ctx.isAdmin) throw new ForbiddenError();
    const versions = await listDocumentVersions(req.params.id as string);
    res.json({ versions });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const doc = await getDocumentById(req.params.id as string);
    const perm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
    if (!perm && !ctx.isAdmin) throw new ForbiddenError();
    const activity = await listDocumentActivity(req.params.id as string);
    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentSearch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const q = req.query.q as string;
    if (!q || q.trim().length === 0) {
      throw new ValidationError('q parameter is required');
    }
    const documents = await searchDocuments(q.trim(), ctx.userId, ctx.userRoles, ctx.isAdmin);
    // Attach user_permission
    const enriched = [];
    for (const doc of documents) {
      const userPerm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
      enriched.push({ ...doc, user_permission: userPerm || 'viewer' });
    }
    res.json({ documents: enriched });
  } catch (err) {
    next(err);
  }
}

// --- Permissions ---

export async function getDocumentPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const doc = await getDocumentById(req.params.id as string);
    const perm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
    if (!perm || (perm !== 'manager' && !ctx.isAdmin)) throw new ForbiddenError('Manager permission required');

    const permissions = await listDocumentPermissions(req.params.id as string);

    // Fetch the owner's user info
    const ownerResult = await query(
      `SELECT id, display_name, email FROM users WHERE id = $1`,
      [doc.uploaded_by]
    );

    res.json({
      permissions,
      owner: ownerResult.rows.length > 0 ? ownerResult.rows[0] : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function postDocumentPermission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const doc = await getDocumentById(req.params.id as string);
    const userPerm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
    if (!userPerm || (userPerm !== 'manager' && !ctx.isAdmin)) throw new ForbiddenError('Manager permission required');

    // Accept both camelCase (frontend) and snake_case (direct API)
    const user_id = req.body.user_id ?? req.body.userId;
    const role_id = req.body.role_id ?? req.body.role;
    const permission = req.body.permission ?? req.body.level;
    const inherit = req.body.inherit;

    if (!permission) throw new ValidationError('permission or level is required');
    if (!user_id && !role_id) throw new ValidationError('user_id/userId or role_id/role is required');

    if (userPerm === 'manager' && permission === 'manager' && !ctx.isAdmin) {
      throw new ForbiddenError('Only admins can grant manager permission');
    }

    const { permission: dp, created } = await grantPermission({
      document_id: req.params.id as string,
      user_id: user_id || null,
      role_id: role_id || null,
      permission,
      inherit: inherit ?? false,
      granted_by: ctx.userId,
    });

    await logActivity({ document_id: doc.id, actor_id: ctx.userId, action: 'permission_change', metadata: { permission_id: dp.id, granted: permission } });
    res.status(201).json({ permission: dp, created });
  } catch (err) {
    next(err);
  }
}

export async function deleteDocumentPermission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const doc = await getDocumentById(req.params.id as string);
    const userPerm = await resolveDocumentPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, doc.id);
    if (!userPerm || (userPerm !== 'manager' && !ctx.isAdmin)) throw new ForbiddenError('Manager permission required');
    await revokePermission(req.params.pid as string);
    await logActivity({ document_id: doc.id, actor_id: ctx.userId, action: 'permission_change', metadata: { revoked: req.params.pid as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getFolderPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const perm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, req.params.id as string);
    if (!perm || (perm !== 'manager' && !ctx.isAdmin)) throw new ForbiddenError('Manager permission required');
    const permissions = await listFolderPermissions(req.params.id as string);
    res.json({ permissions });
  } catch (err) {
    next(err);
  }
}

export async function postFolderPermission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const userPerm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, req.params.id as string);
    if (!userPerm || (userPerm !== 'manager' && !ctx.isAdmin)) throw new ForbiddenError('Manager permission required');

    // Accept both camelCase (frontend) and snake_case (direct API)
    const user_id = req.body.user_id ?? req.body.userId;
    const role_id = req.body.role_id ?? req.body.role;
    const permission = req.body.permission ?? req.body.level;
    const inherit = req.body.inherit;

    if (!permission) throw new ValidationError('permission or level is required');
    if (!user_id && !role_id) throw new ValidationError('user_id/userId or role_id/role is required');

    if (userPerm === 'manager' && permission === 'manager' && !ctx.isAdmin) {
      throw new ForbiddenError('Only admins can grant manager permission');
    }

    const { permission: dp, created } = await grantPermission({
      folder_id: req.params.id as string,
      user_id: user_id || null,
      role_id: role_id || null,
      permission,
      inherit: inherit ?? true,
      granted_by: ctx.userId,
    });

    await logActivity({ folder_id: req.params.id as string, actor_id: ctx.userId, action: 'permission_change', metadata: { permission_id: dp.id } });
    res.status(201).json({ permission: dp, created });
  } catch (err) {
    next(err);
  }
}

export async function deleteFolderPermission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const userPerm = await resolveFolderPermission(ctx.userId, ctx.userRoles, ctx.isAdmin, req.params.id as string);
    if (!userPerm || (userPerm !== 'manager' && !ctx.isAdmin)) throw new ForbiddenError('Manager permission required');
    await revokePermission(req.params.pid as string);
    await logActivity({ folder_id: req.params.id as string, actor_id: ctx.userId, action: 'permission_change', metadata: { revoked: req.params.pid as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
