import { useState, useEffect } from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderTree } from '@/components/documents/FolderTree';
import { useCreateFolder } from '@/hooks/useFolders';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultParentId?: string | null;
  onSuccess?: () => void;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  defaultParentId = null,
  onSuccess,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(defaultParentId);
  const createFolder = useCreateFolder();

  useEffect(() => {
    if (open) {
      setSelectedParentId(defaultParentId);
      setFolderName('');
    }
  }, [open, defaultParentId]);

  const handleCreate = () => {
    if (!folderName.trim()) return;

    createFolder.mutate(
      {
        name: folderName.trim(),
        parentId: selectedParentId || undefined,
      },
      {
        onSuccess: () => {
          setFolderName('');
          onOpenChange(false);
          if (onSuccess) {
            onSuccess();
          }
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && folderName.trim()) {
      handleCreate();
    }
  };

  const handleClearParent = () => {
    setSelectedParentId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Folder Name Input */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              onKeyDown={handleKeyDown}
              autoFocus
              disabled={createFolder.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Required. The name must be unique within the selected parent folder.
            </p>
          </div>

          {/* Parent Folder Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Parent Folder</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearParent}
                disabled={!selectedParentId || createFolder.isPending}
              >
                Clear (Create at Root)
              </Button>
            </div>

            {/* Current Selection Display */}
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm">
                {selectedParentId === null ? (
                  <>
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Root (All Folders)</span>
                    <span className="text-muted-foreground">— Folder will be created at root level</span>
                  </>
                ) : (
                  <>
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Selected:</span>
                    <span className="text-muted-foreground">
                      Click a folder below to change selection
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Folder Tree for Selection */}
            <div className="rounded-lg border max-h-[300px] overflow-y-auto">
              <FolderTree
                selectedFolderId={selectedParentId}
                onSelectFolder={setSelectedParentId}
                showRoot={true}
                maxDepth={3}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Select a parent folder from the tree above. Folders can be expanded by clicking on them.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createFolder.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!folderName.trim() || createFolder.isPending}
          >
            {createFolder.isPending ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}