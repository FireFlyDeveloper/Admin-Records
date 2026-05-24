import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then((res) => res.data),
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
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
