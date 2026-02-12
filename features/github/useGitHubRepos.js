import { useState, useEffect, useCallback } from 'react';
import { github } from '@/api/github';
import { githubPublicFetch, parseGitHubUrl } from '@/api/github';
import { db } from '@/api/db';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import repositoryAnalyzer from '@/api/repositoryAnalyzer';

/**
 * Hook for managing GitHub repositories
 * Handles listing user repos, workspace-linked repos, and repo operations
 */
export function useGitHubRepos() {
  const { currentWorkspaceId, currentUser } = useWorkspace();

  // User's accessible GitHub repos
  const [userRepos, setUserRepos] = useState([]);
  const [isLoadingUserRepos, setIsLoadingUserRepos] = useState(false);
  const [userReposError, setUserReposError] = useState(null);

  // Workspace-linked repos
  const [linkedRepos, setLinkedRepos] = useState([]);
  const [isLoadingLinked, setIsLoadingLinked] = useState(false);
  const [linkedError, setLinkedError] = useState(null);

  // Selected repo for browsing
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  /**
   * Fetch user's GitHub repositories
   */
  const fetchUserRepos = useCallback(async (options = {}) => {
    try {
      setIsLoadingUserRepos(true);
      setUserReposError(null);
      const repos = await github.listUserRepos({
        sort: 'updated',
        perPage: options.perPage || 50,
        page: options.page || 1,
      });
      setUserRepos(repos);
      return repos;
    } catch (err) {
      console.error('Error fetching user repos:', err);
      setUserReposError(err.message);
      return [];
    } finally {
      setIsLoadingUserRepos(false);
    }
  }, []);

  /**
   * Fetch workspace-linked repositories
   */
  const fetchLinkedRepos = useCallback(async () => {
    if (!currentWorkspaceId) return [];

    try {
      setIsLoadingLinked(true);
      setLinkedError(null);
      const repos = await db.entities.WorkspaceRepository.list({
        workspace_id: currentWorkspaceId,
      });
      setLinkedRepos(repos || []);
      return repos || [];
    } catch (err) {
      console.error('Error fetching linked repos:', err);
      setLinkedError(err.message);
      return [];
    } finally {
      setIsLoadingLinked(false);
    }
  }, [currentWorkspaceId]);

  /**
   * Link a GitHub repository to the current workspace
   */
  const linkRepository = useCallback(
    async (repo) => {
      if (!currentWorkspaceId || !currentUser) {
        throw new Error('No workspace or user context');
      }

      // Check if already linked
      const existing = linkedRepos.find((r) => r.github_repo_id === repo.id);
      if (existing) {
        throw new Error('Repository already linked to this workspace');
      }

      const linkedRepo = await db.entities.WorkspaceRepository.create({
        workspace_id: currentWorkspaceId,
        github_repo_id: repo.id,
        github_repo_full_name: repo.full_name,
        github_repo_url: repo.html_url,
        github_repo_description: repo.description || '',
        github_default_branch: repo.default_branch || 'main',
        is_private: repo.private || false,
        linked_by: currentUser.id,
        sync_enabled: true,
        settings: {},
      });

      setLinkedRepos((prev) => [...prev, linkedRepo]);

      // Trigger background analysis for the repository
      // This runs asynchronously and doesn't block the UI
      repositoryAnalyzer
        .startAnalysis(linkedRepo.id, currentWorkspaceId, repo.full_name)
        .catch((err) => {
          console.warn('Background analysis failed to start:', err);
          // Non-blocking - user can still use the repo
        });

      return linkedRepo;
    },
    [currentWorkspaceId, currentUser, linkedRepos]
  );

  /**
   * Unlink a repository from the workspace
   */
  const unlinkRepository = useCallback(async (repoId) => {
    await db.entities.WorkspaceRepository.delete(repoId);
    setLinkedRepos((prev) => prev.filter((r) => r.id !== repoId));
  }, []);

  /**
   * Link a PUBLIC GitHub repository by its API metadata (no OAuth needed).
   * @param {object} repoData - Raw repo object from githubPublicFetch
   */
  const linkPublicRepository = useCallback(
    async (repoData) => {
      if (!currentWorkspaceId || !currentUser) {
        throw new Error('No workspace or user context');
      }

      // Check if already linked by full name
      const existing = linkedRepos.find(
        (r) => r.github_repo_full_name === repoData.full_name
      );
      if (existing) {
        throw new Error('Repository already linked to this workspace');
      }

      const linkedRepo = await db.entities.WorkspaceRepository.create({
        workspace_id: currentWorkspaceId,
        github_repo_id: repoData.id,
        github_repo_full_name: repoData.full_name,
        github_repo_url: repoData.html_url,
        github_repo_description: repoData.description || '',
        github_default_branch: repoData.default_branch || 'main',
        is_private: false, // Public repos only
        linked_by: currentUser.id,
        sync_enabled: true,
        settings: {},
      });

      setLinkedRepos((prev) => [...prev, linkedRepo]);

      // Trigger background analysis
      repositoryAnalyzer
        .startAnalysis(linkedRepo.id, currentWorkspaceId, repoData.full_name)
        .catch((err) => {
          console.warn('Background analysis failed to start:', err);
        });

      return linkedRepo;
    },
    [currentWorkspaceId, currentUser, linkedRepos]
  );

  /**
   * Select a repository for detailed browsing
   */
  const selectRepository = useCallback(async (repoFullName) => {
    if (!repoFullName) {
      setSelectedRepo(null);
      setRepoDetails(null);
      return;
    }

    const [owner, repo] = repoFullName.split('/');
    setSelectedRepo(repoFullName);
    setIsLoadingDetails(true);

    try {
      const [details, readme, languages, branches] = await Promise.all([
        github.getRepo(owner, repo),
        github.getReadme(owner, repo).catch(() => null),
        github.getLanguages(owner, repo),
        github.listBranches(owner, repo, { perPage: 10 }),
      ]);

      setRepoDetails({
        ...details,
        readme,
        languages,
        branches,
      });
    } catch (err) {
      console.error('Error fetching repo details:', err);
      setRepoDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  /**
   * Get repository issues
   */
  const getIssues = useCallback(async (owner, repo, options = {}) => {
    return github.listIssues(owner, repo, options);
  }, []);

  /**
   * Get repository pull requests
   */
  const getPullRequests = useCallback(async (owner, repo, options = {}) => {
    return github.listPullRequests(owner, repo, options);
  }, []);

  /**
   * Get repository commits
   */
  const getCommits = useCallback(async (owner, repo, options = {}) => {
    return github.listCommits(owner, repo, options);
  }, []);

  /**
   * Get repository file tree
   */
  const getFileTree = useCallback(async (owner, repo, sha = 'HEAD') => {
    return github.getTree(owner, repo, sha, true);
  }, []);

  /**
   * Get file content
   */
  const getFileContent = useCallback(async (owner, repo, path, ref) => {
    return github.getFileContent(owner, repo, path, ref);
  }, []);

  // Load linked repos when workspace changes
  useEffect(() => {
    if (currentWorkspaceId) {
      fetchLinkedRepos();
    }
  }, [currentWorkspaceId, fetchLinkedRepos]);

  return {
    // User repos
    userRepos,
    isLoadingUserRepos,
    userReposError,
    fetchUserRepos,

    // Linked repos
    linkedRepos,
    isLoadingLinked,
    linkedError,
    fetchLinkedRepos,
    linkRepository,
    linkPublicRepository,
    unlinkRepository,

    // Selected repo
    selectedRepo,
    repoDetails,
    isLoadingDetails,
    selectRepository,

    // Data fetching
    getIssues,
    getPullRequests,
    getCommits,
    getFileTree,
    getFileContent,
  };
}

export default useGitHubRepos;
