import { useState, useCallback } from 'react'
import { Upload, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUploadDocuments, useCheckDuplicate } from '@/hooks/useDocuments'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  const [conflictFile, setConflictFile] = useState<{ file: File; existingName: string } | null>(null)
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

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Update status to in progress
        setUploadResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'pending' as const, progress: 0 } : r
        ))

        try {
          // Check for duplicates first
          const duplicateCheck = await checkDuplicate.mutateAsync({
            folderId,
            name: file.name,
          }).catch(() => ({ exists: false }))

          if (duplicateCheck.exists) {
            // For now, auto-replace duplicates in batch mode
            await upload.mutateAsync({
              folderId,
              files: [file],
              conflict: 'replace',
              onProgress: (_filename, progress) => {
                setUploadResults(prev => prev.map((r, idx) => 
                  idx === i ? { ...r, progress } : r
                ))
              },
            })
          } else {
            await upload.mutateAsync({
              folderId,
              files: [file],
              conflict: undefined,
              onProgress: (_filename, progress) => {
                setUploadResults(prev => prev.map((r, idx) => 
                  idx === i ? { ...r, progress } : r
                ))
              },
            })
          }
          
          setUploadResults(prev => prev.map((r, idx) => 
            idx === i ? { ...r, status: 'success' as const, progress: 100 } : r
          ))
        } catch {
          setUploadResults(prev => prev.map((r, idx) => 
            idx === i ? { ...r, status: 'error' as const } : r
          ))
        }
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

      {/* Conflict Dialog */}
      <Dialog open={!!conflictFile} onOpenChange={(open) => !open && setConflictFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              File Already Exists
            </DialogTitle>
            <DialogDescription>
              A file named <strong>{conflictFile?.existingName}</strong> already exists in this folder.
              What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
            <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <p className="font-medium">{conflictFile?.existingName}</p>
              <p className="text-xs text-muted-foreground">
                Replace will overwrite the existing file. Keep Both will upload as a new copy.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConflictFile(null)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => {
              // Handle keep both
              setConflictFile(null)
            }}>
              Keep Both
            </Button>
            <Button variant="default" onClick={() => {
              // Handle replace
              setConflictFile(null)
            }}>
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
