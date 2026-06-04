import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const result = await dashboardApi.getStats()
        return result.data
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
        // Return default values on error to match DashboardStats type
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
          }
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
