import { useEffect, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: ReactNode
}

/**
 * Renders children into a dedicated container at the document body level,
 * bypassing any ancestor CSS that might break `fixed` positioning.
 */
export function Portal({ children }: PortalProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = document.createElement('div')
    el.style.position = 'relative'
    el.style.zIndex = '9999'
    document.body.appendChild(el)
    setContainer(el)

    // Prevent body scroll while portal is open
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.removeChild(el)
    }
  }, [])

  if (!container) return null

  return createPortal(children, container)
}
