import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { DocumentEditor } from '@onlyoffice/document-editor-react'
import { documentsApi, OnlyOfficeConfig } from '@/api/documents'

interface OnlyOfficeEditorProps {
  docId: string
  docName: string
  onClose: () => void
}

export function OnlyOfficeEditor({ docId, onClose }: OnlyOfficeEditorProps) {
  const [config, setConfig] = useState<OnlyOfficeConfig['config'] | null>(null)
  const [documentServerUrl, setDocumentServerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    documentsApi.getOnlyOfficeConfig(docId)
      .then((data) => {
        setConfig(data.config)
        setDocumentServerUrl(data.documentServerUrl)
      })
      .catch((err) => setError(err?.message || 'Failed to initialize editor'))
  }, [docId])

  function handleLoadComponentError(errorCode: number, errorDescription: string) {
    switch (errorCode) {
      case -1:
        setError(`Unknown error loading ONLYOFFICE: ${errorDescription}`)
        break
      case -2:
        setError(`Failed to load DocsAPI from server: ${errorDescription}`)
        break
      case -3:
        setError(`DocsAPI is not defined: ${errorDescription}`)
        break
      default:
        setError(errorDescription)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Close button — tiny, in corner */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-20 rounded-full p-1.5 bg-black/10 text-gray-500 hover:text-gray-800 hover:bg-black/20 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Editor area */}
      <div className="absolute inset-0">
        {config && documentServerUrl ? (
          <DocumentEditor
            id="onlyoffice-editor"
            documentServerUrl={documentServerUrl}
            config={config as any}
            onLoadComponentError={handleLoadComponentError}
            height="100%"
            width="100%"
          />
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg font-medium mb-2">Editor Error</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-md px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Loading editor...</p>
          </div>
        )}
      </div>
    </div>
  )
}
