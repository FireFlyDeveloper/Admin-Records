import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { useUIStore } from '@/stores/uiStore'

export function useDashboardStats() {
  const addToast = useUIStore((state) => state.addToast)
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const result = await dashboardApi.getStats()
        return result.data
      } catch (error: any) {
        // Surface real API errors so a silent 0 is never confused with a
        // genuine "no data" state. The KPI tiles fall back to 0s on render,
        // which previously masked 401/403/500 responses.
        const status = error?.response?.status
        const message =
          error?.response?.data?.error ||
          error?.message ||
          'Failed to load dashboard stats'
        addToast({
          message: status ? `Dashboard stats (${status}): ${message}` : message,
          type: 'error',
        })
        console.error('useDashboardStats failed:', error)
        // Return default values to keep the UI rendered (graceful)
        return {
          totalItems: 0,
          totalDocuments: 0,
          totalUsers: 0,
          missingItemsCount: 0,
          offlineDevicesCount: 0,
          recentCheckoutsCount: 0,
          activeCheckoutsCount: 0,
          expirationKpis: {
            expired: 0,
            expiringSoon: 0,
            expiringMonth: 0,
            safe: 0,
          },
        }
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: () => dashboardApi.getRecentActivity({ limit }).then((res) => res.data),
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
  })
}

export function useRoomStatus() {
  return useQuery({
    queryKey: ['room-status'],
    queryFn: () => dashboardApi.getRoomStatus().then((res) => res.data),
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
  })
}
