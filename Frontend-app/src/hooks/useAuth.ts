import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { LoginCredentials } from '@/types/auth'

export function useAuth() {
  return useAuthStore()
}

export function useLogin() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      authApi.login(credentials).then((res) => res.data),
    onSuccess: (data) => {
      login(data.token, data.refreshToken, data.user)
      addToast({ message: 'Welcome back!', type: 'success' })
      navigate('/')
    },
    onError: (error: Error) => {
      addToast({
        message: error.message || 'Login failed. Please check your credentials.',
        type: 'error',
      })
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const addToast = useUIStore((state) => state.addToast)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout()
      queryClient.clear()
      addToast({ message: 'Logged out successfully', type: 'info' })
      navigate('/login')
    },
    onError: () => {
      logout()
      queryClient.clear()
      navigate('/login')
    },
  })
}

export function useMe() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then((res) => res.data.user),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })
}
