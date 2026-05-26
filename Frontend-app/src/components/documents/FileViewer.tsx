import { useEffect, useRef, useState } from 'react'
import mammoth from 'mammoth'
import { Loader2, AlertCircle, X } from 'lucide-react'
import api from '@/api/client'

interface FileViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: { id: string; name: string; mime_type: string } | null
}

function isPdf(mime: string) {
  return mime === 'application/pdf'
}

function isImage(mime: string) {
  return mime.startsWith('image/')
}

function isDocx(mime: string) {
  return (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  )
}

export function FileViewer({ open, onOpenChange, document: doc }: FileViewerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    // Cleanup function for when effect re-runs or unmounts
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!open || !doc) {
      setBlobUrl(null)
      setDocxHtml(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const loadFile = async () => {
      setLoading(true)
      setError(null)
      setBlobUrl(null)
      setDocxHtml(null)

      try {
        const response = await api.get(`/documents/${doc.id}/download`, {
          responseType: 'blob',
        })
        const blob = response.data as Blob

        if (cancelled) return

        if (isPdf(doc.mime_type) || isImage(doc.mime_type)) {
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setBlobUrl(url)
        } else if (isDocx(doc.mime_type)) {
          const arrayBuffer = await blob.arrayBuffer()
          if (cancelled) return
          const result = await mammoth.convertToHtml({ arrayBuffer })
          if (cancelled) return
          setDocxHtml(result.value)
        } else {
          setError('Preview not available for this file type. Please download the file to view it.')
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load file. Please try again.')
          console.error('File load error:', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [open, doc])

  if (!open || !doc) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Close button — tiny, in corner */}
      <button
        onClick={() => onOpenChange(false)}
        className="absolute top-2 right-2 z-20 rounded-full p-1.5 bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading preview...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 text-white/60 max-w-md px-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && blobUrl && isPdf(doc.mime_type) && (
          <iframe
            src={blobUrl}
            title={doc.name}
            className="absolute inset-0 w-full h-full border-0 bg-white"
          />
        )}

        {!loading && !error && blobUrl && isImage(doc.mime_type) && (
          <img
            src={blobUrl}
            alt={doc.name}
            className="max-w-full max-h-full object-contain p-4"
          />
        )}

        {!loading && !error && docxHtml && (
          <div className="absolute inset-0 overflow-auto bg-white">
            <div
              className="max-w-3xl mx-auto p-6 prose prose-sm"
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          </div>
        )}

        {!loading && !error && !blobUrl && !docxHtml && (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <p className="text-sm">No preview available</p>
          </div>
        )}
      </div>
    </div>
  )
}
