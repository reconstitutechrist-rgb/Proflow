import { useState, useCallback } from 'react';
import { db } from '@/api/db';
import { Document } from '@/api/entities';
import { toast } from 'sonner';
import { ACTIVITY_ACTIONS } from './useDocumentActivity';

/**
 * Hook for document actions: star, delete, restore
 * @param {Object} options - Hook options
 * @param {string} options.workspaceId - Current workspace ID
 * @param {Object} options.currentUser - Current user object
 * @param {Function} options.onRefresh - Callback to refresh document list
 * @param {Function} options.logActivity - Activity logging function from useDocumentActivity
 * @returns {Object} Document action functions and loading states
 */
export function useDocumentActions({ workspaceId, currentUser, onRefresh, logActivity }) {
  const [isStarring, setIsStarring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  /**
   * Star a document
   * @param {Object} doc - Document to star
   */
  const starDocument = useCallback(
    async (doc) => {
      if (!doc?.id) return;

      setIsStarring(true);
      try {
        await Document.update(doc.id, { is_starred: true });

        if (logActivity) {
          await logActivity(ACTIVITY_ACTIONS.STARRED, doc, { starred: true });
        }

        toast.success('Document starred');
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to star document:', err);
        toast.error('Failed to star document');
      } finally {
        setIsStarring(false);
      }
    },
    [logActivity, onRefresh]
  );

  /**
   * Unstar a document
   * @param {Object} doc - Document to unstar
   */
  const unstarDocument = useCallback(
    async (doc) => {
      if (!doc?.id) return;

      setIsStarring(true);
      try {
        await Document.update(doc.id, { is_starred: false });

        if (logActivity) {
          await logActivity(ACTIVITY_ACTIONS.UNSTARRED, doc, { starred: false });
        }

        toast.success('Document unstarred');
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to unstar document:', err);
        toast.error('Failed to unstar document');
      } finally {
        setIsStarring(false);
      }
    },
    [logActivity, onRefresh]
  );

  /**
   * Toggle star status on a document
   * @param {Object} doc - Document to toggle
   */
  const toggleStar = useCallback(
    async (doc) => {
      if (doc?.is_starred) {
        return unstarDocument(doc);
      } else {
        return starDocument(doc);
      }
    },
    [starDocument, unstarDocument]
  );

  /**
   * Soft delete a document (move to trash)
   * @param {Object} doc - Document to delete
   */
  const softDeleteDocument = useCallback(
    async (doc) => {
      if (!doc?.id || !currentUser) return;

      setIsDeleting(true);
      try {
        await Document.update(doc.id, {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.email,
          deleted_from_folder: doc.folder_path || '/',
        });

        if (logActivity) {
          await logActivity(ACTIVITY_ACTIONS.DELETED, doc, {
            from_folder: doc.folder_path || '/',
          });
        }

        toast.success('Document moved to trash');
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to delete document:', err);
        toast.error('Failed to delete document');
      } finally {
        setIsDeleting(false);
      }
    },
    [currentUser, logActivity, onRefresh]
  );

  /**
   * Restore a document from trash
   * @param {Object} doc - Document to restore
   */
  const restoreDocument = useCallback(
    async (doc) => {
      if (!doc?.id) return;

      setIsRestoring(true);
      try {
        const restoreToFolder = doc.deleted_from_folder || '/';

        await Document.update(doc.id, {
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          deleted_from_folder: null,
          folder_path: restoreToFolder,
        });

        if (logActivity) {
          await logActivity(ACTIVITY_ACTIONS.RESTORED, doc, {
            to_folder: restoreToFolder,
          });
        }

        toast.success('Document restored');
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to restore document:', err);
        toast.error('Failed to restore document');
      } finally {
        setIsRestoring(false);
      }
    },
    [logActivity, onRefresh]
  );

  /**
   * Permanently delete a document
   * @param {Object} doc - Document to permanently delete
   */
  const permanentDeleteDocument = useCallback(
    async (doc) => {
      if (!doc?.id) return;

      setIsDeleting(true);
      try {
        // Log activity before deletion (so we have the document info)
        if (logActivity) {
          await logActivity(ACTIVITY_ACTIONS.PERMANENTLY_DELETED, doc, {
            title: doc.title,
            file_name: doc.file_name,
          });
        }

        await Document.delete(doc.id);
        toast.success('Document permanently deleted');
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to permanently delete document:', err);
        toast.error('Failed to permanently delete document');
      } finally {
        setIsDeleting(false);
      }
    },
    [logActivity, onRefresh]
  );

  /**
   * Bulk soft delete multiple documents
   * @param {Array} docs - Documents to delete
   */
  const bulkSoftDelete = useCallback(
    async (docs) => {
      if (!docs?.length || !currentUser) return;

      setIsDeleting(true);
      try {
        const timestamp = new Date().toISOString();

        await Promise.all(
          docs.map((doc) =>
            Document.update(doc.id, {
              is_deleted: true,
              deleted_at: timestamp,
              deleted_by: currentUser.email,
              deleted_from_folder: doc.folder_path || '/',
            })
          )
        );

        // Log activities
        if (logActivity) {
          await Promise.all(
            docs.map((doc) =>
              logActivity(ACTIVITY_ACTIONS.DELETED, doc, {
                from_folder: doc.folder_path || '/',
                bulk: true,
              })
            )
          );
        }

        toast.success(`${docs.length} documents moved to trash`);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to delete documents:', err);
        toast.error('Failed to delete some documents');
      } finally {
        setIsDeleting(false);
      }
    },
    [currentUser, logActivity, onRefresh]
  );

  /**
   * Bulk restore multiple documents from trash
   * @param {Array} docs - Documents to restore
   */
  const bulkRestore = useCallback(
    async (docs) => {
      if (!docs?.length) return;

      setIsRestoring(true);
      try {
        await Promise.all(
          docs.map((doc) =>
            Document.update(doc.id, {
              is_deleted: false,
              deleted_at: null,
              deleted_by: null,
              deleted_from_folder: null,
              folder_path: doc.deleted_from_folder || '/',
            })
          )
        );

        // Log activities
        if (logActivity) {
          await Promise.all(
            docs.map((doc) =>
              logActivity(ACTIVITY_ACTIONS.RESTORED, doc, {
                to_folder: doc.deleted_from_folder || '/',
                bulk: true,
              })
            )
          );
        }

        toast.success(`${docs.length} documents restored`);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to restore documents:', err);
        toast.error('Failed to restore some documents');
      } finally {
        setIsRestoring(false);
      }
    },
    [logActivity, onRefresh]
  );

  /**
   * Empty trash - permanently delete all trashed documents
   * @param {Array} trashedDocs - All documents currently in trash
   */
  const emptyTrash = useCallback(
    async (trashedDocs) => {
      if (!trashedDocs?.length) return;

      setIsDeleting(true);
      try {
        // Log activities before deletion
        if (logActivity) {
          await Promise.all(
            trashedDocs.map((doc) =>
              logActivity(ACTIVITY_ACTIONS.PERMANENTLY_DELETED, doc, {
                title: doc.title,
                bulk: true,
              })
            )
          );
        }

        await Promise.all(trashedDocs.map((doc) => Document.delete(doc.id)));

        toast.success(`Trash emptied (${trashedDocs.length} documents)`);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to empty trash:', err);
        toast.error('Failed to empty trash');
      } finally {
        setIsDeleting(false);
      }
    },
    [logActivity, onRefresh]
  );

  /**
   * Log a download activity
   * @param {Object} doc - Document being downloaded
   */
  const logDownload = useCallback(
    async (doc) => {
      if (logActivity && doc) {
        await logActivity(ACTIVITY_ACTIONS.DOWNLOADED, doc, {
          file_name: doc.file_name,
        });
      }
    },
    [logActivity]
  );

  /**
   * Log a view activity
   * @param {Object} doc - Document being viewed
   */
  const logView = useCallback(
    async (doc) => {
      if (logActivity && doc) {
        await logActivity(ACTIVITY_ACTIONS.VIEWED, doc, {});
      }
    },
    [logActivity]
  );

  return {
    // Star actions
    starDocument,
    unstarDocument,
    toggleStar,

    // Delete actions
    softDeleteDocument,
    restoreDocument,
    permanentDeleteDocument,

    // Bulk actions
    bulkSoftDelete,
    bulkRestore,
    emptyTrash,

    // Logging helpers
    logDownload,
    logView,

    // Loading states
    isStarring,
    isDeleting,
    isRestoring,
  };
}

export default useDocumentActions;
