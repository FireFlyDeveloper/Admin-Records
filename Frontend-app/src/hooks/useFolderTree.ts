import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, FolderTreeNode } from '@/api/documents';
import { useUIStore } from '@/stores/uiStore';
import { useMemo } from 'react';

interface UseFolderTreeOptions {
  showRoot?: boolean;
  maxDepth?: number;
  initiallyExpanded?: boolean;
}

/**
 * Hook for fetching and managing the folder tree structure
 * @param options Configuration options for the folder tree
 * @param options.showRoot Whether to show a root "All Folders" node
 * @param options.maxDepth Maximum depth to expand folders
 * @param options.initiallyExpanded Whether folders should be initially expanded
 * @returns React Query result containing the folder tree data
 */
export function useFolderTree(options: UseFolderTreeOptions = {}) {
  const addToast = useUIStore((state) => state.addToast);
  
  const select = useMemo(() => (data: FolderTreeNode[]) => {
    // Apply transformations based on options
    return transformTreeData(data, options);
  }, [options]);

  return useQuery({
    queryKey: ['folder-tree'],
    queryFn: () => documentsApi.getFolderTree().then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    select,
    meta: {
      onError: () => {
        addToast({ message: 'Failed to load folder tree', type: 'error' });
      },
    },
  });
}

/**
 * Hook for fetching the path to a specific folder
 * @param id Folder ID to get the path for
 * @returns React Query result containing the folder path
 */
export function useFolderPath(id: string | null) {
  const addToast = useUIStore((state) => state.addToast);
  
  return useQuery({
    queryKey: ['folder-path', id],
    queryFn: () => documentsApi.getFolderPath(id!).then((res) => res.data),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    meta: {
      onError: () => {
        addToast({ message: 'Failed to load folder path', type: 'error' });
      },
    },
  });
}

/**
 * Hook for toggling folder expansion state (optimistic updates)
 * @returns Mutation function for toggling folder expansion
 */
export function useToggleFolderExpansion() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({ id, expanded }: { id: string; expanded: boolean }) => {
      // This is a local-only operation, no API call needed
      return { id, expanded };
    },
    onMutate: async ({ id, expanded }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['folder-tree'] });

      // Snapshot the previous value
      const previousTree = queryClient.getQueryData<FolderTreeNode[]>(['folder-tree']);

      // Optimistically update the tree
      if (previousTree) {
        const updatedTree = updateTreeExpansion(previousTree, id, expanded);
        queryClient.setQueryData(['folder-tree'], updatedTree);
      }

      return { previousTree };
    },
    onError: (error, _variables, context) => {
      console.error('Failed to toggle folder expansion:', error);
      addToast({ message: 'Failed to toggle folder expansion', type: 'error' });
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTree) {
        queryClient.setQueryData(['folder-tree'], context.previousTree);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

/**
 * Transforms tree data with options like max depth and initial expansion
 * @param tree Original folder tree data
 * @param options Transformation options
 * @returns Transformed folder tree
 */
function transformTreeData(
  tree: FolderTreeNode[],
  options: UseFolderTreeOptions
): FolderTreeNode[] {
  const { initiallyExpanded = true, maxDepth } = options;
  
  const applyTransformations = (
    nodes: FolderTreeNode[],
    currentDepth = 0
  ): FolderTreeNode[] => {
    return nodes.map(node => {
      const transformedNode: FolderTreeNode = {
        ...node,
        expanded: node.expanded ?? initiallyExpanded,
        depth: currentDepth,
      };

      // Apply maxDepth constraint
      if (maxDepth !== undefined && currentDepth >= maxDepth) {
        transformedNode.children = [];
        transformedNode.expanded = false;
      } else if (node.children) {
        transformedNode.children = applyTransformations(node.children, currentDepth + 1);
      }

      return transformedNode;
    });
  };

  return applyTransformations(tree);
}

/**
 * Updates the expansion state of a specific node in the tree
 * @param tree Current folder tree
 * @param id ID of the folder to update
 * @param expanded New expansion state
 * @returns Updated folder tree
 */
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
      };
    }

    if (node.children) {
      return {
        ...node,
        children: updateTreeExpansion(node.children, id, expanded),
      };
    }

    return node;
  });
}

/**
 * Finds a node by its ID in the folder tree
 * @param tree Folder tree to search
 * @param id ID of the folder to find
 * @returns Found folder node or null if not found
 */
export function findNodeInTree(
  tree: FolderTreeNode[],
  id: string
): FolderTreeNode | null {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}