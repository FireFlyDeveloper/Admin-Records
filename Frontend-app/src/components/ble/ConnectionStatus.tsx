import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

export function ConnectionStatus() {
  const { connected, connecting } = useWebSocketContext()

  if (connecting) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Connecting...
      </Badge>
    )
  }

  if (connected) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
        <Wifi className="h-3 w-3" />
        Live
      </Badge>
    )
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <WifiOff className="h-3 w-3" />
      Offline
    </Badge>
  )
}
