import { ItemPresence } from '@/types/ble'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Radio, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MissingTimer } from './MissingTimer'

const statusConfig = {
  present: { label: 'Present', variant: 'default' as const, className: 'bg-green-600 hover:bg-green-600' },
  missing: { label: 'Missing', variant: 'destructive' as const, className: '' },
  inactive: { label: 'Inactive', variant: 'secondary' as const, className: '' },
  maintenance: { label: 'Maintenance', variant: 'outline' as const, className: 'text-amber-600 border-amber-300' },
  transporting: { label: 'Transporting', variant: 'outline' as const, className: 'text-blue-600 border-blue-300' },
}

interface ItemPresenceCardProps {
  presence: ItemPresence
  onClick?: () => void
}

export function ItemPresenceCard({ presence, onClick }: ItemPresenceCardProps) {
  const status = statusConfig[presence.status]

  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow', onClick && 'hover:border-primary')}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base truncate">{presence.item_name}</CardTitle>
          <Badge variant={status.variant} className={cn('text-xs', status.className)}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{presence.room_name || 'Unknown location'}</span>
        </div>
        {presence.last_seen && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{new Date(presence.last_seen).toLocaleString()}</span>
          </div>
        )}
        {presence.status === 'missing' && presence.missing_since && (
          <div className="flex items-center gap-2 text-red-600 font-medium">
            <Timer className="h-4 w-4 shrink-0 animate-pulse" />
            <MissingTimer missingSince={presence.missing_since} />
          </div>
        )}
        {presence.device_name && (
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 shrink-0" />
            <span className="truncate">{presence.device_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
