export type ItemType = 'trackable' | 'quantifiable'
export type ItemStatus = 'active' | 'inactive' | 'maintenance'
export type CheckoutStatus = 'pending' | 'approved' | 'borrowed' | 'returned' | 'rejected' | 'cancelled'

export interface Item {
  id: string
  item_type: ItemType
  name: string
  sku: string | null
  item_model: string | null
  category: string | null
  description: string | null
  status: ItemStatus
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Expiration tracking fields
  earliest_expiration?: string | null
  latest_expiration?: string | null
  has_expired_stock?: boolean
  has_expiring_soon?: boolean
  has_healthy_stock?: boolean
  has_non_expiring?: boolean
  aggregate_expiration_status?: 'expired' | 'no_stock' | 'healthy' | 'expiring_soon' | 'expiring_month' | 'unknown'
  total_stocks?: number
}

export interface ItemLot {
  id: string
  item_id: string
  lot_code: string
  quantity_total: number
  quantity_on_hand: number
  quantity_out: number
  purchased_at: string | null
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  item_name?: string
}

export interface CheckoutTransaction {
  id: string
  checked_out_by: string
  checked_out_by_name?: string
  processed_by: string | null
  status: CheckoutStatus
  notes: string | null
  created_at: string
  updated_at: string
  request_number?: number
  status_changed_at?: string
  tracking_status?: string
  admin_notes?: string
  rejection_reason?: string
  returned_at?: string | null
  borrowed_item_names?: string | null
}

export interface CheckoutTransactionItem {
  id: string
  transaction_id: string
  item_id: string
  lot_id: string
  quantity_out: number
  quantity_returned: number
  created_at: string
  item_name?: string
  lot_code?: string
}

export interface ReturnTransaction {
  id: string
  checkout_transaction_id: string
  returned_by: string
  processed_by: string | null
  notes: string | null
  created_at: string
}

export interface ReturnTransactionItem {
  id: string
  return_transaction_id: string
  checkout_item_id: string
  quantity_returned: number
  created_at: string
}

export interface CheckoutLine {
  lot_id: string
  quantity: number
}

export interface ReturnLine {
  checkout_item_id: string
  quantity: number
}

export interface CheckoutResult {
  transaction: CheckoutTransaction
  items: CheckoutTransactionItem[]
}

export interface CheckoutDetailResult {
  transaction: CheckoutTransaction
  items: (CheckoutTransactionItem & { item_name: string; lot_code: string })[]
}

export interface ReturnResult {
  returnTxn: ReturnTransaction
  items: ReturnTransactionItem[]
}

export interface ScanResult {
  type: 'item' | 'lot'
  item?: Item
  lot?: ItemLot
}

export interface CreateItemInput {
  item_type: ItemType
  name: string
  sku?: string | null
  item_model?: string | null
  category?: string
  description?: string
  status?: ItemStatus
}

export interface UpdateItemInput {
  name?: string
  sku?: string | null
  item_model?: string | null
  category?: string
  description?: string
  status?: ItemStatus
}

export interface CreateLotInput {
  lot_code: string
  quantity_total: number
  purchased_at?: string
  expires_at?: string
  notes?: string
}

export interface UpdateLotInput {
  lot_code?: string
  quantity_total?: number
  purchased_at?: string | null
  expires_at?: string | null
  notes?: string | null
}

export interface CheckoutInput {
  lines: CheckoutLine[]
  notes?: string
}

export interface ReturnInput {
  lines: ReturnLine[]
  notes?: string
}
