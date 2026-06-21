import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  WSMessage,
  MissingAlertPayload,
  DeviceOfflinePayload,
  UnregisteredTagPayload,
} from '@/types/ble'

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:'
    ? 'wss://' + window.location.host + '/ws/'
    : 'ws://' + window.location.host + '/ws/')

interface Alert {
  id: string
  type: 'missing' | 'unregistered' | 'device_offline'
  message: string
  payload: unknown
  timestamp: string
}

interface WebSocketContextValue {
  connected: boolean
  connecting: boolean
  alerts: Alert[]
  dismissAlert: (id: string) => void
  lastMessage: WSMessage | null
  sendMessage: (msg: object) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocketContext must be used within WebSocketProvider')
  return ctx
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const shouldReconnectRef = useRef(true)
  const maxReconnectDelay = 30000
  const accessToken = useAuthStore((state) => state.accessToken)

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const addAlert = useCallback((alert: Omit<Alert, 'id'>) => {
    setAlerts((prev) => {
      if (prev.some((a) => a.message === alert.message)) return prev
      return [...prev.slice(-9), { ...alert, id: generateId() }]
    })
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (!accessToken) return

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    shouldReconnectRef.current = true
    setConnecting(true)
    const url = `${WS_URL}?token=${encodeURIComponent(accessToken)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setConnecting(false)
      reconnectAttemptsRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        setLastMessage(msg)

        switch (msg.type) {
          case 'item_location':
          case 'item_status': {
            // payload handled by consumers via lastMessage
            break
          }
          case 'missing_alert': {
            const p = msg.payload as MissingAlertPayload
            addAlert({
              type: 'missing',
              message: `${p.item_name} is missing (last seen: ${p.last_room_name || 'unknown'})`,
              payload: p,
              timestamp: p.timestamp,
            })
            break
          }
          case 'device_offline': {
            const p = msg.payload as DeviceOfflinePayload
            if (!p?.device_id) break
            addAlert({
              type: 'device_offline',
              message: `Device ${p.device_name || p.device_id} went offline`,
              payload: p,
              timestamp: p.timestamp,
            })
            break
          }
          case 'unregistered_tag': {
            const p = msg.payload as UnregisteredTagPayload
            if (!p?.tag_id) break
            addAlert({
              type: 'unregistered',
              message: `Unregistered tag detected: ${p.tag_id}`,
              payload: p,
              timestamp: p.timestamp,
            })
            break
          }
          case 'error': {
            console.error('WS error:', msg.payload)
            break
          }
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      setConnecting(false)
      wsRef.current = null

      if (!shouldReconnectRef.current || !accessToken) return

      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, maxReconnectDelay)
      reconnectAttemptsRef.current += 1
      reconnectTimeoutRef.current = setTimeout(connect, delay)
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      // Only call close() if the socket is actually open;
      // if it's still CONNECTING the browser will abort it
      // automatically and calling close() here produces the
      // noisy "closed before connection established" warning.
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [accessToken, addAlert])

  useEffect(() => {
    connect()
    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return (
    <WebSocketContext.Provider
      value={{ connected, connecting, alerts, dismissAlert, lastMessage, sendMessage }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}
