import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, FileText, Package, User, Bluetooth, AlertTriangle } from 'lucide-react'
import { RecentActivity } from '@/api/dashboard'
import { cn } from '@/lib/utils'

interface ActivityFeedProps {
  activity: RecentActivity[] | undefined
  isLoading: boolean
}

const entityIcons: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  item: <Package className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  device: <Bluetooth className="h-4 w-4" />,
  checkout: <Activity className="h-4 w-4" />,
  default: <Activity className="h-4 w-4" />,
}

const entityColors: Record<string, string> = {
  document: 'bg-blue-100 text-blue-600',
  item: 'bg-green-100 text-green-600',
  user: 'bg-purple-100 text-purple-600',
  device: 'bg-orange-100 text-orange-600',
  checkout: 'bg-pink-100 text-pink-600',
  default: 'bg-gray-100 text-gray-600',
}

export function ActivityFeed({ activity, isLoading }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activity && activity.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {activity.map((entry) => {
              const icon = entityIcons[entry.entityType] || entityIcons.default
              const color = entityColors[entry.entityType] || entityColors.default
              return (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', color)}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="capitalize">{entry.action}</span>
                      <span>·</span>
                      <span>{entry.actorName}</span>
                      <span>·</span>
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
