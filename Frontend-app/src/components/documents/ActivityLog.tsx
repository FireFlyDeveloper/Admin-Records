import { Clock, FileText, FolderOpen, Shield, Upload, Download } from 'lucide-react'
import { useDocumentActivity } from '@/hooks/useDocuments'
import { formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ActivityLogProps {
  documentId: string | null
}

const actionIcons: Record<string, React.ReactNode> = {
  upload: <Upload className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  create: <FileText className="h-4 w-4" />,
  update: <FileText className="h-4 w-4" />,
  delete: <FileText className="h-4 w-4" />,
  permission_grant: <Shield className="h-4 w-4" />,
  permission_revoke: <Shield className="h-4 w-4" />,
  folder_create: <FolderOpen className="h-4 w-4" />,
}

export function ActivityLog({ documentId }: ActivityLogProps) {
  const { data: activities, isLoading } = useDocumentActivity(documentId ?? '')

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 rounded-md border p-3"
        >
          <div className="mt-0.5 text-muted-foreground">
            {actionIcons[activity.action] || <Clock className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{activity.actor_id}</span>{' '}
              <span className="text-muted-foreground">{activity.action.replace(/_/g, ' ')}</span>
            </p>
            {activity.metadata && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {JSON.stringify(activity.metadata)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(activity.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
