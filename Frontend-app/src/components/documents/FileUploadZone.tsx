import { useState, useCallback } from 'react'
import { Upload, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUploadDocument, useCheckDuplicate } from '@/hooks/useDocuments'
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

export function FileUploadZone({ folderId }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [conflictFile, setConflictFile] = useState<{ file: File; existingName: string } | null>(null)
  const upload = useUploadDocument()
  const checkDuplicate = useCheckDuplicate()
  const processFile = useCallback(
    (file: File) => {
      

      checkDuplicate.mutate(
        { folderId, name: file.name },
        {
          onSuccess: (data) => {
            if (data.exists) {
              setConflictFile({ file, existingName: file.name })
            } else {
              doUpload(file)
            }
          },
          onError: () => {
            // If check fails, upload anyway (replace by default)
            doUpload(file)
          },
        }
      )
    },
    [folderId, checkDuplicate]
  )

  const doUpload = useCallback(
    (file: File, conflict?: 'replace' | 'duplicate') => {
      
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))
      upload.mutate(
        {
          folderId,
          file,
          conflict,
          onProgress: (progress) => {
            setUploadProgress((prev) => ({ ...prev, [file.name]: progress }))
          },
        },
        {
          onSettled: () => {
            setUploadProgress((prev) => {
              const next = { ...prev }
              delete next[file.name]
              return next
            })
          },
        }
      )
    },
    [folderId, upload]
  )

  const handleReplace = useCallback(() => {
    if (!conflictFile) return
    doUpload(conflictFile.file, 'replace')
    setConflictFile(null)
  }, [conflictFile, doUpload])

  const handleKeepBoth = useCallback(() => {
    if (!conflictFile) return
    doUpload(conflictFile.file, 'duplicate')
    setConflictFile(null)
  }, [conflictFile, doUpload])

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
      
      Array.from(e.dataTransfer.files).forEach(processFile)
    },
    [folderId, processFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!folderId || !e.target.files) return
      Array.from(e.target.files).forEach(processFile)
      e.target.value = ''
    },
    [folderId, processFile]
  )

  const activeUploads = Object.entries(uploadProgress)

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
          disabled={upload.isPending || checkDuplicate.isPending}
        />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          Drop files here or click to upload
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports any file type up to 100MB
        </p>
      </div>

      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map(([filename, progress]) => (
            <div key={filename} className="flex items-center gap-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span className="flex-1 truncate">{filename}</span>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {progress}%
              </span>
            </div>
          ))}
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
            <Button variant="secondary" onClick={handleKeepBoth}>
              Keep Both
            </Button>
            <Button variant="default" onClick={handleReplace}>
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
