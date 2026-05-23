import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import { useUIStore } from '@/stores/uiStore'
import { CreateUserInput, UpdateUserInput } from '@/types/auth'

export function useUsers(params?: {
  page?: number
  per_page?: number
  search?: string
  role?: string
  is_active?: boolean
}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.getUsers(params),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.getRoles(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (data: CreateUserInput) => usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      addToast({ message: 'User created successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({
        message: err?.response?.data?.error || 'Failed to create user',
        type: 'error',
      })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      addToast({ message: 'User updated successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({
        message: err?.response?.data?.error || 'Failed to update user',
        type: 'error',
      })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      addToast({ message: 'User deleted', type: 'success' })
    },
    onError: (err: any) => {
      addToast({
        message: err?.response?.data?.error || 'Failed to delete user',
        type: 'error',
      })
    },
  })
}

export function useAssignUserRole() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      usersApi.assignRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      addToast({ message: 'Role assigned', type: 'success' })
    },
    onError: (err: any) => {
      addToast({
        message: err?.response?.data?.error || 'Failed to assign role',
        type: 'error',
      })
    },
  })
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      usersApi.removeRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      addToast({ message: 'Role removed', type: 'success' })
    },
    onError: (err: any) => {
      addToast({
        message: err?.response?.data?.error || 'Failed to remove role',
        type: 'error',
      })
    },
  })
}
