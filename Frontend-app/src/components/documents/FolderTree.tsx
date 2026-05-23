import { useState } from 'react'
import { Folder, FolderOpen, ChevronRight, ChevronDown, Pencil, Trash2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Folder as FolderType } from '@/types/document'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useUpdateFolder, useDeleteFolder } from '@/hooks/useFolders'
import { PermissionEditor } from './PermissionEditor'

interface FolderTreeProps {
  folders: FolderType[]
  selectedFolderId: string | null
  onSelectFolder: (id: string | null) => void
}

interface FolderNodeProps {
  folder: FolderType
  folders: FolderType[]
  level: number
  selectedFolderId: string | null
  onSelectFolder: (id: string | null) => void
}

function FolderNode({ folder, folders, level, selectedFolderId, onSelectFolder }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const [showPermissions, setShowPermissions] = useState(false)

  const children = folders.filter((f) => f.parent_id === folder.id)
  const hasChildren = children.length > 0
  const isSelected = selectedFolderId === folder.id

  const updateFolder = useUpdateFolder()
  const deleteFolder = useDeleteFolder()

  const handleRename = () => {
    if (editName.trim() && editName !== folder.name) {
      updateFolder.mutate({ id: folder.id, data: { name: editName.trim() } })
    }
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this folder?')) {
      deleteFolder.mutate(folder.id)
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
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) setExpanded(!expanded)
          }}
          className={cn(
            'p-0.5 rounded hover:bg-black/10',
            !hasChildren && 'invisible'
          )}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        <div
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => onSelectFolder(folder.id)}
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
                  setEditName(folder.name)
                  setIsEditing(false)
                }
              }}
              autoFocus
              className="h-6 text-sm py-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate">{folder.name}</span>
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

      {expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              folders={folders}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </div>
      )}

      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder Permissions: {folder.name}</DialogTitle>
          </DialogHeader>
          <PermissionEditor
            type="folder"
            id={folder.id}
            onClose={() => setShowPermissions(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function FolderTree({ folders, selectedFolderId, onSelectFolder }: FolderTreeProps) {
  const rootFolders = folders.filter((f) => !f.parent_id)

  return (
    <div className="space-y-0.5">
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
      {rootFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          folders={folders}
          level={0}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
        />
      ))}
    </div>
  )
}
