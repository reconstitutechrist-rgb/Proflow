import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  FileSearch,
  Wand2,
  Sparkles,
  MessageSquare,
  Globe,
  FolderOpen,
  Target,
  AlertCircle,
  X,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// Import hooks and components
import { useAskAI, MEMORY_LIMITS } from '@/hooks/useAskAI';
import {
  AskAIHeader,
  AskAIDocumentSidebar,
  AskAIChatArea,
  AskAIDialogs,
} from '@/features/ai/askAI';
import AIResearchAssistant from '@/features/ai/AIResearchAssistant';
import ResearchSuggestions from '@/features/research/ResearchSuggestions';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { db } from '@/api/db';

// Enhancement components for AskAI
import OnboardingTutorial from '@/components/OnboardingTutorial';
import SessionTemplates from '@/components/SessionTemplates';
import CostEstimator from '@/components/CostEstimator';
import QuickStartGuide from '@/components/QuickStartGuide';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

export default function AIHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'chat';
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  // Shared state
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Research state
  const [researchHistory, setResearchHistory] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [contextType, setContextType] = useState('none');
  const [pendingResearchQuestion, setPendingResearchQuestion] = useState(null);
  const [researchActiveTab, setResearchActiveTab] = useState('research');

  // Generate state
  const [retryAttempt, setRetryAttempt] = useState(0);
  const MAX_RETRIES = 3;
  const retryTimeoutRef = useRef(null);

  // AskAI hook
  const askAI = useAskAI();

  // Set active tab
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Load shared data
  const loadData = useCallback(async () => {
    if (!currentWorkspaceId || workspaceLoading) {
      if (!currentWorkspaceId) {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const [assignmentsData, projectsData, documentsData, researchData, user] = await Promise.all([
        db.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
        db.entities.Document.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
        db.entities.AIResearchChat.filter(
          { workspace_id: currentWorkspaceId },
          '-created_date',
          50
        ),
        db.auth.me(),
      ]);

      setAssignments(assignmentsData || []);
      setProjects(projectsData || []);
      setDocuments(documentsData || []);
      setResearchHistory(researchData || []);
      setCurrentUser(user);

      // Clear selections if they no longer exist
      if (selectedAssignment && !assignmentsData.find((a) => a.id === selectedAssignment.id)) {
        setSelectedAssignment(null);
        setContextType('none');
      }
      if (selectedProject && !projectsData.find((p) => p.id === selectedProject.id)) {
        setSelectedProject(null);
        setContextType('none');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, workspaceLoading]);

  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading) {
      loadData();
    }
  }, [currentWorkspaceId, workspaceLoading, loadData]);

  // Track last loaded context to prevent duplicate loading
  const lastLoadedContextRef = useRef({ key: null, docCount: 0 });

  // Auto-load linked documents when context changes (for Chat tab)
  useEffect(() => {
    // Only auto-load when on the chat tab
    if (activeTab !== 'chat') return;

    // Get linked documents based on current selection
    let linkedDocs = [];
    let contextKey = 'none';

    if (selectedAssignment) {
      contextKey = `assignment:${selectedAssignment.id}`;
      linkedDocs = documents.filter(
        (doc) =>
          doc.assigned_to_assignments?.includes(selectedAssignment.id) &&
          doc.document_type !== 'folder_placeholder' &&
          doc.file_url
      );
    } else if (selectedProject) {
      contextKey = `project:${selectedProject.id}`;
      linkedDocs = documents.filter(
        (doc) =>
          doc.assigned_to_project === selectedProject.id &&
          doc.document_type !== 'folder_placeholder' &&
          doc.file_url
      );
    }

    // Skip if we've already loaded for this exact context and document count
    const lastLoaded = lastLoadedContextRef.current;
    if (lastLoaded.key === contextKey && lastLoaded.docCount === linkedDocs.length) {
      return;
    }

    // Update tracking ref
    lastLoadedContextRef.current = { key: contextKey, docCount: linkedDocs.length };

    // Load or clear documents
    if (linkedDocs.length > 0) {
      askAI.addLinkedDocuments(linkedDocs);
    } else {
      askAI.clearAutoLoadedDocuments();
    }
  }, [selectedAssignment, selectedProject, documents, activeTab]);

  // Research helpers
  const getAssignmentDocuments = (assignmentId) => {
    if (!assignmentId) return [];
    return documents.filter((doc) => doc.assigned_to_assignments?.includes(assignmentId));
  };

  const handleContextChange = (value) => {
    if (value === 'none') {
      setSelectedAssignment(null);
      setSelectedProject(null);
      setContextType('none');
    } else if (value.startsWith('project:')) {
      const projectId = value.replace('project:', '');
      const project = projects.find((p) => p.id === projectId);
      setSelectedProject(project);
      setSelectedAssignment(null);
      setContextType('project');
    } else if (value.startsWith('assignment:')) {
      const assignmentId = value.replace('assignment:', '');
      const assignment = assignments.find((a) => a.id === assignmentId);
      setSelectedAssignment(assignment);
      setSelectedProject(null);
      setContextType('assignment');
    }
  };

  const clearContext = () => {
    setSelectedAssignment(null);
    setSelectedProject(null);
    setContextType('none');
  };

  const getContextValue = () => {
    if (contextType === 'project' && selectedProject) {
      return `project:${selectedProject.id}`;
    } else if (contextType === 'assignment' && selectedAssignment) {
      return `assignment:${selectedAssignment.id}`;
    }
    return 'none';
  };

  const handleResearchComplete = () => {
    db.entities.AIResearchChat.filter({ workspace_id: currentWorkspaceId }, '-created_date', 50)
      .then(setResearchHistory)
      .catch(console.error);
  };

  const handleResearchStart = (question) => {
    setPendingResearchQuestion(question);
    setResearchActiveTab('research');
  };

  const handlePendingQuestionUsed = () => {
    setPendingResearchQuestion(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading AI Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col overflow-hidden -m-8 h-[calc(100vh-56px)]">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Hub</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Chat, Research, and Generate with AI assistance
                </p>
              </div>
            </div>

            {/* Context Selector */}
            <div className="flex items-center gap-3">
              <Select value={getContextValue()} onValueChange={handleContextChange}>
                <SelectTrigger className="w-64">
                  <SelectValue>
                    {selectedProject ? (
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-600" />
                        <span className="truncate">{selectedProject.name}</span>
                      </div>
                    ) : selectedAssignment ? (
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-purple-600" />
                        <span className="truncate">{selectedAssignment.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span>No Context</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span>No Context</span>
                    </div>
                  </SelectItem>
                  {projects.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                        Projects
                      </div>
                      {projects.map((project) => (
                        <SelectItem key={`project:${project.id}`} value={`project:${project.id}`}>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-indigo-600" />
                            <span>{project.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {assignments.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                        Assignments
                      </div>
                      {assignments.map((assignment) => (
                        <SelectItem
                          key={`assignment:${assignment.id}`}
                          value={`assignment:${assignment.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-purple-600" />
                            <span>{assignment.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {(selectedAssignment || selectedProject) && (
                <Button variant="ghost" size="icon" onClick={clearContext}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-shrink-0 border-b px-6 bg-white dark:bg-gray-900">
            <TabsList className="h-14 bg-transparent gap-2">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 px-6 py-3 rounded-lg"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat with Documents
              </TabsTrigger>
              <TabsTrigger
                value="research"
                className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 px-6 py-3 rounded-lg"
              >
                <FileSearch className="w-4 h-4 mr-2" />
                Research
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Chat Tab - Document Q&A */}
          <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* AskAI Header */}
              <AskAIHeader
                useRAG={askAI.useRAG}
                setUseRAG={askAI.setUseRAG}
                isProcessing={askAI.isProcessing}
                isProcessingEmbeddings={askAI.isProcessingEmbeddings}
                docsWithRealEmbeddings={askAI.docsWithRealEmbeddings}
                totalEmbeddingCost={askAI.totalEmbeddingCost}
                messages={askAI.messages}
                sessions={askAI.sessions}
                sortedSessions={askAI.sortedSessions}
                loading={askAI.loading}
                loadingSessions={askAI.loadingSessions}
                isSessionsSheetOpen={askAI.isSessionsSheetOpen}
                setIsSessionsSheetOpen={askAI.setIsSessionsSheetOpen}
                sessionSearchQuery={askAI.sessionSearchQuery}
                setSessionSearchQuery={askAI.setSessionSearchQuery}
                sessionSortBy={askAI.sessionSortBy}
                setSessionSortBy={askAI.setSessionSortBy}
                currentSession={askAI.currentSession}
                sessionModified={askAI.sessionModified}
                uploadedDocuments={askAI.uploadedDocuments}
                setDeleteConfirmSession={askAI.setDeleteConfirmSession}
                handleLoadSession={askAI.handleLoadSession}
                setIsSaveDialogOpen={askAI.setIsSaveDialogOpen}
                setSessionName={askAI.setSessionName}
                setSessionDescription={askAI.setSessionDescription}
                handleNewConversation={askAI.handleNewConversation}
                setIsExportDialogOpen={askAI.setIsExportDialogOpen}
                setExportFormat={askAI.setExportFormat}
                setShowSessionTemplates={askAI.setShowSessionTemplates}
                setShowKeyboardShortcuts={askAI.setShowKeyboardShortcuts}
              />

              {/* Warnings */}
              {(askAI.showDocumentWarning || askAI.showMessageWarning) && (
                <Card className="mx-4 mt-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          High Capacity Usage
                        </p>
                        <div className="space-y-2 mt-2">
                          {askAI.showDocumentWarning && (
                            <div>
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                Documents: {askAI.uploadedDocuments.length}/
                                {MEMORY_LIMITS.MAX_DOCUMENTS} (
                                {askAI.documentCapacityPercent.toFixed(0)}%)
                              </p>
                              <Progress
                                value={askAI.documentCapacityPercent}
                                className="h-1.5 mt-1"
                              />
                            </div>
                          )}
                          {askAI.showMessageWarning && (
                            <div>
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                Messages: {askAI.messages.length}/{MEMORY_LIMITS.MAX_MESSAGES} (
                                {askAI.messageCapacityPercent.toFixed(0)}%)
                              </p>
                              <Progress
                                value={askAI.messageCapacityPercent}
                                className="h-1.5 mt-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Main content area */}
              <div className="flex-1 flex gap-6 min-h-0 p-4 overflow-hidden">
                {/* Left Sidebar - Documents */}
                <AskAIDocumentSidebar
                  uploadedDocuments={askAI.uploadedDocuments}
                  assignments={assignments}
                  projects={projects}
                  selectedAssignment={askAI.selectedAssignment}
                  selectedProject={askAI.selectedProject}
                  contextType={askAI.contextType}
                  setSelectedAssignment={askAI.setSelectedAssignment}
                  setSelectedProject={askAI.setSelectedProject}
                  setContextType={askAI.setContextType}
                  isUploading={askAI.isUploading}
                  isProcessingEmbeddings={askAI.isProcessingEmbeddings}
                  embeddingProgress={askAI.embeddingProgress}
                  useRAG={askAI.useRAG}
                  docsWithEmbeddings={askAI.docsWithEmbeddings}
                  docsWithRealEmbeddings={askAI.docsWithRealEmbeddings}
                  docsWithSimulatedEmbeddings={askAI.docsWithSimulatedEmbeddings}
                  docsWithSemanticChunking={askAI.docsWithSemanticChunking}
                  excludedDocumentCount={askAI.excludedDocumentCount}
                  documentCapacityPercent={askAI.documentCapacityPercent}
                  fileInputRef={askAI.fileInputRef}
                  handleFileUpload={askAI.handleFileUpload}
                  handleRemoveDocument={askAI.handleRemoveDocument}
                  toggleDocumentInContext={askAI.toggleDocumentInContext}
                  handleDragDropFiles={askAI.handleDragDropFiles}
                />

                {/* Main Chat Area */}
                <AskAIChatArea
                  messages={askAI.messages}
                  currentUser={askAI.currentUser}
                  currentSession={askAI.currentSession}
                  sessionModified={askAI.sessionModified}
                  inputMessage={askAI.inputMessage}
                  setInputMessage={askAI.setInputMessage}
                  isProcessing={askAI.isProcessing}
                  isProcessingEmbeddings={askAI.isProcessingEmbeddings}
                  uploadedDocuments={askAI.uploadedDocuments}
                  excludedMessageCount={askAI.excludedMessageCount}
                  useRAG={askAI.useRAG}
                  messagesEndRef={askAI.messagesEndRef}
                  toggleMessageInContext={askAI.toggleMessageInContext}
                  handleDeleteMessage={askAI.handleDeleteMessage}
                  handleSendMessage={askAI.handleSendMessage}
                  handleSuggestedQuestion={askAI.handleSuggestedQuestion}
                  setShowOnboardingTutorial={askAI.setShowOnboardingTutorial}
                  setShowSessionTemplates={askAI.setShowSessionTemplates}
                />
              </div>

              {/* Dialogs */}
              <AskAIDialogs
                isSaveDialogOpen={askAI.isSaveDialogOpen}
                setIsSaveDialogOpen={askAI.setIsSaveDialogOpen}
                sessionName={askAI.sessionName}
                setSessionName={askAI.setSessionName}
                sessionDescription={askAI.sessionDescription}
                setSessionDescription={askAI.setSessionDescription}
                currentSession={askAI.currentSession}
                messages={askAI.messages}
                uploadedDocuments={askAI.uploadedDocuments}
                totalEmbeddingCost={askAI.totalEmbeddingCost}
                handleSaveSession={askAI.handleSaveSession}
                isExportDialogOpen={askAI.isExportDialogOpen}
                setIsExportDialogOpen={askAI.setIsExportDialogOpen}
                exportFormat={askAI.exportFormat}
                setExportFormat={askAI.setExportFormat}
                isExporting={askAI.isExporting}
                handleExportSession={askAI.handleExportSession}
                selectedProject={askAI.selectedProject}
                selectedAssignment={askAI.selectedAssignment}
                deleteConfirmSession={askAI.deleteConfirmSession}
                setDeleteConfirmSession={askAI.setDeleteConfirmSession}
                handleDeleteSession={askAI.handleDeleteSession}
                isLoadNewSessionDialogOpen={askAI.isLoadNewSessionDialogOpen}
                setIsLoadNewSessionDialogOpen={askAI.setIsLoadNewSessionDialogOpen}
                pendingSessionToLoad={askAI.pendingSessionToLoad}
                setPendingSessionToLoad={askAI.setPendingSessionToLoad}
                sessionModified={askAI.sessionModified}
                confirmLoadSession={askAI.confirmLoadSession}
              />

              {/* Enhancement Overlays */}
              {askAI.showQuickStartGuide && (
                <QuickStartGuide
                  onClose={() => askAI.setShowQuickStartGuide(false)}
                  onStartTutorial={() => {
                    askAI.setShowQuickStartGuide(false);
                    askAI.setShowOnboardingTutorial(true);
                  }}
                />
              )}

              {askAI.showOnboardingTutorial && (
                <OnboardingTutorial
                  onClose={() => askAI.setShowOnboardingTutorial(false)}
                  onComplete={() => {
                    askAI.setShowOnboardingTutorial(false);
                    toast.success('Welcome to AI Chat!');
                  }}
                />
              )}

              {askAI.showKeyboardShortcuts && (
                <KeyboardShortcuts
                  isOpen={askAI.showKeyboardShortcuts}
                  onClose={() => askAI.setShowKeyboardShortcuts(false)}
                />
              )}

              {askAI.showSessionTemplates && (
                <SessionTemplates
                  onSelectTemplate={askAI.handleSessionTemplateSelect}
                  onClose={() => askAI.setShowSessionTemplates(false)}
                />
              )}

              {askAI.showCostEstimator && askAI.costEstimatorData && (
                <CostEstimator
                  documents={askAI.costEstimatorData.documents}
                  estimatedTokens={askAI.costEstimatorData.tokens}
                  onConfirm={() => {
                    askAI.setShowCostEstimator(false);
                    askAI.costEstimatorData.onConfirm?.();
                  }}
                  onCancel={() => askAI.setShowCostEstimator(false)}
                  operation={askAI.costEstimatorData.operation}
                />
              )}
            </div>
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="flex-1 overflow-auto m-0 p-6">
            <ErrorBoundary>
              <Tabs
                value={researchActiveTab}
                onValueChange={setResearchActiveTab}
                className="space-y-6"
              >
                <TabsList className="grid w-full grid-cols-2 h-12 max-w-md">
                  <TabsTrigger value="research" className="text-base font-medium">
                    <Brain className="w-4 h-4 mr-2" />
                    AI Research
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-base font-medium">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="research">
                  <div className="space-y-6">
                    {/* Context Badge */}
                    {selectedProject && (
                      <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <Target className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                          Researching for: {selectedProject.name}
                        </span>
                        <Badge variant="outline" className="ml-auto">
                          Project
                        </Badge>
                      </div>
                    )}
                    {selectedAssignment && (
                      <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <FolderOpen className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                          Researching for: {selectedAssignment.name}
                        </span>
                        <Badge variant="outline" className="ml-auto">
                          {getAssignmentDocuments(selectedAssignment.id).length} docs
                        </Badge>
                      </div>
                    )}
                    {!selectedProject && !selectedAssignment && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          General Research Mode - Ask about any topic
                        </span>
                      </div>
                    )}

                    {/* Research Assistant */}
                    <div className="h-[600px]">
                      <AIResearchAssistant
                        assignment={selectedAssignment}
                        project={selectedProject}
                        documents={
                          selectedAssignment ? getAssignmentDocuments(selectedAssignment.id) : []
                        }
                        currentUser={currentUser}
                        onResearchComplete={handleResearchComplete}
                        workspaceId={currentWorkspaceId}
                        allAssignments={assignments}
                        allProjects={projects}
                        pendingQuestion={pendingResearchQuestion}
                        onPendingQuestionUsed={handlePendingQuestionUsed}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Research History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {researchHistory.length > 0 ? (
                        <div className="space-y-4">
                          {researchHistory.map((research) => (
                            <div
                              key={research.id}
                              className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {research.question}
                                </h4>
                                <Badge variant="outline">{research.research_type}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                                {research.response}
                              </p>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{new Date(research.created_date).toLocaleDateString()}</span>
                                {research.confidence_score && (
                                  <span>Confidence: {research.confidence_score}%</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No research history yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
