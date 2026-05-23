import { PageShell } from '@/components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useDashboardStats } from '@/hooks/useDashboard'
import { useUsers } from '@/hooks/useUsers'
import { useRooms, useDevices } from '@/hooks/useBLE'
import {
  Database,
  Users,
  Server,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

export function AdminPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: usersData, isLoading: usersLoading } = useUsers()
  const users = usersData?.users ?? []
  const { data: rooms, isLoading: roomsLoading } = useRooms()
  const { data: devices, isLoading: devicesLoading } = useDevices()

  const isLoading = statsLoading || usersLoading || roomsLoading || devicesLoading

  const dbStats = [
    { label: 'Users', value: users.length, icon: <Users className="h-4 w-4" /> },
    { label: 'Rooms', value: rooms?.length ?? 0, icon: <Database className="h-4 w-4" /> },
    { label: 'BLE Devices', value: devices?.length ?? 0, icon: <Server className="h-4 w-4" /> },
    { label: 'Items', value: stats?.totalItems ?? 0, icon: <Activity className="h-4 w-4" /> },
    { label: 'Documents', value: stats?.totalDocuments ?? 0, icon: <Database className="h-4 w-4" /> },
  ]

  const systemHealth = [
    {
      label: 'API Server',
      status: 'healthy',
      message: 'Responding normally',
    },
    {
      label: 'Database',
      status: 'healthy',
      message: 'Connected',
    },
    {
      label: 'WebSocket',
      status: 'healthy',
      message: 'Active',
    },
  ]

  const statusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">Healthy</Badge>
      case 'warning':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">Warning</Badge>
      case 'error':
        return <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <PageShell
      title="Admin Panel"
      description="System health, database stats, and user activity"
    >
      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {systemHealth.map((svc) => (
                <div
                  key={svc.label}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {statusIcon(svc.status)}
                    <div>
                      <p className="text-sm font-medium">{svc.label}</p>
                      <p className="text-xs text-muted-foreground">{svc.message}</p>
                    </div>
                  </div>
                  {statusBadge(svc.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Database Statistics</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {dbStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border bg-card p-4 text-center"
                >
                  <div className="flex justify-center mb-2 text-muted-foreground">
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Activity Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {usersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {users.slice(0, 10).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {user.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-xs">
                      {user.roles[0]?.name ?? 'No role'}
                    </Badge>
                    <div
                      className={`h-2 w-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                      title={user.is_active ? 'Active' : 'Inactive'}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
