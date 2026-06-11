import { useState, useCallback } from 'react'
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUploadDocuments, useCheckDuplicate } from '@/hooks/useDocuments'
import { Button } from '@/components/ui/button'

interface FileUploadZoneProps {
  folderId: string | null
}

interface UploadResult {
  file: string
  status: 'success' | 'error' | 'pending'
  progress?: number
}

export function FileUploadZone({ folderId }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const upload = useUploadDocuments()
  const checkDuplicate = useCheckDuplicate()

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return

      // Initialize progress for all files
      const initialResults = files.map(f => ({ file: f.name, status: 'pending' as const, progress: 0 }))
      setUploadResults(initialResults)
      setShowResults(true)

      // Check all files for duplicates first
      const duplicateChecks = await Promise.all(
        files.map(async (file) => {
          try {
            const duplicateCheck = await checkDuplicate.mutateAsync({
              folderId,
              filename: file.name,
            })
            return { file, exists: duplicateCheck.exists }
          } catch {
            return { file, exists: false }
          }
        })
      )

      // Separate files with and without duplicates
      const filesWithDuplicates = duplicateChecks.filter(c => c.exists).map(c => c.file)
      const filesWithoutDuplicates = duplicateChecks.filter(c => !c.exists).map(c => c.file)

      // Upload all files at once using batch endpoint
      try {
        await upload.mutateAsync({
          folderId,
          files: [...filesWithoutDuplicates, ...filesWithDuplicates], // All files
          conflict: 'replace', // Auto-replace duplicates
          onProgress: (filename, progress) => {
            setUploadResults(prev => prev.map(r => 
              r.file === filename ? { ...r, progress } : r
            ))
          },
        })

        // Mark all as successful
        setUploadResults(prev => prev.map(r => 
          ({ ...r, status: 'success' as const, progress: 100 })
        ))
      } catch {
        // Mark all as failed
        setUploadResults(prev => prev.map(r => 
          ({ ...r, status: 'error' as const })
        ))
      }
    },
    [folderId, upload, checkDuplicate]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFiles(Array.from(e.dataTransfer.files))
    },
    [handleFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return
      handleFiles(Array.from(e.target.files))
      e.target.value = ''
    },
    [handleFiles]
  )

  const activeUploads = uploadResults.filter(r => r.status === 'pending')
  const completedUploads = uploadResults.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/50',
          !folderId && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          type="file"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
          disabled={upload.isPending}
        />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          Drop files here or click to upload
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports any file type up to 100MB (multiple files supported)
        </p>
      </div>

      {/* Upload Results Panel */}
      {showResults && uploadResults.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Upload Results</h4>
            <Button variant="ghost" size="sm" onClick={() => setShowResults(false)}>
              Hide
            </Button>
          </div>
          
          {/* In Progress */}
          {activeUploads.length > 0 && (
            <div className="space-y-2">
              {uploadResults.filter(r => r.status === 'pending').map((result) => (
                <div key={result.file} className="flex items-center gap-3 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
                  <span className="flex-1 truncate">{result.file}</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${result.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {result.progress || 0}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Completed */}
          {completedUploads.length > 0 && (
            <div className="space-y-1">
              {uploadResults.filter(r => r.status !== 'pending').map((result) => (
                <div key={result.file} className="flex items-center gap-3 text-sm py-1">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <span className="flex-1 truncate">{result.file}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.status === 'success' ? 'Uploaded' : 'Failed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
