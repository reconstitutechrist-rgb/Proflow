import { useState, useMemo, useCallback } from 'react';
import { applyChangesToContent } from '@/utils/diffUtils';

/**
 * Hook for managing document diff state and change acceptance
 * @param {string} originalContent - The original document content
 * @param {Array} changes - Array of change objects from AI review
 * @returns {object} - State and actions for managing changes
 */
export function useDocumentDiff(originalContent, changes = []) {
  const [appliedChanges, setAppliedChanges] = useState(new Set());
  const [rejectedChanges, setRejectedChanges] = useState(new Set());

  // Compute preview content with accepted changes applied
  const previewContent = useMemo(() => {
    return applyChangesToContent(originalContent, changes, appliedChanges);
  }, [originalContent, changes, appliedChanges]);

  // Get pending changes (not yet accepted or rejected)
  const pendingChanges = useMemo(() => {
    return changes.filter(
      c => !appliedChanges.has(c.id) && !rejectedChanges.has(c.id)
    );
  }, [changes, appliedChanges, rejectedChanges]);

  // Accept a single change
  const acceptChange = useCallback((changeId) => {
    setAppliedChanges(prev => new Set([...prev, changeId]));
    setRejectedChanges(prev => {
      const next = new Set(prev);
      next.delete(changeId);
      return next;
    });
  }, []);

  // Reject a single change
  const rejectChange = useCallback((changeId) => {
    setRejectedChanges(prev => new Set([...prev, changeId]));
    setAppliedChanges(prev => {
      const next = new Set(prev);
      next.delete(changeId);
      return next;
    });
  }, []);

  // Accept all changes
  const acceptAll = useCallback(() => {
    setAppliedChanges(new Set(changes.map(c => c.id)));
    setRejectedChanges(new Set());
  }, [changes]);

  // Reject all changes
  const rejectAll = useCallback(() => {
    setRejectedChanges(new Set(changes.map(c => c.id)));
    setAppliedChanges(new Set());
  }, [changes]);

  // Reset all decisions
  const resetAll = useCallback(() => {
    setAppliedChanges(new Set());
    setRejectedChanges(new Set());
  }, []);

  // Toggle a change (if accepted, reject; if rejected or pending, accept)
  const toggleChange = useCallback((changeId) => {
    if (appliedChanges.has(changeId)) {
      rejectChange(changeId);
    } else {
      acceptChange(changeId);
    }
  }, [appliedChanges, acceptChange, rejectChange]);

  // Get the final content with all accepted changes
  const getFinalContent = useCallback(() => {
    return applyChangesToContent(originalContent, changes, appliedChanges);
  }, [originalContent, changes, appliedChanges]);

  // Check if a change is accepted
  const isAccepted = useCallback((changeId) => {
    return appliedChanges.has(changeId);
  }, [appliedChanges]);

  // Check if a change is rejected
  const isRejected = useCallback((changeId) => {
    return rejectedChanges.has(changeId);
  }, [rejectedChanges]);

  // Get stats
  const stats = useMemo(() => ({
    total: changes.length,
    accepted: appliedChanges.size,
    rejected: rejectedChanges.size,
    pending: pendingChanges.length
  }), [changes.length, appliedChanges.size, rejectedChanges.size, pendingChanges.length]);

  return {
    // Content
    previewContent,

    // Change lists
    pendingChanges,

    // Sets for checking
    appliedChanges,
    rejectedChanges,

    // Actions
    acceptChange,
    rejectChange,
    acceptAll,
    rejectAll,
    resetAll,
    toggleChange,

    // Helpers
    getFinalContent,
    isAccepted,
    isRejected,

    // Stats
    stats
  };
}

export default useDocumentDiff;
