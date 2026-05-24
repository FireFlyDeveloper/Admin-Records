import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/api/documents'
import { useUIStore } from '@/stores/uiStore'

export function useDocuments(folderId: string | null) {
  return useQuery({
    queryKey: ['documents', folderId],
    queryFn: () =>
      folderId
        ? documentsApi.getFolderDocuments(folderId).then((res) => res.data)
        : documentsApi.getAllDocuments().then((res) => res.data),
    enabled: true,
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useUploadDocuments() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: async ({
      folderId,
      files,
      conflict,
      onProgress,
    }: {
      folderId: string | null
      files: File[]
      conflict?: 'replace' | 'duplicate'
      onProgress?: (filename: string, progress: number) => void
    }) => {
      const results = []
      for (const file of files) {
        try {
          const result = await documentsApi.uploadDocument(folderId, file, conflict, (progress) => {
            onProgress?.(file.name, progress)
          })
          results.push({ success: true, file: file.name, data: result.data })
        } catch (error) {
          results.push({ success: false, file: file.name, error })
        }
      }
      return results
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['documents', variables.folderId],
      })
      addToast({ message: `${variables.files.length} file(s) uploaded successfully`, type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to upload files', type: 'error' })
    },
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({
      folderId,
      file,
      conflict,
      onProgress,
    }: {
      folderId: string | null
      file: File
      conflict?: 'replace' | 'duplicate'
      onProgress?: (progress: number) => void
    }) => documentsApi.uploadDocument(folderId, file, conflict, onProgress).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['documents', variables.folderId],
      })
      addToast({ message: 'File uploaded successfully', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to upload file', type: 'error' })
    },
  })
}

export function useDownloadDocument() {
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      const response = await documentsApi.downloadDocument(id)
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      addToast({ message: 'Download started', type: 'info' })
    },
    onError: () => {
      addToast({ message: 'Failed to download file', type: 'error' })
    },
  })
}

export function useDocumentVersions(documentId: string | null) {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () =>
      documentsApi.getDocumentVersions(documentId!).then((res) => res.data),
    enabled: !!documentId,
  })
}

export function useDocumentActivity(documentId: string | null) {
  return useQuery({
    queryKey: ['document-activity', documentId],
    queryFn: () =>
      documentsApi.getDocumentActivity(documentId!).then((res) => res.data),
    enabled: !!documentId,
  })
}

export function useSearchDocuments(q: string) {
  return useQuery({
    queryKey: ['documents-search', q],
    queryFn: () => documentsApi.searchDocuments(q).then((res) => res.data),
    enabled: q.trim().length > 0,
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      addToast({ message: 'Document deleted', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to delete document', type: 'error' })
    },
  })
}

export function useRenameDocument() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      documentsApi.renameDocument(id, name).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      addToast({ message: 'Document renamed', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to rename document', type: 'error' })
    },
  })
}

export function useCheckDuplicate() {
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string | null; name: string }) =>
      documentsApi.checkDuplicate(folderId, name),
  })
}
