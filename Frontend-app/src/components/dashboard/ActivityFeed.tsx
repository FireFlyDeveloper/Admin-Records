import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, FileText, Package, User, Bluetooth, AlertTriangle, LogIn, LogOut, Plus, Edit, Trash2, Download, Upload, ShoppingCart } from 'lucide-react'
import { RecentActivity } from '@/api/dashboard'
import { cn, formatDate } from '@/lib/utils'

interface ActivityFeedProps {
  activity: RecentActivity[] | undefined
  isLoading: boolean
}

const entityIcons: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  item: <Package className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  device: <Bluetooth className="h-4 w-4" />,
  checkout: <ShoppingCart className="h-4 w-4" />,
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  create: <Plus className="h-4 w-4" />,
  update: <Edit className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  upload: <Upload className="h-4 w-4" />,
  default: <Activity className="h-4 w-4" />,
}

const entityColors: Record<string, string> = {
  document: 'bg-blue-100 text-blue-600',
  item: 'bg-green-100 text-green-600',
  user: 'bg-purple-100 text-purple-600',
  device: 'bg-orange-100 text-orange-600',
  checkout: 'bg-pink-100 text-pink-600',
  login: 'bg-indigo-100 text-indigo-600',
  logout: 'bg-gray-100 text-gray-600',
  create: 'bg-emerald-100 text-emerald-600',
  update: 'bg-amber-100 text-amber-600',
  delete: 'bg-red-100 text-red-600',
  download: 'bg-cyan-100 text-cyan-600',
  upload: 'bg-teal-100 text-teal-600',
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
              // Get icon based on action or entity type
              const iconKey = entry.action || entry.entityType
              const icon = entityIcons[iconKey] || entityIcons.default
              const color = entityColors[iconKey] || entityColors.default
              
              // Format the description for better readability
              const formatDescription = (desc: string) => {
                // Capitalize first letter of each word
                return desc.split(' ').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ')
              }
              
              return (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', color)}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{formatDescription(entry.description)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{entry.actorName}</span>
                      <span>·</span>
                      <time dateTime={entry.createdAt} title={formatTimeAgo(entry.createdAt)}>
                        {formatDate(entry.createdAt)}
                      </time>
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

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}
