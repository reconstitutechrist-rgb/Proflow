import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Github,
  Lock,
  Unlock,
  Star,
  GitFork,
  ExternalLink,
  MoreVertical,
  Unlink,
  MessageSquare,
  Loader2,
  Plus,
} from 'lucide-react';
import { useGitHubRepos } from './useGitHubRepos';
import { RepositoryPicker } from './RepositoryPicker';
import { RepositoryAnalysisStatus } from './RepositoryAnalysisStatus';
import { toast } from 'sonner';

/**
 * List of workspace-linked GitHub repositories
 * Shows linked repos with options to unlink, browse, or start a debate
 */
export function RepositoryList({ onSelectRepository }) {
  const { linkedRepos, isLoadingLinked, unlinkRepository } = useGitHubRepos();

  const [showPicker, setShowPicker] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState(null);
  const [confirmUnlink, setConfirmUnlink] = useState(null);

  const handleUnlink = async (repo) => {
    setUnlinkingId(repo.id);
    try {
      await unlinkRepository(repo.id);
      toast.success(`Unlinked ${repo.github_repo_full_name}`);
    } catch (err) {
      toast.error(`Failed to unlink: ${err.message}`);
    } finally {
      setUnlinkingId(null);
      setConfirmUnlink(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoadingLinked) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading repositories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Linked Repositories</h3>
        <Button onClick={() => setShowPicker(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Link Repository
        </Button>
      </div>

      {/* Repository List */}
      {linkedRepos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Github className="w-12 h-12 text-gray-300 mb-4" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              No repositories linked
            </h4>
            <p className="text-sm text-gray-500 text-center mb-4">
              Link GitHub repositories to analyze them with the dual-AI debate system
            </p>
            <Button onClick={() => setShowPicker(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Link Your First Repository
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {linkedRepos.map((repo) => (
            <Card
              key={repo.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectRepository?.(repo.github_repo_full_name)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Github className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {repo.github_repo_full_name}
                      </span>
                      {repo.is_private ? (
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Unlock className="w-3 h-3 mr-1" />
                          Public
                        </Badge>
                      )}
                      <RepositoryAnalysisStatus
                        repositoryId={repo.id}
                        repoFullName={repo.github_repo_full_name}
                      />
                    </div>
                    {repo.github_repo_description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {repo.github_repo_description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Branch: {repo.github_default_branch}</span>
                      <span>Linked {formatDate(repo.linked_at)}</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRepository?.(repo.github_repo_full_name);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Start AI Debate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(repo.github_repo_url, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in GitHub
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmUnlink(repo);
                        }}
                        className="text-red-600"
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Unlink Repository
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Repository Picker Modal */}
      <RepositoryPicker
        open={showPicker}
        onOpenChange={setShowPicker}
        onRepositoryLinked={() => {
          // Repos are automatically refreshed via hook
        }}
      />

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={!!confirmUnlink} onOpenChange={() => setConfirmUnlink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Repository?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink{' '}
              <strong>{confirmUnlink?.github_repo_full_name}</strong> from this workspace? This will
              remove access to the repository for all workspace members. Debate history will be
              preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmUnlink && handleUnlink(confirmUnlink)}
              className="bg-red-600 hover:bg-red-700"
              disabled={unlinkingId === confirmUnlink?.id}
            >
              {unlinkingId === confirmUnlink?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Unlinking...
                </>
              ) : (
                'Unlink'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RepositoryList;
