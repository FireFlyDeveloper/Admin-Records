import { useState, useMemo } from 'react'
import { Shield, Plus, Trash2, User, Users } from 'lucide-react'
import { useDocumentPermissions, useAddDocumentPermission, useRemoveDocumentPermission } from '@/hooks/usePermissions'
import { useFolderPermissions, useAddFolderPermission, useRemoveFolderPermission } from '@/hooks/usePermissions'
import { useUsers } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface PermissionEditorProps {
  type: 'document' | 'folder'
  id: string
  onClose?: () => void
}

export function PermissionEditor({ type, id }: PermissionEditorProps) {
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newLevel, setNewLevel] = useState<'viewer' | 'editor' | 'manager'>('viewer')
  const [grantType, setGrantType] = useState<'user' | 'role'>('user')

  const docPerms = useDocumentPermissions(type === 'document' ? id : null)
  const folderPerms = useFolderPermissions(type === 'folder' ? id : null)
  const usersQuery = useUsers()

  const data = type === 'document' ? docPerms.data : { permissions: folderPerms.data || [] }
  const isLoading = type === 'document' ? docPerms.isLoading : folderPerms.isLoading

  const addDocPerm = useAddDocumentPermission()
  const addFolderPerm = useAddFolderPermission()
  const removeDocPerm = useRemoveDocumentPermission()
  const removeFolderPerm = useRemoveFolderPermission()

  const owner = type === 'document' ? (docPerms.data as { owner: { id: string; display_name: string; email: string } | null } | null)?.owner : null
  const permissions: Permission[] = data?.permissions || []
  const currentUser = useAuthStore((state) => state.user)

  // Filter out owner's own permission entries (they own it anyway)
  const sharedPermissions = owner
    ? permissions.filter((p) => p.user_id !== owner.id)
    : permissions

  // IDs to exclude from the "Add user" dropdown
  const excludedUserIds = useMemo(() => {
    const ids = new Set<string>()
    if (currentUser?.id) ids.add(currentUser.id)
    if (owner?.id) ids.add(owner.id)
    sharedPermissions.forEach((p) => { if (p.user_id) ids.add(p.user_id) })
    return ids
  }, [currentUser?.id, owner?.id, sharedPermissions])

  const handleAdd = () => {
    const payload = grantType === 'user'
      ? { userId: newUserId, level: newLevel }
      : { role: newRole, level: newLevel }

    if (type === 'document') {
      addDocPerm.mutate({ documentId: id, data: payload })
    } else {
      addFolderPerm.mutate({ folderId: id, data: payload })
    }

    setNewUserId('')
    setNewRole('')
  }

  const handleRemove = (permissionId: string) => {
    if (type === 'document') {
      removeDocPerm.mutate({ documentId: id, permissionId })
    } else {
      removeFolderPerm.mutate({ folderId: id, permissionId })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  const levelColors: Record<string, string> = {
    viewer: 'bg-blue-100 text-blue-700 border-blue-200',
    editor: 'bg-amber-100 text-amber-700 border-amber-200',
    manager: 'bg-green-100 text-green-700 border-green-200',
  }

  return (
    <div className="space-y-4">
      {/* Owner section */}
      {owner && (
        <div className="rounded-md border p-3 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Owner</p>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium">{owner.display_name}</span>
            <span className="text-xs text-muted-foreground">{owner.email}</span>
            <Badge variant="outline" className="capitalize text-xs shrink-0 bg-green-100 text-green-700 border-green-200">
              Owner
            </Badge>
          </div>
        </div>
      )}

      {/* Shared permissions section */}
      {sharedPermissions.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
            Shared with
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sharedPermissions.map((perm) => {
              const isRole = !!perm.role_id
              const displayName = perm.user_display_name || perm.user?.display_name || perm.role_name || perm.role_id || 'Unknown'
              const email = perm.user_email || perm.user?.email
              return (
                <div
                  key={perm.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isRole ? (
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {isRole ? 'Role' : 'User'}
                    </span>
                    <span className="text-sm font-medium truncate">{displayName}</span>
                    {email && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        {email}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`capitalize text-xs shrink-0 ${levelColors[perm.permission] || ''}`}
                    >
                      {perm.permission}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 ml-2"
                    onClick={() => handleRemove(perm.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add permission */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
          Add access
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={grantType}
            onChange={(e) => setGrantType(e.target.value as 'user' | 'role')}
            className="w-28"
          >
            <option value="user">User</option>
            <option value="role">Role</option>
          </Select>

          {grantType === 'user' ? (
            <Select
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="flex-1"
            >
              <option value="">Select user...</option>
              {usersQuery.data?.users
                ?.filter((user: any) => !excludedUserIds.has(user.id))
                .map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.display_name} ({user.email})
                </option>
              ))}
            </Select>
          ) : (
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="flex-1"
            >
              <option value="">Select role...</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </Select>
          )}

          <Select
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value as 'viewer' | 'editor' | 'manager')}
            className="w-28"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="manager">Manager</option>
          </Select>

          <Button
            size="icon"
            onClick={handleAdd}
            disabled={grantType === 'user' ? !newUserId : !newRole}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {sharedPermissions.length === 0 && !owner && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No permissions set.
        </p>
      )}
    </div>
  )
}
