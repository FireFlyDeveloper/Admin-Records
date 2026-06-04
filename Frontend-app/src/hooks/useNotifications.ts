import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

export interface Notification {
  id: string;
  user_id: string;
  type: 'pending_request' | 'missing_item' | 'expiring_item' | 'alert' | 'system';
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationCounts {
  total_unread: number;
  pending_requests: number;
  missing_items: number;
  expiring_items: number;
  alerts: number;
  latest_unread: string | null;
}

export interface GetNotificationsParams {
  unread?: boolean;
  type?: Notification['type'];
  limit?: number;
  offset?: number;
}

// --- Queries ---

export function useNotifications(params?: GetNotificationsParams) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      try {
        const searchParams = new URLSearchParams();
        if (params?.unread !== undefined) searchParams.set('unread', params.unread.toString());
        if (params?.type) searchParams.set('type', params.type);
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.offset) searchParams.set('offset', params.offset.toString());
        
        const response = await api.get(`/user-status/notifications?${searchParams.toString()}`);
        return response.data as { notifications: Notification[]; total: number; limit: number; offset: number };
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        // Return empty result on error
        return { notifications: [], total: 0, limit: params?.limit || 50, offset: params?.offset || 0 };
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useNotificationCounts() {
  return useQuery({
    queryKey: ['notificationCounts'],
    queryFn: async () => {
      try {
        const response = await api.get('/user-status/notifications/counts');
        return response.data as NotificationCounts;
      } catch (error) {
        console.error('Failed to fetch notification counts:', error);
        // Return default counts on error to prevent UI from breaking
        return {
          total_unread: 0,
          pending_requests: 0,
          missing_items: 0,
          expiring_items: 0,
          alerts: 0,
          latest_unread: null
        };
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

export function useUnreadNotifications() {
  return useNotifications({ unread: true, limit: 20 });
}

// --- Mutations ---

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.post(`/user-status/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/user-status/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.delete(`/user-status/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
    },
  });
}

// --- Custom hooks for sidebar notifications ---

export function useSidebarNotificationCounts() {
  const { data: counts, isLoading, error } = useNotificationCounts();
  
  return {
    counts,
    isLoading,
    error,
    hasPendingRequests: counts ? counts.pending_requests > 0 : false,
    hasMissingItems: counts ? counts.missing_items > 0 : false,
    hasExpiringItems: counts ? counts.expiring_items > 0 : false,
    hasAlerts: counts ? counts.alerts > 0 : false,
    totalUnread: counts ? counts.total_unread : 0,
  };
}

export function useLatestNotifications(limit = 5) {
  return useNotifications({ limit });
}

// --- Helper function to get notification icon ---

export function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'pending_request':
      return '📋';
    case 'missing_item':
      return '❓';
    case 'expiring_item':
      return '⏰';
    case 'alert':
      return '⚠️';
    case 'system':
      return '🔧';
    default:
      return '📢';
  }
}

// --- Helper function to get notification color ---

export function getNotificationColor(type: Notification['type']) {
  switch (type) {
    case 'pending_request':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'missing_item':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'expiring_item':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'alert':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'system':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}