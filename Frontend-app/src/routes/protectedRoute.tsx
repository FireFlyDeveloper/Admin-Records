import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { isTokenExpired } from '@/lib/jwt'
import { API_BASE_URL } from '@/lib/constants'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function verify() {
      const state = useAuthStore.getState()
      const { accessToken, refreshToken, user: storedUser, login, logout } = state

      if (!accessToken || !state.isAuthenticated) {
        setChecking(false)
        return
      }

      // Token is still valid — proceed immediately
      if (!isTokenExpired(accessToken)) {
        setChecking(false)
        return
      }

      // Token expired — try refresh if refresh token is still valid
      if (refreshToken && !isTokenExpired(refreshToken)) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
          const { token, refreshToken: newRt } = res.data
          if (!cancelled && storedUser) {
            login(token, newRt, storedUser)
          }
        } catch {
          if (!cancelled) logout()
        }
      } else {
        // Both tokens expired — force logout
        if (!cancelled) logout()
      }

      setChecking(false)
    }

    verify()
    return () => { cancelled = true }
  }, [])

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !user.roles.some((r) => allowedRoles.includes(r))) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
