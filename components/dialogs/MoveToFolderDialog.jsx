import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Loader2,
  FolderInput,
  Home,
} from 'lucide-react';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';
import { db } from '@/api/db';
import { cn } from '@/lib/utils';

export default function MoveToFolderDialog({
  document,
  documents = [],
  isOpen,
  onClose,
  onSuccess,
}) {
  const [selectedPath, setSelectedPath] = useState('/');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['/']));
  const [moving, setMoving] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  // Reset selection when dialog opens with a new document
  useEffect(() => {
    if (isOpen && document) {
      // Default to root, not the current folder (so user sees a change)
      setSelectedPath('/');
      // Expand the path to the document's current folder
      const currentFolder = document.folder_path || '/';
      if (currentFolder !== '/') {
        const parts = currentFolder.split('/').filter(Boolean);
        const pathsToExpand = new Set(['/']);
        let path = '';
        parts.forEach((part) => {
          path = `${path}/${part}`;
          pathsToExpand.add(path);
        });
        setExpandedFolders(pathsToExpand);
      } else {
        setExpandedFolders(new Set(['/']));
      }
    }
  }, [isOpen, document]);

  // Build folder tree from documents
  const folderTree = useMemo(() => {
    const tree = { '/': { name: 'Root', children: [], path: '/' } };

    // Filter to current workspace documents
    const workspaceDocuments = documents.filter((doc) => doc.workspace_id === currentWorkspaceId);

    workspaceDocuments.forEach((doc) => {
      const path = doc.folder_path || '/';
      if (path === '/') return;

      const parts = path.split('/').filter(Boolean);
      let currentPath = '';

      parts.forEach((part) => {
        const parentPath = currentPath || '/';
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;

        if (!tree[currentPath]) {
          tree[currentPath] = {
            name: part,
            children: [],
            path: currentPath,
          };
        }

        // Add to parent's children if not already there
        if (!tree[parentPath]) {
          tree[parentPath] = {
            name: parentPath === '/' ? 'Root' : parentPath.split('/').pop(),
            children: [],
            path: parentPath,
          };
        }

        if (!tree[parentPath].children.includes(currentPath)) {
          tree[parentPath].children.push(currentPath);
        }
      });
    });

    // Sort children alphabetically
    Object.values(tree).forEach((folder) => {
      folder.children.sort((a, b) => {
        const nameA = tree[a]?.name || a.split('/').pop();
        const nameB = tree[b]?.name || b.split('/').pop();
        return nameA.localeCompare(nameB);
      });
    });

    return tree;
  }, [documents, currentWorkspaceId]);

  const toggleFolder = (path) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleMove = async () => {
    if (!document) return;

    // Don't move if already in the same folder
    const currentPath = document.folder_path || '/';
    if (currentPath === selectedPath) {
      toast.info('Document is already in this folder');
      onClose();
      return;
    }

    // Security check
    if (document.workspace_id !== currentWorkspaceId) {
      toast.error('Cannot move documents from other workspaces');
      return;
    }

    setMoving(true);

    try {
      await db.entities.Document.update(document.id, {
        folder_path: selectedPath,
      });

      toast.success(`Moved "${document.title}" to ${selectedPath === '/' ? 'Root' : selectedPath}`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error moving document:', error);
      toast.error('Failed to move document. Please try again.');
    } finally {
      setMoving(false);
    }
  };

  const renderFolder = (path, level = 0) => {
    const folder = folderTree[path];
    if (!folder) return null;

    const isExpanded = expandedFolders.has(path);
    const isSelected = selectedPath === path;
    const hasChildren = folder.children && folder.children.length > 0;
    const isCurrentFolder = (document?.folder_path || '/') === path;

    return (
      <div key={path}>
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors',
            isSelected
              ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800',
            isCurrentFolder && 'opacity-50'
          )}
          style={{ marginLeft: level > 0 ? `${level * 1}rem` : 0 }}
          onClick={() => !isCurrentFolder && setSelectedPath(path)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(path);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          ) : (
            <div className="w-6 h-6 shrink-0" />
          )}

          {path === '/' ? (
            <Home className={cn('w-5 h-5', isSelected ? 'text-blue-600' : 'text-gray-400')} />
          ) : isExpanded ? (
            <FolderOpen className={cn('w-5 h-5', isSelected ? 'text-blue-600' : 'text-blue-500')} />
          ) : (
            <Folder className={cn('w-5 h-5', isSelected ? 'text-blue-600' : 'text-gray-400')} />
          )}

          <span
            className={cn(
              'flex-1 min-w-0 text-sm font-medium truncate',
              isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
            )}
          >
            {folder.name}
          </span>

          {isCurrentFolder && <span className="text-xs text-gray-500 italic">current</span>}
        </div>

        {isExpanded && hasChildren && (
          <div className="pl-4">
            {folder.children.map((childPath) => renderFolder(childPath, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="w-5 h-5" />
            Move Document
          </DialogTitle>
          <DialogDescription>Select a folder to move "{document?.title}" to</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ScrollArea className="h-[300px] border rounded-lg p-2">
            <div className="space-y-1">{renderFolder('/')}</div>
          </ScrollArea>

          {/* Selected destination preview */}
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <span className="font-medium">Move to:</span>{' '}
              <span className="font-mono">
                {selectedPath === '/' ? 'Root folder' : selectedPath}
              </span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={moving}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={moving}>
            {moving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <FolderInput className="w-4 h-4 mr-2" />
                Move Here
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
