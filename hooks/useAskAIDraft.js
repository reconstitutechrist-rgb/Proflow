import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const DRAFT_STORAGE_KEY = 'askAI_draft_v1';
const AUTO_SAVE_INTERVAL = 60000;

/**
 * Hook for managing draft/auto-save functionality in AskAI
 */
export function useAskAIDraft({
  messages,
  uploadedDocuments,
  selectedAssignment,
  selectedProject,
  contextType,
  totalEmbeddingCost,
  currentSession,
  assignments,
  projects,
  setMessages,
  setUploadedDocuments,
  setSelectedAssignment,
  setSelectedProject,
  setContextType,
  setTotalEmbeddingCost,
}) {
  // Keep ref updated with current data for stable auto-save callback
  const autoSaveDataRef = useRef({
    messages: [],
    uploadedDocuments: [],
    selectedAssignment: null,
    selectedProject: null,
    contextType: 'none',
    totalEmbeddingCost: 0,
  });

  // Update ref with current data
  useEffect(() => {
    autoSaveDataRef.current = {
      messages,
      uploadedDocuments,
      selectedAssignment,
      selectedProject,
      contextType,
      totalEmbeddingCost,
    };
  }, [
    messages,
    uploadedDocuments,
    selectedAssignment,
    selectedProject,
    contextType,
    totalEmbeddingCost,
  ]);

  const clearDraftFromStorage = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, []);

  const saveDraftToStorage = useCallback(() => {
    try {
      const {
        messages,
        uploadedDocuments,
        selectedAssignment,
        selectedProject,
        contextType,
        totalEmbeddingCost,
      } = autoSaveDataRef.current;

      const draft = {
        messages: messages.map((m) => ({
          ...m,
          excludedFromContext: m.excludedFromContext || false,
          ragMetadata: m.ragMetadata || undefined,
          source_documents: m.source_documents || undefined,
          confidence_score: m.confidence_score || undefined,
          ragUsed: m.ragUsed || undefined,
        })),
        documents: uploadedDocuments.map((d) => ({
          ...d,
          includedInContext: d.includedInContext !== false,
          chunks: d.chunks || [],
          embeddings: d.embeddings || [],
          embeddingModel: d.embeddingModel || null,
          chunkingStrategy: d.chunkingStrategy || null,
          structureAnalysis: d.structureAnalysis || null,
          tokenCount: d.tokenCount || 0,
          estimatedCost: d.estimatedCost || 0,
          contentHash: d.contentHash || null,
          fromCache: d.fromCache || false,
        })),
        assignmentId: selectedAssignment?.id,
        projectId: selectedProject?.id,
        contextType: contextType,
        totalEmbeddingCost: totalEmbeddingCost,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, []);

  const loadDraftFromStorage = useCallback(() => {
    try {
      const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.messages?.length > 0 || draft.documents?.length > 0) {
          const draftAge = Date.now() - new Date(draft.timestamp).getTime();
          if (draftAge < 24 * 60 * 60 * 1000) {
            setMessages(
              (draft.messages || []).map((m) => ({
                ...m,
                excludedFromContext: m.excludedFromContext || false,
                ragMetadata: m.ragMetadata || undefined,
                source_documents: m.source_documents || undefined,
                confidence_score: m.confidence_score || undefined,
                ragUsed: m.ragUsed || undefined,
              }))
            );
            setUploadedDocuments(
              (draft.documents || []).map((d) => ({
                ...d,
                includedInContext: d.includedInContext !== false,
                chunks: d.chunks || [],
                embeddings: d.embeddings || [],
                embeddingModel: d.embeddingModel || null,
                chunkingStrategy: d.chunkingStrategy || null,
                structureAnalysis: d.structureAnalysis || null,
                tokenCount: d.tokenCount || 0,
                estimatedCost: d.estimatedCost || 0,
                contentHash: d.contentHash || null,
                fromCache: d.fromCache || false,
              }))
            );
            if (draft.contextType) {
              setContextType(draft.contextType);
            }
            if (draft.assignmentId && assignments.length > 0) {
              const assignment = assignments.find((a) => a.id === draft.assignmentId);
              if (assignment) setSelectedAssignment(assignment);
            }
            if (draft.projectId && projects.length > 0) {
              const project = projects.find((p) => p.id === draft.projectId);
              if (project) setSelectedProject(project);
            }
            setTotalEmbeddingCost(draft.totalEmbeddingCost || 0);
            toast.info('Restored unsaved work from draft', {
              action: {
                label: 'Discard',
                onClick: () => {
                  clearDraftFromStorage();
                  setMessages([]);
                  setUploadedDocuments([]);
                  setSelectedAssignment(null);
                  setSelectedProject(null);
                  setContextType('none');
                  setTotalEmbeddingCost(0);
                },
              },
            });
          } else {
            clearDraftFromStorage();
          }
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [
    assignments,
    projects,
    clearDraftFromStorage,
    setMessages,
    setUploadedDocuments,
    setSelectedAssignment,
    setSelectedProject,
    setContextType,
    setTotalEmbeddingCost,
  ]);

  // Track whether we have content to enable auto-save
  const hasContentForAutoSave = messages.length > 0 || uploadedDocuments.length > 0;

  // Auto-save effect
  useEffect(() => {
    if (hasContentForAutoSave && !currentSession) {
      const interval = setInterval(() => {
        saveDraftToStorage();
      }, AUTO_SAVE_INTERVAL);
      return () => clearInterval(interval);
    }
    return () => {};
  }, [hasContentForAutoSave, currentSession, saveDraftToStorage]);

  return {
    clearDraftFromStorage,
    saveDraftToStorage,
    loadDraftFromStorage,
  };
}
