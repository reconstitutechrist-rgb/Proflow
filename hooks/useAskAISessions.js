import { useState, useCallback } from 'react';
import { db } from '@/api/db';
import { toast } from 'sonner';

/**
 * Hook for managing session operations in AskAI
 */
export function useAskAISessions({
  currentWorkspaceId,
  assignments,
  projects,
  messages,
  uploadedDocuments,
  selectedAssignment,
  selectedProject,
  contextType,
  currentSession,
  sessionModified,
  totalEmbeddingCost,
  currentUser,
  projectMemory,
  setMessages,
  setUploadedDocuments,
  setSelectedAssignment,
  setSelectedProject,
  setContextType,
  setCurrentSession,
  setSessionModified,
  setTotalEmbeddingCost,
  setProjectMemory,
  clearDraftFromStorage,
  loadInitialData,
}) {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isSessionsSheetOpen, setIsSessionsSheetOpen] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionSortBy, setSessionSortBy] = useState('recent');
  const [deleteConfirmSession, setDeleteConfirmSession] = useState(null);
  const [isLoadNewSessionDialogOpen, setIsLoadNewSessionDialogOpen] = useState(false);
  const [pendingSessionToLoad, setPendingSessionToLoad] = useState(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');

  const confirmLoadSession = useCallback(
    (session) => {
      try {
        setMessages(
          (session.messages || []).map((m) => ({
            ...m,
            excludedFromContext: m.excludedFromContext || false,
            ragMetadata: m.ragMetadata || undefined,
            source_documents: m.source_documents || undefined,
            confidence_score: m.confidence_score || undefined,
            ragUsed: m.ragUsed || undefined,
          }))
        );

        setUploadedDocuments(
          (session.documents || []).map((d) => ({
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

        setCurrentSession(session);
        setSessionName(session.name);
        setSessionDescription(session.description || '');

        if (session.context_type) {
          setContextType(session.context_type);
        } else if (session.project_id) {
          setContextType('project');
        } else if (session.assignment_id) {
          setContextType('assignment');
        } else {
          setContextType('none');
        }

        if (session.project_id) {
          const project = projects.find((p) => p.id === session.project_id);
          if (project) setSelectedProject(project);
          else setSelectedProject(null);
        } else {
          setSelectedProject(null);
        }

        if (session.assignment_id) {
          const assignment = assignments.find((a) => a.id === session.assignment_id);
          if (assignment) setSelectedAssignment(assignment);
          else setSelectedAssignment(null);
        } else {
          setSelectedAssignment(null);
        }

        const loadedCost = (session.documents || []).reduce(
          (sum, d) => sum + (d.estimatedCost || 0),
          0
        );
        setTotalEmbeddingCost(loadedCost);

        setSessionModified(false);
        setIsSessionsSheetOpen(false);
        clearDraftFromStorage();

        toast.success(`Loaded session: ${session.name}`);
      } catch (error) {
        console.error('Error confirming load session:', error);
        toast.error('Failed to load session content');
      } finally {
        setIsLoadNewSessionDialogOpen(false);
        setPendingSessionToLoad(null);
      }
    },
    [
      assignments,
      projects,
      clearDraftFromStorage,
      setMessages,
      setUploadedDocuments,
      setSelectedAssignment,
      setSelectedProject,
      setContextType,
      setCurrentSession,
      setSessionModified,
      setTotalEmbeddingCost,
    ]
  );

  const handleLoadSession = useCallback(
    async (session) => {
      if (
        sessionModified ||
        ((messages.length > 0 || uploadedDocuments.length > 0) && !currentSession)
      ) {
        setPendingSessionToLoad(session);
        setIsLoadNewSessionDialogOpen(true);
      } else {
        confirmLoadSession(session);
      }
    },
    [sessionModified, messages.length, uploadedDocuments.length, currentSession, confirmLoadSession]
  );

  const handleDeleteSession = useCallback(
    async (sessionId) => {
      try {
        await db.entities.ChatSession.delete(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));

        if (currentSession?.id === sessionId) {
          // Reset to new conversation
          setMessages([]);
          setUploadedDocuments([]);
          setSelectedAssignment(null);
          setSelectedProject(null);
          setContextType('none');
          setCurrentSession(null);
          setSessionModified(false);
          setSessionName('');
          setSessionDescription('');
          setTotalEmbeddingCost(0);
        }

        setDeleteConfirmSession(null);
        toast.success('Session deleted successfully');
      } catch (error) {
        console.error('Error deleting session:', error);
        toast.error('Failed to delete session');
      }
    },
    [
      currentSession,
      setMessages,
      setUploadedDocuments,
      setSelectedAssignment,
      setSelectedProject,
      setContextType,
      setCurrentSession,
      setSessionModified,
      setTotalEmbeddingCost,
    ]
  );

  const handleNewConversation = useCallback(() => {
    if (sessionModified || messages.length > 0 || uploadedDocuments.length > 0) {
      if (
        !confirm(
          'Are you sure you want to start a new conversation? Any unsaved changes will be lost.'
        )
      ) {
        return;
      }
    }

    setMessages([]);
    setUploadedDocuments([]);
    setSelectedAssignment(null);
    setSelectedProject(null);
    setContextType('none');
    setCurrentSession(null);
    setSessionModified(false);
    setIsLoadNewSessionDialogOpen(false);
    setSessionName('');
    setSessionDescription('');
    setTotalEmbeddingCost(0);
    clearDraftFromStorage();
    toast.info('Started new conversation');
  }, [
    sessionModified,
    messages.length,
    uploadedDocuments.length,
    clearDraftFromStorage,
    setMessages,
    setUploadedDocuments,
    setSelectedAssignment,
    setSelectedProject,
    setContextType,
    setCurrentSession,
    setSessionModified,
    setTotalEmbeddingCost,
  ]);

  const handleSaveSession = useCallback(async () => {
    if (!sessionName.trim()) {
      toast.error('Please provide a session name');
      return;
    }

    try {
      const sessionData = {
        name: sessionName,
        description: sessionDescription,
        assignment_id: selectedAssignment?.id || null,
        project_id: selectedProject?.id || null,
        context_type: contextType,
        created_by: currentUser?.email,
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
        message_count: messages.length,
        last_activity: new Date().toISOString(),
        status: 'active',
        auto_generated_summary:
          messages.length > 0
            ? `Discussion about: ${messages[0].content.substring(0, Math.min(messages[0].content.length, 100))}...`
            : 'No messages yet',
        total_embedding_cost: totalEmbeddingCost,
      };

      if (currentSession) {
        await db.entities.ChatSession.update(currentSession.id, sessionData);
        setCurrentSession({ ...currentSession, ...sessionData });
        setSessionModified(false);
        toast.success('Session updated successfully');
      } else {
        const newSession = await db.entities.ChatSession.create({
          ...sessionData,
          workspace_id: currentWorkspaceId,
        });
        setCurrentSession(newSession);
        setSessionModified(false);
        clearDraftFromStorage();
        toast.success('Session saved successfully');
      }

      if (loadInitialData) {
        await loadInitialData(0);
      }
      setIsSaveDialogOpen(false);
      setSessionName('');
      setSessionDescription('');
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Failed to save session');
    }
  }, [
    sessionName,
    sessionDescription,
    selectedAssignment,
    selectedProject,
    contextType,
    currentUser,
    messages,
    uploadedDocuments,
    totalEmbeddingCost,
    currentSession,
    currentWorkspaceId,
    clearDraftFromStorage,
    loadInitialData,
    setCurrentSession,
    setSessionModified,
  ]);

  // Filter and sort sessions
  const filteredSessions = sessions.filter((session) => {
    const query = sessionSearchQuery.toLowerCase();
    return (
      session.name.toLowerCase().includes(query) ||
      session.description?.toLowerCase().includes(query) ||
      session.messages?.some((m) => m.content.toLowerCase().includes(query))
    );
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sessionSortBy) {
      case 'recent':
        return (
          new Date(b.last_activity || b.updated_date || b.created_date) -
          new Date(a.last_activity || a.updated_date || a.created_date)
        );
      case 'oldest':
        return new Date(a.created_date) - new Date(b.created_date);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'messages':
        return (b.message_count || 0) - (a.message_count || 0);
      default:
        return 0;
    }
  });

  return {
    // State
    sessions,
    setSessions,
    loadingSessions,
    setLoadingSessions,
    isSessionsSheetOpen,
    setIsSessionsSheetOpen,
    sessionSearchQuery,
    setSessionSearchQuery,
    sessionSortBy,
    setSessionSortBy,
    deleteConfirmSession,
    setDeleteConfirmSession,
    isLoadNewSessionDialogOpen,
    setIsLoadNewSessionDialogOpen,
    pendingSessionToLoad,
    setPendingSessionToLoad,
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    sessionName,
    setSessionName,
    sessionDescription,
    setSessionDescription,

    // Computed
    sortedSessions,

    // Handlers
    confirmLoadSession,
    handleLoadSession,
    handleDeleteSession,
    handleNewConversation,
    handleSaveSession,
  };
}
