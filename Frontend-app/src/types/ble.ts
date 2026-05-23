export type PresenceStatus = 'present' | 'missing' | 'inactive' | 'maintenance' | 'transporting'
export type DeviceStatus = 'online' | 'offline'

export interface Room {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface CreateRoomInput {
  name: string
  description?: string
}

export interface UpdateRoomInput {
  name?: string
  description?: string
}

export interface BleDevice {
  id: string
  device_id: string
  name: string
  room_id: string | null
  room_name?: string | null
  status: DeviceStatus
  last_seen: string | null
  rssi_range: number | null
  created_at: string
  updated_at: string
}

export interface CreateDeviceInput {
  device_id: string
  name: string
  room_id?: string
  rssi_range?: number
}

export interface UpdateDeviceInput {
  name?: string
  room_id?: string | null
  rssi_range?: number
}

export interface BleTag {
  id: string
  tag_id: string
  name: string
  item_id: string | null
  item_name?: string | null
  created_at: string
  updated_at: string
}

export interface CreateTagInput {
  tag_id: string
  name: string
}

export interface UpdateTagInput {
  name?: string
}

export interface AssignTagInput {
  item_id: string
}

export interface ItemPresence {
  item_id: string
  item_name: string
  room_id: string | null
  room_name: string | null
  status: PresenceStatus
  last_seen: string | null
  missing_since: string | null
  device_id: string | null
  device_name: string | null
}

export interface LocationHistoryEntry {
  room_id: string
  room_name: string
  detected_at: string
  device_id: string
  device_name: string
  rssi?: number | null
  has_conflict?: boolean
}

export interface ItemPresenceDetail {
  item_id: string
  item_name: string
  room_id: string | null
  room_name: string | null
  status: PresenceStatus
  last_seen: string | null
  device_id: string | null
  device_name: string | null
  history: LocationHistoryEntry[]
}

// WebSocket message types
export type WSMessageType =
  | 'item_location'
  | 'item_status'
  | 'missing_alert'
  | 'item_missing'
  | 'item_transporting'
  | 'device_offline'
  | 'unregistered_tag'
  | 'connected'
  | 'error'

export interface WSMessage {
  type: WSMessageType
  payload: unknown
}

export interface ItemLocationPayload {
  item_id: string
  item_name?: string
  room_id: string
  room_name?: string
  device_id: string
  device_name?: string
  timestamp: string
}

export interface ItemStatusPayload {
  item_id: string
  item_name?: string
  status: PresenceStatus
  previous_status?: PresenceStatus
  timestamp: string
}

export interface MissingAlertPayload {
  item_id: string
  item_name?: string
  last_room_id: string | null
  last_room_name?: string | null
  last_seen: string | null
  timestamp: string
}

export interface DeviceOfflinePayload {
  device_id: string
  device_name?: string
  room_id: string | null
  room_name?: string | null
  last_seen: string | null
  timestamp: string
}

export interface UnregisteredTagPayload {
  tag_id: string
  device_id: string
  device_name?: string
  room_id: string | null
  room_name?: string | null
  rssi: number | null
  timestamp: string
}
