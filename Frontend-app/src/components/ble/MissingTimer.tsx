import { useEffect, useState } from 'react'

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

interface MissingTimerProps {
  missingSince: string | null
  className?: string
}

export function MissingTimer({ missingSince, className }: MissingTimerProps) {
  const [elapsed, setElapsed] = useState<number>(0)

  useEffect(() => {
    if (!missingSince) return

    const updateElapsed = () => {
      const diff = Date.now() - new Date(missingSince).getTime()
      if (diff >= 0) {
        setElapsed(diff)
      }
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [missingSince])

  if (!missingSince || elapsed < 0) return null

  return (
    <span className={className}>
      {formatDuration(elapsed)}
    </span>
  )
}
