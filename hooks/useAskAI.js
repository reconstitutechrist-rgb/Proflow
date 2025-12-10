import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/api/db';
import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import { ragHelper } from '@/api/functions';
import { exportSessionToPdf } from '@/api/functions';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';
import {
  getProjectMemory,
  updateProjectMemoryFromChat,
  buildProjectMemoryPrompt,
} from '@/api/projectMemory';

const MEMORY_LIMITS = {
  MAX_DOCUMENTS: 50,
  MAX_MESSAGES: 200,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  WARNING_DOCUMENTS: 30,
  WARNING_MESSAGES: 150,
};

const DRAFT_STORAGE_KEY = 'askAI_draft_v1';
const AUTO_SAVE_INTERVAL = 60000;
const MAX_CONCURRENT_UPLOADS = 3;
const MAX_RETRIES = 3;

export { MEMORY_LIMITS };

export function useAskAI() {
  const [currentUser, setCurrentUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [contextType, setContextType] = useState('none');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionModified, setSessionModified] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');

  // Project Memory state
  const [projectMemory, setProjectMemory] = useState(null);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

  // RAG state
  const [useRAG, setUseRAG] = useState(true);
  const [isProcessingEmbeddings, setIsProcessingEmbeddings] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState({ current: 0, total: 0 });
  const [totalEmbeddingCost, setTotalEmbeddingCost] = useState(0);

  // Session management states
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isSessionsSheetOpen, setIsSessionsSheetOpen] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionSortBy, setSessionSortBy] = useState('recent');
  const [deleteConfirmSession, setDeleteConfirmSession] = useState(null);
  const [isLoadNewSessionDialogOpen, setIsLoadNewSessionDialogOpen] = useState(false);
  const [pendingSessionToLoad, setPendingSessionToLoad] = useState(null);

  // Export state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('markdown');
  const [isExporting, setIsExporting] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const processedCountRef = useRef(0);
  const embeddingCostRef = useRef(0);
  const autoSaveDataRef = useRef({
    messages: [],
    uploadedDocuments: [],
    selectedAssignment: null,
    selectedProject: null,
    contextType: 'none',
    totalEmbeddingCost: 0,
  });
  const [loading, setLoading] = useState(true);

  const { currentWorkspaceId } = useWorkspace();

  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryTimeoutRef = useRef(null);

  // Enhancement feature states
  const [showOnboardingTutorial, setShowOnboardingTutorial] = useState(false);
  const [showQuickStartGuide, setShowQuickStartGuide] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSessionTemplates, setShowSessionTemplates] = useState(false);
  const [showCostEstimator, setShowCostEstimator] = useState(false);
  const [costEstimatorData, setCostEstimatorData] = useState(null);

  // Check if first-time user
  useEffect(() => {
    const hasVisited = localStorage.getItem('askAI_hasVisited');
    if (!hasVisited) {
      setShowQuickStartGuide(true);
      localStorage.setItem('askAI_hasVisited', 'true');
    }
  }, []);

  // Load project memory when project is selected
  useEffect(() => {
    const loadProjectMemory = async () => {
      if (selectedProject && currentWorkspaceId) {
        setIsLoadingMemory(true);
        try {
          const memory = await getProjectMemory(selectedProject.id, currentWorkspaceId);
          setProjectMemory(memory);
        } catch (error) {
          console.error('Error loading project memory:', error);
          setProjectMemory(null);
        } finally {
          setIsLoadingMemory(false);
        }
      } else {
        setProjectMemory(null);
      }
    };
    loadProjectMemory();
  }, [selectedProject, currentWorkspaceId]);

  const clearDraftFromStorage = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, []);

  // Keep ref updated with current data for stable auto-save callback
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
  }, []); // Now stable - reads from ref

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
  }, [assignments, projects, clearDraftFromStorage]);

  const loadInitialData = useCallback(
    async (currentRetry = 0) => {
      if (!currentWorkspaceId) return;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      try {
        setLoading(true);
        setLoadingSessions(true);

        const userData = await db.auth.me();
        setCurrentUser(userData);

        const baseDelay = 500;
        const delay = baseDelay * Math.pow(2, currentRetry);
        await new Promise((resolve) => setTimeout(resolve, delay));

        const [assignmentsData, projectsData] = await Promise.all([
          db.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, '-updated_date', 20),
          db.entities.Project.filter({ workspace_id: currentWorkspaceId }, '-updated_date', 20),
        ]);
        setAssignments(assignmentsData);
        setProjects(projectsData);

        await new Promise((resolve) => setTimeout(resolve, delay));

        const sessionsData = await db.entities.ChatSession.filter(
          { workspace_id: currentWorkspaceId },
          '-last_activity',
          50
        );
        setSessions(sessionsData);

        setRetryAttempt(0);
        loadDraftFromStorage();
      } catch (error) {
        console.error('Error loading initial data:', error);

        if (error.message && error.message.includes('Rate limit')) {
          if (currentRetry < MAX_RETRIES) {
            const retryDelay = 5000 * Math.pow(2, currentRetry);
            toast.error(
              `Rate limit reached. Retrying in ${retryDelay / 1000} seconds... (Attempt ${currentRetry + 1}/${MAX_RETRIES})`,
              {
                duration: retryDelay,
              }
            );

            retryTimeoutRef.current = setTimeout(() => {
              setRetryAttempt(currentRetry + 1);
              loadInitialData(currentRetry + 1);
            }, retryDelay);
          } else {
            toast.error(
              'Rate limit exceeded. Please wait a moment and refresh the page manually.',
              {
                duration: 10000,
                action: {
                  label: 'Refresh',
                  onClick: () => window.location.reload(),
                },
              }
            );
          }
        } else {
          toast.error('Failed to load initial data. Please refresh the page.');
        }
      } finally {
        setLoading(false);
        setLoadingSessions(false);
      }
    },
    [currentWorkspaceId, loadDraftFromStorage]
  );

  const processAndEmbedDocument = useCallback(
    async (file) => {
      let newDoc = null;
      let newEmbeddingsCost = 0;
      let contentForRAG = '';

      try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        const isDuplicateInState = uploadedDocuments.some((d) => d.contentHash === contentHash);
        if (isDuplicateInState) {
          toast.info(`"${file.name}" already uploaded in this session, skipping.`);
          return { newDoc: null, newEmbeddingsCost: 0 };
        }

        let content = '';
        if (
          file.type.startsWith('text/') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.json')
        ) {
          content = new TextDecoder().decode(arrayBuffer);
          contentForRAG = content;
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          toast.info(`Extracting text from ${file.name}...`);

          try {
            const { file_url } = await UploadFile({ file });

            const extractResult = await ExtractDataFromUploadedFile({
              file_url: file_url,
              json_schema: {
                type: 'object',
                properties: {
                  full_text: {
                    type: 'string',
                    description: 'The complete text content extracted from the PDF',
                  },
                  page_count: { type: 'number', description: 'Number of pages in the PDF' },
                },
              },
            });

            if (extractResult.status === 'success' && extractResult.output?.full_text) {
              content = extractResult.output.full_text;
              contentForRAG = content;
              const pageInfo = extractResult.output.page_count
                ? ` (${extractResult.output.page_count} pages)`
                : '';
              toast.success(`Extracted ${content.length} characters from ${file.name}${pageInfo}`);
            } else {
              toast.warning(`Could not extract text from ${file.name}. Using as reference only.`);
              content = `PDF Document: ${file.name} (text extraction failed)`;
              contentForRAG = '';
            }

            newDoc = { file_url };
          } catch (extractError) {
            console.error('PDF extraction error:', extractError);
            toast.warning(`PDF text extraction failed for ${file.name}. Using as reference only.`);
            content = `PDF Document: ${file.name}`;
            contentForRAG = '';
          }
        } else {
          try {
            content = new TextDecoder().decode(arrayBuffer);
            contentForRAG = content;
          } catch (readError) {
            console.warn(`Could not read ${file.name} as text:`, readError);
            content = `File: ${file.name} (content extraction not supported for this file type)`;
            contentForRAG = '';
          }
        }

        if (!newDoc?.file_url) {
          const { file_url } = await UploadFile({ file });
          newDoc = { file_url };
        }

        newDoc = {
          ...newDoc,
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          content: content,
          size: file.size,
          type: file.type,
          includedInContext: true,
          contentHash: contentHash,
          chunks: [],
          embeddings: [],
          embeddingModel: null,
          chunkingStrategy: null,
          structureAnalysis: null,
          tokenCount: 0,
          estimatedCost: 0,
          fromCache: false,
        };

        if (useRAG && contentForRAG.trim()) {
          try {
            let cachedEmbeddingData = null;
            try {
              const existingDocsInDb = await db.entities.Document.filter(
                { contentHash: contentHash },
                '',
                1
              );
              if (existingDocsInDb.length > 0 && existingDocsInDb[0].embedding_cache) {
                cachedEmbeddingData = existingDocsInDb[0].embedding_cache;
              }
            } catch (error) {
              console.warn('Failed to query Document entity for cached embeddings:', error);
            }

            const { data } = await ragHelper({
              endpoint: 'generateEmbeddings',
              documentId: newDoc.id,
              content: contentForRAG,
              fileName: file.name,
              chunkingStrategy: 'auto',
              cachedEmbeddings: cachedEmbeddingData,
            });

            if (data) {
              newDoc.chunks = data.chunks || [];
              newDoc.embeddings = data.embeddings || [];
              newDoc.embeddingModel = data.embeddingModel || 'unknown';
              newDoc.chunkingStrategy = data.chunkingStrategy || 'unknown';
              newDoc.structureAnalysis = data.structureAnalysis || null;
              newDoc.tokenCount = data.tokenCount || 0;
              newDoc.estimatedCost = data.estimatedCost || 0;
              newDoc.fromCache = data.fromCache || false;

              if (!newDoc.fromCache) {
                newEmbeddingsCost = data.estimatedCost || 0;
              }

              if (!newDoc.fromCache) {
                try {
                  const docRecord = {
                    title: file.name,
                    file_url: newDoc.file_url,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    contentHash: contentHash,
                    workspace_id: currentWorkspaceId,
                    embedding_cache: {
                      content_hash: contentHash,
                      chunks: data.chunks,
                      embeddings: data.embeddings,
                      model: data.embeddingModel,
                      chunking_strategy: data.chunkingStrategy,
                      structure_analysis: data.structureAnalysis,
                      created_at: new Date().toISOString(),
                      token_count: data.tokenCount,
                      estimated_cost: data.estimatedCost,
                    },
                  };
                  await db.entities.Document.create(docRecord);
                } catch (cacheError) {
                  console.error('Failed to cache embeddings in Document entity:', cacheError);
                }
              }

              const cacheStatus = newDoc.fromCache ? ' (cached)' : ' (new)';
              const modelInfo =
                newDoc.embeddingModel === 'text-embedding-ada-002' ? 'OpenAI' : 'Simulated';
              toast.success(
                `${file.name}: ${modelInfo}${cacheStatus} • $${newDoc.estimatedCost.toFixed(4)}`,
                { duration: 3000 }
              );
            } else {
              toast.warning(`${file.name} uploaded but RAG processing returned no usable data.`);
            }
          } catch (ragError) {
            console.error('RAG processing error:', ragError);
            toast.warning(`${file.name} uploaded but RAG processing failed: ${ragError.message}.`);
          }
        } else if (useRAG && !contentForRAG.trim()) {
          toast.info(`${file.name}: No text content extracted for RAG processing.`);
        } else if (!useRAG) {
          toast.success(`${file.name} uploaded. RAG is disabled.`);
        }

        return { newDoc, newEmbeddingsCost };
      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError);
        toast.error(`Failed to upload or process: ${fileError.message}`);
        throw fileError;
      }
    },
    [uploadedDocuments, useRAG, currentWorkspaceId]
  );

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
    [assignments, projects, clearDraftFromStorage]
  );

  // Effects
  useEffect(() => {
    loadInitialData(0);
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [currentWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const checkPendingDocument = async () => {
      const pendingDoc = sessionStorage.getItem('askAI_pendingDocument');
      if (pendingDoc) {
        try {
          const fileData = JSON.parse(pendingDoc);
          if (Date.now() - fileData.timestamp < 10000) {
            toast.info(`Loading converted document: ${fileData.file.name}...`);
            const response = await fetch(fileData.url);
            if (!response.ok) throw new Error(`Failed to fetch pending document`);
            const blob = await response.blob();
            const file = new File([blob], fileData.file.name, { type: fileData.file.type });

            setIsUploading(true);
            setIsProcessingEmbeddings(true);
            setEmbeddingProgress({ current: 0, total: 1 });

            const { newDoc, newEmbeddingsCost } = await processAndEmbedDocument(file);

            if (newDoc) {
              setUploadedDocuments((prev) => [...prev, newDoc]);
              setTotalEmbeddingCost((prev) => prev + newEmbeddingsCost);
              setSessionModified(true);
              toast.success(`${fileData.file.name} added successfully!`);
            }
          }
        } catch (error) {
          console.error('Error loading pending document:', error);
          toast.error('Failed to load converted document');
        } finally {
          setIsUploading(false);
          setIsProcessingEmbeddings(false);
          setEmbeddingProgress({ current: 0, total: 0 });
          sessionStorage.removeItem('askAI_pendingDocument');
        }
      }
    };
    checkPendingDocument();
  }, [processAndEmbedDocument]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track whether we have content to enable auto-save (primitive value for stable dependency)
  const hasContentForAutoSave = messages.length > 0 || uploadedDocuments.length > 0;

  // Auto-save effect - stable interval that won't recreate on every state change
  useEffect(() => {
    if (hasContentForAutoSave && !currentSession) {
      const interval = setInterval(() => {
        saveDraftToStorage();
      }, AUTO_SAVE_INTERVAL);
      return () => clearInterval(interval);
    }
    return () => {};
  }, [hasContentForAutoSave, currentSession, saveDraftToStorage]); // Only re-run when content presence or session changes

  // Efficient session modification tracking using shallow comparison
  // instead of expensive JSON.stringify on every render
  useEffect(() => {
    if (!currentSession) {
      setSessionModified(false);
      return;
    }

    // Quick checks first (most likely to detect changes)
    const sessionMessages = currentSession.messages || [];
    const sessionDocuments = currentSession.documents || [];

    // Check counts first (fast)
    if (
      messages.length !== sessionMessages.length ||
      uploadedDocuments.length !== sessionDocuments.length
    ) {
      setSessionModified(true);
      return;
    }

    // Check assignment change
    if (selectedAssignment?.id !== currentSession.assignment_id) {
      setSessionModified(true);
      return;
    }

    // Check message IDs and content (more expensive, but only if counts match)
    const hasMessageChanges = messages.some((m, i) => {
      const sessionMsg = sessionMessages[i];
      return (
        !sessionMsg ||
        m.id !== sessionMsg.id ||
        m.content !== sessionMsg.content ||
        m.excludedFromContext !== (sessionMsg.excludedFromContext || false)
      );
    });

    if (hasMessageChanges) {
      setSessionModified(true);
      return;
    }

    // Check document IDs and inclusion state
    const hasDocumentChanges = uploadedDocuments.some((d, i) => {
      const sessionDoc = sessionDocuments[i];
      return (
        !sessionDoc ||
        d.id !== sessionDoc.id ||
        (d.includedInContext !== false) !== (sessionDoc.includedInContext !== false)
      );
    });

    setSessionModified(hasDocumentChanges);
  }, [messages, uploadedDocuments, selectedAssignment, currentSession]);

  // Handlers
  const handleLoadSession = async (session) => {
    if (
      sessionModified ||
      ((messages.length > 0 || uploadedDocuments.length > 0) && !currentSession)
    ) {
      setPendingSessionToLoad(session);
      setIsLoadNewSessionDialogOpen(true);
    } else {
      confirmLoadSession(session);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await db.entities.ChatSession.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      if (currentSession?.id === sessionId) {
        handleNewConversation();
      }

      setDeleteConfirmSession(null);
      toast.success('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleNewConversation = () => {
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
  };

  const handleFileUpload = async (event) => {
    let files = Array.from(event.target.files);

    if (files.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (uploadedDocuments.length + files.length > MEMORY_LIMITS.MAX_DOCUMENTS) {
      toast.error(
        `Cannot upload ${files.length} files. Maximum ${MEMORY_LIMITS.MAX_DOCUMENTS} documents per session.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const oversizedFiles = files.filter((f) => f.size > MEMORY_LIMITS.MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed ${MEMORY_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
      files = files.filter((f) => f.size <= MEMORY_LIMITS.MAX_FILE_SIZE);
    }

    if (files.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setIsProcessingEmbeddings(true);
    setEmbeddingProgress({ current: 0, total: files.length });

    const successfulUploads = [];
    const failedFiles = [];
    // Use refs for atomic counters to avoid race conditions with concurrent workers
    processedCountRef.current = 0;
    embeddingCostRef.current = 0;

    const queue = [...files];
    const processingPromises = [];

    const worker = async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (file) {
          try {
            const { newDoc, newEmbeddingsCost } = await processAndEmbedDocument(file);
            if (newDoc) {
              successfulUploads.push(newDoc);
              // Use ref for atomic increment to avoid race conditions
              embeddingCostRef.current += newEmbeddingsCost;
            }
          } catch (error) {
            failedFiles.push(file.name);
          } finally {
            // Atomic increment using ref
            processedCountRef.current += 1;
            setEmbeddingProgress((prev) => ({ ...prev, current: processedCountRef.current }));
          }
        }
      }
    };

    for (let i = 0; i < MAX_CONCURRENT_UPLOADS; i++) {
      processingPromises.push(worker());
    }

    try {
      await Promise.all(processingPromises);
      // Read final cost from ref after all workers complete
      const finalEmbeddingCost = embeddingCostRef.current;
      setTotalEmbeddingCost((prev) => prev + finalEmbeddingCost);

      if (successfulUploads.length > 0) {
        setUploadedDocuments((prev) => [...prev, ...successfulUploads]);
        setSessionModified(true);
      }

      if (failedFiles.length > 0) {
        toast.error(`Failed to process ${failedFiles.length} file(s).`);
      }

      if (successfulUploads.length > 0) {
        const cachedCount = successfulUploads.filter((doc) => doc.fromCache).length;
        const newGeneratedCount = successfulUploads.length - cachedCount;

        if (newGeneratedCount > 0 && finalEmbeddingCost > 0) {
          toast.success(
            `${newGeneratedCount} file(s) processed (est. cost: $${finalEmbeddingCost.toFixed(4)}). ${cachedCount} cached.`,
            { duration: 5000 }
          );
        } else if (cachedCount > 0) {
          toast.success(`${cachedCount} file(s) processed using cached embeddings.`, {
            duration: 4000,
          });
        } else {
          toast.success(`${successfulUploads.length} file(s) uploaded successfully.`);
        }
      }
    } catch (error) {
      console.error('Batch file upload processing error:', error);
      toast.error('An unexpected error occurred during batch file processing.');
    } finally {
      setIsUploading(false);
      setIsProcessingEmbeddings(false);
      setEmbeddingProgress({ current: 0, total: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDocument = (docId) => {
    setUploadedDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    toast.success('Document removed');
  };

  const toggleDocumentInContext = (docId) => {
    setUploadedDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, includedInContext: !d.includedInContext } : d))
    );
  };

  const toggleMessageInContext = (messageId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, excludedFromContext: !m.excludedFromContext } : m
      )
    );
  };

  const handleDeleteMessage = (messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setSessionModified(true);
    toast.success('Message deleted');
  };

  const handleSendMessage = async () => {
    if (
      !inputMessage.trim() &&
      uploadedDocuments.filter((d) => d.includedInContext !== false).length === 0
    ) {
      toast.error('Please enter a message or upload documents for context.');
      return;
    }

    if (messages.length >= MEMORY_LIMITS.MAX_MESSAGES) {
      toast.error(`Maximum ${MEMORY_LIMITS.MAX_MESSAGES} messages reached.`);
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      excludedFromContext: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const activeDocuments = uploadedDocuments.filter((doc) => doc.includedInContext !== false);
      const activeMessages = [...messages, userMessage].filter((msg) => !msg.excludedFromContext);

      let contextData = [];
      let relevantChunks = [];
      let ragMetadata = {
        usedRAG: false,
        usingRealEmbeddings: false,
        totalChunksSearched: 0,
        chunksRetrieved: 0,
        chunkTypes: [],
      };

      const docsWithRealEmbeddings = activeDocuments.filter(
        (doc) =>
          doc.embeddingModel === 'text-embedding-ada-002' && doc.chunks && doc.chunks.length > 0
      );
      const docsWithSimulatedEmbeddings = activeDocuments.filter(
        (doc) => doc.embeddingModel === 'simulated' && doc.chunks && doc.chunks.length > 0
      );
      const docsWithoutEmbeddingsOrContent = activeDocuments.filter(
        (doc) => !doc.chunks || doc.chunks.length === 0
      );

      if (useRAG && docsWithRealEmbeddings.length > 0) {
        try {
          ragMetadata.usedRAG = true;
          const allChunks = docsWithRealEmbeddings.flatMap((doc) =>
            (doc.chunks || []).map((chunk, idx) => ({
              ...chunk,
              documentId: doc.id,
              documentName: doc.name,
              embedding: doc.embeddings?.[idx],
              chunkType: chunk.chunkType,
            }))
          );
          ragMetadata.totalChunksSearched = allChunks.length;

          if (allChunks.length > 0) {
            const { data } = await ragHelper({
              endpoint: 'findSimilarChunks',
              query: inputMessage,
              chunks: allChunks,
              topK: 5,
            });

            if (data && Array.isArray(data.chunks)) {
              relevantChunks = data.chunks;
              ragMetadata.chunksRetrieved = relevantChunks.length;
              ragMetadata.usingRealEmbeddings = data.usingRealEmbeddings;
              ragMetadata.chunkTypes = [
                ...new Set(relevantChunks.map((c) => c.chunkType || 'unknown')),
              ];

              contextData = relevantChunks.map((chunk) => ({
                documentName: chunk.documentName,
                text: chunk.text,
                relevanceScore: chunk.score,
                chunkType: chunk.chunkType,
              }));
            }
          }
        } catch (ragError) {
          console.error('RAG retrieval error:', ragError);
          toast.warning('RAG retrieval failed. Falling back to full document content.');
          ragMetadata.usedRAG = false;
        }
      }

      const fullTextContextDocs = [
        ...docsWithSimulatedEmbeddings,
        ...docsWithoutEmbeddingsOrContent,
        ...(useRAG && !ragMetadata.usedRAG ? docsWithRealEmbeddings : []),
      ].filter((doc) => doc.content && doc.content.trim());

      if (fullTextContextDocs.length > 0) {
        fullTextContextDocs.forEach((doc) => {
          contextData.push({
            documentName: doc.name,
            text: doc.content.substring(0, 2000),
          });
        });
      }

      // Increased from 20 to 50 for better context retention
      const conversationHistory = activeMessages.slice(-50).map((msg) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      let systemPrompt =
        'You are a helpful AI assistant analyzing documents and answering questions.';

      if (selectedProject) {
        systemPrompt += `\n\nCurrent Project: ${selectedProject.name}`;
        if (selectedProject.description)
          systemPrompt += `\nDescription: ${selectedProject.description}`;

        // Add project memory bank if available
        if (projectMemory) {
          systemPrompt += buildProjectMemoryPrompt(projectMemory);
        }
      }

      if (selectedAssignment) {
        systemPrompt += `\n\nCurrent Assignment: ${selectedAssignment.name}`;
        if (selectedAssignment.description)
          systemPrompt += `\nDescription: ${selectedAssignment.description}`;
      }

      if (contextData.length > 0) {
        systemPrompt += '\n\nRelevant Document Context:';
        contextData.forEach((ctx, idx) => {
          systemPrompt += `\n\n--- Document ${idx + 1}: ${ctx.documentName} ---`;
          if (ctx.relevanceScore)
            systemPrompt += ` (Relevance: ${(ctx.relevanceScore * 100).toFixed(1)}%)`;
          if (ctx.chunkType) systemPrompt += ` (Type: ${ctx.chunkType})`;
          systemPrompt += `\n${ctx.text}`;
        });
        systemPrompt += '\n--- End Document Context ---';
      }

      const fullPromptContent =
        conversationHistory
          .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n') + `\n\nUser: ${userMessage.content}`;

      const response = await InvokeLLM({
        prompt: `${systemPrompt}\n\n${fullPromptContent}`,
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        source_documents: contextData.map((ctx) => ctx.documentName),
        excludedFromContext: false,
        ragMetadata: ragMetadata.usedRAG ? ragMetadata : undefined,
        ragUsed: ragMetadata.usedRAG,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error processing message:', error);

      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        excludedFromContext: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSession = async () => {
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

      await loadInitialData(0);
      setIsSaveDialogOpen(false);
      setSessionName('');
      setSessionDescription('');

      // Update project memory bank after saving session
      if (selectedProject && currentWorkspaceId) {
        try {
          const sessionId = currentSession?.id || null;
          await updateProjectMemoryFromChat(
            selectedProject.id,
            currentWorkspaceId,
            messages,
            uploadedDocuments,
            sessionId
          );
          // Reload project memory to reflect updates
          const updatedMemory = await getProjectMemory(selectedProject.id, currentWorkspaceId);
          setProjectMemory(updatedMemory);
        } catch (memoryError) {
          console.error('Error updating project memory:', memoryError);
          // Don't show error to user - memory update is a background enhancement
        }
      }
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Failed to save session');
    }
  };

  const handleExportSession = async (format) => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    setIsExporting(true);

    try {
      const sessionTitle = currentSession?.name || `AI Chat - ${new Date().toLocaleDateString()}`;
      const exportDate = new Date().toLocaleString();

      if (format === 'pdf') {
        const exportData = {
          sessionTitle,
          exportDate,
          project: selectedProject,
          assignment: selectedAssignment,
          documents: uploadedDocuments.map((d) => ({
            name: d.name,
            includedInContext: d.includedInContext !== false,
            embeddingModel: d.embeddingModel,
            chunkingStrategy: d.chunkingStrategy,
            tokenCount: d.tokenCount,
            estimatedCost: d.estimatedCost,
            fromCache: d.fromCache,
          })),
          messages: messages.map((m) => ({
            role: m.type === 'user' ? 'You' : 'AI Assistant',
            content: m.content,
            timestamp: m.timestamp,
            excludedFromContext: m.excludedFromContext || false,
            ragMetadata: m.ragMetadata || undefined,
            ragUsed: m.ragUsed || undefined,
          })),
        };

        const response = await exportSessionToPdf(exportData);

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        toast.success('PDF exported successfully');
      } else if (format === 'markdown') {
        let markdown = `# ${sessionTitle}\n\n`;
        markdown += `**Export Date:** ${exportDate}\n\n`;

        if (selectedProject) {
          markdown += `**Project:** ${selectedProject.name}\n`;
          if (selectedProject.description)
            markdown += `Description: ${selectedProject.description}\n`;
          markdown += `\n`;
        }

        if (selectedAssignment) {
          markdown += `**Assignment:** ${selectedAssignment.name}\n`;
          if (selectedAssignment.description)
            markdown += `Description: ${selectedAssignment.description}\n`;
          markdown += `\n`;
        }

        if (uploadedDocuments.length > 0) {
          markdown += `## Documents (${uploadedDocuments.length})\n\n`;
          uploadedDocuments.forEach((doc) => {
            let docInfo = `- ${doc.name}`;
            if (!doc.includedInContext) docInfo += ' *(excluded from context)*';
            if (doc.embeddingModel === 'text-embedding-ada-002')
              docInfo += ' *(OpenAI Embeddings)*';
            if (doc.embeddingModel === 'simulated') docInfo += ' *(Simulated Embeddings)*';
            if (doc.chunkingStrategy) docInfo += ` *(Chunking: ${doc.chunkingStrategy})*`;
            if (doc.tokenCount > 0) docInfo += ` *(Tokens: ${doc.tokenCount})*`;
            if (doc.estimatedCost > 0) docInfo += ` *(Cost: $${doc.estimatedCost.toFixed(4)})*`;
            if (doc.fromCache) docInfo += ` *(Cached)*`;
            markdown += `${docInfo}\n`;
          });
          markdown += `\n`;
        }

        markdown += `## Conversation\n\n`;

        messages.forEach((msg) => {
          const role = msg.type === 'user' ? '**You**' : '**AI Assistant**';
          const timestamp = new Date(msg.timestamp).toLocaleTimeString();
          const exclusion = msg.excludedFromContext ? ' *(excluded from context)*' : '';
          let ragInfo = '';
          if (msg.ragMetadata?.usedRAG) {
            ragInfo = ` *(Used RAG: ${msg.ragMetadata.usingRealEmbeddings ? 'OpenAI' : 'Simulated'} embeddings, ${msg.ragMetadata.chunksRetrieved} chunks`;
            if (msg.ragMetadata.chunkTypes && msg.ragMetadata.chunkTypes.length > 0) {
              ragInfo += `, Types: ${msg.ragMetadata.chunkTypes.join(', ')}`;
            }
            ragInfo += `)*`;
          }

          markdown += `### ${role} - ${timestamp}${exclusion}${ragInfo}\n\n`;
          markdown += `${msg.content}\n\n`;
          markdown += `---\n\n`;
        });

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        toast.success('Markdown exported successfully');
      }

      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

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

  // Calculate statistics
  const showDocumentWarning = uploadedDocuments.length >= MEMORY_LIMITS.WARNING_DOCUMENTS;
  const showMessageWarning = messages.length >= MEMORY_LIMITS.WARNING_MESSAGES;
  const documentCapacityPercent = (uploadedDocuments.length / MEMORY_LIMITS.MAX_DOCUMENTS) * 100;
  const messageCapacityPercent = (messages.length / MEMORY_LIMITS.MAX_MESSAGES) * 100;
  const excludedMessageCount = messages.filter((m) => m.excludedFromContext).length;
  const excludedDocumentCount = uploadedDocuments.filter(
    (d) => d.includedInContext === false
  ).length;
  const docsWithEmbeddings = uploadedDocuments.filter((d) => d.chunks && d.chunks.length > 0);
  const docsWithRealEmbeddings = uploadedDocuments.filter(
    (d) => d.embeddingModel === 'text-embedding-ada-002'
  );
  const docsWithSimulatedEmbeddings = uploadedDocuments.filter(
    (d) => d.embeddingModel === 'simulated'
  );
  const docsWithSemanticChunking = uploadedDocuments.filter(
    (d) => d.chunkingStrategy === 'semantic'
  );

  const handleSessionTemplateSelect = (template) => {
    setUseRAG(template.settings.ragEnabled);
    toast.success(`Applied template: ${template.name}`);
  };

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question);
  };

  const handleDragDropFiles = async (files) => {
    const syntheticEvent = { target: { files: files } };
    await handleFileUpload(syntheticEvent);
  };

  // Add linked documents from assignments/projects
  const addLinkedDocuments = useCallback((linkedDocs) => {
    if (!linkedDocs || linkedDocs.length === 0) return;

    // Filter out folder placeholders and docs without file_url
    const validDocs = linkedDocs.filter(
      (d) => d.document_type !== 'folder_placeholder' && d.file_url
    );

    if (validDocs.length === 0) return;

    // Convert to format expected by useAskAI, marking them as auto-loaded
    const docsForContext = validDocs.map((doc) => ({
      id: doc.id,
      name: doc.title || doc.file_name || 'Untitled Document',
      file_url: doc.file_url,
      content: doc.extracted_text || '',
      size: doc.file_size || 0,
      type: doc.file_type || 'application/octet-stream',
      includedInContext: true,
      autoLoaded: true, // Flag to distinguish from manually uploaded
      linkedDocumentId: doc.id, // Reference to original document
      // Initialize embedding fields (will need processing if RAG is needed)
      chunks: [],
      embeddings: [],
      embeddingModel: null,
      chunkingStrategy: null,
      structureAnalysis: null,
      tokenCount: 0,
      estimatedCost: 0,
      contentHash: null,
      fromCache: false,
    }));

    setUploadedDocuments((prev) => {
      // Remove previous auto-loaded docs, keep manually uploaded ones
      const manualDocs = prev.filter((d) => !d.autoLoaded);
      // Avoid duplicates by checking linkedDocumentId
      const existingIds = new Set(manualDocs.map((d) => d.linkedDocumentId).filter(Boolean));
      const newDocs = docsForContext.filter((d) => !existingIds.has(d.linkedDocumentId));
      return [...manualDocs, ...newDocs];
    });

    if (docsForContext.length > 0) {
      toast.info(`${docsForContext.length} linked document(s) added to context`, {
        duration: 3000,
      });
    }
  }, []);

  // Clear auto-loaded documents (when context changes)
  const clearAutoLoadedDocuments = useCallback(() => {
    setUploadedDocuments((prev) => prev.filter((d) => !d.autoLoaded));
  }, []);

  return {
    // State
    currentUser,
    assignments,
    projects,
    selectedAssignment,
    selectedProject,
    contextType,
    uploadedDocuments,
    messages,
    inputMessage,
    isProcessing,
    isUploading,
    currentSession,
    sessionModified,
    isSaveDialogOpen,
    sessionName,
    sessionDescription,
    useRAG,
    isProcessingEmbeddings,
    embeddingProgress,
    totalEmbeddingCost,
    sessions,
    loadingSessions,
    isSessionsSheetOpen,
    sessionSearchQuery,
    sessionSortBy,
    deleteConfirmSession,
    isLoadNewSessionDialogOpen,
    pendingSessionToLoad,
    isExportDialogOpen,
    exportFormat,
    isExporting,
    loading,
    showOnboardingTutorial,
    showQuickStartGuide,
    showKeyboardShortcuts,
    showSessionTemplates,
    showCostEstimator,
    costEstimatorData,
    projectMemory,
    isLoadingMemory,

    // Refs
    messagesEndRef,
    fileInputRef,

    // Computed
    sortedSessions,
    showDocumentWarning,
    showMessageWarning,
    documentCapacityPercent,
    messageCapacityPercent,
    excludedMessageCount,
    excludedDocumentCount,
    docsWithEmbeddings,
    docsWithRealEmbeddings,
    docsWithSimulatedEmbeddings,
    docsWithSemanticChunking,

    // Setters
    setSelectedAssignment,
    setSelectedProject,
    setContextType,
    setInputMessage,
    setIsSaveDialogOpen,
    setSessionName,
    setSessionDescription,
    setUseRAG,
    setIsSessionsSheetOpen,
    setSessionSearchQuery,
    setSessionSortBy,
    setDeleteConfirmSession,
    setIsLoadNewSessionDialogOpen,
    setPendingSessionToLoad,
    setIsExportDialogOpen,
    setExportFormat,
    setShowOnboardingTutorial,
    setShowQuickStartGuide,
    setShowKeyboardShortcuts,
    setShowSessionTemplates,
    setShowCostEstimator,
    setCostEstimatorData,

    // Handlers
    handleLoadSession,
    handleDeleteSession,
    handleDeleteMessage,
    handleNewConversation,
    handleFileUpload,
    handleRemoveDocument,
    toggleDocumentInContext,
    toggleMessageInContext,
    handleSendMessage,
    handleSaveSession,
    handleExportSession,
    handleSessionTemplateSelect,
    handleSuggestedQuestion,
    handleDragDropFiles,
    confirmLoadSession,
    loadInitialData,
    addLinkedDocuments,
    clearAutoLoadedDocuments,
  };
}
