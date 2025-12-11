import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  Target,
  AlertCircle,
  Loader2,
  History,
  Save,
  Search,
  ArrowUpDown,
  FolderOpen,
  MessageSquare,
  FileText,
  Clock,
  DollarSign,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

// Import AI hook and components
import { useAskAI, MEMORY_LIMITS } from '@/hooks/useAskAI';
import { AskAIDocumentSidebar, AskAIChatArea, AskAIDialogs } from '@/features/ai/askAI';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Enhancement components
import OnboardingTutorial from '@/components/OnboardingTutorial';
import SessionTemplates from '@/components/SessionTemplates';
import CostEstimator from '@/components/CostEstimator';
import QuickStartGuide from '@/components/QuickStartGuide';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

export default function ProjectAIAssistant({
  project,
  assignments,
  tasks,
  documents,
  projectMemory,
  workspaceId,
  currentUser,
  onDataRefresh,
}) {
  const askAI = useAskAI();

  // Track if we've already set up the context for this project
  const contextSetRef = useRef(null);
  const docsLoadedRef = useRef(null);

  // Auto-set project context on mount or project change
  useEffect(() => {
    if (project && project.id !== contextSetRef.current) {
      askAI.setSelectedProject(project);
      askAI.setContextType('project');
      contextSetRef.current = project.id;
    }
  }, [project?.id]);

  // Auto-load linked documents when they change
  useEffect(() => {
    if (!documents || documents.length === 0) return;

    // Filter to documents with file URLs (actual files, not folders)
    const linkedDocs = documents.filter(
      (doc) => doc.document_type !== 'folder_placeholder' && doc.file_url
    );

    // Create a stable key for comparison
    const docsKey = linkedDocs
      .map((d) => d.id)
      .sort()
      .join(',');

    // Skip if we've already loaded these exact documents
    if (docsKey === docsLoadedRef.current) return;
    docsLoadedRef.current = docsKey;

    if (linkedDocs.length > 0) {
      askAI.addLinkedDocuments(linkedDocs);
    }
  }, [documents]);

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-gray-900">
        {/* Header with Project Context and Session Controls */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
                {project && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <Target className="w-3 h-3 text-indigo-600" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      Context: {project.name}
                    </span>
                    {projectMemory && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-indigo-50 dark:bg-indigo-900/30"
                      >
                        Memory Active
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Session Controls - Sessions & Save only */}
            <div className="flex items-center gap-2">
              <Sheet open={askAI.isSessionsSheetOpen} onOpenChange={askAI.setIsSessionsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <History className="w-4 h-4 mr-2" />
                    Sessions ({askAI.sessions.length})
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[500px] sm:w-[600px] flex flex-col p-6">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Saved Sessions</SheetTitle>
                  </SheetHeader>

                  <div className="space-y-3 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search sessions..."
                        value={askAI.sessionSearchQuery}
                        onChange={(e) => askAI.setSessionSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <Select value={askAI.sessionSortBy} onValueChange={askAI.setSessionSortBy}>
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

                  <ScrollArea className="flex-1 pr-2">
                    {askAI.loading || askAI.loadingSessions ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                      </div>
                    ) : askAI.sortedSessions.length === 0 ? (
                      <div className="text-center py-12">
                        <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">
                          {askAI.sessionSearchQuery ? 'No sessions found' : 'No saved sessions yet'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {askAI.sortedSessions.map((session) => (
                          <div
                            key={session.id}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                              askAI.currentSession?.id === session.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => askAI.handleLoadSession(session)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate text-gray-900 dark:text-white">
                                  {session.name}
                                </p>
                                {session.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {session.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  askAI.setDeleteConfirmSession(session);
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
                                <span>
                                  {new Date(
                                    session.last_activity ||
                                      session.updated_date ||
                                      session.created_date
                                  ).toLocaleDateString()}
                                </span>
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

              {(askAI.messages.length > 0 || askAI.uploadedDocuments.length > 0) && (
                <Button
                  variant={askAI.sessionModified ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (askAI.currentSession) {
                      askAI.setSessionName(askAI.currentSession.name);
                      askAI.setSessionDescription(askAI.currentSession.description || '');
                    } else {
                      askAI.setSessionName('');
                      askAI.setSessionDescription('');
                    }
                    askAI.setIsSaveDialogOpen(true);
                  }}
                  className="rounded-xl"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {askAI.currentSession ? 'Update' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Capacity Warnings */}
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
                          Documents: {askAI.uploadedDocuments.length}/{MEMORY_LIMITS.MAX_DOCUMENTS}{' '}
                          ({askAI.documentCapacityPercent.toFixed(0)}%)
                        </p>
                        <Progress value={askAI.documentCapacityPercent} className="h-1.5 mt-1" />
                      </div>
                    )}
                    {askAI.showMessageWarning && (
                      <div>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Messages: {askAI.messages.length}/{MEMORY_LIMITS.MAX_MESSAGES} (
                          {askAI.messageCapacityPercent.toFixed(0)}%)
                        </p>
                        <Progress value={askAI.messageCapacityPercent} className="h-1.5 mt-1" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 min-h-0 p-4 overflow-hidden">
          {/* Left Sidebar - Documents */}
          <AskAIDocumentSidebar
            uploadedDocuments={askAI.uploadedDocuments}
            assignments={assignments}
            projects={project ? [project] : []}
            selectedAssignment={askAI.selectedAssignment}
            selectedProject={project}
            contextType="project"
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
            currentUser={currentUser}
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
          selectedProject={project}
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
    </ErrorBoundary>
  );
}
