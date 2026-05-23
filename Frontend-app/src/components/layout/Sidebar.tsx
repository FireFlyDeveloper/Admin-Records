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
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles: string[]
  children?: NavItem[]
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
    roles: ['admin', 'staff'],
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
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg min-w-0">
            <FileText className="h-6 w-6 shrink-0" />
            <span className="truncate">Records</span>
          </Link>
          {/* Close button (mobile) / collapse button (desktop) */}
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1 hover:bg-accent shrink-0"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 lg:hidden" />
            <ChevronLeft className="h-5 w-5 hidden lg:block" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = isActive(item.path, location.pathname)
            const children = item.children
            const hasChildren = children && children.length > 0
            const isExpanded = expandedSections[item.label]

            return (
              <div key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
