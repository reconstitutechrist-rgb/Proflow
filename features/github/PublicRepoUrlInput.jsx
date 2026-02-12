import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Github,
  Link2,
  Loader2,
  Star,
  GitFork,
  Unlock,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { parseGitHubUrl, githubPublicFetch } from '@/api/github';

/**
 * Component for pasting a public GitHub repo URL to link it to the workspace.
 * No OAuth required — uses unauthenticated GitHub API for public repos.
 *
 * @param {object} props
 * @param {function} props.onLink - Called with the fetched repo data when user confirms linking
 * @param {boolean} [props.isLinking] - Whether a link operation is in progress
 * @param {string} [props.className] - Additional CSS classes
 */
export function PublicRepoUrlInput({ onLink, isLinking = false, className = '' }) {
  const [inputValue, setInputValue] = useState('');
  const [preview, setPreview] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch repo metadata from GitHub's public API and show a preview card.
   */
  const fetchRepoPreview = useCallback(async (input) => {
    const parsed = parseGitHubUrl(input);
    if (!parsed) {
      setError('Invalid GitHub URL. Try a format like: https://github.com/owner/repo');
      setPreview(null);
      return;
    }

    setIsFetching(true);
    setError(null);
    setPreview(null);

    try {
      const repo = await githubPublicFetch(`/repos/${parsed.owner}/${parsed.repo}`);

      if (repo.private) {
        setError('This repository is private. Connect your GitHub account to access private repos.');
        return;
      }

      setPreview(repo);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  }, []);

  /**
   * Handle input submission (Enter key or button click).
   */
  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) return;
    fetchRepoPreview(inputValue);
  }, [inputValue, fetchRepoPreview]);

  /**
   * Handle paste — auto-fetch preview immediately.
   */
  const handlePaste = useCallback(
    (e) => {
      // Use the pasted text directly since state hasn't updated yet
      const pasted = e.clipboardData.getData('text');
      if (pasted && parseGitHubUrl(pasted)) {
        // Small delay to let the input value update visually
        setTimeout(() => fetchRepoPreview(pasted), 50);
      }
    },
    [fetchRepoPreview]
  );

  /**
   * Handle linking the previewed repo.
   */
  const handleLink = useCallback(() => {
    if (!preview || isLinking) return;
    onLink?.(preview);
    // Clear state after initiating link
    setInputValue('');
    setPreview(null);
    setError(null);
  }, [preview, isLinking, onLink]);

  /**
   * Handle key press — Enter to submit.
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Input Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="public-repo-url-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Paste a public repo URL — e.g. https://github.com/facebook/react"
            className="pl-9"
            disabled={isFetching || isLinking}
          />
        </div>
        <Button
          id="public-repo-fetch-btn"
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isFetching || isLinking}
          variant="outline"
          size="default"
        >
          {isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Github className="w-4 h-4 mr-2" />
              Fetch
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Preview Card */}
      {preview && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Github className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {preview.full_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    <Unlock className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                </div>

                {preview.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{preview.description}</p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  {preview.language && (
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getLanguageColor(preview.language) }}
                      />
                      {preview.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {formatNumber(preview.stargazers_count)}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="w-3 h-3" />
                    {formatNumber(preview.forks_count)}
                  </span>
                  <a
                    href={preview.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-gray-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on GitHub
                  </a>
                </div>
              </div>

              <Button
                id="public-repo-link-btn"
                onClick={handleLink}
                disabled={isLinking}
                size="sm"
                className="shrink-0"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Link Repository
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Language color lookup — matches RepositoryPicker */
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

export default PublicRepoUrlInput;
