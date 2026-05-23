import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import { User } from '@/types/auth'
import { getTokenExpiryMs, isTokenExpired } from '@/lib/jwt'
import { API_BASE_URL } from '@/lib/constants'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  scheduleTokenRefresh: () => void
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

function setRefreshTimer(accessToken: string, refreshToken: string, login: AuthState['login'], logout: AuthState['logout']) {
  clearRefreshTimer()

  const expiryMs = getTokenExpiryMs(accessToken)
  if (!expiryMs) {
    // Can't decode — schedule logout at a default 15 min
    refreshTimer = setTimeout(() => logout(), 15 * 60 * 1000)
    return
  }

  const now = Date.now()
  const timeUntilExpiry = expiryMs - now

  // Refresh 60 seconds before expiry
  const refreshAt = Math.max(timeUntilExpiry - 60_000, 0)

  if (refreshAt <= 0) {
    // Already expired or about to — try immediate refresh
    if (!isTokenExpired(refreshToken)) {
      axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }).then(res => {
        const { token, refreshToken: newRt } = res.data
        const user = useAuthStore.getState().user
        if (user) login(token, newRt, user)
      }).catch(() => logout())
    } else {
      logout()
    }
    return
  }

  refreshTimer = setTimeout(async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      const { token, refreshToken: newRt } = res.data
      const user = useAuthStore.getState().user
      if (user) login(token, newRt, user)
    } catch {
      logout()
    }
  }, refreshAt)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isAdmin: false,

      login: (accessToken, refreshToken, user) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isAdmin: user.roles.includes('admin'),
        })
        setRefreshTimer(accessToken, refreshToken, get().login, get().logout)
      },

      logout: () => {
        clearRefreshTimer()
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isAdmin: false,
        })
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken })
        const user = get().user
        if (user && get().isAuthenticated) {
          setRefreshTimer(accessToken, refreshToken, get().login, get().logout)
        }
      },

      setUser: (user) =>
        set({
          user,
          isAdmin: user.roles.includes('admin'),
        }),

      scheduleTokenRefresh: () => {
        const { accessToken, refreshToken, isAuthenticated } = get()
        if (isAuthenticated && accessToken && refreshToken) {
          setRefreshTimer(accessToken, refreshToken, get().login, get().logout)
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
)
