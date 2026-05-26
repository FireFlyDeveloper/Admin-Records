import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface LotSelection<T = any> {
  lot: T
  quantity: number
}

/**
 * Select the most appropriate lots for a given quantity using FIFO (First In First Out) logic.
 * This prefers lots that expire soonest first, then falls back to other criteria.
 */
export function selectMostAppropriateLots<T extends { quantity_on_hand: number; expires_at?: string | null; purchased_at?: string | null }>(
  lots: T[],
  requestedQuantity: number,
  strategy: 'fifo' | 'largest-first' = 'fifo'
): LotSelection<T>[] {
  const availableLots = lots.filter(l => l.quantity_on_hand > 0)
  if (availableLots.length === 0) return []

  // Sort lots based on strategy
  const sortedLots = [...availableLots]
  if (strategy === 'fifo') {
    // For FIFO: sort by expiration date (earliest first), then by purchase date, then by quantity
    sortedLots.sort((a, b) => {
      // Handle null expiration dates (treat as far future)
      const aExpires = a.expires_at ? new Date(a.expires_at).getTime() : Number.MAX_SAFE_INTEGER
      const bExpires = b.expires_at ? new Date(b.expires_at).getTime() : Number.MAX_SAFE_INTEGER
      
      if (aExpires !== bExpires) return aExpires - bExpires
      
      // If same expiration, sort by purchase date (earliest first)
      const aPurchased = a.purchased_at ? new Date(a.purchased_at).getTime() : Number.MAX_SAFE_INTEGER
      const bPurchased = b.purchased_at ? new Date(b.purchased_at).getTime() : Number.MAX_SAFE_INTEGER
      if (aPurchased !== bPurchased) return aPurchased - bPurchased
      
      // If still tied, sort by quantity (largest first for efficiency)
      return b.quantity_on_hand - a.quantity_on_hand
    })
  } else {
    // For largest-first: sort by quantity (largest first), then by expiration
    sortedLots.sort((a, b) => {
      if (a.quantity_on_hand !== b.quantity_on_hand) {
        return b.quantity_on_hand - a.quantity_on_hand
      }
      // If same quantity, use FIFO logic for expiration
      const aExpires = a.expires_at ? new Date(a.expires_at).getTime() : Number.MAX_SAFE_INTEGER
      const bExpires = b.expires_at ? new Date(b.expires_at).getTime() : Number.MAX_SAFE_INTEGER
      return aExpires - bExpires
    })
  }

  // Distribute quantity across sorted lots
  let remaining = requestedQuantity
  const selections: LotSelection<T>[] = []

  for (const lot of sortedLots) {
    if (remaining <= 0) break
    
    const take = Math.min(remaining, lot.quantity_on_hand)
    if (take > 0) {
      selections.push({ lot, quantity: take })
      remaining -= take
    }
  }

  return selections
}
