import { ChevronRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Folder } from '@/types/document'

interface FolderBreadcrumbsProps {
  path: Folder[] // From useFolderPath hook
  currentFolderId: string | null
  onNavigate: (folderId: string | null) => void
}

/**
 * Breadcrumb navigation component showing current folder path
 * 
 * Features:
 * - Shows clickable breadcrumb path from root to current folder
 * - Includes "Home" as root level
 * - Visually highlights current folder
 * - Truncates long folder names
 * - Proper ARIA labels for accessibility
 * - Uses chevron separators between breadcrumbs
 * - Responsive design
 */
export function FolderBreadcrumbs({ 
  path, 
  currentFolderId, 
  onNavigate 
}: FolderBreadcrumbsProps) {
  // Handle root navigation (Home)
  const handleHomeClick = () => {
    onNavigate(null)
  }

  // Handle folder navigation
  const handleFolderClick = (folderId: string) => {
    onNavigate(folderId)
  }

  // Truncate folder name if too long
  const truncateName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name
    return name.slice(0, maxLength - 3) + '...'
  }

  return (
    <nav 
      aria-label="Breadcrumb navigation" 
      className="flex items-center gap-1 text-sm"
    >
      {/* Home/All Folders button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleHomeClick}
        className={cn(
          "h-7 px-2 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors",
          !currentFolderId && "text-foreground font-medium"
        )}
        aria-label="Navigate to all folders"
        aria-current={!currentFolderId ? 'page' : undefined}
      >
        <Home className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Home</span>
      </Button>

      {/* Breadcrumb items */}
      {path.map((folder) => {
        const isCurrent = folder.id === currentFolderId
        
        return (
          <div key={folder.id} className="flex items-center gap-1">
            <ChevronRight 
              className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" 
              aria-hidden="true" 
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFolderClick(folder.id)}
              className={cn(
                "h-7 px-2 max-w-[150px] sm:max-w-[200px]",
                "text-muted-foreground hover:text-foreground transition-colors",
                "flex items-center",
                isCurrent && "text-foreground font-medium"
              )}
              aria-label={`Navigate to ${folder.name} folder`}
              aria-current={isCurrent ? 'page' : undefined}
              title={folder.name} // Full name as tooltip
            >
              <span className="truncate">
                {truncateName(folder.name)}
              </span>
            </Button>
          </div>
        )
      })}

      {/* Show current folder name for non-breadcrumb context (e.g., no path yet) */}
      {path.length === 0 && currentFolderId && (
        <div className="flex items-center gap-1">
          <ChevronRight 
            className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" 
            aria-hidden="true" 
          />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            Loading...
          </span>
        </div>
      )}
    </nav>
  )
}