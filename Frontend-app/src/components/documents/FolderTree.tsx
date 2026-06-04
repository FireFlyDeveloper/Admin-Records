import { Folder, FolderOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpdateFolder, useDeleteFolder } from '@/hooks/useFolders';
import { useFolderTree, useToggleFolderExpansion } from '@/hooks/useFolderTree';
import { FolderNode } from './FolderNode';
import { useUIStore } from '@/stores/uiStore';

interface FolderTreeProps {
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  showRoot?: boolean;
  maxDepth?: number;
}

export function FolderTree({ 
  selectedFolderId, 
  onSelectFolder,
  showRoot = true,
  maxDepth 
}: FolderTreeProps) {
  const { data: tree, isLoading, error } = useFolderTree({
    showRoot,
    maxDepth,
    initiallyExpanded: true,
  });
  const { mutate: toggleExpansion } = useToggleFolderExpansion();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const addToast = useUIStore((state) => state.addToast);

  const handleToggleExpansion = (id: string, expanded: boolean) => {
    toggleExpansion({ id, expanded });
  };

  const handleRename = async (id: string, name: string) => {
    try {
      await updateFolder.mutateAsync({ id, data: { name } });
    } catch (error) {
      console.error('Failed to rename folder:', error);
      addToast({ message: 'Failed to rename folder', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFolder.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete folder:', error);
      addToast({ message: 'Failed to delete folder', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading folder tree" />
      </div>
    );
  }

  if (error) {
    addToast({ message: 'Error loading folder tree', type: 'error' });
    return (
      <div className="p-4 text-sm text-destructive">
        Error loading folder tree
      </div>
    );
  }

  if (!tree || tree.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No folders found
      </div>
    );
  }

  return (
    <div className="space-y-0.5" role="tree" aria-label="Folder hierarchy">
      {showRoot && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors',
            selectedFolderId === null
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground'
          )}
          onClick={() => onSelectFolder(null)}
          role="treeitem"
          aria-selected={selectedFolderId === null}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectFolder(null);
            }
          }}
        >
          {selectedFolderId === null ? (
            <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Folder className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">All Folders</span>
        </div>
      )}
      {tree.map((node) => (
        <FolderNode
          key={node.id}
          node={node}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onToggleExpansion={handleToggleExpansion}
          onRename={handleRename}
          onDelete={handleDelete}
          isRenaming={updateFolder.isPending}
          isDeleting={deleteFolder.isPending}
        />
      ))}
    </div>
  );
}