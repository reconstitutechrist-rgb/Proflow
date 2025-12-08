import React, { useState, useMemo } from 'react'; // Removed useEffect, useCallback as they are no longer used
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';

// New imports
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';
import { db } from '@/api/db';

import CreateFolderDialog from '@/components/dialogs/CreateFolderDialog';

export default function FolderStructure({
  documents,
  onFolderSelect, // New prop
  onDocumentMove, // New prop
  onRefresh, // New prop
}) {
  // Initial state for expanded folders - starts with root expanded
  const [expandedFolders, setExpandedFolders] = useState(new Set(['/']));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPath, setSelectedPath] = useState('/');

  // Hook to get current workspace ID
  const { currentWorkspaceId } = useWorkspace();

  // Build folder tree from documents using useMemo for performance
  const folderTree = useMemo(() => {
    const tree = {};
    const folderCounts = {}; // Stores count of direct items (documents + placeholder) for each folder

    // CRITICAL: Only process documents from current workspace for security
    const workspaceDocuments = documents.filter((doc) => {
      if (doc.workspace_id !== currentWorkspaceId) {
        console.warn('Document in different workspace, filtering from folder structure', {
          documentId: doc.id,
          documentWorkspace: doc.workspace_id,
          currentWorkspace: currentWorkspaceId,
        });
        return false;
      }
      return true;
    });

    workspaceDocuments.forEach((doc) => {
      const path = doc.folder_path || '/';

      // Initialize folder entry if it doesn't exist
      if (!tree[path]) {
        tree[path] = { folders: [], documents: [], folderDoc: null };
      }

      // Assign folder_placeholder document to folderDoc
      if (doc.document_type === 'folder_placeholder') {
        tree[path].folderDoc = doc;
      } else {
        tree[path].documents.push(doc);
      }

      // Count all direct children (documents and folder placeholders) for the badge
      folderCounts[path] = (folderCounts[path] || 0) + 1;

      // Build parent-child relationships
      const parts = path.split('/').filter(Boolean);
      let currentSegmentPath = '';
      parts.forEach((part) => {
        const parentPath = currentSegmentPath || '/';
        currentSegmentPath += (currentSegmentPath === '/' ? '' : '/') + part;

        // Ensure parent folder entry exists
        if (!tree[parentPath]) {
          tree[parentPath] = { folders: [], documents: [], folderDoc: null };
        }

        // Add current segment path as a child of its parent, if not already present
        if (!tree[parentPath].folders.includes(currentSegmentPath)) {
          tree[parentPath].folders.push(currentSegmentPath);
        }
      });
    });

    // Ensure root folder always exists, even if empty
    if (!tree['/']) {
      tree['/'] = { folders: [], documents: [], folderDoc: null };
    }

    // Sort subfolders alphabetically for consistent display
    Object.keys(tree).forEach((folderPath) => {
      tree[folderPath].folders.sort((a, b) => {
        const nameA = a.split('/').pop();
        const nameB = b.split('/').pop();
        return nameA.localeCompare(nameB);
      });
    });

    return { tree, folderCounts };
  }, [documents, currentWorkspaceId]);

  // Toggles expansion state of a folder
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

  // Handles clicking on a folder to select it
  const handleFolderClick = (path) => {
    if (onFolderSelect) {
      onFolderSelect(path);
    }
  };

  // Opens the Create Folder dialog for a specific parent path
  const handleCreateFolder = (parentPath) => {
    setSelectedPath(parentPath);
    setShowCreateDialog(true);
  };

  // Callback after a folder has been created, refreshes the parent component
  const handleFolderCreated = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  // Handles deleting a folder, including security checks
  const handleDeleteFolder = async (folderPath, folderDoc) => {
    const folderData = folderTree.tree[folderPath];
    const documentsInFolder = folderData?.documents || [];
    const subfolders = folderData?.folders || [];

    // Prevent deletion if folder contains items
    if (documentsInFolder.length > 0 || subfolders.length > 0) {
      toast.error('Cannot delete folder with contents. Please move or delete all items first.');
      return;
    }

    // User confirmation
    if (!confirm(`Are you sure you want to delete the folder "${folderPath}"?`)) {
      return;
    }

    try {
      // CRITICAL: Validate folder is in current workspace before deletion
      if (folderDoc && folderDoc.workspace_id !== currentWorkspaceId) {
        toast.error('Cannot delete folders from other workspaces');
        console.error('Security violation: Attempted to delete folder from different workspace', {
          folderWorkspace: folderDoc.workspace_id,
          currentWorkspace: currentWorkspaceId,
        });
        return;
      }

      // Only delete if a placeholder document exists for the folder
      if (folderDoc) {
        await db.entities.Document.delete(folderDoc.id);
        toast.success('Folder deleted successfully');
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error('No folder placeholder found to delete. Implicit folders cannot be deleted.');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(`Failed to delete folder: ${error.message || 'An unknown error occurred.'}`);
    }
  };

  // Recursive function to render folders
  const renderFolder = (path, level = 0) => {
    const isExpanded = expandedFolders.has(path);
    const folderData = folderTree.tree[path] || { folders: [], documents: [], folderDoc: null };
    const folderName = path === '/' ? 'Root' : path.split('/').pop(); // Display "Root" for the base path

    return (
      <div key={path}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group ${
            level > 0 ? `ml-${level * 4}` : '' // Dynamic left margin for indentation
          }`}
          onClick={() => handleFolderClick(path)}
        >
          {folderData.folders.length > 0 ? ( // Show chevron only if there are subfolders
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent folder selection when clicking chevron
                toggleFolder(path);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title={isExpanded ? 'Collapse Folder' : 'Expand Folder'}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          ) : (
            <div className="w-6 h-6 flex-shrink-0" /> // Placeholder for consistent spacing if no chevron
          )}

          {isExpanded ? (
            <FolderOpen className="w-5 h-5 text-blue-500" />
          ) : (
            <Folder className="w-5 h-5 text-gray-400" />
          )}

          <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
            {folderName}
          </span>

          {/* Badge showing count of direct children (documents + placeholder) */}
          {folderTree.folderCounts[path] > 0 && (
            <Badge variant="secondary" className="text-xs">
              {folderTree.folderCounts[path]}
            </Badge>
          )}

          {/* Action buttons (only visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation(); // Prevent folder selection
                handleCreateFolder(path);
              }}
              title="Create New Subfolder"
            >
              <Plus className="w-4 h-4" />
            </Button>

            {path !== '/' && ( // Root folder cannot be deleted
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent folder selection
                  handleDeleteFolder(path, folderData.folderDoc);
                }}
                title="Delete Folder"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {isExpanded && folderData.folders.length > 0 && (
          <div className="pl-4">
            {' '}
            {/* Indent subfolders */}
            {folderData.folders.map((subPath) => renderFolder(subPath, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4 px-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Folders</h3>
        <Button variant="outline" size="sm" onClick={() => handleCreateFolder('/')}>
          <Plus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>

      <div className="space-y-1">
        {/* Render the folder structure starting from the root */}
        {renderFolder('/')}
      </div>

      {/* Security Notice */}
      <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mx-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          🔒 Folders are workspace-specific and only show documents from the current workspace
        </p>
      </div>

      {/* Dialog for creating new folders */}
      <CreateFolderDialog
        parentPath={selectedPath}
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onFolderCreated={handleFolderCreated}
      />
    </div>
  );
}
