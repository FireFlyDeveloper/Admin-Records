import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  description?: string
  colorClass?: string
  isLoading?: boolean
  onClick?: () => void
}

export function StatCard({ label, value, icon, description, colorClass, isLoading, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        onClick && 'cursor-pointer transition-colors hover:bg-accent/50'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', colorClass || 'bg-primary/10 text-primary')}>
          {icon}
        </div>
        <div className="min-w-0">
          {isLoading ? (
            <Skeleton className="h-6 w-16 mb-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-sm text-muted-foreground">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
