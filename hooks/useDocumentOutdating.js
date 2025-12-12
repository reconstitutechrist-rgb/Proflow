import { useState, useCallback } from 'react';
import { db } from '@/api/db';
import { ragHelper } from '@/api/functions';
import { toast } from 'sonner';

// Constants for outdating feature
export const OUTDATED_FOLDER = '/Outdated';

/**
 * Hook for managing document outdating functionality
 * Provides AI-powered related document discovery and outdating/restore operations
 */
export function useDocumentOutdating(workspaceId) {
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [searchError, setSearchError] = useState(null);

  /**
   * Find related documents based on new document content and metadata
   */
  const findRelatedDocuments = useCallback(
    async ({ content, title, fileName, projectId, assignmentIds = [] }) => {
      if (!workspaceId) {
        console.warn('No workspace ID provided for document search');
        return [];
      }

      setIsSearching(true);
      setSearchError(null);
      setSuggestions([]);

      try {
        // Load existing documents from the workspace
        const existingDocs = await db.entities.Document.filter(
          { workspace_id: workspaceId },
          '-created_date'
        );

        // Filter to only active, non-folder documents
        const searchableDocs = existingDocs.filter(
          (doc) =>
            !doc.is_outdated &&
            doc.document_type !== 'folder_placeholder' &&
            (doc.file_url || doc.content)
        );

        if (searchableDocs.length === 0) {
          setSuggestions([]);
          return [];
        }

        // Call RAG helper to find related documents
        const result = await ragHelper({
          endpoint: 'findRelatedDocuments',
          newDocumentContent: content || '',
          newDocumentTitle: title || fileName || '',
          projectId,
          assignmentIds,
          existingDocuments: searchableDocs,
        });

        const foundSuggestions = result?.data?.suggestions || [];
        setSuggestions(foundSuggestions);

        if (foundSuggestions.length > 0) {
          toast.info(`Found ${foundSuggestions.length} potentially related document(s)`);
        }

        return foundSuggestions;
      } catch (error) {
        console.error('Error finding related documents:', error);
        setSearchError(error.message || 'Failed to search for related documents');
        toast.error('Failed to search for related documents');
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [workspaceId]
  );

  /**
   * Toggle selection of a document for outdating
   */
  const toggleDocumentSelection = useCallback((documentId) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all suggested documents
   */
  const selectAllSuggestions = useCallback(() => {
    setSelectedDocuments(new Set(suggestions.map((s) => s.documentId)));
  }, [suggestions]);

  /**
   * Clear all selections
   */
  const clearSelections = useCallback(() => {
    setSelectedDocuments(new Set());
  }, []);

  /**
   * Mark selected documents as outdated
   * @param {string[]} documentIds - Array of document IDs to mark as outdated
   * @param {string} replacementDocId - ID of the document replacing these
   * @param {string} reason - Reason for outdating
   * @param {string} currentUserEmail - Email of the current user
   */
  const markAsOutdated = useCallback(
    async (documentIds, replacementDocId, reason, currentUserEmail) => {
      if (!documentIds || documentIds.length === 0) {
        return { success: false, error: 'No documents selected' };
      }

      try {
        const updates = await Promise.all(
          documentIds.map(async (docId) => {
            // Get the current document to preserve its original folder
            const doc = await db.entities.Document.get(docId);
            if (!doc) {
              throw new Error(`Document ${docId} not found`);
            }

            // Update the document
            await db.entities.Document.update(docId, {
              is_outdated: true,
              outdated_date: new Date().toISOString(),
              outdated_by: currentUserEmail,
              replaced_by: replacementDocId,
              replacement_reason: reason || `Replaced by newer document`,
              outdated_from_folder: doc.folder_path || '/',
              folder_path: OUTDATED_FOLDER,
            });

            return doc.title;
          })
        );

        // Clear selections after successful update
        setSelectedDocuments(new Set());
        setSuggestions((prev) => prev.filter((s) => !documentIds.includes(s.documentId)));

        toast.success(
          `Marked ${updates.length} document(s) as outdated: ${updates.slice(0, 3).join(', ')}${updates.length > 3 ? '...' : ''}`
        );

        return { success: true, updatedCount: updates.length };
      } catch (error) {
        console.error('Error marking documents as outdated:', error);
        toast.error('Failed to mark documents as outdated');
        return { success: false, error: error.message };
      }
    },
    []
  );

  /**
   * Restore an outdated document back to active status
   * @param {string} documentId - ID of the document to restore
   */
  const restoreDocument = useCallback(async (documentId) => {
    try {
      const doc = await db.entities.Document.get(documentId);
      if (!doc) {
        throw new Error('Document not found');
      }

      if (!doc.is_outdated) {
        toast.info('Document is not marked as outdated');
        return { success: false, error: 'Document is not outdated' };
      }

      // Restore to original folder or root
      const originalFolder = doc.outdated_from_folder || '/';

      await db.entities.Document.update(documentId, {
        is_outdated: false,
        outdated_date: null,
        outdated_by: null,
        replaced_by: null,
        replacement_reason: null,
        folder_path: originalFolder,
        outdated_from_folder: null,
      });

      toast.success(
        `Restored "${doc.title}" to ${originalFolder === '/' ? 'root folder' : originalFolder}`
      );

      return { success: true, restoredTo: originalFolder };
    } catch (error) {
      console.error('Error restoring document:', error);
      toast.error('Failed to restore document');
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Get the replacement document info for an outdated document
   */
  const getReplacementDocument = useCallback(async (replacedById) => {
    if (!replacedById) return null;

    try {
      const replacement = await db.entities.Document.get(replacedById);
      return replacement;
    } catch (error) {
      console.error('Error fetching replacement document:', error);
      return null;
    }
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setSuggestions([]);
    setSelectedDocuments(new Set());
    setSearchError(null);
    setIsSearching(false);
  }, []);

  return {
    // State
    isSearching,
    suggestions,
    selectedDocuments,
    searchError,

    // Actions
    findRelatedDocuments,
    toggleDocumentSelection,
    selectAllSuggestions,
    clearSelections,
    markAsOutdated,
    restoreDocument,
    getReplacementDocument,
    reset,

    // Computed
    hasSelections: selectedDocuments.size > 0,
    selectedCount: selectedDocuments.size,
  };
}
