import { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Pencil, Trash2, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FolderTreeNode } from '@/api/documents';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { PermissionEditor } from './PermissionEditor';
import { useUIStore } from '@/stores/uiStore';

export interface FolderNodeProps {
  node: FolderTreeNode;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onToggleExpansion: (id: string, expanded: boolean) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isRenaming?: boolean;
  isDeleting?: boolean;
}

export function FolderNode({ 
  node, 
  selectedFolderId, 
  onSelectFolder, 
  onToggleExpansion,
  onRename,
  onDelete,
  isRenaming = false,
  isDeleting = false
}: FolderNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const addToast = useUIStore((state) => state.addToast);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFolderId === node.id;

  const handleRename = async () => {
    if (editName.trim() && editName !== node.name) {
      try {
        await onRename(node.id, editName.trim());
        setIsEditing(false);
      } catch (error) {
        console.error('Rename failed:', error);
        addToast({ message: 'Failed to rename folder', type: 'error' });
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(node.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete failed:', error);
      addToast({ message: 'Failed to delete folder', type: 'error' });
    }
  };

  const handleToggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpansion(node.id, !node.expanded);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectFolder(node.id);
    }
    if (e.key === 'ArrowLeft' && node.expanded && hasChildren) {
      e.preventDefault();
      onToggleExpansion(node.id, false);
    }
    if (e.key === 'ArrowRight' && !node.expanded && hasChildren) {
      e.preventDefault();
      onToggleExpansion(node.id, true);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer group transition-colors',
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
        style={{ paddingLeft: `${(node.depth || 0) * 12 + 8}px` }}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={node.expanded}
        aria-label={`Folder: ${node.name}${hasChildren ? `, ${node.expanded ? 'expanded' : 'collapsed'}` : ''}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => onSelectFolder(node.id)}
      >
        <button
          onClick={handleToggleExpansion}
          className={cn(
            'p-0.5 rounded hover:bg-black/10',
            !hasChildren && 'invisible'
          )}
          aria-label={node.expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          disabled={!hasChildren}
        >
          {node.expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        <div
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {isSelected ? (
            <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Folder className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setEditName(node.name);
                  setIsEditing(false);
                }
              }}
              autoFocus
              className="h-6 text-sm py-0"
              onClick={(e) => e.stopPropagation()}
              disabled={isRenaming}
              aria-label={`Rename folder ${node.name}`}
            />
          ) : (
            <span className="text-sm truncate">{node.name}</span>
          )}
          {isRenaming && (
            <Loader2 className="h-3 w-3 animate-spin ml-1" aria-label="Renaming..." />
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 rounded hover:bg-black/10"
            title="Rename"
            aria-label={`Rename ${node.name}`}
            disabled={isRenaming || isDeleting}
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPermissions(true);
            }}
            className="p-1 rounded hover:bg-black/10"
            title="Permissions"
            aria-label={`Manage permissions for ${node.name}`}
            disabled={isRenaming || isDeleting}
          >
            <Shield className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="p-1 rounded hover:bg-black/10 hover:text-destructive"
            title="Delete"
            aria-label={`Delete ${node.name}`}
            disabled={isRenaming || isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {node.expanded && hasChildren && (
        <div role="group" aria-label={`Contents of ${node.name}`}>
          {node.children!.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onToggleExpansion={onToggleExpansion}
              onRename={onRename}
              onDelete={onDelete}
              isRenaming={isRenaming}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder Permissions: {node.name}</DialogTitle>
          </DialogHeader>
          <PermissionEditor
            type="folder"
            id={node.id}
            onClose={() => setShowPermissions(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Folder"
        description="Are you sure you want to delete this folder? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}