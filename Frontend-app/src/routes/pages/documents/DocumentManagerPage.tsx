import { useState } from 'react'
import { FolderPlus, Search, Home, ChevronRight, FileText, Calendar, Clock, HardDrive, Hash, FolderOpen } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { FolderTree } from '@/components/documents/FolderTree'
import { FileList } from '@/components/documents/FileList'
import { FileViewer } from '@/components/documents/FileViewer'
import { OnlyOfficeEditor } from '@/components/documents/OnlyOfficeEditor'
import { Portal } from '@/components/ui/portal'
import { FileUploadZone } from '@/components/documents/FileUploadZone'
import { PermissionEditor } from '@/components/documents/PermissionEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useFolders, useCreateFolder } from '@/hooks/useFolders'
import { useDocuments, useSearchDocuments, useDeleteDocument, useRenameDocument } from '@/hooks/useDocuments'
import { DocumentFile } from '@/types/document'
import { formatFileSize, formatDate } from '@/lib/utils'

export function DocumentManagerPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showPermissions, setShowPermissions] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingDocument, setEditingDocument] = useState<DocumentFile | null>(null)
  const [previewDocument, setPreviewDocument] = useState<DocumentFile | null>(null)

  const { data: folders, isLoading: foldersLoading } = useFolders()
  const { data: documents, isLoading: documentsLoading } = useDocuments(selectedFolderId)
  const { data: searchResults, isLoading: searchLoading } = useSearchDocuments(searchQuery)
  const createFolder = useCreateFolder()
  const deleteDocument = useDeleteDocument()
  const renameDocument = useRenameDocument()

  const isSearching = searchQuery.trim().length > 0
  const displayDocuments = isSearching ? (searchResults || []) : (documents || [])
  const displayLoading = isSearching ? searchLoading : documentsLoading

  const selectedFolder = folders?.find((f) => f.id === selectedFolderId)
  const selectedDocument = displayDocuments?.find((d) => d.id === selectedDocumentId)

  function mimeLabel(mime: string): string {
    const map: Record<string, string> = {
      'application/pdf': 'PDF Document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
      'application/msword': 'Word (Legacy)',
      'application/vnd.ms-excel': 'Excel (Legacy)',
      'application/vnd.ms-powerpoint': 'PowerPoint (Legacy)',
      'image/png': 'PNG Image',
      'image/jpeg': 'JPEG Image',
      'image/gif': 'GIF Image',
      'image/webp': 'WebP Image',
      'image/svg+xml': 'SVG Image',
      'text/plain': 'Text File',
      'text/csv': 'CSV File',
      'application/zip': 'ZIP Archive',
      'application/json': 'JSON File',
    }
    return map[mime] || mime
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    createFolder.mutate(
      {
        name: newFolderName.trim(),
        parentId: selectedFolderId || undefined,
      },
      {
        onSuccess: () => {
          setNewFolderName('')
          setShowNewFolder(false)
        },
      }
    )
  }

  const handleRename = () => {
    if (!selectedDocumentId || !renameValue.trim()) return
    renameDocument.mutate(
      { id: selectedDocumentId, name: renameValue.trim() },
      {
        onSuccess: () => {
          setShowRename(false)
          setRenameValue('')
        },
      }
    )
  }

  const handleDelete = () => {
    if (!selectedDocumentId) return
    deleteDocument.mutate(selectedDocumentId, {
      onSuccess: () => {
        setShowDeleteConfirm(false)
        setSelectedDocumentId(null)
      },
    })
  }

  return (
    <PageShell
      title="Documents"
      description="Manage your files and folders"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewFolder(true)}
          className="w-full sm:w-auto justify-center"
        >
          <FolderPlus className="h-4 w-4 mr-2 shrink-0" />
          <span>New Folder</span>
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Folder Tree */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card p-3 lg:p-4">
            <h3 className="text-sm font-semibold mb-3">Folders</h3>
            {foldersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-7 lg:h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <FolderTree
                folders={folders || []}
                selectedFolderId={selectedFolderId}
                onSelectFolder={(id) => {
                  setSelectedFolderId(id)
                  setSelectedDocumentId(null)
                  setSearchQuery('')
                }}
              />
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <button
              onClick={() => {
                setSelectedFolderId(null)
                setSelectedDocumentId(null)
                setSearchQuery('')
              }}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </button>
            {!isSearching && selectedFolder && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{selectedFolder.name}</span>
              </>
            )}
            {isSearching && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">Search Results</span>
              </>
            )}
          </nav>

          {!selectedFolderId && !isSearching ? (
            /* Home Directory View */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">All Folders</h2>
              </div>
              
              {foldersLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ) : (folders?.filter(f => !f.parent_id) || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-card/50 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-1">No folders found</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create a folder to start organizing your documents.</p>
                  <Button onClick={() => setShowNewFolder(true)}>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Create Folder
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(folders?.filter(f => !f.parent_id) || []).map((folder) => {
                    return (
                      <div
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="group p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all cursor-pointer flex flex-col gap-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                            <FolderOpen className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                              {folder.name}
                            </h3>
                          </div>
                        </div>
                        <div className="mt-auto pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(folder.updated_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Folder Contents or Search Results */
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isSearching ? "Search all documents..." : "Search documents in this folder..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {!isSearching && <FileUploadZone folderId={selectedFolderId} />}

              <div className="rounded-lg border bg-card p-3 lg:p-4">
                <h3 className="text-sm font-semibold mb-3">
                  {isSearching ? 'Search Results' : 'Documents'}
                </h3>
                <FileList
                  documents={displayDocuments}
                  isLoading={displayLoading}
                  selectedDocumentId={selectedDocumentId}
                  onSelectDocument={setSelectedDocumentId}
                  onEdit={(doc) => setEditingDocument(doc)}
                  onPreview={(doc) => setPreviewDocument(doc)}
                  onRename={(doc) => {
                    setRenameValue(doc.name)
                    setShowRename(true)
                  }}
                  onDelete={() => setShowDeleteConfirm(true)}
                  onManagePermissions={() => setShowPermissions(true)}
                />
              </div>

              {selectedDocumentId && selectedDocument && (
                <div className="rounded-lg border bg-card p-3 lg:p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{selectedDocument.name}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>{mimeLabel(selectedDocument.mime_type)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <HardDrive className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatFileSize(selectedDocument.size_bytes)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-3.5 w-3.5 shrink-0" />
                      <span>Version {selectedDocument.version}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedFolder?.name || 'Root'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Created {formatDate(selectedDocument.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>Updated {formatDate(selectedDocument.updated_at)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Folder Name</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Permissions</DialogTitle>
          </DialogHeader>
          {selectedDocumentId && (
            <PermissionEditor
              type="document"
              id={selectedDocumentId}
              onClose={() => setShowPermissions(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">New Name</label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRename(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!renameValue.trim() || renameDocument.isPending}
            >
              {renameDocument.isPending ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{selectedDocument?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editingDocument && (
        <Portal>
          <OnlyOfficeEditor
            docId={editingDocument.id}
            docName={editingDocument.name}
            onClose={() => setEditingDocument(null)}
          />
        </Portal>
      )}
      {previewDocument && (
        <Portal>
          <FileViewer
            open={!!previewDocument}
            onOpenChange={(open) => { if (!open) setPreviewDocument(null) }}
            document={previewDocument}
          />
        </Portal>
      )}
    </PageShell>
  )
}