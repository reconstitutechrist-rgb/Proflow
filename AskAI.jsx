
import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client"; // NEW: base44 client import
import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Send,
  Upload,
  FileText,
  X,
  Brain,
  MessageSquare,
  Sparkles,
  Plus,
  Save,
  Trash2,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Info,
  History,
  Search,
  DollarSign,
  Clock,
  Archive,
  ArrowUpDown,
  Download,
  FileDown,
  Eye,
  EyeOff,
  Zap,
  MoreVertical,
  CheckCircle,
  XCircle,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import { ragHelper } from "@/api/functions";
import { exportSessionToPdf } from "@/api/functions";
import { useWorkspace } from "../components/workspace/WorkspaceContext";

// Import new enhancement components
import OnboardingTutorial from "./components/OnboardingTutorial";
import DocumentSidebar from "./components/DocumentSidebar";
import MessageActions from "./components/MessageActions";
import SessionTemplates from "./components/SessionTemplates";
import CostEstimator from "./components/CostEstimator";
import DragDropZone from "./components/DragDropZone";
import ContextualTooltip from "./components/ContextualTooltip";
import SuggestedQuestions from "./components/SuggestedQuestions";
import ProgressIndicator from "./components/ProgressIndicator";
import QuickStartGuide from "./components/QuickStartGuide";
import KeyboardShortcuts from "./components/KeyboardShortcuts";

const MEMORY_LIMITS = {
  MAX_DOCUMENTS: 50,
  MAX_MESSAGES: 200,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  WARNING_DOCUMENTS: 30,
  WARNING_MESSAGES: 150,
};

const DRAFT_STORAGE_KEY = "askAI_draft_v1";
const AUTO_SAVE_INTERVAL = 60000; // 1 minute
const MAX_CONCURRENT_UPLOADS = 3; // For parallelizing file processing

export default function AskAIPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionModified, setSessionModified] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  
  // RAG state
  const [useRAG, setUseRAG] = useState(true);
  const [isProcessingEmbeddings, setIsProcessingEmbeddings] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState({ current: 0, total: 0 });
  const [totalEmbeddingCost, setTotalEmbeddingCost] = useState(0); // New state for cost tracking
  
  // Session management states
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false); // Kept loadingSessions state
  const [isSessionsSheetOpen, setIsSessionsSheetOpen] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [sessionSortBy, setSessionSortBy] = useState("recent");
  const [deleteConfirmSession, setDeleteConfirmSession] = useState(null);
  const [isLoadNewSessionDialogOpen, setIsLoadNewSessionDialogOpen] = useState(false);
  const [pendingSessionToLoad, setPendingSessionToLoad] = useState(null);
  
  // Export state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("markdown");
  const [isExporting, setIsExporting] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true); // NEW: general loading state for initial fetch

  const { currentWorkspaceId } = useWorkspace();

  const [retryAttempt, setRetryAttempt] = useState(0);
  const MAX_RETRIES = 3;
  const retryTimeoutRef = useRef(null); // Added useRef for retry timeout

  // Enhancement feature states
  const [showOnboardingTutorial, setShowOnboardingTutorial] = useState(false);
  const [showQuickStartGuide, setShowQuickStartGuide] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSessionTemplates, setShowSessionTemplates] = useState(false);
  const [showCostEstimator, setShowCostEstimator] = useState(false);
  const [costEstimatorData, setCostEstimatorData] = useState(null);
  const [documentSidebarCollapsed, setDocumentSidebarCollapsed] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [undoStack, setUndoStack] = useState([]);
  const [sessionTags, setSessionTags] = useState([]);
  const [sessionNotes, setSessionNotes] = useState({});
  const [relevanceThreshold, setRelevanceThreshold] = useState(0.5);
  const [multiQueryEnabled, setMultiQueryEnabled] = useState(false);
  const [hybridSearchEnabled, setHybridSearchEnabled] = useState(false);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [operationProgress, setOperationProgress] = useState(null);

  // Check if first-time user
  useEffect(() => {
    const hasVisited = localStorage.getItem('askAI_hasVisited');
    if (!hasVisited) {
      setShowQuickStartGuide(true);
      localStorage.setItem('askAI_hasVisited', 'true');
    }
  }, []);

  // IMPORTANT: Define ALL callback functions BEFORE useEffects that use them
  
  // 1. clearDraftFromStorage (no dependencies)
  const clearDraftFromStorage = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  }, []); // No dependencies

  // 2. saveDraftToStorage (depends on state)
  const saveDraftToStorage = useCallback(() => {
    try {
      const draft = {
        messages: messages.map(m => ({
          ...m,
          excludedFromContext: m.excludedFromContext || false,
          ragMetadata: m.ragMetadata || undefined,
          source_documents: m.source_documents || undefined,
          confidence_score: m.confidence_score || undefined,
          ragUsed: m.ragUsed || undefined
        })),
        documents: uploadedDocuments.map(d => ({
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
          fromCache: d.fromCache || false
        })),
        assignmentId: selectedAssignment?.id,
        totalEmbeddingCost: totalEmbeddingCost,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  }, [messages, uploadedDocuments, selectedAssignment, totalEmbeddingCost]);

  // 3. loadDraftFromStorage (depends on clearDraftFromStorage, assignments)
  const loadDraftFromStorage = useCallback(() => {
    try {
      const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.messages?.length > 0 || draft.documents?.length > 0) {
          const draftAge = Date.now() - new Date(draft.timestamp).getTime();
          if (draftAge < 24 * 60 * 60 * 1000) {
            setMessages((draft.messages || []).map(m => ({
              ...m,
              excludedFromContext: m.excludedFromContext || false,
              ragMetadata: m.ragMetadata || undefined,
              source_documents: m.source_documents || undefined,
              confidence_score: m.confidence_score || undefined,
              ragUsed: m.ragUsed || undefined
            })));
            setUploadedDocuments((draft.documents || []).map(d => ({
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
              fromCache: d.fromCache || false
            })));
            if (draft.assignmentId && assignments.length > 0) {
              const assignment = assignments.find(a => a.id === draft.assignmentId);
              if (assignment) setSelectedAssignment(assignment);
            }
            setTotalEmbeddingCost(draft.totalEmbeddingCost || 0);
            toast.info("Restored unsaved work from draft", {
              action: {
                label: "Discard",
                onClick: () => {
                  clearDraftFromStorage();
                  setMessages([]);
                  setUploadedDocuments([]);
                  setSelectedAssignment(null);
                  setTotalEmbeddingCost(0);
                }
              }
            });
          } else {
            clearDraftFromStorage();
          }
        }
      }
    } catch (error) {
      console.error("Error loading draft:", error);
    }
  }, [assignments, clearDraftFromStorage, setMessages, setUploadedDocuments, setSelectedAssignment, setTotalEmbeddingCost]); // Added setters to dependencies

  // 4. loadInitialData (depends on loadDraftFromStorage)
  const loadInitialData = useCallback(async (currentRetry = 0) => {
    if (!currentWorkspaceId) return;
    
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    try {
      setLoading(true);
      setLoadingSessions(true);

      // Load user data first
      const userData = await base44.auth.me();
      setCurrentUser(userData);

      // Longer delay to avoid rate limiting - exponential backoff
      const baseDelay = 500; // Increased base delay
      const delay = baseDelay * Math.pow(2, currentRetry);
      await new Promise(resolve => setTimeout(resolve, delay));

      const assignmentsData = await base44.entities.Assignment.filter(
        { workspace_id: currentWorkspaceId }, 
        "-updated_date", 
        20
      );
      setAssignments(assignmentsData);

      // Another delay
      await new Promise(resolve => setTimeout(resolve, delay));

      const sessionsData = await base44.entities.AIChatSession.filter(
        { workspace_id: currentWorkspaceId }, 
        "-last_activity", 
        50
      );
      setSessions(sessionsData);
      
      // Success - reset retry attempt
      setRetryAttempt(0);
      loadDraftFromStorage(); 
      
    } catch (error) {
      console.error("Error loading initial data:", error);
      
      if (error.message && error.message.includes('Rate limit')) {
        if (currentRetry < MAX_RETRIES) {
          const retryDelay = 5000 * Math.pow(2, currentRetry); // 5s, 10s, 20s
          toast.error(`Rate limit reached. Retrying in ${retryDelay/1000} seconds... (Attempt ${currentRetry + 1}/${MAX_RETRIES})`, {
            duration: retryDelay
          });
          
          retryTimeoutRef.current = setTimeout(() => {
            setRetryAttempt(currentRetry + 1); // Update the state
            loadInitialData(currentRetry + 1); // Pass the updated retry count
          }, retryDelay);
        } else {
          toast.error("Rate limit exceeded. Please wait a moment and refresh the page manually.", {
            duration: 10000, // Increased duration for final error toast
            action: {
              label: "Refresh",
              onClick: () => window.location.reload()
            }
          });
        }
      } else {
        toast.error("Failed to load initial data. Please refresh the page.");
      }
    } finally {
      setLoading(false);
      setLoadingSessions(false);
    }
  }, [currentWorkspaceId, loadDraftFromStorage]); // Removed retryAttempt from dependencies

  // 5. processAndEmbedDocument (complex, keep as is)
  const processAndEmbedDocument = useCallback(async (file) => {
    let newDoc = null;
    let newEmbeddingsCost = 0;
    let contentForRAG = "";

    try {
      // Get arrayBuffer for hashing and content extraction
      const arrayBuffer = await file.arrayBuffer();

      // Generate content hash from arrayBuffer for true content-based uniqueness
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Check for duplicates already in `uploadedDocuments` state by content hash
      const isDuplicateInState = uploadedDocuments.some(d => d.contentHash === contentHash);
      if (isDuplicateInState) {
        toast.info(`"${file.name}" (content hash: ${contentHash.substring(0, 8)}...) already uploaded in this session, skipping.`);
        return { newDoc: null, newEmbeddingsCost: 0 };
      }
      
      // Extract text content for RAG processing
      let content = "";
      if (file.type.startsWith("text/") || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        content = new TextDecoder().decode(arrayBuffer);
        contentForRAG = content;
      } else if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
        // Extract PDF text using the Core integration
        toast.info(`Extracting text from ${file.name}...`);
        
        try {
          // First upload the file to get a URL
          const { file_url } = await UploadFile({ file });
          
          // Use ExtractDataFromUploadedFile to extract text from PDF
          const extractResult = await ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: {
              type: "object",
              properties: {
                full_text: {
                  type: "string",
                  description: "The complete text content extracted from the PDF"
                },
                page_count: {
                  type: "number",
                  description: "Number of pages in the PDF"
                }
              }
            }
          });

          if (extractResult.status === "success" && extractResult.output?.full_text) {
            content = extractResult.output.full_text;
            contentForRAG = content;
            const pageInfo = extractResult.output.page_count ? ` (${extractResult.output.page_count} pages)` : '';
            toast.success(`Extracted ${content.length} characters from ${file.name}${pageInfo}`);
          } else {
            // Fallback if extraction fails
            toast.warning(`Could not extract text from ${file.name}. Using as reference only.`);
            content = `PDF Document: ${file.name} (text extraction failed)`;
            contentForRAG = "";
          }
          
          // Store the file_url for later use
          newDoc = { file_url };
        } catch (extractError) {
          console.error("PDF extraction error:", extractError);
          toast.warning(`PDF text extraction failed for ${file.name}. Using as reference only.`);
          content = `PDF Document: ${file.name}`;
          contentForRAG = "";
        }
      } else {
        // Attempt to read as text for other file types if possible
        try {
          content = new TextDecoder().decode(arrayBuffer);
          contentForRAG = content;
        } catch (readError) {
          console.warn(`Could not read ${file.name} as text:`, readError);
          content = `File: ${file.name} (content extraction not supported for this file type)`;
          contentForRAG = "";
        }
      }
      
      // Upload file to storage if not already done (for non-PDF files)
      if (!newDoc?.file_url) {
        const { file_url } = await UploadFile({ file });
        newDoc = { file_url };
      }
      
      // Create initial document object
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
        fromCache: false
      };

      // Generate or retrieve embeddings (only if RAG is enabled and content is available for RAG)
      if (useRAG && contentForRAG.trim()) {
        try {
          // Attempt to load embeddings from Document entity cache first
          let cachedEmbeddingData = null;
          try {
            const existingDocsInDb = await base44.entities.Document.filter({ contentHash: contentHash }, "", 1);
            if (existingDocsInDb.length > 0 && existingDocsInDb[0].embedding_cache) {
              cachedEmbeddingData = existingDocsInDb[0].embedding_cache;
            }
          } catch (error) {
            console.warn("Failed to query Document entity for cached embeddings:", error);
          }

          // Call ragHelper, passing cached data if available
          const { data } = await ragHelper({
            endpoint: 'generateEmbeddings',
            documentId: newDoc.id,
            content: contentForRAG,
            fileName: file.name,
            chunkingStrategy: 'auto',
            cachedEmbeddings: cachedEmbeddingData
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
              newEmbeddingsCost = (data.estimatedCost || 0);
            }

            // Save newly generated embeddings in the Document entity if not from cache
            if (!newDoc.fromCache) {
              try {
                const docRecord = {
                  title: file.name,
                  file_url: newDoc.file_url,
                  file_name: file.name,
                  file_size: file.size,
                  file_type: file.type,
                  contentHash: contentHash,
                  workspace_id: currentWorkspaceId, // Add workspace_id
                  embedding_cache: {
                    content_hash: contentHash,
                    chunks: data.chunks,
                    embeddings: data.embeddings,
                    model: data.embeddingModel,
                    chunking_strategy: data.chunkingStrategy,
                    structure_analysis: data.structureAnalysis,
                    created_at: new Date().toISOString(),
                    token_count: data.tokenCount,
                    estimated_cost: data.estimatedCost
                  }
                };
                await base44.entities.Document.create(docRecord); 
                console.log(`Cached newly generated embeddings for ${file.name} (hash: ${contentHash.substring(0, 8)}...) in database.`);
              } catch (cacheError) {
                console.error("Failed to cache embeddings in Document entity:", cacheError);
              }
            }

            const cacheStatus = newDoc.fromCache ? " (cached)" : " (new)";
            const modelInfo = newDoc.embeddingModel === 'text-embedding-ada-002' ? "OpenAI" : "Simulated";
            toast.success(`${file.name}: ${modelInfo}${cacheStatus} • $${newDoc.estimatedCost.toFixed(4)}`, { duration: 3000 });
          } else {
            toast.warning(`${file.name} uploaded but RAG processing returned no usable data. Will use full text.`);
          }
        } catch (ragError) {
          console.error("RAG processing error:", ragError);
          toast.warning(`${file.name} uploaded but RAG processing failed: ${ragError.message}. It will be used as full text.`);
        }
      } else if (useRAG && !contentForRAG.trim()) {
          toast.info(`${file.name}: No text content extracted for RAG processing, using full text.`);
      } else if (!useRAG) {
          toast.success(`${file.name} uploaded. RAG is disabled, full text will be used.`);
      }
      
      return { newDoc, newEmbeddingsCost };

    } catch (fileError) {
      console.error(`Error processing ${file.name}:`, fileError);
      toast.error(`Failed to upload or process: ${fileError.message}`);
      throw fileError;
    }
  }, [uploadedDocuments, useRAG, toast, currentWorkspaceId]);

  // 6. confirmLoadSession
  const confirmLoadSession = useCallback((session) => {
    try {
      // Restore messages with exclusion states and RAG metadata
      setMessages((session.messages || []).map(m => ({
        ...m,
        excludedFromContext: m.excludedFromContext || false,
        ragMetadata: m.ragMetadata || undefined,
        source_documents: m.source_documents || undefined,
        confidence_score: m.confidence_score || undefined,
        ragUsed: m.ragUsed || undefined
      })));
      
      // Restore documents with inclusion states and embedding info
      setUploadedDocuments((session.documents || []).map(d => ({
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
        fromCache: d.fromCache || false
      })));
      
      setCurrentSession(session);
      setSessionName(session.name);
      setSessionDescription(session.description || "");
      
      if (session.assignment_id) {
        const assignment = assignments.find(a => a.id === session.assignment_id);
        if (assignment) setSelectedAssignment(assignment);
        // else keep current selected assignment if none found (e.g. assignment deleted)
      } else {
        setSelectedAssignment(null);
      }

      const loadedCost = (session.documents || []).reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
      setTotalEmbeddingCost(loadedCost);
      
      setSessionModified(false);
      setIsSessionsSheetOpen(false);
      clearDraftFromStorage();
      
      toast.success(`Loaded session: ${session.name}`);
    } catch (error) {
      console.error("Error confirming load session:", error);
      toast.error("Failed to load session content");
    } finally {
      setIsLoadNewSessionDialogOpen(false);
      setPendingSessionToLoad(null);
    }
  }, [assignments, clearDraftFromStorage, setMessages, setUploadedDocuments, setCurrentSession, setSessionName, setSessionDescription, setSelectedAssignment, setTotalEmbeddingCost, setSessionModified, setIsSessionsSheetOpen]);

  // NOW all useEffects can safely use these functions
  
  // Effect to load initial data once on component mount
  useEffect(() => {
    loadInitialData(0);
    
    // Cleanup function to clear any pending retry timeouts
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [currentWorkspaceId]); // Only depend on workspace change

  // Effect to check for pending documents (e.g., from PDF converter)
  useEffect(() => {
    const checkPendingDocument = async () => {
      const pendingDoc = sessionStorage.getItem('askAI_pendingDocument');
      if (pendingDoc) {
        try {
          const fileData = JSON.parse(pendingDoc);
          
          // Check if this is a recent addition (within last 10 seconds)
          if (Date.now() - fileData.timestamp < 10000) {
            toast.info(`Loading converted document: ${fileData.file.name}...`);
            
            // Fetch the file from the URL (can be a blob URL or data URL)
            const response = await fetch(fileData.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch pending document: ${response.statusText}`);
            }
            const blob = await response.blob();
            
            // Reconstruct a File object
            const file = new File([blob], fileData.file.name, { type: fileData.file.type });
            
            // Set processing states for a single file
            setIsUploading(true);
            setIsProcessingEmbeddings(true);
            setEmbeddingProgress({ current: 0, total: 1 }); // Only one file
            
            // Process the file as if it was uploaded
            const { newDoc, newEmbeddingsCost } = await processAndEmbedDocument(file);
            
            if (newDoc) {
              setUploadedDocuments(prev => [...prev, newDoc]);
              setTotalEmbeddingCost(prev => prev + newEmbeddingsCost);
              setSessionModified(true);
              toast.success(`${fileData.file.name} added successfully!`);
            } else {
              toast.warning(`Could not add ${fileData.file.name}. It might be a duplicate or empty.`);
            }
          } else {
            // Old draft, clear it
            sessionStorage.removeItem('askAI_pendingDocument');
            return;
          }
          
        } catch (error) {
          console.error("Error loading pending document:", error);
          toast.error("Failed to load converted document");
        } finally {
          setIsUploading(false);
          setIsProcessingEmbeddings(false);
          setEmbeddingProgress({ current: 0, total: 0 });
          sessionStorage.removeItem('askAI_pendingDocument'); // Clear after processing attempt
        }
      }
    };
    
    checkPendingDocument();
  }, [processAndEmbedDocument, toast, setUploadedDocuments, setTotalEmbeddingCost, setSessionModified, setIsUploading, setIsProcessingEmbeddings, setEmbeddingProgress]); // Only depends on processAndEmbedDocument

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-save draft functionality - NOW saveDraftToStorage is defined
  useEffect(() => {
    // Only auto-save if there's unsaved work and not already a saved session
    if ((messages.length > 0 || uploadedDocuments.length > 0) && !currentSession) {
      const interval = setInterval(() => {
        saveDraftToStorage();
      }, AUTO_SAVE_INTERVAL);

      return () => clearInterval(interval);
    }
    // If there's no unsaved work or a session is active, ensure no auto-save runs
    return () => {};
  }, [messages, uploadedDocuments, selectedAssignment, currentSession, saveDraftToStorage]); // Re-evaluate auto-save when these change

  // Track session modifications
  useEffect(() => {
    if (currentSession) { // Only track modifications if a session is currently loaded
      // Standardize objects for comparison for documents
      const currentSessionDocuments = (currentSession.documents || []).map(d => ({
        id: d.id, name: d.name, file_url: d.file_url, content: d.content, size: d.size, type: d.type,
        includedInContext: d.includedInContext !== false,
        chunks: d.chunks || [], embeddings: d.embeddings || [], embeddingModel: d.embeddingModel || null,
        chunkingStrategy: d.chunkingStrategy || null,
        structureAnalysis: d.structureAnalysis || null,
        tokenCount: d.tokenCount || 0,
        estimatedCost: d.estimatedCost || 0,
        contentHash: d.contentHash || null, // Include contentHash for comparison
        fromCache: d.fromCache || false // Include fromCache for comparison
      }));
      const currentDocuments = uploadedDocuments.map(d => ({
        id: d.id, name: d.name, file_url: d.file_url, content: d.content, size: d.size, type: d.type,
        includedInContext: d.includedInContext !== false,
        chunks: d.chunks || [],
        embeddings: d.embeddings || [],
        embeddingModel: d.embeddingModel || null,
        chunkingStrategy: d.chunkingStrategy || null,
        structureAnalysis: d.structureAnalysis || null,
        tokenCount: d.tokenCount || 0,
        estimatedCost: d.estimatedCost || 0,
        contentHash: d.contentHash || null,
        fromCache: d.fromCache || false
      }));

      // Standardize objects for comparison for messages (including RAG metadata)
      const currentSessionMessages = (currentSession.messages || []).map(m => ({
        id: m.id, type: m.type, content: m.content, timestamp: m.timestamp,
        excludedFromContext: m.excludedFromContext || false,
        ragMetadata: m.ragMetadata || undefined, // Include RAG metadata
        source_documents: m.source_documents || undefined,
        confidence_score: m.confidence_score || undefined,
        ragUsed: m.ragUsed || undefined
      }));
      const currentMessages = messages.map(m => ({
        id: m.id, type: m.type, content: m.content, timestamp: m.timestamp,
        excludedFromContext: m.excludedFromContext || false,
        ragMetadata: m.ragMetadata || undefined,
        source_documents: m.source_documents || undefined,
        confidence_score: m.confidence_score || undefined,
        ragUsed: m.ragUsed || undefined
      }));

      const hasMessageChanges = JSON.stringify(currentMessages) !== JSON.stringify(currentSessionMessages);
      const hasDocumentChanges = JSON.stringify(currentDocuments) !== JSON.stringify(currentSessionDocuments);
      const hasAssignmentChange = selectedAssignment?.id !== currentSession.assignment_id;
      
      setSessionModified(hasMessageChanges || hasDocumentChanges || hasAssignmentChange);
    } else {
        // If no session is current, it can't be "modified"
        setSessionModified(false);
    }
  }, [messages, uploadedDocuments, selectedAssignment, currentSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLoadSession = async (session) => {
    if (sessionModified || (messages.length > 0 || uploadedDocuments.length > 0) && !currentSession) {
      setPendingSessionToLoad(session);
      setIsLoadNewSessionDialogOpen(true);
    } else {
      confirmLoadSession(session);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await base44.entities.AIChatSession.delete(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSession?.id === sessionId) {
        handleNewConversation(); // Start a new conversation if the current one is deleted
      }
      
      setDeleteConfirmSession(null);
      toast.success("Session deleted successfully");
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    }
  };

  const handleNewConversation = () => {
    if (sessionModified || (messages.length > 0 || uploadedDocuments.length > 0)) {
      if (!confirm("Are you sure you want to start a new conversation? Any unsaved changes will be lost.")) {
        return;
      }
    }

    setMessages([]);
    setUploadedDocuments([]);
    setSelectedAssignment(null);
    setCurrentSession(null);
    setSessionModified(false);
    setIsLoadNewSessionDialogOpen(false); // Close dialog if it was open
    setSessionName("");
    setSessionDescription("");
    setTotalEmbeddingCost(0); // Reset cost
    clearDraftFromStorage();
    toast.info("Started new conversation");
  };

  // Handle file upload with parallel processing and content-hash based caching
  const handleFileUpload = async (event) => {
    let files = Array.from(event.target.files); // Use 'let' because we might filter them

    if (files.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Combined check for exceeding total documents allowed
    if (uploadedDocuments.length + files.length > MEMORY_LIMITS.MAX_DOCUMENTS) {
      toast.error(`Cannot upload ${files.length} files. Maximum ${MEMORY_LIMITS.MAX_DOCUMENTS} documents per session.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const oversizedFiles = files.filter(f => f.size > MEMORY_LIMITS.MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed ${MEMORY_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      // Filter out oversized files from the batch
      files = files.filter(f => f.size <= MEMORY_LIMITS.MAX_FILE_SIZE);
    }
    
    if (files.length === 0) { // All files were oversized or there were no valid files left
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setIsProcessingEmbeddings(true);
    setEmbeddingProgress({ current: 0, total: files.length });

    const CONCURRENCY = MAX_CONCURRENT_UPLOADS; 
    const successfulUploads = [];
    const failedFiles = [];
    let processedCount = 0;
    let newEmbeddingsTotalCost = 0; // Total cost for this batch of new embeddings

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
              newEmbeddingsTotalCost += newEmbeddingsCost; // Accumulate cost
            }
          } catch (error) {
            failedFiles.push(file.name);
            // Error handling/toast is already inside processAndEmbedDocument
          } finally {
            processedCount++;
            setEmbeddingProgress(prev => ({ ...prev, current: processedCount }));
          }
        }
      }
    };

    // Start workers
    for (let i = 0; i < CONCURRENCY; i++) {
      processingPromises.push(worker());
    }

    try {
      await Promise.all(processingPromises);

      // Update total embedding cost in state AFTER all files are processed
      setTotalEmbeddingCost(prev => prev + newEmbeddingsTotalCost);
      
      // Add successful uploads to the main state
      if (successfulUploads.length > 0) {
        setUploadedDocuments(prev => [...prev, ...successfulUploads]);
        setSessionModified(true);
      }

      if (failedFiles.length > 0) {
        toast.error(`Failed to process ${failedFiles.length} file(s) in batch. Check console for details.`);
      }

      if (successfulUploads.length > 0) {
        const cachedCount = successfulUploads.filter(doc => doc.fromCache).length;
        const newGeneratedCount = successfulUploads.length - cachedCount;

        if (newGeneratedCount > 0 && newEmbeddingsTotalCost > 0) {
            toast.success(`${newGeneratedCount} file(s) processed with new embeddings (est. cost: $${newEmbeddingsTotalCost.toFixed(4)}). ${cachedCount} file(s) used cached embeddings.`, { duration: 5000 });
        } else if (cachedCount > 0) {
            toast.success(`${cachedCount} file(s) processed using cached embeddings (no new cost).`, { duration: 4000 });
        } else {
            toast.success(`${successfulUploads.length} file(s) uploaded successfully.`);
        }
      }

    } catch (error) {
      console.error("Batch file upload processing error:", error);
      toast.error("An unexpected error occurred during batch file processing.");
    } finally {
      setIsUploading(false);
      setIsProcessingEmbeddings(false);
      setEmbeddingProgress({ current: 0, total: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveDocument = (docId) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId));
    toast.success("Document removed");
  };

  const toggleDocumentInContext = (docId) => {
    setUploadedDocuments(prev => 
      prev.map(d => 
        d.id === docId 
          ? { ...d, includedInContext: !d.includedInContext }
          : d
      )
    );
  };

  const toggleMessageInContext = (messageId) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId
          ? { ...m, excludedFromContext: !m.excludedFromContext }
          : m
      )
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && uploadedDocuments.filter(d => d.includedInContext !== false).length === 0) {
      toast.error("Please enter a message or upload documents for context.");
      return;
    }

    if (messages.length >= MEMORY_LIMITS.MAX_MESSAGES) {
      toast.error(`Maximum ${MEMORY_LIMITS.MAX_MESSAGES} messages reached. Please consider saving this session and starting a new conversation.`);
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      excludedFromContext: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsProcessing(true);

    try {
      // Build context from included documents and messages
      const activeDocuments = uploadedDocuments.filter(doc => doc.includedInContext !== false);
      const activeMessages = [...messages, userMessage].filter(msg => !msg.excludedFromContext);
      
      let contextData = [];
      let relevantChunks = [];
      let ragMetadata = { usedRAG: false, usingRealEmbeddings: false, totalChunksSearched: 0, chunksRetrieved: 0, chunkTypes: [] };

      // Separate documents with and without embeddings
      const docsWithRealEmbeddings = activeDocuments.filter(doc => doc.embeddingModel === 'text-embedding-ada-002' && doc.chunks && doc.chunks.length > 0);
      const docsWithSimulatedEmbeddings = activeDocuments.filter(doc => doc.embeddingModel === 'simulated' && doc.chunks && doc.chunks.length > 0);
      // Removed `!doc.content.trim()` here as it's handled by the final `filter` below.
      const docsWithoutEmbeddingsOrContent = activeDocuments.filter(doc => !doc.chunks || doc.chunks.length === 0);

      // Use RAG if enabled and documents have real embeddings
      if (useRAG && docsWithRealEmbeddings.length > 0) {
        try {
          ragMetadata.usedRAG = true;
          // Collect all chunks from all documents that have real embeddings
          const allChunks = docsWithRealEmbeddings.flatMap(doc => 
            (doc.chunks || []).map((chunk, idx) => ({
              ...chunk,
              documentId: doc.id,
              documentName: doc.name,
              embedding: doc.embeddings?.[idx], // Assuming embeddings are stored corresponding to chunks
              chunkType: chunk.chunkType // Added chunkType
            }))
          );
          ragMetadata.totalChunksSearched = allChunks.length;

          if (allChunks.length > 0) {
            const { data } = await ragHelper({
              endpoint: 'findSimilarChunks',
              query: inputMessage,
              chunks: allChunks,
              topK: 5
            });

            if (data && Array.isArray(data.chunks)) {
              relevantChunks = data.chunks;
              ragMetadata.chunksRetrieved = relevantChunks.length;
              ragMetadata.usingRealEmbeddings = data.usingRealEmbeddings;
              ragMetadata.chunkTypes = [...new Set(relevantChunks.map(c => c.chunkType || 'unknown'))]; // Store unique chunk types

              contextData = relevantChunks.map(chunk => ({
                documentName: chunk.documentName,
                text: chunk.text,
                relevanceScore: chunk.score,
                chunkType: chunk.chunkType // Added chunkType
              }));
              console.log(`RAG retrieved ${relevantChunks.length} chunks (${ragMetadata.chunkTypes.join(', ')}) using ${data.usingRealEmbeddings ? 'real OpenAI' : 'simulated'} embeddings.`);
            }
          }
        } catch (ragError) {
          console.error("RAG retrieval error:", ragError);
          toast.warning("RAG retrieval failed. Falling back to using full document content.");
          ragMetadata.usedRAG = false; // RAG failed, so mark as not used for this message
        }
      } 
      
      // Add full content from documents that couldn't be processed by RAG (simulated embeddings or no embeddings/content)
      const fullTextContextDocs = [
        ...docsWithSimulatedEmbeddings, // If RAG is active, these are still full-text fallback
        ...docsWithoutEmbeddingsOrContent,
        ...(useRAG && !ragMetadata.usedRAG ? docsWithRealEmbeddings : []) // If RAG was enabled but failed, treat real embedding docs as full text
      ].filter(doc => doc.content && doc.content.trim()); // Only include if content actually exists and is not just whitespace

      if (fullTextContextDocs.length > 0) {
        fullTextContextDocs.forEach((doc) => {
          contextData.push({
            documentName: doc.name,
            text: doc.content.substring(0, 2000) // Truncate content for direct injection
          });
        });
      }


      // Build conversation history (last 20 messages or fewer)
      const conversationHistory = activeMessages.slice(-20).map(msg => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content
      }));

      // Create system prompt with context
      let systemPrompt = "You are a helpful AI assistant analyzing documents and answering questions.";
      
      if (selectedAssignment) {
        systemPrompt += `\n\nCurrent Assignment: ${selectedAssignment.name}`;
        if (selectedAssignment.description) {
          systemPrompt += `\nDescription: ${selectedAssignment.description}`;
        }
      }

      if (contextData.length > 0) {
        systemPrompt += "\n\nRelevant Document Context:";
        contextData.forEach((ctx, idx) => {
          systemPrompt += `\n\n--- Document ${idx + 1}: ${ctx.documentName} ---`;
          if (ctx.relevanceScore) {
            systemPrompt += ` (Relevance: ${(ctx.relevanceScore * 100).toFixed(1)}%)`;
          }
          if (ctx.chunkType) { // Added chunkType to context prompt
            systemPrompt += ` (Type: ${ctx.chunkType})`;
          }
          systemPrompt += `\n${ctx.text}`;
        });
        systemPrompt += "\n--- End Document Context ---";
      }

      // Build full prompt including conversation history and current user input
      const fullPromptContent = conversationHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n\n') + `\n\nUser: ${userMessage.content}`;

      // Call LLM
      const response = await InvokeLLM({
        prompt: `${systemPrompt}\n\n${fullPromptContent}`,
        // file_urls: activeDocuments.map(doc => doc.file_url).filter(Boolean) // file_urls not always needed if context is in prompt
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
        source_documents: contextData.map(ctx => ctx.documentName), // Track names of docs used in context
        excludedFromContext: false,
        ragMetadata: ragMetadata.usedRAG ? ragMetadata : undefined, // Include RAG metadata only if used
        ragUsed: ragMetadata.usedRAG // Simplified boolean flag for UI
      };

      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error("Error processing message:", error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: "error", // Changed type to error
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        excludedFromContext: true // Exclude error messages from context
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to get AI response. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Please provide a session name");
      return;
    }

    try {
      const sessionData = {
        name: sessionName,
        description: sessionDescription,
        assignment_id: selectedAssignment?.id || null,
        created_by: currentUser?.email,
        messages: messages.map(m => ({
          ...m,
          excludedFromContext: m.excludedFromContext || false,
          ragMetadata: m.ragMetadata || undefined,
          source_documents: m.source_documents || undefined,
          confidence_score: m.confidence_score || undefined,
          ragUsed: m.ragUsed || undefined
        })),
        documents: uploadedDocuments.map(d => ({
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
          fromCache: d.fromCache || false
        })),
        message_count: messages.length,
        last_activity: new Date().toISOString(),
        status: "active",
        auto_generated_summary: messages.length > 0 
          ? `Discussion about: ${messages[0].content.substring(0, Math.min(messages[0].content.length, 100))}...`
          : "No messages yet",
        total_embedding_cost: totalEmbeddingCost // Save total cost
      };

      if (currentSession) {
        await base44.entities.AIChatSession.update(currentSession.id, sessionData);
        setCurrentSession({ ...currentSession, ...sessionData });
        setSessionModified(false);
        toast.success("Session updated successfully");
      } else {
        const newSession = await base44.entities.AIChatSession.create({
          ...sessionData,
          workspace_id: currentWorkspaceId, // Add workspace_id when creating new session
        });
        setCurrentSession(newSession);
        setSessionModified(false);
        clearDraftFromStorage();
        toast.success("Session saved successfully");
      }

      await loadInitialData(0); // Refresh sessions list after save
      setIsSaveDialogOpen(false);
      setSessionName(""); // Clear form fields
      setSessionDescription("");
      
    } catch (error) {
      console.error("Error saving session:", error);
      toast.error("Failed to save session");
    }
  };

  const handleExportSession = async (format) => {
    if (messages.length === 0) {
      toast.error("No messages to export");
      return;
    }

    setIsExporting(true);

    try {
      const sessionTitle = currentSession?.name || `AI Chat - ${new Date().toLocaleDateString()}`;
      const exportDate = new Date().toLocaleString();

      if (format === "pdf") {
        const exportData = {
          sessionTitle: sessionTitle,
          exportDate: exportDate,
          assignment: selectedAssignment,
          documents: uploadedDocuments.map(d => ({
            name: d.name,
            includedInContext: d.includedInContext !== false,
            embeddingModel: d.embeddingModel,
            chunkingStrategy: d.chunkingStrategy,
            tokenCount: d.tokenCount, // Added for export
            estimatedCost: d.estimatedCost, // Added for export
            fromCache: d.fromCache // Added for export
          })),
          messages: messages.map(m => ({
            role: m.type === "user" ? "You" : "AI Assistant",
            content: m.content,
            timestamp: m.timestamp,
            excludedFromContext: m.excludedFromContext || false,
            ragMetadata: m.ragMetadata || undefined, // Include RAG metadata
            ragUsed: m.ragUsed || undefined
          }))
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
        
        toast.success("PDF exported successfully");
        
      } else if (format === "markdown") {
        let markdown = `# ${sessionTitle}\n\n`;
        markdown += `**Export Date:** ${exportDate}\n\n`;
        
        if (selectedAssignment) {
          markdown += `**Assignment:** ${selectedAssignment.name}\n`;
          if (selectedAssignment.description) {
            markdown += `Description: ${selectedAssignment.description}\n`;
          }
          markdown += `\n`;
        }
        
        if (uploadedDocuments.length > 0) {
          markdown += `## Documents (${uploadedDocuments.length})\n\n`;
          uploadedDocuments.forEach(doc => {
            let docInfo = `- ${doc.name}`;
            if (!doc.includedInContext) docInfo += ' *(excluded from context)*';
            if (doc.embeddingModel === 'text-embedding-ada-002') docInfo += ' *(OpenAI Embeddings)*';
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
        
        messages.forEach(msg => {
          const role = msg.type === "user" ? "**You**" : "**AI Assistant**";
          const timestamp = new Date(msg.timestamp).toLocaleTimeString();
          const exclusion = msg.excludedFromContext ? " *(excluded from context)*" : "";
          let ragInfo = "";
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
        
        toast.success("Markdown exported successfully");
      }
      
      setIsExportDialogOpen(false);
      
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Filter and sort sessions
  const filteredSessions = sessions.filter(session => {
    const query = sessionSearchQuery.toLowerCase();
    return (
      session.name.toLowerCase().includes(query) ||
      session.description?.toLowerCase().includes(query) ||
      session.messages?.some(m => m.content.toLowerCase().includes(query))
    );
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sessionSortBy) {
      case "recent":
        return new Date(b.last_activity || b.updated_date || b.created_date) - new Date(a.last_activity || a.updated_date || a.created_date);
      case "oldest":
        return new Date(a.created_date) - new Date(b.created_date);
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "messages":
        return (b.message_count || 0) - (a.message_count || 0);
      default:
        return 0;
    }
  });

  // Calculate warnings and statistics
  const showDocumentWarning = uploadedDocuments.length >= MEMORY_LIMITS.WARNING_DOCUMENTS;
  const showMessageWarning = messages.length >= MEMORY_LIMITS.WARNING_MESSAGES; // Use WARNING_MESSAGES for the toast, MAX_MESSAGES for hard stop
  const documentCapacityPercent = (uploadedDocuments.length / MEMORY_LIMITS.MAX_DOCUMENTS) * 100;
  const messageCapacityPercent = (messages.length / MEMORY_LIMITS.MAX_MESSAGES) * 100;

  const excludedMessageCount = messages.filter(m => m.excludedFromContext).length;
  const excludedDocumentCount = uploadedDocuments.filter(d => d.includedInContext === false).length;
  // const activeMessageCount = messages.length - excludedMessageCount; // Not used in UI
  // const activeDocumentCount = uploadedDocuments.length - excludedDocumentCount; // Not used in UI

  const docsWithEmbeddings = uploadedDocuments.filter(d => d.chunks && d.chunks.length > 0);
  const docsWithRealEmbeddings = uploadedDocuments.filter(d => d.embeddingModel === 'text-embedding-ada-002');
  const docsWithSimulatedEmbeddings = uploadedDocuments.filter(d => d.embeddingModel === 'simulated');
  const docsWithSemanticChunking = uploadedDocuments.filter(d => d.chunkingStrategy === 'semantic');
  const docsWithSimpleChunking = uploadedDocuments.filter(d => d.chunkingStrategy === 'simple');

  // Enhancement functions
  const handleSessionTemplateSelect = (template) => {
    setUseRAG(template.settings.ragEnabled);
    toast.success(`Applied template: ${template.name}`);
  };

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question);
  };

  const handleDocumentRemove = (docIndex) => {
    const newDocs = [...uploadedDocuments];
    newDocs.splice(docIndex, 1);
    setUploadedDocuments(newDocs);
    setSessionModified(true);
    toast.success('Document removed');
  };

  const handleDocumentExclude = (docIndex) => {
    const newDocs = [...uploadedDocuments];
    newDocs[docIndex] = { ...newDocs[docIndex], includedInContext: false };
    setUploadedDocuments(newDocs);
    setSessionModified(true);
  };

  const handleDocumentInclude = (docIndex) => {
    const newDocs = [...uploadedDocuments];
    newDocs[docIndex] = { ...newDocs[docIndex], includedInContext: true };
    setUploadedDocuments(newDocs);
    setSessionModified(true);
  };

  const handleMessageCopy = (message) => {
    toast.success('Message copied to clipboard');
  };

  const handleMessageEdit = (messageIndex) => {
    const message = messages[messageIndex];
    if (message.role === 'user') {
      setInputMessage(message.content);
      toast.info('Message loaded for editing');
    }
  };

  const handleMessageRegenerate = async (messageIndex) => {
    const message = messages[messageIndex];
    if (message.role === 'assistant' && messageIndex > 0) {
      // Get the user message before this assistant message
      const userMessage = messages[messageIndex - 1];
      if (userMessage && userMessage.role === 'user') {
        setInputMessage(userMessage.content);
        toast.info('Regenerating response...');
      }
    }
  };

  const handleMessageDelete = (messageIndex) => {
    const newMessages = [...messages];
    newMessages.splice(messageIndex, 1);
    setMessages(newMessages);
    setSessionModified(true);
    toast.success('Message deleted');
  };

  const handleDragDropFiles = async (files) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      await handleFileSelect({ target: { files: [file] } });
    }
  };

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter: Send message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && inputMessage.trim()) {
        e.preventDefault();
        handleSendMessage();
      }

      // Ctrl/Cmd + U: Focus file upload
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        fileInputRef.current?.click();
      }

      // Ctrl/Cmd + N: New session
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewSession();
      }

      // Ctrl/Cmd + S: Save session
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentSession) {
          handleSaveSession();
        } else {
          setIsSaveDialogOpen(true);
        }
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const activeElement = document.activeElement;
        const isInputField = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable
        );
        if (!isInputField) {
          e.preventDefault();
          setShowKeyboardShortcuts(true);
        }
      }

      // Escape: Close dialogs
      if (e.key === 'Escape') {
        setShowKeyboardShortcuts(false);
        setShowQuickStartGuide(false);
        setShowOnboardingTutorial(false);
        setShowSessionTemplates(false);
        setShowCostEstimator(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputMessage, currentSession]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Ask AI
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload documents and have intelligent conversations powered by{' '}
            {useRAG ? (
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Advanced RAG with Semantic Chunking
              </span>
            ) : (
              <span>full document context</span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Session Templates Button */}
          <Button
            variant="outline"
            onClick={() => setShowSessionTemplates(true)}
            className="rounded-xl"
            title="Choose from pre-configured templates"
          >
            <Layers className="w-4 h-4 mr-2" />
            Templates
          </Button>

          {/* Keyboard Shortcuts Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowKeyboardShortcuts(true)}
            className="rounded-xl"
            title="Show keyboard shortcuts (Press ?)"
          >
            <Info className="w-4 h-4" />
          </Button>

          {/* RAG Toggle with Tooltip */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border" id="rag-toggle">
            <ContextualTooltip
              content="Enable Retrieval-Augmented Generation to search through your documents for relevant context before answering questions"
              position="bottom"
            >
              <div className="flex items-center gap-3">
                <Brain className={`w-5 h-5 ${useRAG ? 'text-blue-600' : 'text-gray-400'}`} />
                <Label htmlFor="rag-switch" className="text-sm font-medium cursor-pointer">
                  Smart RAG
                </Label>
              </div>
            </ContextualTooltip>
            <Switch
              id="rag-switch"
              checked={useRAG}
              onCheckedChange={setUseRAG}
              disabled={isProcessing || isProcessingEmbeddings}
            />
            {useRAG && docsWithRealEmbeddings.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                OpenAI + Semantic
              </Badge>
            )}
            {totalEmbeddingCost > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <DollarSign className="w-3 h-3" />
                <span>${totalEmbeddingCost.toFixed(4)}</span>
              </div>
            )}
          </div>

          {/* Export Button */}
          {messages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setExportFormat('markdown'); setIsExportDialogOpen(true); }}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setExportFormat('pdf'); setIsExportDialogOpen(true); }}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sessions Button */}
          <Sheet open={isSessionsSheetOpen} onOpenChange={setIsSessionsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <History className="w-4 h-4 mr-2" />
                Sessions ({sessions.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[500px] sm:w-[600px] flex flex-col p-6">
              <SheetHeader className="mb-4">
                <SheetTitle>Saved Sessions</SheetTitle>
              </SheetHeader>

              {/* Search and Sort */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search sessions..."
                    value={sessionSearchQuery}
                    onChange={(e) => setSessionSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={sessionSortBy} onValueChange={setSessionSortBy}>
                  <SelectTrigger>
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="messages">Most Messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sessions List */}
              <ScrollArea className="flex-1 pr-2">
                {loading || loadingSessions ? ( // Use general loading or sessions loading
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                ) : sortedSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">
                      {sessionSearchQuery ? "No sessions found" : "No saved sessions yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          currentSession?.id === session.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleLoadSession(session)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate text-gray-900 dark:text-white">{session.name}</p>
                            {session.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmSession(session);
                            }}
                            className="flex-shrink-0 text-gray-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{session.message_count || 0} messages</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>{session.documents?.length || 0} docs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(session.last_activity || session.updated_date || session.created_date).toLocaleDateString()}</span>
                          </div>
                          {session.total_embedding_cost > 0 && (
                            <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                <span>${session.total_embedding_cost.toFixed(4)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Save Button */}
          {(messages.length > 0 || uploadedDocuments.length > 0) && (
            <Button
              variant={sessionModified ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (currentSession) {
                  setSessionName(currentSession.name);
                  setSessionDescription(currentSession.description || "");
                } else {
                  setSessionName("");
                  setSessionDescription("");
                }
                setIsSaveDialogOpen(true);
              }}
              className="rounded-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              {currentSession ? "Update" : "Save"}
            </Button>
          )}

          {/* New Thread Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {(showDocumentWarning || showMessageWarning) && (
        <Card className="mt-4 mx-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  High Capacity Usage
                </p>
                <div className="space-y-2 mt-2">
                  {showDocumentWarning && (
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Documents: {uploadedDocuments.length}/{MEMORY_LIMITS.MAX_DOCUMENTS} ({documentCapacityPercent.toFixed(0)}%)
                      </p>
                      <Progress value={documentCapacityPercent} className="h-1.5 mt-1" />
                    </div>
                  )}
                  {showMessageWarning && (
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Messages: {messages.length}/{MEMORY_LIMITS.MAX_MESSAGES} ({messageCapacityPercent.toFixed(0)}%)
                      </p>
                      <Progress value={messageCapacityPercent} className="h-1.5 mt-1" />
                    </div>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ May increase response time and API costs. Consider saving this session and starting a new conversation.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content area (sidebar + chat) */}
      <div className="flex-1 flex gap-6 min-h-0 p-4 pt-4">
        {/* Left Sidebar - Documents */}
        <Card className="w-80 flex-shrink-0 shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Documents</CardTitle>
              <Badge variant="secondary">
                {uploadedDocuments.length}/{MEMORY_LIMITS.MAX_DOCUMENTS}
              </Badge>
            </div>
            {documentCapacityPercent > 60 && (
              <div className="mt-2">
                <Progress value={documentCapacityPercent} className="h-1.5" />
                <p className="text-xs text-gray-500 mt-1">
                  {MEMORY_LIMITS.MAX_DOCUMENTS - uploadedDocuments.length} slots remaining
                </p>
              </div>
            )}
          </CardHeader>

          {/* RAG Status Badge - Moved here */}
          {useRAG && uploadedDocuments.length > 0 && (
            <div className="mx-4 mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      {docsWithEmbeddings.length}/{uploadedDocuments.length} processed
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {docsWithRealEmbeddings.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0">
                        {docsWithRealEmbeddings.length} AI
                      </Badge>
                    )}
                    {docsWithSemanticChunking.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0">
                        {docsWithSemanticChunking.length} sem
                      </Badge>
                    )}
                    {docsWithSimulatedEmbeddings.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0">
                        {docsWithSimulatedEmbeddings.length} sim
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <CardContent className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <Select
                value={selectedAssignment?.id || ""}
                onValueChange={(value) => {
                  const assignment = assignments.find(a => a.id === value);
                  setSelectedAssignment(assignment);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">No assignment</SelectItem> {/* Changed to string "null" for Select */}
                  {assignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4" id="upload-zone">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.pdf,.doc,.docx,.md,.csv,.json"
                onChange={handleFileUpload}
                disabled={isUploading || uploadedDocuments.length >= MEMORY_LIMITS.MAX_DOCUMENTS}
                className="hidden"
              />

              {uploadedDocuments.length === 0 ? (
                <DragDropZone
                  onFilesSelected={handleDragDropFiles}
                  accept=".txt,.pdf,.doc,.docx,.md,.csv,.json"
                  multiple={true}
                  disabled={isUploading || uploadedDocuments.length >= MEMORY_LIMITS.MAX_DOCUMENTS}
                />
              ) : (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || uploadedDocuments.length >= MEMORY_LIMITS.MAX_DOCUMENTS}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload More Documents
                    </>
                  )}
                </Button>
              )}
            </div>

            {isProcessingEmbeddings && (
              <div className="mb-4">
                <ProgressIndicator
                  operation="Generating embeddings"
                  current={embeddingProgress.current}
                  total={embeddingProgress.total}
                  message="Processing documents and creating vector embeddings..."
                  canCancel={false}
                />
              </div>
            )}

            {excludedDocumentCount > 0 && (
              <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {excludedDocumentCount} document{excludedDocumentCount > 1 ? 's' : ''} excluded from context
                </p>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {uploadedDocuments.length > 0 ? (
                  uploadedDocuments.map((doc) => (
                    <Card 
                      key={doc.id} 
                      className={`transition-all ${
                        doc.includedInContext === false 
                          ? 'opacity-50 bg-gray-100 dark:bg-gray-800' 
                          : 'hover:shadow-md'
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {doc.name}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                                onClick={() => handleRemoveDocument(doc.id)}
                                title="Remove document"
                              >
                                <X className="w-4 h-4 mr-1" />
                                <span className="text-xs">Remove</span>
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {doc.embeddingModel && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${
                                    doc.embeddingModel === 'text-embedding-ada-002'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                  }`}
                                >
                                  {doc.embeddingModel === 'text-embedding-ada-002' ? '✓ OpenAI' : '⚠ Simulated'}
                                </Badge>
                              )}
                              {doc.chunkingStrategy && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${
                                    doc.chunkingStrategy === 'semantic'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                  }`}
                                >
                                  {doc.chunkingStrategy === 'semantic' ? '🧠 Semantic' : '📝 Simple'}
                                </Badge>
                              )}
                              {doc.fromCache && (
                                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  Cached
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-gray-500">
                                {(doc.size / 1024).toFixed(1)} KB
                                {doc.tokenCount > 0 && ` • ${doc.tokenCount} tokens`}
                                {doc.estimatedCost > 0 && ` • $${doc.estimatedCost.toFixed(4)}`}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-2 text-xs"
                                onClick={() => toggleDocumentInContext(doc.id)}
                                title={doc.includedInContext === false ? "Include in context" : "Exclude from context"}
                              >
                                {doc.includedInContext === false ? (
                                  <>
                                    <EyeOff className="w-3 h-3 mr-1" />
                                    <span>Excluded</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3 mr-1" />
                                    <span>Included</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500 mb-2">No documents uploaded</p>
                    <p className="text-xs text-gray-400">Upload documents to start asking questions</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {currentSession ? (
                    <div className="flex items-center gap-2">
                      <span>{currentSession.name}</span>
                      {sessionModified && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          Modified
                        </Badge>
                      )}
                    </div>
                  ) : (
                    "Conversation"
                  )}
                </CardTitle>
                <div className="flex items-center gap-3">
                  {messages.length > 0 && (
                    <Badge variant="secondary">
                      {messages.length} message{messages.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {excludedMessageCount > 0 && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      {excludedMessageCount} excluded
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6 max-w-4xl mx-auto">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${
                        message.excludedFromContext ? 'opacity-50' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.type === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          : message.type === 'error'
                          ? 'bg-red-500'
                          : 'bg-gradient-to-br from-purple-500 to-pink-600'
                      }`}>
                        {message.type === 'user' ? (
                          <span className="text-white text-sm font-semibold">
                            {currentUser?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </span>
                        ) : message.type === 'error' ? (
                            <XCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Brain className="w-5 h-5 text-white" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {message.type === 'user' ? 'You' : message.type === 'error' ? 'Error' : 'AI Assistant'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                          {message.ragMetadata?.usedRAG && ( // Display ragMetadata for AI assistant messages
                            <Badge variant="secondary" className={`text-xs ${
                              message.ragMetadata.usingRealEmbeddings ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''
                            }`}>
                              RAG: {message.ragMetadata.usingRealEmbeddings ? 'OpenAI' : 'Simulated'}
                              {message.ragMetadata.chunkTypes && message.ragMetadata.chunkTypes.length > 0 && ` (${message.ragMetadata.chunkTypes.join(', ')})`}
                            </Badge>
                          )}
                          {(message.type === 'user' || message.type === 'assistant') && (
                            <div className="flex items-center gap-2 ml-auto">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleMessageInContext(message.id)}
                                title={message.excludedFromContext ? "Include in context" : "Exclude from context"}
                              >
                                {message.excludedFromContext ? (
                                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5 text-gray-600" />
                                )}
                              </Button>
                              <MessageActions
                                message={message}
                                onEdit={() => handleMessageEdit(messages.findIndex(m => m.id === message.id))}
                                onCopy={() => handleMessageCopy(message)}
                                onRegenerate={() => handleMessageRegenerate(messages.findIndex(m => m.id === message.id))}
                                onDelete={() => handleMessageDelete(messages.findIndex(m => m.id === message.id))}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className={`prose prose-sm dark:prose-invert max-w-none ${
                          message.type === 'user' ? 'text-gray-900 dark:text-gray-100' : ''
                        }`}>
                          {(message.type === 'assistant' || message.type === 'error') ? ( // Render markdown for AI and error messages
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      Start a Conversation
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
                      Upload documents and ask questions to get intelligent answers powered by {useRAG ? 'advanced semantic chunking and OpenAI embeddings' : 'AI'}
                    </p>
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 text-left mb-6">
                      <p>• Upload up to {MEMORY_LIMITS.MAX_DOCUMENTS} documents</p>
                      <p>• Chat for up to {MEMORY_LIMITS.MAX_MESSAGES} messages</p>
                      <p>• Automatic semantic chunking for better context</p>
                      <p>• Save and resume conversations anytime</p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowOnboardingTutorial(true)}
                        className="rounded-xl"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Take a Tour
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => setShowSessionTemplates(true)}
                        className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Browse Templates
                      </Button>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions */}
              {messages.length > 0 && uploadedDocuments.length > 0 && (
                <div className="px-4 pb-4">
                  <SuggestedQuestions
                    documents={uploadedDocuments}
                    lastMessage={messages[messages.length - 1]}
                    onSelectQuestion={handleSuggestedQuestion}
                  />
                </div>
              )}
            </ScrollArea>

            <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0" id="message-input">
              <div className="flex gap-3">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your question here... (Shift+Enter for new line)"
                  className="resize-none rounded-xl"
                  rows={3}
                  disabled={isProcessing || isProcessingEmbeddings}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isProcessing || isProcessingEmbeddings || (!inputMessage.trim() && uploadedDocuments.filter(d => d.includedInContext !== false).length === 0)}
                  className="px-6 bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              {isProcessing && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  AI is thinking...
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Save Session Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentSession ? "Update Session" : "Save Session"}
            </DialogTitle>
            <DialogDescription>
              {currentSession 
                ? 'Update the session name and description'
                : 'Give your conversation a name to save it for later'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="session-name">Session Name *</Label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Project Requirements Analysis"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="session-description">Description (Optional)</Label>
              <Textarea
                id="session-description"
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
                placeholder="Brief description of what this conversation is about..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>{messages.length} messages</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{uploadedDocuments.length} documents</span>
              </div>
              {totalEmbeddingCost > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>${totalEmbeddingCost.toFixed(4)} estimated cost</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSession} disabled={!sessionName.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {currentSession ? "Update" : "Save"} Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Session</DialogTitle>
            <DialogDescription>
              Download your conversation as a document
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4" />
                      Markdown (.md)
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      PDF Document
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium mb-2 text-gray-900 dark:text-white">Export will include:</p>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                All {messages.length} messages
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Document list ({uploadedDocuments.length} files)
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Context exclusion markers
              </div>
              {selectedAssignment && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Assignment context
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleExportSession(exportFormat)}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmSession} onOpenChange={() => setDeleteConfirmSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmSession?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmSession(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteSession(deleteConfirmSession.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load New Session Confirmation */}
      <Dialog open={isLoadNewSessionDialogOpen} onOpenChange={setIsLoadNewSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Session?</DialogTitle>
            <DialogDescription>
              {sessionModified && currentSession 
                ? 'You have unsaved changes. Loading a new session will discard them.'
                : 'Your current unsaved conversation will be discarded.'}
              <br />
              Are you sure you want to load "{pendingSessionToLoad?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLoadNewSessionDialogOpen(false);
                setPendingSessionToLoad(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (pendingSessionToLoad) {
                  confirmLoadSession(pendingSessionToLoad);
                }
              }}
            >
              Load Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhancement Overlays */}
      {showQuickStartGuide && (
        <QuickStartGuide
          onClose={() => setShowQuickStartGuide(false)}
          onStartTutorial={() => {
            setShowQuickStartGuide(false);
            setShowOnboardingTutorial(true);
          }}
        />
      )}

      {showOnboardingTutorial && (
        <OnboardingTutorial
          onClose={() => setShowOnboardingTutorial(false)}
          onComplete={() => {
            setShowOnboardingTutorial(false);
            toast.success('Welcome to Ask AI! Let\'s get started.');
          }}
        />
      )}

      {showKeyboardShortcuts && (
        <KeyboardShortcuts
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      )}

      {showSessionTemplates && (
        <SessionTemplates
          onSelectTemplate={handleSessionTemplateSelect}
          onClose={() => setShowSessionTemplates(false)}
        />
      )}

      {showCostEstimator && costEstimatorData && (
        <CostEstimator
          documents={costEstimatorData.documents}
          estimatedTokens={costEstimatorData.tokens}
          onConfirm={() => {
            setShowCostEstimator(false);
            costEstimatorData.onConfirm && costEstimatorData.onConfirm();
          }}
          onCancel={() => setShowCostEstimator(false)}
          operation={costEstimatorData.operation}
        />
      )}
    </div>
  );
}
