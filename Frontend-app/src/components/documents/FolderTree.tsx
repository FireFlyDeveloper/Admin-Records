import { useState } from 'react'
import { Folder, FolderOpen, ChevronRight, ChevronDown, Pencil, Trash2, Shield, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FolderTreeNode } from '@/api/documents'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useUpdateFolder, useDeleteFolder } from '@/hooks/useFolders'
import { useFolderTree, useToggleFolderExpansion } from '@/hooks/useFolderTree'
import { PermissionEditor } from './PermissionEditor'

interface FolderTreeProps {
  selectedFolderId: string | null
  onSelectFolder: (id: string | null) => void
  showRoot?: boolean
  maxDepth?: number
}

interface FolderNodeProps {
  node: FolderTreeNode
  selectedFolderId: string | null
  onSelectFolder: (id: string | null) => void
  onToggleExpansion: (id: string, expanded: boolean) => void
}

function FolderNode({ node, selectedFolderId, onSelectFolder, onToggleExpansion }: FolderNodeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)
  const [showPermissions, setShowPermissions] = useState(false)

  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedFolderId === node.id

  const updateFolder = useUpdateFolder()
  const deleteFolder = useDeleteFolder()

  const handleRename = () => {
    if (editName.trim() && editName !== node.name) {
      updateFolder.mutate({ id: node.id, data: { name: editName.trim() } })
    }
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this folder?')) {
      deleteFolder.mutate(node.id)
    }
  }

  const handleToggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggleExpansion(node.id, !node.expanded)
    }
  }

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
      >
        <button
          onClick={handleToggleExpansion}
          className={cn(
            'p-0.5 rounded hover:bg-black/10',
            !hasChildren && 'invisible'
          )}
        >
          {node.expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        <div
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => onSelectFolder(node.id)}
        >
          {isSelected ? (
            <FolderOpen className="h-4 w-4 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 shrink-0" />
          )}
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') {
                  setEditName(node.name)
                  setIsEditing(false)
                }
              }}
              autoFocus
              className="h-6 text-sm py-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate">{node.name}</span>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="p-1 rounded hover:bg-black/10"
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowPermissions(true)
            }}
            className="p-1 rounded hover:bg-black/10"
            title="Permissions"
          >
            <Shield className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            className="p-1 rounded hover:bg-black/10"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {node.expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onToggleExpansion={onToggleExpansion}
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
    </div>
  )
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
  })
  const { mutate: toggleExpansion } = useToggleFolderExpansion()

  const handleToggleExpansion = (id: string, expanded: boolean) => {
    toggleExpansion({ id, expanded })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Error loading folder tree
      </div>
    )
  }

  if (!tree || tree.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No folders found
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {showRoot && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors',
            selectedFolderId === null
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground'
          )}
          onClick={() => onSelectFolder(null)}
        >
          {selectedFolderId === null ? (
            <FolderOpen className="h-4 w-4 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 shrink-0" />
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
        />
      ))}
    </div>
  )
}