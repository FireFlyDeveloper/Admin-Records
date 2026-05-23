import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import {
  ItemLocationPayload,
  ItemStatusPayload,
  MissingAlertPayload,
  DeviceOfflinePayload,
  ItemPresence,
  BleDevice,
} from '@/types/ble'

export function useWebSocket() {
  return useWebSocketContext()
}

export function useWebSocketPresenceSync() {
  const { lastMessage } = useWebSocketContext()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case 'item_location': {
        const p = lastMessage.payload as ItemLocationPayload
        if (!p?.item_id) break
        queryClient.setQueryData<ItemPresence[]>(['ble-presence'], (old) => {
          if (!old) return old
          return old.filter(Boolean).map((item) =>
            item.item_id === p.item_id
              ? {
                  ...item,
                  room_id: p.room_id ?? item.room_id,
                  room_name: p.room_name ?? item.room_name,
                  last_seen: p.timestamp,
                  device_id: p.device_id ?? item.device_id,
                  device_name: p.device_name ?? item.device_name,
                  status: 'present',
                  missing_since: null,
                }
              : item
          )
        })
        break
      }
      case 'item_status': {
        const p = lastMessage.payload as ItemStatusPayload
        if (!p?.item_id) break
        queryClient.setQueryData<ItemPresence[]>(['ble-presence'], (old) => {
          if (!old) return old
          return old.filter(Boolean).map((item) =>
            item.item_id === p.item_id ? { ...item, status: p.status } : item
          )
        })
        break
      }
      case 'item_missing':
      case 'missing_alert': {
        const p = lastMessage.payload as MissingAlertPayload
        if (!p?.item_id) break
        queryClient.setQueryData<ItemPresence[]>(['ble-presence'], (old) => {
          if (!old) return old
          return old.filter(Boolean).map((item) =>
            item.item_id === p.item_id
              ? {
                  ...item,
                  status: 'missing',
                  room_id: p.last_room_id ?? item.room_id,
                  room_name: p.last_room_name ?? item.room_name,
                  last_seen: p.last_seen ?? item.last_seen,
                  missing_since: p.timestamp,
                }
              : item
          )
        })
        break
      }
      case 'item_transporting': {
        const p = lastMessage.payload as { item_id: string; room_id: string | null; rssi: number; timestamp: string }
        if (!p?.item_id) break
        queryClient.setQueryData<ItemPresence[]>(['ble-presence'], (old) => {
          if (!old) return old
          return old.filter(Boolean).map((item) =>
            item.item_id === p.item_id
              ? {
                  ...item,
                  status: 'transporting',
                  room_id: p.room_id ?? item.room_id,
                  last_seen: p.timestamp,
                  missing_since: null,
                }
              : item
          )
        })
        break
      }
      case 'device_offline': {
        const p = lastMessage.payload as DeviceOfflinePayload
        if (!p?.device_id) break
        queryClient.setQueryData<BleDevice[]>(['ble-devices'], (old) => {
          if (!old) return old
          return old.filter(Boolean).map((d) =>
            d.device_id === p.device_id
              ? { ...d, status: 'offline', last_seen: p.last_seen ?? d.last_seen }
              : d
          )
        })
        break
      }
      case 'unregistered_tag': {
        // No cache update needed — handled by alerts
        break
      }
    }
  }, [lastMessage, queryClient])
}
