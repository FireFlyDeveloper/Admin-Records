import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

export type UserStatus = 'online' | 'offline' | 'inactive';

export interface UserOnlineStatus {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  status: UserStatus;
  last_seen: string | null;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  last_active: string;
  created_at: string;
  expires_at: string;
}

// --- User Status Queries ---

export function useUserStatus() {
  return useQuery({
    queryKey: ['userStatus'],
    queryFn: async () => {
      const response = await api.get('/user-status/status');
      return response.data as {
        status: UserStatus;
        user_id: string;
        display_name: string;
        email: string;
        is_active: boolean;
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useAllUsersStatus() {
  return useQuery({
    queryKey: ['allUsersStatus'],
    queryFn: async () => {
      const response = await api.get('/user-status/status/all');
      return response.data as { statuses: UserOnlineStatus[] };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    // Only admins should use this
  });
}

export function useUserSessionVerification() {
  return useQuery({
    queryKey: ['userSessionVerification'],
    queryFn: async () => {
      const sessionToken = useAuthStore.getState().getSessionToken();
      if (!sessionToken) {
        throw new Error('No session token');
      }
      
      const response = await api.post('/user-status/session/verify', {
        session_token: sessionToken,
      });
      return response.data as { valid: boolean; session: UserSession | null };
    },
    refetchInterval: 300000, // Check every 5 minutes
    retry: false, // Don't retry on failure
  });
}

// --- User Status Mutations ---

export function useUpdateUserActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionToken: string) => {
      const response = await api.post('/user-status/activity', {
        session_token: sessionToken,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate user status queries
      queryClient.invalidateQueries({ queryKey: ['userStatus'] });
    },
  });
}

export function useLogoutSession() {
  return useMutation({
    mutationFn: async (sessionToken: string) => {
      const response = await api.post('/user-status/session/logout', {
        session_token: sessionToken,
      });
      return response.data;
    },
  });
}

// --- Helper Functions ---

export function getUserStatusIcon(status: UserStatus): string {
  switch (status) {
    case 'online':
      return '🟢';
    case 'offline':
      return '🔴';
    case 'inactive':
      return '🟠';
    default:
      return '⚪';
  }
}

export function getUserStatusColor(status: UserStatus): string {
  switch (status) {
    case 'online':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'offline':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'inactive':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getUserStatusLabel(status: UserStatus): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'offline':
      return 'Offline';
    case 'inactive':
      return 'Inactive';
    default:
      return 'Unknown';
  }
}

// --- Custom Hooks for UI Components ---

export function useUserStatusIndicator() {
  const { data: status, isLoading, error } = useUserStatus();
  
  return {
    status: status?.status,
    icon: status ? getUserStatusIcon(status.status) : '⚪',
    color: status ? getUserStatusColor(status.status) : 'text-gray-600 bg-gray-50 border-gray-200',
    label: status ? getUserStatusLabel(status.status) : 'Loading...',
    isLoading,
    error,
    isOnline: status?.status === 'online',
    isOffline: status?.status === 'offline',
    isInactive: status?.status === 'inactive',
  };
}

export function useRealTimeUserStatus(userId?: string) {
  const { data: allStatuses, isLoading, error } = useAllUsersStatus();
  
  const userStatus = userId 
    ? allStatuses?.statuses.find(s => s.id === userId)
    : undefined;
  
  return {
    status: userStatus,
    icon: userStatus ? getUserStatusIcon(userStatus.status) : '⚪',
    color: userStatus ? getUserStatusColor(userStatus.status) : 'text-gray-600 bg-gray-50 border-gray-200',
    label: userStatus ? getUserStatusLabel(userStatus.status) : 'Unknown',
    isLoading,
    error,
    isOnline: userStatus?.status === 'online',
    isOffline: userStatus?.status === 'offline',
    isInactive: userStatus?.status === 'inactive',
  };
}

// --- Hook to update user activity periodically ---

export function usePeriodicActivityUpdate() {
  const updateUserActivity = useUpdateUserActivity();
  const sessionToken = useAuthStore.getState().getSessionToken();
  
  const updateActivity = () => {
    if (sessionToken) {
      updateUserActivity.mutate(sessionToken);
    }
  };
  
  // This would typically be used in a useEffect in a component
  return {
    updateActivity,
    isUpdating: updateUserActivity.isPending,
  };
}