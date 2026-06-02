import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi, FolderTreeNode } from '@/api/documents'

interface UseFolderTreeOptions {
  showRoot?: boolean
  maxDepth?: number
  initiallyExpanded?: boolean
}

export function useFolderTree(options: UseFolderTreeOptions = {}) {
  return useQuery({
    queryKey: ['folder-tree'],
    queryFn: () => documentsApi.getFolderTree().then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    select: (data) => {
      // Apply transformations based on options
      return transformTreeData(data, options)
    },
  })
}

export function useFolderPath(id: string | null) {
  return useQuery({
    queryKey: ['folder-path', id],
    queryFn: () => documentsApi.getFolderPath(id!).then((res) => res.data),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useToggleFolderExpansion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, expanded }: { id: string; expanded: boolean }) => {
      // This is a local-only operation, no API call needed
      return { id, expanded }
    },
    onMutate: async ({ id, expanded }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['folder-tree'] })

      // Snapshot the previous value
      const previousTree = queryClient.getQueryData<FolderTreeNode[]>(['folder-tree'])

      // Optimistically update the tree
      if (previousTree) {
        const updatedTree = updateTreeExpansion(previousTree, id, expanded)
        queryClient.setQueryData(['folder-tree'], updatedTree)
      }

      return { previousTree }
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTree) {
        queryClient.setQueryData(['folder-tree'], context.previousTree)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] })
    },
  })
}

// Helper function to transform tree data with options
function transformTreeData(
  tree: FolderTreeNode[],
  options: UseFolderTreeOptions
): FolderTreeNode[] {
  const { initiallyExpanded = true, maxDepth } = options
  
  const applyTransformations = (
    nodes: FolderTreeNode[],
    currentDepth = 0
  ): FolderTreeNode[] => {
    return nodes.map(node => {
      const transformedNode: FolderTreeNode = {
        ...node,
        expanded: node.expanded ?? initiallyExpanded,
        depth: currentDepth,
      }

      // Apply maxDepth constraint
      if (maxDepth !== undefined && currentDepth >= maxDepth) {
        transformedNode.children = []
        transformedNode.expanded = false
      } else if (node.children) {
        transformedNode.children = applyTransformations(node.children, currentDepth + 1)
      }

      return transformedNode
    })
  }

  return applyTransformations(tree)
}

// Helper function to update expansion state in tree
function updateTreeExpansion(
  tree: FolderTreeNode[],
  id: string,
  expanded: boolean
): FolderTreeNode[] {
  return tree.map(node => {
    if (node.id === id) {
      return {
        ...node,
        expanded,
      }
    }

    if (node.children) {
      return {
        ...node,
        children: updateTreeExpansion(node.children, id, expanded),
      }
    }

    return node
  })
}

// Helper to find a node by id in the tree
export function findNodeInTree(
  tree: FolderTreeNode[],
  id: string
): FolderTreeNode | null {
  for (const node of tree) {
    if (node.id === id) {
      return node
    }
    if (node.children) {
      const found = findNodeInTree(node.children, id)
      if (found) return found
    }
  }
  return null
}