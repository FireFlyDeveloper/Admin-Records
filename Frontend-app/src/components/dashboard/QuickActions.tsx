import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, Package, ShoppingCart, ClipboardList, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function QuickActions() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const actions = [
    { label: 'Documents', icon: <FolderOpen className="h-4 w-4" />, path: '/documents', roles: ['admin', 'staff'] },
    { label: 'Inventory', icon: <Package className="h-4 w-4" />, path: '/inventory', roles: ['admin', 'staff'] },
    { label: 'Request', icon: <ShoppingCart className="h-4 w-4" />, path: '/inventory/checkout', roles: ['admin', 'staff'] },
    { label: 'Requests', icon: <ClipboardList className="h-4 w-4" />, path: '/inventory/checkouts', roles: ['admin', 'staff'] },
    { label: 'Reports', icon: <BarChart3 className="h-4 w-4" />, path: '/reports', roles: ['admin'] },
  ]

  const filtered = actions.filter((a) => user?.roles.some((r) => a.roles.includes(r)))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filtered.map((action) => (
            <Button
              key={action.path}
              variant="outline"
              className="justify-start gap-2 h-auto py-2"
              onClick={() => navigate(action.path)}
            >
              {action.icon}
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
