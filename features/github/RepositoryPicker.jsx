import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Github,
  Search,
  Lock,
  Unlock,
  Star,
  GitFork,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { useGitHubRepos } from './useGitHubRepos';
import { toast } from 'sonner';

/**
 * Modal dialog for picking GitHub repositories to link to workspace
 */
export function RepositoryPicker({ open, onOpenChange, onRepositoryLinked }) {
  const {
    userRepos,
    isLoadingUserRepos,
    userReposError,
    fetchUserRepos,
    linkedRepos,
    linkRepository,
  } = useGitHubRepos();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [isLinking, setIsLinking] = useState(false);

  // Fetch repos when dialog opens
  useEffect(() => {
    if (open && userRepos.length === 0) {
      fetchUserRepos();
    }
  }, [open, userRepos.length, fetchUserRepos]);

  // Filter repos by search query
  const filteredRepos = userRepos.filter((repo) => {
    const query = searchQuery.toLowerCase();
    return (
      repo.full_name.toLowerCase().includes(query) ||
      (repo.description && repo.description.toLowerCase().includes(query))
    );
  });

  // Check if repo is already linked
  const isLinked = (repoId) => {
    return linkedRepos.some((r) => r.github_repo_id === repoId);
  };

  // Toggle repo selection
  const toggleRepoSelection = (repo) => {
    if (isLinked(repo.id)) return;

    setSelectedRepos((prev) => {
      const isSelected = prev.some((r) => r.id === repo.id);
      if (isSelected) {
        return prev.filter((r) => r.id !== repo.id);
      } else {
        return [...prev, repo];
      }
    });
  };

  // Link selected repositories
  const handleLinkSelected = async () => {
    if (selectedRepos.length === 0) return;

    setIsLinking(true);
    let successCount = 0;
    let errorCount = 0;

    for (const repo of selectedRepos) {
      try {
        await linkRepository(repo);
        successCount++;
      } catch (err) {
        console.error(`Error linking ${repo.full_name}:`, err);
        errorCount++;
      }
    }

    setIsLinking(false);
    setSelectedRepos([]);

    if (successCount > 0) {
      toast.success(`Linked ${successCount} repositor${successCount > 1 ? 'ies' : 'y'}`);
      onRepositoryLinked?.();
    }
    if (errorCount > 0) {
      toast.error(`Failed to link ${errorCount} repositor${errorCount > 1 ? 'ies' : 'y'}`);
    }

    onOpenChange(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Link GitHub Repositories
          </DialogTitle>
          <DialogDescription>
            Select repositories to link to your workspace. Linked repositories can be analyzed using
            the dual-AI debate system.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories..."
            className="pl-9"
          />
        </div>

        {/* Repository List */}
        <ScrollArea className="flex-1 min-h-[300px] border rounded-lg">
          {isLoadingUserRepos ? (
            <div className="flex items-center justify-center h-full p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading repositories...</span>
            </div>
          ) : userReposError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-red-600">{userReposError}</p>
              <Button variant="outline" onClick={() => fetchUserRepos()} className="mt-4">
                Retry
              </Button>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Github className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-500">
                {searchQuery ? 'No repositories match your search' : 'No repositories found'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRepos.map((repo) => {
                const linked = isLinked(repo.id);
                const selected = selectedRepos.some((r) => r.id === repo.id);

                return (
                  <div
                    key={repo.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                      linked ? 'opacity-50 cursor-not-allowed' : ''
                    } ${selected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                    onClick={() => toggleRepoSelection(repo)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selected || linked} disabled={linked} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {repo.full_name}
                          </span>
                          {repo.private ? (
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
                          {linked && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Linked
                            </Badge>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: getLanguageColor(repo.language),
                                }}
                              />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {repo.stargazers_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="w-3 h-3" />
                            {repo.forks_count}
                          </span>
                          <span>Updated {formatDate(repo.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-gray-500">{selectedRepos.length} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkSelected} disabled={selectedRepos.length === 0 || isLinking}>
              {isLinking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Link {selectedRepos.length > 0 ? `(${selectedRepos.length})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to get language colors (common languages)
function getLanguageColor(language) {
  const colors = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Vue: '#41b883',
    Shell: '#89e051',
  };
  return colors[language] || '#8b949e';
}

export default RepositoryPicker;
