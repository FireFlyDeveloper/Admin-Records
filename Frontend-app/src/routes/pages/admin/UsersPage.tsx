import { useState, useMemo } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import {
  useUsers,
  useRoles,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useRealTimeUserStatus } from '@/hooks/useUserStatus'
import { ManagedUser, CreateUserInput } from '@/types/auth'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  staff: 'bg-blue-100 text-blue-800 border-blue-200',
}

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [perPage] = useState(10)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)

  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formRoleId, setFormRoleId] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)

  const { data, isLoading } = useUsers({
    page,
    per_page: perPage,
    search: search || undefined,
    role: roleFilter || undefined,
    is_active: statusFilter ? statusFilter === 'active' : undefined,
  })
  const { data: roles } = useRoles()

  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 1

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
      admins: users.filter((u) => u.roles.some((r) => r.name === 'admin')).length,
    }
  }, [users])

  const openCreate = () => {
    setEditingUser(null)
    setFormEmail('')
    setFormName('')
    setFormPassword('')
    setFormActive(true)
    setFormRoleId('')
    setShowPassword(false)
    setDialogOpen(true)
  }

  const openEdit = (user: ManagedUser) => {
    setEditingUser(user)
    setFormEmail(user.email)
    setFormName(user.display_name)
    setFormPassword('')
    setFormActive(user.is_active)
    setFormRoleId(user.roles[0]?.id ?? '')
    setShowPassword(false)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEmail.trim() || !formName.trim()) return

    const role_ids = formRoleId ? [formRoleId] : []

    if (editingUser) {
      const data: Partial<CreateUserInput> = {
        email: formEmail,
        display_name: formName,
        is_active: formActive,
        role_ids,
      }
      if (formPassword) {
        data.password = formPassword
      }
      updateUser.mutate({ id: editingUser.id, data })
    } else {
      if (!formPassword) return
      createUser.mutate({
        email: formEmail,
        display_name: formName,
        password: formPassword,
        is_active: formActive,
        role_ids,
      })
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser.mutate(id)
    }
  }

  // Remove simulated status - we'll use real status from hook in the JSX

  return (
    <PageShell
      title="User Management"
      description="Manage platform users, roles, and access"
      actions={
        <Button onClick={openCreate} className="h-9 sm:h-10 text-xs sm:text-sm px-3">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Add User
        </Button>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: 'Total Users', value: stats.total, icon: <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
          { label: 'Active', value: stats.active, icon: <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
          { label: 'Inactive', value: stats.inactive, icon: <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
          { label: 'Admins', value: stats.admins, icon: <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-3 sm:pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                <div className="text-muted-foreground">{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-3 sm:pt-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 text-sm"
              />
            </div>
            <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}>
              <option value="">All Roles</option>
              {roles?.map((role) => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base">Users</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No users found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:-mx-0">
              <div className="min-w-0 space-y-2 px-3 sm:px-0">
{users.map((user: ManagedUser) => {
                   const { status: userStatus, icon, label, isLoading } = useRealTimeUserStatus(user.id)
                   return (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border p-2 sm:p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs sm:text-sm font-bold shrink-0">
                          {user.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 max-w-[120px] xs:max-w-[160px] sm:max-w-none">
                          <p className="text-xs sm:text-sm font-medium truncate">{user.display_name}</p>
                          <div className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
                            <Mail className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role.id} variant="outline" className={`text-xs capitalize ${ROLE_COLORS[role.name] || ''}`}>
                              {role.name}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && <Badge variant="outline" className="text-xs">No roles</Badge>}
                        </div>
                        <div className={`h-2 w-2 rounded-full shrink-0 ${isLoading ? 'bg-gray-300' : userStatus === 'online' ? 'bg-green-500' : userStatus === 'offline' ? 'bg-red-500' : 'bg-orange-500'}`} title={isLoading ? 'Loading...' : label} />
                        <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => openEdit(user)}>
                          <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
              <p className="text-xs sm:text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="outline" size="sm" className="h-7 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="John Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password {editingUser && <span className="text-muted-foreground">(leave blank to keep current)</span>}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={editingUser ? '••••••••' : 'Enter password'} required={!editingUser} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {editingUser && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select id="status" value={formActive ? 'active' : 'inactive'} onChange={(e) => setFormActive(e.target.value === 'active')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="space-y-2 rounded-md border p-3">
                {roles?.map((role) => (
                  <label key={role.id} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="role" className="h-4 w-4 border-gray-300" checked={formRoleId === role.id} onChange={() => setFormRoleId(role.id)} />
                    <div>
                      <p className="text-sm font-medium capitalize">{role.name}</p>
                      {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                    </div>
                  </label>
                ))}
                {(!roles || roles.length === 0) && <p className="text-sm text-muted-foreground">No roles available</p>}
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="text-xs sm:text-sm h-9 sm:h-10">Cancel</Button>
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending} className="text-xs sm:text-sm h-9 sm:h-10">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
