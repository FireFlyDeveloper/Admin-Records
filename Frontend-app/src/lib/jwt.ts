/**
 * Lightweight JWT decode — no dependencies.
 * Parses the payload without verifying the signature.
 */

export interface JwtPayload {
  sub?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    // Handle both standard base64 and base64url
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token)
  if (!payload || !payload.exp) return true // no exp = treat as expired

  // exp is in seconds, Date.now() is in milliseconds
  // Add 10-second buffer to avoid edge cases
  return payload.exp * 1000 < Date.now() + 10_000
}

export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeJwt(token)
  if (!payload || !payload.exp) return null
  return payload.exp * 1000
}
