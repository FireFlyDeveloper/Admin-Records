import api from './client'
import { Folder, DocumentFile, DocumentVersion, ActivityLogEntry, Permission, CreateFolderInput, UpdateFolderInput } from '@/types/document'

export interface FolderTreeNode extends Folder {
  children?: FolderTreeNode[]
  expanded?: boolean
  depth?: number
  path?: Folder[]
}

// Export OnlyOfficeConfig type
export type OnlyOfficeConfig = {
  config: {
    document: { fileType: string; key: string; title: string; url: string }
    documentType: string
    editorConfig: {
      callbackUrl: string
      user: { id: string; name: string }
    }
    height: string
    token: string
    type: string
    width: string
  }
  documentServerUrl: string
}

export const documentsApi = {
  // Folders
  getFolders: () => api.get<{ folders: Folder[] }>('/folders').then(r => ({ data: r.data.folders })),

  getFolder: (id: string) => api.get<{ folder: Folder }>(`/folders/${id}`).then(r => ({ data: r.data.folder })),

  getFolderTree: () => api.get<{ tree: FolderTreeNode[] }>('/folders/tree').then(r => ({ data: r.data.tree })),

  getFolderPath: (id: string) => api.get<{ path: Folder[] }>(`/folders/${id}/path`).then(r => ({ data: r.data.path })),

  createFolder: (data: CreateFolderInput) =>
    api.post<{ folder: Folder }>('/folders', data).then(r => ({ data: r.data.folder })),

  updateFolder: (id: string, data: UpdateFolderInput) =>
    api.patch<{ folder: Folder }>(`/folders/${id}`, data).then(r => ({ data: r.data.folder })),

  deleteFolder: (id: string) => api.delete(`/folders/${id}`),

  getFolderDocuments: (id: string) =>
    api.get<{ documents: DocumentFile[] }>(`/folders/${id}/documents`).then(r => ({ data: r.data.documents })),

  // Documents
  getAllDocuments: () =>
    api.get<{ documents: DocumentFile[] }>('/documents').then(r => ({ data: r.data.documents })),

  checkDuplicate: (folderId: string | null, name: string) =>
    api.get<{ exists: boolean; document?: { id: string; name: string; size_bytes: number; updated_at: string } }>(
      '/documents/check-duplicate',
      { params: { folder_id: folderId || '', name } }
    ).then(r => r.data),

  checkDocumentExists: (folderId: string | null, name: string) =>
    api.get<{ exists: boolean; document?: { id: string; name: string; size_bytes: number; updated_at: string } }>(
      '/documents/check-duplicate',
      { params: { folder_id: folderId || '', name } }
    ),

  uploadDocument: (folderId: string | null, file: File, conflict?: 'replace' | 'duplicate', onProgress?: (progress: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) formData.append('folderId', folderId)
    const params: Record<string, string> = {}
    if (conflict) params.conflict = conflict
    return api.post<DocumentFile>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
        }
      },
    })
  },

  downloadDocument: (id: string) =>
    api.get(`/documents/${id}/download`, { responseType: 'blob' }),

  getDocumentVersions: (id: string) =>
    api.get<{ versions: DocumentVersion[] }>(`/documents/${id}/versions`).then(r => ({ data: r.data.versions })),

  getDocumentActivity: (id: string) =>
    api.get<{ activity: ActivityLogEntry[] }>(`/documents/${id}/activity`).then(r => ({ data: r.data.activity })),

  searchDocuments: (q: string) =>
    api.get<{ documents: DocumentFile[] }>(`/documents/search`, { params: { q } }).then(r => ({ data: r.data.documents })),

  deleteDocument: (id: string) => api.delete(`/documents/${id}`),

  renameDocument: (id: string, name: string) =>
    api.patch<{ document: DocumentFile }>(`/documents/${id}`, { name }).then(r => ({ data: r.data.document })),

  // Permissions
  getDocumentPermissions: (id: string) =>
    api.get<{ permissions: Permission[]; owner: { id: string; display_name: string; email: string } | null }>(`/documents/${id}/permissions`).then(r => r.data),

  addDocumentPermission: (id: string, data: { userId?: string; role?: string; level: 'viewer' | 'editor' | 'manager' }) =>
    api.post<{ permission: Permission; created: boolean }>(`/documents/${id}/permissions`, data),

  removeDocumentPermission: (id: string, permissionId: string) =>
    api.delete(`/documents/${id}/permissions/${permissionId}`),

  getFolderPermissions: (id: string) =>
    api.get<{ permissions: Permission[] }>(`/folders/${id}/permissions`).then(r => ({ data: r.data.permissions })),

  addFolderPermission: (id: string, data: { userId?: string; role?: string; level: 'viewer' | 'editor' | 'manager' }) =>
    api.post<{ permission: Permission; created: boolean }>(`/folders/${id}/permissions`, data),

  removeFolderPermission: (id: string, permissionId: string) =>
    api.delete(`/folders/${id}/permissions/${permissionId}`),

  // ONLYOFFICE
  getOnlyOfficeConfig: (docId: string) =>
    api.post<{
      config: {
        document: { fileType: string; key: string; title: string; url: string };
        documentType: string;
        editorConfig: {
          callbackUrl: string;
          user: { id: string; name: string };
        };
        height: string;
        token: string;
        type: string;
        width: string;
      };
      documentServerUrl: string;
    }>(`/onlyoffice/config/${docId}`).then(r => r.data),
}