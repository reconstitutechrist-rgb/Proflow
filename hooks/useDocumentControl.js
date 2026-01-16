/**
 * useDocumentControl Hook
 *
 * State management for the AI Document Control feature.
 * Manages the workflow: upload → analyze → preview → apply → complete
 */

import { useState, useCallback, useRef } from 'react';
import {
  runDocumentControlAnalysis,
  applyDocumentChanges,
  saveUploadedDocument,
} from '@/api/documentControl';
import {
  CONTROL_STEPS,
  CHANGE_STATUS,
  CONFIDENCE_THRESHOLDS,
} from '@/features/documents/documentControlTypes';

/**
 * Initial state for document control
 */
const initialState = {
  // UI State
  isExpanded: false,
  currentStep: CONTROL_STEPS.UPLOAD,

  // Upload State
  uploadedFile: null,
  linkedAssignment: null,
  linkedTask: null,

  // Analysis State
  analysisProgress: 0,
  analysisStatus: '',
  contentAnalysis: null,

  // Changes State
  proposedChanges: [],
  affectedDocuments: [],
  expandedDocuments: new Set(),

  // Results State
  appliedChanges: [],
  savedDocumentId: null,

  // Error State
  error: null,
};

/**
 * Hook for managing document control workflow
 * @param {string} projectId - Current project UUID
 * @param {string} workspaceId - Current workspace UUID
 * @param {string} userId - Current user email/ID
 */
export function useDocumentControl(projectId, workspaceId, userId) {
  const [state, setState] = useState(initialState);
  const abortControllerRef = useRef(null);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Toggle panel expansion
   */
  const toggleExpanded = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  /**
   * Set the uploaded file
   */
  const setUploadedFile = useCallback(
    (file) => {
      updateState({
        uploadedFile: file,
        error: null,
      });
    },
    [updateState]
  );

  /**
   * Set linked assignment
   */
  const setLinkedAssignment = useCallback(
    (assignmentId) => {
      updateState({ linkedAssignment: assignmentId });
    },
    [updateState]
  );

  /**
   * Set linked task
   */
  const setLinkedTask = useCallback(
    (taskId) => {
      updateState({ linkedTask: taskId });
    },
    [updateState]
  );

  /**
   * Start the analysis process
   */
  const startAnalysis = useCallback(async () => {
    if (!state.uploadedFile || !projectId) {
      updateState({ error: 'No file selected or project not specified' });
      return;
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    updateState({
      currentStep: CONTROL_STEPS.ANALYZING,
      analysisProgress: 0,
      analysisStatus: 'Starting analysis...',
      error: null,
    });

    try {
      const result = await runDocumentControlAnalysis(
        state.uploadedFile,
        projectId,
        workspaceId,
        (progress) => {
          // Check for abort
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Analysis cancelled');
          }
          updateState({
            analysisProgress: progress.progress,
            analysisStatus: progress.message,
          });
        }
      );

      if (!result.success) {
        updateState({
          currentStep: CONTROL_STEPS.ERROR,
          error: result.error || 'Analysis failed',
        });
        return;
      }

      if (result.noMatches) {
        // No matching documents found
        updateState({
          currentStep: CONTROL_STEPS.PREVIEW,
          contentAnalysis: result.contentAnalysis,
          affectedDocuments: [],
          proposedChanges: [],
          analysisProgress: 100,
          analysisStatus: 'No related documents found',
        });
        return;
      }

      // Flatten all changes from affected documents
      const allChanges = result.affectedDocuments.flatMap((doc) => doc.changes);

      updateState({
        currentStep: CONTROL_STEPS.PREVIEW,
        contentAnalysis: result.contentAnalysis,
        affectedDocuments: result.affectedDocuments,
        proposedChanges: allChanges,
        analysisProgress: 100,
        analysisStatus: `Found ${allChanges.length} proposed changes`,
      });
    } catch (error) {
      if (error.message === 'Analysis cancelled') {
        updateState({
          currentStep: CONTROL_STEPS.UPLOAD,
          analysisProgress: 0,
          analysisStatus: '',
        });
      } else {
        updateState({
          currentStep: CONTROL_STEPS.ERROR,
          error: error.message || 'Analysis failed',
        });
      }
    }
  }, [state.uploadedFile, projectId, workspaceId, updateState]);

  /**
   * Cancel ongoing analysis
   */
  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    updateState({
      currentStep: CONTROL_STEPS.UPLOAD,
      analysisProgress: 0,
      analysisStatus: '',
    });
  }, [updateState]);

  /**
   * Approve a single change
   */
  const approveChange = useCallback((changeId) => {
    setState((prev) => ({
      ...prev,
      proposedChanges: prev.proposedChanges.map((change) =>
        change.id === changeId ? { ...change, status: CHANGE_STATUS.APPROVED } : change
      ),
    }));
  }, []);

  /**
   * Reject a single change
   */
  const rejectChange = useCallback((changeId) => {
    setState((prev) => ({
      ...prev,
      proposedChanges: prev.proposedChanges.map((change) =>
        change.id === changeId ? { ...change, status: CHANGE_STATUS.REJECTED } : change
      ),
    }));
  }, []);

  /**
   * Edit a change's proposed text
   */
  const editChange = useCallback((changeId, newText) => {
    setState((prev) => ({
      ...prev,
      proposedChanges: prev.proposedChanges.map((change) =>
        change.id === changeId
          ? { ...change, userEditedText: newText, status: CHANGE_STATUS.APPROVED }
          : change
      ),
    }));
  }, []);

  /**
   * Approve all changes for a document
   */
  const approveAllForDocument = useCallback((documentId) => {
    setState((prev) => ({
      ...prev,
      proposedChanges: prev.proposedChanges.map((change) =>
        change.documentId === documentId ? { ...change, status: CHANGE_STATUS.APPROVED } : change
      ),
    }));
  }, []);

  /**
   * Reject all changes for a document
   */
  const rejectAllForDocument = useCallback((documentId) => {
    setState((prev) => ({
      ...prev,
      proposedChanges: prev.proposedChanges.map((change) =>
        change.documentId === documentId ? { ...change, status: CHANGE_STATUS.REJECTED } : change
      ),
    }));
  }, []);

  /**
   * Approve all pending changes
   */
  const approveAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      proposedChanges: prev.proposedChanges.map((change) =>
        change.status === CHANGE_STATUS.PENDING
          ? { ...change, status: CHANGE_STATUS.APPROVED }
          : change
      ),
    }));
  }, []);

  /**
   * Reject all pending changes
   */
  const rejectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      proposedChanges: prev.proposedChanges.map((change) =>
        change.status === CHANGE_STATUS.PENDING
          ? { ...change, status: CHANGE_STATUS.REJECTED }
          : change
      ),
    }));
  }, []);

  /**
   * Toggle document expansion in preview
   */
  const toggleDocumentExpanded = useCallback((documentId) => {
    setState((prev) => {
      const newExpanded = new Set(prev.expandedDocuments);
      if (newExpanded.has(documentId)) {
        newExpanded.delete(documentId);
      } else {
        newExpanded.add(documentId);
      }
      return { ...prev, expandedDocuments: newExpanded };
    });
  }, []);

  /**
   * Apply all approved changes
   */
  const applyChanges = useCallback(async () => {
    const approvedChanges = state.proposedChanges.filter(
      (c) => c.status === CHANGE_STATUS.APPROVED
    );

    if (approvedChanges.length === 0) {
      updateState({ error: 'No changes approved to apply' });
      return;
    }

    updateState({
      currentStep: CONTROL_STEPS.APPLYING,
      analysisStatus: 'Applying changes...',
    });

    try {
      const result = await applyDocumentChanges(approvedChanges, userId, workspaceId);

      // Update change statuses based on results
      const appliedIds = new Set(
        result.results.filter((r) => r.success).flatMap((r) => r.changeIds || [])
      );

      setState((prev) => ({
        ...prev,
        proposedChanges: prev.proposedChanges.map((change) =>
          appliedIds.has(change.id) ? { ...change, status: CHANGE_STATUS.APPLIED } : change
        ),
        appliedChanges: result.results,
      }));

      // Save the uploaded document
      if (state.uploadedFile) {
        const saveResult = await saveUploadedDocument(
          state.uploadedFile,
          projectId,
          workspaceId,
          userId
        );

        if (saveResult.success) {
          updateState({ savedDocumentId: saveResult.documentId });
        }
      }

      updateState({
        currentStep: CONTROL_STEPS.COMPLETE,
        analysisStatus: `Applied ${result.totalApplied} changes`,
      });
    } catch (error) {
      updateState({
        currentStep: CONTROL_STEPS.ERROR,
        error: error.message || 'Failed to apply changes',
      });
    }
  }, [state.proposedChanges, state.uploadedFile, projectId, workspaceId, userId, updateState]);

  /**
   * Skip applying changes and just save the document
   */
  const skipAndSave = useCallback(async () => {
    if (!state.uploadedFile) {
      updateState({ error: 'No file to save' });
      return;
    }

    updateState({
      currentStep: CONTROL_STEPS.APPLYING,
      analysisStatus: 'Saving document...',
    });

    try {
      const saveResult = await saveUploadedDocument(
        state.uploadedFile,
        projectId,
        workspaceId,
        userId
      );

      if (saveResult.success) {
        updateState({
          currentStep: CONTROL_STEPS.COMPLETE,
          savedDocumentId: saveResult.documentId,
          analysisStatus: 'Document saved to Miscellaneous folder',
        });
      } else {
        throw new Error(saveResult.error || 'Failed to save document');
      }
    } catch (error) {
      updateState({
        currentStep: CONTROL_STEPS.ERROR,
        error: error.message || 'Failed to save document',
      });
    }
  }, [state.uploadedFile, projectId, workspaceId, userId, updateState]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Get changes grouped by document
   */
  const getChangesByDocument = useCallback(() => {
    const byDoc = new Map();

    for (const change of state.proposedChanges) {
      if (!byDoc.has(change.documentId)) {
        byDoc.set(change.documentId, {
          documentId: change.documentId,
          documentTitle: change.documentTitle,
          changes: [],
          approvedCount: 0,
          rejectedCount: 0,
          pendingCount: 0,
        });
      }

      const doc = byDoc.get(change.documentId);
      doc.changes.push(change);

      if (change.status === CHANGE_STATUS.APPROVED) doc.approvedCount++;
      else if (change.status === CHANGE_STATUS.REJECTED) doc.rejectedCount++;
      else doc.pendingCount++;
    }

    return Array.from(byDoc.values());
  }, [state.proposedChanges]);

  /**
   * Get summary statistics
   */
  const getSummary = useCallback(() => {
    const total = state.proposedChanges.length;
    const approved = state.proposedChanges.filter(
      (c) => c.status === CHANGE_STATUS.APPROVED
    ).length;
    const rejected = state.proposedChanges.filter(
      (c) => c.status === CHANGE_STATUS.REJECTED
    ).length;
    const pending = state.proposedChanges.filter((c) => c.status === CHANGE_STATUS.PENDING).length;
    const applied = state.proposedChanges.filter((c) => c.status === CHANGE_STATUS.APPLIED).length;

    const highConfidence = state.proposedChanges.filter(
      (c) => c.evidence?.confidence?.overall >= CONFIDENCE_THRESHOLDS.STANDARD_PROPOSAL
    ).length;

    const lowConfidence = state.proposedChanges.filter(
      (c) => c.evidence?.confidence?.overall < CONFIDENCE_THRESHOLDS.FLAGGED_FOR_REVIEW
    ).length;

    return {
      total,
      approved,
      rejected,
      pending,
      applied,
      highConfidence,
      lowConfidence,
      totalDocuments: new Set(state.proposedChanges.map((c) => c.documentId)).size,
    };
  }, [state.proposedChanges]);

  return {
    // State
    state,
    isExpanded: state.isExpanded,
    currentStep: state.currentStep,
    uploadedFile: state.uploadedFile,
    analysisProgress: state.analysisProgress,
    analysisStatus: state.analysisStatus,
    proposedChanges: state.proposedChanges,
    expandedDocuments: state.expandedDocuments,
    error: state.error,

    // Actions
    toggleExpanded,
    setUploadedFile,
    setLinkedAssignment,
    setLinkedTask,
    startAnalysis,
    cancelAnalysis,
    approveChange,
    rejectChange,
    editChange,
    approveAllForDocument,
    rejectAllForDocument,
    approveAll,
    rejectAll,
    toggleDocumentExpanded,
    applyChanges,
    skipAndSave,
    reset,

    // Computed
    getChangesByDocument,
    getSummary,
  };
}

export default useDocumentControl;
