import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { inventoryApi } from '@/api/inventory'
import { Item } from '@/types/inventory'
import { Package, AlertCircle, Clock, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react'

interface ItemStatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: 'expired' | 'expiring_soon' | 'expiring_month' | 'safe' | 'missing' | null
  title: string
  onViewAll: () => void
}

const statusConfig = {
  expired: {
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
    color: 'bg-red-100',
    textColor: 'text-red-600',
  },
  expiring_soon: {
    icon: <Clock className="h-5 w-5 text-orange-600" />,
    color: 'bg-orange-100',
    textColor: 'text-orange-600',
  },
  expiring_month: {
    icon: <Clock className="h-5 w-5 text-yellow-600" />,
    color: 'bg-yellow-100',
    textColor: 'text-yellow-600',
  },
  safe: {
    icon: <ShieldCheck className="h-5 w-5 text-green-600" />,
    color: 'bg-green-100',
    textColor: 'text-green-600',
  },
  missing: {
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    color: 'bg-red-100',
    textColor: 'text-red-600',
  },
}

export function ItemStatusModal({ open, onOpenChange, status, title, onViewAll }: ItemStatusModalProps) {
  const { data: items, isLoading } = useQuery({
    queryKey: ['item-status', status],
    queryFn: () => {
      if (status === 'missing') {
        return inventoryApi.getItems({ status: 'missing' }).then(res => res.data.items)
      }
      return inventoryApi.getItems({ type: 'quantifiable', expiration: status || undefined }).then(res => res.data.items)
    },
    enabled: open && status !== null,
  })

  const config = status ? statusConfig[status] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {config && <div className={`p-2 rounded-full ${config.color}`}>{config.icon}</div>}
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="space-y-2">
              {items.slice(0, 10).map((item: Item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={onViewAll}
                >
                  <div className={`p-2 rounded-full ${config?.color || 'bg-gray-100'}`}>
                    <Package className={`h-4 w-4 ${config?.textColor || 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.total_stocks !== undefined ? `Total Stocks: ${item.total_stocks}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {items.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  And {items.length - 10} more items...
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No items found</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onViewAll}>
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}