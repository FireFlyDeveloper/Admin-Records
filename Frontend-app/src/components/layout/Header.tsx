import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LogOut, Menu } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

export function Header() {
  const user = useAuthStore((state) => state.user)
  const logout = useLogout()
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)

  return (
    <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden rounded-md p-1.5 hover:bg-accent -ml-1"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold truncate">Admin Records</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline truncate max-w-[180px]">
          {user?.email}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 sm:h-9 px-2 sm:px-3"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">
            {logout.isPending ? 'Logging out...' : 'Logout'}
          </span>
        </Button>
      </div>
    </header>
  )
}
