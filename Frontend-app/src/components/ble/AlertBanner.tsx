import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle, Radio, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

const alertConfig = {
  missing: { icon: AlertTriangle, color: 'bg-red-50 border-red-200 text-red-800' },
  device_offline: { icon: Radio, color: 'bg-orange-50 border-orange-200 text-orange-800' },
  unregistered: { icon: Tag, color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
}

export function AlertBanner() {
  const { alerts, dismissAlert } = useWebSocketContext()

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const config = alertConfig[alert.type]
        const Icon = config.icon
        return (
          <div
            key={alert.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-sm',
              config.color
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{alert.message}</p>
              <p className="text-xs opacity-70">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => dismissAlert(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
