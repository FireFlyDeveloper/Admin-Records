/**
 * Utility functions for intelligent lot selection in checkout/borrow workflows
 */

import { ItemLot } from '@/types/inventory'

/**
 * Sort lots by appropriateness for checkout/borrowing
 * Priority order:
 * 1. Lots expiring soonest (FIFO - First In First Out)
 * 2. Lots with highest quantity (easier to fulfill from)
 * 3. Alphabetical by lot code (deterministic fallback)
 */
export function sortLotsByAppropriateness(lots: ItemLot[]): ItemLot[] {
  return [...lots].sort((a, b) => {
    // First, sort by expiration date (earliest first)
    if (a.expires_at && b.expires_at) {
      const dateA = new Date(a.expires_at)
      const dateB = new Date(b.expires_at)
      if (dateA < dateB) return -1
      if (dateA > dateB) return 1
    } else if (a.expires_at && !b.expires_at) {
      return -1 // Lots with expiration come first
    } else if (!a.expires_at && b.expires_at) {
      return 1
    }
    
    // Second, sort by quantity on hand (highest first for efficiency)
    if (a.quantity_on_hand > b.quantity_on_hand) return -1
    if (a.quantity_on_hand < b.quantity_on_hand) return 1
    
    // Finally, sort by lot code for deterministic ordering
    return a.lot_code.localeCompare(b.lot_code)
  })
}

/**
 * Select the most appropriate lots to fulfill a requested quantity
 * Uses FIFO (First In First Out) inventory management principles
 */
export function selectMostAppropriateLots(
  requestedQty: number,
  availableLots: ItemLot[]
): Array<{ lot: ItemLot; quantity: number }> {
  if (requestedQty <= 0 || availableLots.length === 0) {
    return []
  }
  
  // Sort lots by appropriateness
  const sortedLots = sortLotsByAppropriateness(availableLots)
  
  // Distribute quantity across appropriate lots
  let remaining = requestedQty
  const selections: Array<{ lot: ItemLot; quantity: number }> = []
  
  for (const lot of sortedLots) {
    if (remaining <= 0) break
    
    // Only consider lots with available stock
    if (lot.quantity_on_hand <= 0) continue
    
    const take = Math.min(remaining, lot.quantity_on_hand)
    selections.push({ lot, quantity: take })
    remaining -= take
  }
  
  return selections
}

/**
 * Calculate how much of a requested quantity can be fulfilled from available lots
 */
export function getAvailableQuantity(lots: ItemLot[]): number {
  return lots.reduce((sum, lot) => sum + lot.quantity_on_hand, 0)
}

/**
 * Check if a requested quantity can be fulfilled from available lots
 */
export function canFulfillQuantity(requestedQty: number, lots: ItemLot[]): boolean {
  return getAvailableQuantity(lots) >= requestedQty
}