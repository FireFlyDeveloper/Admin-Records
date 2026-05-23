import { Badge } from '@/components/ui/badge'

interface RoleBadgeProps {
  role: string
}

const roleColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  admin: 'destructive',
  staff: 'default',
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant={roleColors[role] || 'outline'} className="capitalize">
      {role}
    </Badge>
  )
}
