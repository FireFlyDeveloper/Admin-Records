import api from './client'
import { ManagedUser, PaginatedUsers, CreateUserInput, UpdateUserInput, Role } from '@/types/auth'

export const usersApi = {
  getUsers: (params?: {
    page?: number
    per_page?: number
    search?: string
    role?: string
    is_active?: boolean
  }) => api.get<PaginatedUsers>('/users', { params }).then(r => r.data),

  getUser: (id: string) => api.get<{ user: ManagedUser }>(`/users/${id}`).then(r => r.data.user),

  createUser: (data: CreateUserInput) => api.post<{ user: ManagedUser }>('/users', data).then(r => r.data.user),

  updateUser: (id: string, data: UpdateUserInput) => api.patch<{ user: ManagedUser }>(`/users/${id}`, data).then(r => r.data.user),

  deleteUser: (id: string) => api.delete(`/users/${id}`),

  getRoles: () => api.get<{ roles: Role[] }>('/users/roles').then(r => r.data.roles),

  assignRole: (userId: string, roleId: string) => api.post(`/users/${userId}/roles`, { role_id: roleId }),

  removeRole: (userId: string, roleId: string) => api.delete(`/users/${userId}/roles/${roleId}`),
}
