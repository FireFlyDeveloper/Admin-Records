export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  folder_id: string;
  size_bytes: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  user_permission?: 'viewer' | 'editor' | 'manager';
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  size_bytes: number;
  created_at: string;
  uploaded_by: string;
}

export interface ActivityLogEntry {
  id: string;
  document_id: string;
  action: string;
  actor_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Permission {
  id: string;
  user_id?: string;
  role_id?: string;
  permission: 'viewer' | 'editor' | 'manager';
  // JOINed from backend
  user_display_name?: string;
  user_email?: string;
  role_name?: string;
  user?: {
    id: string;
    display_name: string;
    email: string;
  };
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
}
