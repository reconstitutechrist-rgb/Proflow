import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Github,
  Link2,
  Unlink,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useGitHubConnection } from './useGitHubConnection';

/**
 * Card component for connecting/disconnecting GitHub account
 * Shows connection status and GitHub user info when connected
 */
export function GitHubConnectionCard() {
  const { isConnected, isLoading, isConnecting, githubUser, error, connect, disconnect } =
    useGitHubConnection();

  const handleConnect = async () => {
    console.log('[GitHubCard] Connect button clicked');
    // Redirect back to preferences with integrations tab
    const redirectUrl = `${window.location.origin}/Preferences?tab=integrations`;
    console.log('[GitHubCard] Redirect URL:', redirectUrl);
    const result = await connect(redirectUrl);
    console.log('[GitHubCard] Connect result:', result);
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking connection...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          GitHub
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to access repositories from your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected && githubUser ? (
          <div className="space-y-4">
            {/* Connected User Info */}
            <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarImage src={githubUser.avatar_url} alt={githubUser.login} />
                <AvatarFallback>{githubUser.login?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {githubUser.name || githubUser.login}
                  </span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <a
                  href={githubUser.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  @{githubUser.login}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {githubUser.public_repos || 0}
                </div>
                <div className="text-xs text-gray-500">Repositories</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {githubUser.followers || 0}
                </div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {githubUser.following || 0}
                </div>
                <div className="text-xs text-gray-500">Following</div>
              </div>
            </div>

            {/* Scopes Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Permissions:</strong> Repository access, Organization read, User profile read
            </div>

            {/* Disconnect Button */}
            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
            >
              <Unlink className="w-4 h-4 mr-2" />
              Disconnect GitHub
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not Connected State */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <Github className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Connect Your GitHub Account
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Link your GitHub account to browse repositories, analyze code, and get AI-powered
                insights on your projects.
              </p>

              {/* Features List */}
              <div className="text-left text-sm space-y-2 mb-6">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Browse repositories, issues, and pull requests
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Dual-AI analysis with GPT-5.2 and Claude Opus 4.5
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Save insights to your projects
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4 mr-2" />
                    Connect GitHub
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GitHubConnectionCard;
