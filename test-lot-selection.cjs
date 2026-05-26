// Simple test for lot selection logic
function selectMostAppropriateLots(lots, requestedQuantity, strategy = 'fifo') {
  const availableLots = lots.filter(l => l.quantity_on_hand > 0)
  if (availableLots.length === 0) return []

  // Sort lots based on strategy
  let sortedLots = [...availableLots]
  if (strategy === 'fifo') {
    sortedLots.sort((a, b) => {
      const aExpires = a.expires_at ? new Date(a.expires_at).getTime() : Number.MAX_SAFE_INTEGER
      const bExpires = b.expires_at ? new Date(b.expires_at).getTime() : Number.MAX_SAFE_INTEGER
      
      if (aExpires !== bExpires) return aExpires - bExpires
      
      const aPurchased = a.purchased_at ? new Date(a.purchased_at).getTime() : Number.MAX_SAFE_INTEGER
      const bPurchased = b.purchased_at ? new Date(b.purchased_at).getTime() : Number.MAX_SAFE_INTEGER
      if (aPurchased !== bPurchased) return aPurchased - bPurchased
      
      return b.quantity_on_hand - a.quantity_on_hand
    })
  } else {
    sortedLots.sort((a, b) => {
      if (a.quantity_on_hand !== b.quantity_on_hand) {
        return b.quantity_on_hand - a.quantity_on_hand
      }
      const aExpires = a.expires_at ? new Date(a.expires_at).getTime() : Number.MAX_SAFE_INTEGER
      const bExpires = b.expires_at ? new Date(b.expires_at).getTime() : Number.MAX_SAFE_INTEGER
      return aExpires - bExpires
    })
  }

  let remaining = requestedQuantity
  const selections = []

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

// Test data
const testLots = [
  { id: '1', lot_code: 'LOT001', quantity_on_hand: 5, expires_at: '2024-12-31', purchased_at: '2024-01-01' },
  { id: '2', lot_code: 'LOT002', quantity_on_hand: 10, expires_at: '2025-06-30', purchased_at: '2024-03-01' },
  { id: '3', lot_code: 'LOT003', quantity_on_hand: 3, expires_at: '2024-09-30', purchased_at: '2024-02-01' },
  { id: '4', lot_code: 'LOT004', quantity_on_hand: 8, expires_at: null, purchased_at: null },
]

console.log('=== Testing FIFO Strategy ===')
console.log('Test 1: Request 10 items')
const result1 = selectMostAppropriateLots(testLots, 10, 'fifo')
console.log('Selected lots:', result1.map(r => `${r.lot.lot_code}: ${r.quantity} (expires: ${r.lot.expires_at || 'none'})`))
console.log('Total selected:', result1.reduce((sum, r) => sum + r.quantity, 0))

console.log('\nTest 2: Request 20 items (more than available)')
const result2 = selectMostAppropriateLots(testLots, 20, 'fifo')
console.log('Selected lots:', result2.map(r => `${r.lot.lot_code}: ${r.quantity}`))
console.log('Total selected:', result2.reduce((sum, r) => sum + r.quantity, 0))

console.log('\n=== Testing Largest-First Strategy ===')
console.log('Test 3: Request 10 items')
const result3 = selectMostAppropriateLots(testLots, 10, 'largest-first')
console.log('Selected lots:', result3.map(r => `${r.lot.lot_code}: ${r.quantity} (qty: ${r.lot.quantity_on_hand})`))

console.log('\nTest 4: Item with no expiration dates')
const testLots2 = [
  { id: '1', lot_code: 'LOTA', quantity_on_hand: 5, expires_at: null, purchased_at: '2024-01-01' },
  { id: '2', lot_code: 'LOTB', quantity_on_hand: 5, expires_at: null, purchased_at: '2023-12-01' },
]
const result4 = selectMostAppropriateLots(testLots2, 3, 'fifo')
console.log('Selected lots (should pick older purchase first):', result4.map(r => `${r.lot.lot_code}: ${r.quantity}`))

console.log('\nAll tests completed!')