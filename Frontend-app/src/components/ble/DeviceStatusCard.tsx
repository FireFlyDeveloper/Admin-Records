import { Cpu, Wifi, WifiOff, Clock } from 'lucide-react'
import { BleDevice } from '@/types/ble'
import { Card, CardContent } from '@/components/ui/card'

interface DeviceStatusCardProps {
  device: BleDevice
}

export function DeviceStatusCard({ device }: DeviceStatusCardProps) {
  const isOnline = device.status === 'online'

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="h-5 w-5 text-muted-foreground shrink-0" />
            <h3 className="font-medium text-sm truncate">{device.name}</h3>
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${isOnline ? 'text-green-600' : 'text-red-500'}`}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Device ID</span>
            <span className="font-mono">{device.device_id}</span>
          </div>
          {device.room_name && (
            <div className="flex justify-between">
              <span>Room</span>
              <span>{device.room_name}</span>
            </div>
          )}
          {device.rssi_range != null && (
            <div className="flex justify-between">
              <span>RSSI Range</span>
              <span>{device.rssi_range} dBm</span>
            </div>
          )}
          {device.last_seen && (
            <div className="flex items-center gap-1 justify-end mt-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(device.last_seen).toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
