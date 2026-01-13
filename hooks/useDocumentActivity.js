import { useState, useCallback, useEffect } from 'react';
import { db } from '@/api/db';

/**
 * Activity action types for document operations
 */
export const ACTIVITY_ACTIONS = {
  CREATED: 'created',
  UPLOADED: 'uploaded',
  EDITED: 'edited',
  DELETED: 'deleted',
  RESTORED: 'restored',
  PERMANENTLY_DELETED: 'permanently_deleted',
  STARRED: 'starred',
  UNSTARRED: 'unstarred',
  MOVED: 'moved',
  DOWNLOADED: 'downloaded',
  VIEWED: 'viewed',
};

/**
 * Hook for managing document activity logging and retrieval
 * @param {Object} options - Hook options
 * @param {string} options.workspaceId - Current workspace ID
 * @param {Object} options.currentUser - Current user object
 * @param {number} [options.limit=50] - Maximum activities to fetch
 * @returns {Object} Activity state and actions
 */
export function useDocumentActivity({ workspaceId, currentUser, limit = 50 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Log a document activity
   * @param {string} action - The action type (from ACTIVITY_ACTIONS)
   * @param {Object} document - The document being acted upon
   * @param {Object} [details={}] - Additional action details
   */
  const logActivity = useCallback(
    async (action, document, details = {}) => {
      if (!workspaceId || !currentUser) {
        console.warn('Cannot log activity: missing workspaceId or currentUser');
        return;
      }

      try {
        await db.entities.DocumentActivity.create({
          workspace_id: workspaceId,
          document_id: document?.id || null,
          document_title: document?.title || 'Unknown Document',
          user_email: currentUser.email,
          user_name: currentUser.full_name || currentUser.email,
          action,
          action_details: details,
        });
      } catch (err) {
        console.error('Failed to log activity:', err);
        // Don't throw - activity logging shouldn't break the main operation
      }
    },
    [workspaceId, currentUser]
  );

  /**
   * Fetch activities with optional filters
   * @param {Object} [options={}] - Filter options
   * @param {string} [options.userEmail] - Filter by user email
   * @param {string} [options.documentId] - Filter by document ID
   * @param {string} [options.action] - Filter by action type
   * @param {Date} [options.since] - Filter by date (activities after this date)
   */
  const fetchActivities = useCallback(
    async (options = {}) => {
      if (!workspaceId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Build filter object
        const filters = { workspace_id: workspaceId };

        if (options.userEmail) {
          filters.user_email = options.userEmail;
        }

        if (options.documentId) {
          filters.document_id = options.documentId;
        }

        if (options.action) {
          filters.action = options.action;
        }

        // Fetch activities sorted by created_at descending
        const result = await db.entities.DocumentActivity.filter(filters, '-created_at', limit);

        // If 'since' filter is provided, filter client-side
        let filteredResult = result;
        if (options.since && options.since instanceof Date) {
          filteredResult = result.filter(
            (activity) => new Date(activity.created_at) > options.since
          );
        }

        setActivities(filteredResult || []);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
        setError(err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, limit]
  );

  /**
   * Refresh activities (re-fetch with current filters)
   */
  const refreshActivities = useCallback(() => {
    return fetchActivities();
  }, [fetchActivities]);

  // Initial fetch when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      fetchActivities();
    }
  }, [workspaceId, fetchActivities]);

  return {
    // State
    activities,
    loading,
    error,

    // Actions
    logActivity,
    fetchActivities,
    refreshActivities,
  };
}

export default useDocumentActivity;
