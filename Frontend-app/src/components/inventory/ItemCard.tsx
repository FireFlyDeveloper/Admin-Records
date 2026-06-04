import { Package, Box, AlertTriangle, Clock, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Item } from '@/types/inventory'
import { cn } from '@/lib/utils'
import { isPast, isBefore, addDays } from 'date-fns'

interface ItemCardProps {
  item: Item
  onClick?: () => void
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
}

/** Regex to detect if a string starts with an emoji character */
const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u

function renderItemName(name: string) {
  const match = name.match(EMOJI_RE)
  if (!match) {
    return <span>{name}</span>
  }
  const emoji = match[1]
  const rest = name.slice(emoji.length).trim()
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-base leading-none shrink-0" aria-hidden="true">{emoji}</span>
      <span className="truncate">{rest || emoji}</span>
    </span>
  )
}

function getExpirationInfo(item: Item) {
  // Use aggregate_expiration_status for the overall item status
  if (item.aggregate_expiration_status === 'expired') {
    return { label: 'Expired', color: 'text-red-600 bg-red-100' };
  }
  if (item.aggregate_expiration_status === 'expiring_soon') {
    return { label: 'Expiring Soon', color: 'text-orange-600 bg-orange-100' };
  }
  if (item.aggregate_expiration_status === 'expiring_month') {
    return { label: 'Expiring This Month', color: 'text-yellow-600 bg-yellow-100' };
  }
  if (item.aggregate_expiration_status === 'healthy' || item.has_healthy_stock || item.has_non_expiring) {
    return { label: 'Safe', color: 'text-green-600 bg-green-100' };
  }
  if (item.aggregate_expiration_status === 'no_stock') {
    return { label: 'No Stock', color: 'text-gray-600 bg-gray-100' };
  }

  // Fallback to earliest_expiration for edge cases
  if (item.earliest_expiration) {
    const date = new Date(item.earliest_expiration);
    const now = new Date();
    if (isPast(date)) return { label: 'Expired', color: 'text-red-600 bg-red-100' };
    if (isBefore(date, addDays(now, 7))) return { label: 'Expiring Soon', color: 'text-orange-600 bg-orange-100' };
    if (isBefore(date, addDays(now, 30))) return { label: 'Expiring This Month', color: 'text-yellow-600 bg-yellow-100' };
    return { label: 'Safe', color: 'text-green-600 bg-green-100' };
  }

  return null;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const expirationInfo = getExpirationInfo(item);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md',
        onClick && 'hover:border-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2">
              {item.item_type === 'quantifiable' ? (
                <Box className="h-5 w-5 text-primary" />
              ) : (
                <Package className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate leading-snug">{renderItemName(item.name)}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{item.item_type}</span>
                {item.category && <span>• {item.category}</span>}
                {item.total_stocks !== undefined && <span className="font-medium">• {item.total_stocks} in stock</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={cn('shrink-0 text-xs', statusColors[item.status])}>
              {item.status}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click from also triggering
                onClick?.();
              }}
              disabled={!onClick}
              className="shrink-0 h-7 px-3 text-xs hover:bg-accent hover:text-accent-foreground"
              aria-label={`View details for ${item.name}`}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              View Details
            </Button>
          </div>
        </div>
        {item.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="capitalize">{item.item_type}</span>
            {item.status === 'maintenance' && <AlertTriangle className="h-3 w-3 text-yellow-600" />}
          </div>
          {expirationInfo && (
            <Badge variant="outline" className={cn('shrink-0 text-[10px] h-4', expirationInfo.color, 'border-transparent')}>
              <Clock className="h-3 w-3 mr-1" />
              {expirationInfo.label}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
