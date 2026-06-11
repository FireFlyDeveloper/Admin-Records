import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  Bluetooth,
  ChevronLeft,
  FileText,
  ShoppingCart,
  ClipboardList,
  ChevronDown,
  Shield,
  BarChart3,
  ScrollText,
  X,
  Bell,
} from 'lucide-react'
import { useSidebarNotificationCounts } from '@/hooks/useNotifications'
import { useState, useEffect } from 'react'
import { useDashboardStats } from '@/hooks/useDashboard'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles: string[]
  children?: NavItem[]
  badge?: 'pending' | 'missing' | 'expiring' | 'alert' | 'total'
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['admin', 'staff'],
  },
  {
    label: 'Documents',
    path: '/documents',
    icon: <FolderOpen className="h-5 w-5" />,
    roles: ['admin', 'staff'],
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: <Package className="h-5 w-5" />,
    roles: ['admin', 'staff'],
  },
  {
    label: 'Request',
    path: '/inventory/checkout',
    icon: <ShoppingCart className="h-5 w-5" />,
    roles: ['admin', 'staff'],
  },
  {
    label: 'Requests',
    path: '/inventory/checkouts',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['admin', 'staff'],
    badge: 'pending',
  },
  {
    label: 'BLE Tracking',
    path: '/ble-tracking',
    icon: <Bluetooth className="h-5 w-5" />,
    roles: ['admin', 'staff'],
  },
  {
    label: 'Audit Logs',
    path: '/audit-logs',
    icon: <ScrollText className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    label: 'Admin',
    path: '/admin/users',
    icon: <Shield className="h-5 w-5" />,
    roles: ['admin'],
  },
]

function isActive(path: string, location: string) {
  if (path === '/') return location === '/'
  return location === path || location.startsWith(path + '/')
}

export function Sidebar() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'BLE Tracking': isActive('/ble-tracking', location.pathname),
    Admin: isActive('/admin', location.pathname),
  })

  // Fetch dashboard stats for notification counts
  const { data: stats } = useDashboardStats()
  
  // Fetch notification counts from new notification system
  const { counts: notificationCounts } = useSidebarNotificationCounts()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const filteredNav = navItems.filter((item) =>
    user?.roles.some((r) => item.roles.includes(r))
  )

  // Get notification counts - use new notification system first, fallback to dashboard stats
  const pendingRequestsCount = notificationCounts?.pending_requests ?? stats?.activeCheckoutsCount ?? 0
  const missingItemsCount = notificationCounts?.missing_items ?? stats?.missingItemsCount ?? 0
  // Expiring inventory is a live lot-state indicator; do not use stale unread notification rows.
  const liveExpiringItemsCount = (stats?.expirationKpis?.expiringSoon ?? 0) + (stats?.expirationKpis?.expiringMonth ?? 0)
  const expiringItemsCount = liveExpiringItemsCount
  const totalUnread = notificationCounts?.total_unread ?? 0

  const getBadgeCount = (badge: NavItem['badge']) => {
    switch (badge) {
      case 'pending':
        return pendingRequestsCount
      case 'missing':
        return missingItemsCount
      case 'expiring':
        return expiringItemsCount
      case 'alert':
        return notificationCounts?.alerts ?? 0
      case 'total':
        return totalUnread
      default:
        return 0
    }
  }

  return (
    <>
      {/* Backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border flex flex-col transition-all duration-300',
          // Desktop: collapsible sidebar
          'lg:translate-x-0',
          sidebarOpen ? 'lg:w-64' : 'lg:w-16',
          // Mobile: hidden by default, slides in when open
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
        )}
      >
        <div className={cn(
          'flex h-16 items-center border-b border-border px-4',
          sidebarOpen ? 'justify-between' : 'justify-center lg:px-2'
        )}>
          <Link to="/" className={cn(
            'flex items-center gap-2 font-bold text-lg min-w-0',
            !sidebarOpen && 'lg:hidden'
          )}>
            <FileText className="h-6 w-6 shrink-0" />
            <span className="truncate">Records</span>
          </Link>
          {/* Close button (mobile) / collapse button (desktop) */}
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1 hover:bg-accent shrink-0"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <X className="h-5 w-5 lg:hidden" />
            <ChevronLeft className={cn('h-5 w-5 hidden lg:block transition-transform', !sidebarOpen && 'rotate-180')} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = isActive(item.path, location.pathname)
            const children = item.children
            const hasChildren = children && children.length > 0
            const isExpanded = expandedSections[item.label]
            const badgeCount = getBadgeCount(item.badge)

            return (
              <div key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    !sidebarOpen && 'lg:justify-center lg:px-2'
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                  onClick={(e) => {
                    if (hasChildren && sidebarOpen) {
                      e.preventDefault()
                      toggleSection(item.label)
                    }
                  }}
                >
                  {item.icon}
                  <span className={cn('flex-1', !sidebarOpen && 'lg:hidden')}>
                    {item.label}
                  </span>
                  {badgeCount !== undefined && badgeCount > 0 && (
                    sidebarOpen ? (
                      <span className={cn(
                        'min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold px-1.5',
                        item.badge === 'pending' ? 'bg-amber-100 text-amber-800' :
                        item.badge === 'missing' ? 'bg-red-100 text-red-800' :
                        item.badge === 'expiring' ? 'bg-orange-100 text-orange-800' :
                        item.badge === 'alert' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      )}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    ) : (
                      <span className={cn(
                        'absolute -right-1 -top-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold px-1 shadow-sm ring-2 ring-card lg:flex hidden',
                        item.badge === 'pending' ? 'bg-amber-500 text-white' :
                        item.badge === 'missing' ? 'bg-red-500 text-white' :
                        item.badge === 'expiring' ? 'bg-orange-500 text-white' :
                        item.badge === 'alert' ? 'bg-purple-500 text-white' :
                        'bg-blue-500 text-white'
                      )}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )
                  )}
                  {hasChildren && (
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform shrink-0',
                        isExpanded && 'rotate-180',
                        !sidebarOpen && 'lg:hidden'
                      )}
                    />
                  )}
                </Link>

                {hasChildren && sidebarOpen && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                    {children
                      .filter((child) => user?.roles.some((r) => child.roles.includes(r)))
                      .map((child) => {
                      const childActive = isActive(child.path, location.pathname)
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            childActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          {child.icon}
                          <span>{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Notification Summary */}
        {sidebarOpen && (
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Alerts</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50">
                <span className="text-lg font-bold text-amber-600">{pendingRequestsCount || 0}</span>
                <span className="text-[10px] text-amber-700">Pending</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-red-50">
                <span className="text-lg font-bold text-red-600">{missingItemsCount || 0}</span>
                <span className="text-[10px] text-red-700">Missing</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-orange-50">
                <span className="text-lg font-bold text-orange-600">{expiringItemsCount || 0}</span>
                <span className="text-[10px] text-orange-700">Expiring</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-purple-50">
                <span className="text-lg font-bold text-purple-600">{notificationCounts?.alerts || 0}</span>
                <span className="text-[10px] text-purple-700">Alerts</span>
              </div>
            </div>
          </div>
        )}

        {sidebarOpen && (
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                {user?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.display_name}</p>
                <p className="text-xs text-muted-foreground capitalize truncate">{user?.roles?.[0]}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
