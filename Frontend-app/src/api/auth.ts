import api from './client'
import { LoginCredentials, LoginResponse, User } from '@/types/auth'

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/auth/login', credentials),

  logout: () => api.post('/auth/logout'),

  refresh: (refreshToken: string) =>
    api.post<{ token: string; refreshToken: string }>('/auth/refresh', {
      refreshToken,
    }),

  me: () => api.get<{ user: User }>('/auth/me'),
}
