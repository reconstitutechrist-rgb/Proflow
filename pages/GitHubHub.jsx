import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, ArrowLeft, Settings, Loader2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useGitHubConnection } from '@/features/github';
import { RepositoryList, DebateChatInterface } from '@/features/github';
import { ROUTES } from '@/config/constants';

/**
 * GitHub Hub Page
 * Main page for GitHub integration with dual-AI debate system
 */
export default function GitHubHub() {
  const { isConnected, isLoading, githubUser, error } = useGitHubConnection();
  const [selectedRepo, setSelectedRepo] = useState(null);

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
                <p className="text-sm text-gray-300">Analyze repositories with dual-AI debate</p>
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
                  debate system.
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
                <p className="text-sm text-gray-300">Analyze repositories with dual-AI debate</p>
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

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Sidebar - Repository List */}
          {!selectedRepo && (
            <div className="flex-1 p-6 overflow-auto">
              <RepositoryList onSelectRepository={setSelectedRepo} />
            </div>
          )}

          {/* Selected Repo - Back Button + Debate Interface */}
          {selectedRepo && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Back navigation */}
              <div className="flex-shrink-0 p-4 border-b bg-gray-50 dark:bg-gray-800/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRepo(null)}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Repositories
                </Button>
              </div>

              {/* Debate Interface */}
              <div className="flex-1 min-h-0 overflow-hidden p-4">
                <DebateChatInterface
                  repoFullName={selectedRepo}
                  onBack={() => setSelectedRepo(null)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
