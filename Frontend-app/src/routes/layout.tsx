import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ToastContainer } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/error'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          // Desktop: content shifts with sidebar
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16',
          // Mobile: no left margin (sidebar overlays)
          'ml-0'
        )}
      >
        <Header />
        <main className="p-3 sm:p-4 lg:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
