import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Github,
  ArrowLeft,
  Settings,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  MessageSquare,
  BrainCircuit,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  useGitHubConnection,
  RepositoryList,
  DualAIChatInterface,
  ArtifactViewer,
  CompletenessAnalysis,
} from '@/features/github';
import { DebateChatInterface } from '@/features/debate';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { db } from '@/api/db';
import { ROUTES } from '@/config/constants';

/**
 * GitHub Hub Page
 * Main page for GitHub integration with dual-AI debate and collaboration systems
 */
export default function GitHubHub() {
  const { isConnected, isLoading, githubUser, error } = useGitHubConnection();
  const { currentWorkspaceId, currentUser } = useWorkspace();
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [activeTab, setActiveTab] = useState('repositories');
  const [artifact, setArtifact] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [isSavingDocument, setIsSavingDocument] = useState(false);

  // Handle artifact generation from dual AI
  const handleArtifactGenerated = useCallback((newArtifact) => {
    setArtifact(newArtifact);
  }, []);

  // Handle completeness analysis request
  const handleAnalyzeCompleteness = useCallback((content) => {
    setShowAnalysis(true);
  }, []);

  // Handle save to documents
  const handleSaveToDocuments = useCallback(async (content, title) => {
    if (!currentWorkspaceId) {
      toast.error('Please select a workspace first');
      return;
    }

    setIsSavingDocument(true);

    try {
      // Create a document from the artifact content
      const documentData = {
        workspace_id: currentWorkspaceId,
        title: title || artifact?.title || 'AI Collaboration Document',
        content: content,
        description: `Generated from Dual AI Collaboration${selectedRepo ? ` for ${selectedRepo}` : ''}`,
        file_type: 'markdown',
        status: 'draft',
        folder_path: '/ai-collaboration/',
        created_by: currentUser?.email || 'AI Assistant',
        metadata: {
          source: 'dual-ai-collaboration',
          repository: selectedRepo || null,
          generated_at: new Date().toISOString(),
        },
      };

      const savedDocument = await db.entities.Document.create(documentData);

      toast.success('Document saved successfully!', {
        description: `"${savedDocument.title}" has been saved to your document library.`,
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = `${ROUTES.DOCUMENTS}?id=${savedDocument.id}`;
          },
        },
      });

      return savedDocument;
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document', {
        description: error.message,
      });
      throw error;
    } finally {
      setIsSavingDocument(false);
    }
  }, [currentWorkspaceId, currentUser, artifact, selectedRepo]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading GitHub integration...</p>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <ErrorBoundary>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 border-b bg-gradient-to-r from-gray-800 to-gray-900 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Github className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">GitHub Hub</h1>
                <p className="text-sm text-gray-300">Analyze repositories with dual-AI systems</p>
              </div>
            </div>
          </div>

          {/* Not Connected Card */}
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Github className="w-8 h-8 text-gray-500" />
                </div>
                <CardTitle>Connect GitHub to Get Started</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-500">
                  Connect your GitHub account to link repositories and analyze them with our dual-AI
                  systems.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full">
                    <Link to={`${ROUTES.PREFERENCES}?tab=integrations`}>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Connect in Settings
                    </Link>
                  </Button>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Connected state - main interface
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full h-[calc(100vh-56px)]">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-gray-800 to-gray-900 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Github className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">GitHub Hub</h1>
                <p className="text-sm text-gray-300">Analyze repositories with dual-AI systems</p>
              </div>
            </div>

            {/* User Info & Settings */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                {githubUser?.avatar_url && (
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="text-white text-sm font-medium">
                  {githubUser?.login || 'Connected'}
                </span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                  Connected
                </Badge>
              </div>
              <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/10">
                <Link to={`${ROUTES.PREFERENCES}?tab=integrations`}>
                  <Settings className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b bg-card">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-12 w-full justify-start rounded-none border-0 bg-transparent px-4">
              <TabsTrigger
                value="repositories"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Github className="w-4 h-4 mr-2" />
                Repositories
              </TabsTrigger>
              <TabsTrigger
                value="ai-collaboration"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <BrainCircuit className="w-4 h-4 mr-2" />
                AI Collaboration
              </TabsTrigger>
              <TabsTrigger
                value="debate"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                disabled={!selectedRepo}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Debate
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <Tabs value={activeTab} className="flex-1 flex flex-col">
            {/* Repositories Tab */}
            <TabsContent value="repositories" className="flex-1 m-0 overflow-auto">
              <div className="p-6">
                <RepositoryList
                  onSelectRepository={(repo) => {
                    setSelectedRepo(repo);
                    setActiveTab('debate');
                  }}
                />
              </div>
            </TabsContent>

            {/* AI Collaboration Tab */}
            <TabsContent value="ai-collaboration" className="flex-1 m-0 overflow-hidden">
              <div className="h-full flex">
                {/* Main Chat Area */}
                <div className={`flex-1 p-4 ${artifact && !showAnalysis ? 'w-1/2' : ''}`}>
                  <DualAIChatInterface
                    repoFullName={selectedRepo}
                    contextFiles={[]}
                    onArtifactGenerated={handleArtifactGenerated}
                  />
                </div>

                {/* Artifact/Analysis Panel */}
                {artifact && (
                  <div className="w-1/2 p-4 border-l">
                    {showAnalysis ? (
                      <CompletenessAnalysis
                        artifact={artifact}
                        originalPrompt={originalPrompt}
                        onClose={() => setShowAnalysis(false)}
                      />
                    ) : (
                      <ArtifactViewer
                        artifact={artifact}
                        repoFullName={selectedRepo}
                        onSaveToDocuments={handleSaveToDocuments}
                        onAnalyzeCompleteness={handleAnalyzeCompleteness}
                        isSaving={isSavingDocument}
                      />
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Debate Tab */}
            <TabsContent value="debate" className="flex-1 m-0 overflow-hidden">
              {selectedRepo ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Back navigation */}
                  <div className="flex-shrink-0 p-4 border-b bg-gray-50 dark:bg-gray-800/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRepo(null);
                        setActiveTab('repositories');
                      }}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Repositories
                    </Button>
                    <span className="ml-4 text-sm text-muted-foreground">
                      Analyzing: <strong>{selectedRepo}</strong>
                    </span>
                  </div>

                  {/* Debate Interface */}
                  <div className="flex-1 min-h-0 overflow-hidden p-4">
                    <DebateChatInterface
                      contextType="github"
                      contextData={{ repoFullName: selectedRepo, github_repo_full_name: selectedRepo }}
                      onBack={() => {
                        setSelectedRepo(null);
                        setActiveTab('repositories');
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Card className="max-w-md">
                    <CardContent className="text-center py-12">
                      <Github className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">
                        Select a repository from the Repositories tab to start a debate analysis
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => setActiveTab('repositories')}
                      >
                        Browse Repositories
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  );
}
