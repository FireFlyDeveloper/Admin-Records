import api from './client'

export interface DashboardStats {
  totalItems: number
  totalDocuments: number
  totalUsers: number
  missingItemsCount: number
  offlineDevicesCount: number
  recentCheckoutsCount: number
  activeCheckoutsCount: number
  expirationKpis?: {
    expired: number;
    expiringSoon: number;
    expiringMonth: number;
    safe: number;
  }
}

export interface RecentActivity {
  id: string
  entityType: string
  action: string
  actorName: string
  description: string
  createdAt: string
}

export interface RoomStatus {
  roomId: string
  roomName: string
  itemCount: number
  presentCount: number
  missingCount: number
}

export const dashboardApi = {
  getStats: () => api.get<{ stats: DashboardStats }>('/dashboard/stats').then((r) => ({ data: r.data.stats })),

  getRecentActivity: (params?: { limit?: number }) =>
    api.get<{ activity: RecentActivity[] }>('/dashboard/recent-activity', { params }).then((r) => ({ data: r.data.activity })),

  getRoomStatus: () =>
    api.get<{ rooms: RoomStatus[] }>('/dashboard/room-status').then((r) => ({ data: r.data.rooms })),
}
