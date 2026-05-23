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
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!missingSince) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [missingSince])

  if (!missingSince) return null

  const elapsed = Date.now() - new Date(missingSince).getTime()
  if (elapsed < 0) return null

  return (
    <span className={className}>
      {formatDuration(elapsed)}
    </span>
  )
}
