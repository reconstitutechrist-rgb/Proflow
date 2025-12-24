// GitHub API Integration for Proflow
// Provides authenticated access to GitHub repositories, issues, PRs, commits, and files

import { supabase } from './supabaseClient';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Get the current user's GitHub access token from Supabase session
 * @returns {Promise<string|null>} GitHub access token or null if not connected
 */
export const getGitHubToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.provider_token || null;
};

/**
 * Check if the current user has GitHub connected
 * @returns {Promise<{connected: boolean, identity: object|null}>}
 */
export const checkGitHubConnection = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const githubIdentity = session?.user?.identities?.find((id) => id.provider === 'github');

  return {
    connected: !!githubIdentity && !!session?.provider_token,
    identity: githubIdentity || null,
    hasToken: !!session?.provider_token,
  };
};

/**
 * Connect GitHub account via Supabase OAuth
 * @param {string} redirectTo - URL to redirect to after OAuth
 * @returns {Promise<{data: object, error: object|null}>}
 */
export const connectGitHub = async (redirectTo = window.location.href) => {
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'github',
    options: {
      scopes: 'repo read:org read:user',
      redirectTo,
    },
  });

  return { data, error };
};

/**
 * Make authenticated GitHub API request
 * @param {string} endpoint - API endpoint (e.g., '/user/repos')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} API response data
 * @throws {Error} If not connected or API request fails
 */
export const githubFetch = async (endpoint, options = {}) => {
  const token = await getGitHubToken();

  if (!token) {
    throw new Error('GitHub not connected. Please connect your GitHub account.');
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('GitHub token expired. Please reconnect your GitHub account.');
    }
    if (response.status === 403) {
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining === '0') {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const resetDate = new Date(parseInt(resetTime) * 1000);
        throw new Error(
          `GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`
        );
      }
      throw new Error('GitHub API access forbidden. Check repository permissions.');
    }
    if (response.status === 404) {
      throw new Error('GitHub resource not found. Check the repository name or permissions.');
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `GitHub API request failed: ${response.status}`);
  }

  return response.json();
};

/**
 * GitHub API Methods
 */
export const github = {
  // ==================== USER ====================

  /**
   * Get the authenticated GitHub user
   */
  getCurrentUser: () => githubFetch('/user'),

  /**
   * Get user's organizations
   */
  getUserOrgs: () => githubFetch('/user/orgs'),

  // ==================== REPOSITORIES ====================

  /**
   * List repositories accessible to the authenticated user
   * @param {object} options - Query options
   */
  listUserRepos: (options = {}) => {
    const params = new URLSearchParams({
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
      type: options.type || 'all', // all, owner, public, private, member
    });
    return githubFetch(`/user/repos?${params}`);
  },

  /**
   * Get a specific repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  getRepo: (owner, repo) => githubFetch(`/repos/${owner}/${repo}`),

  /**
   * Get repository README
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  getReadme: async (owner, repo) => {
    try {
      const response = await githubFetch(`/repos/${owner}/${repo}/readme`);
      // Decode base64 content
      if (response.content) {
        response.decodedContent = atob(response.content.replace(/\n/g, ''));
      }
      return response;
    } catch (error) {
      if (error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get repository languages
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  getLanguages: (owner, repo) => githubFetch(`/repos/${owner}/${repo}/languages`),

  /**
   * Get repository contributors
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  getContributors: (owner, repo, options = {}) => {
    const params = new URLSearchParams({
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    return githubFetch(`/repos/${owner}/${repo}/contributors?${params}`);
  },

  // ==================== ISSUES ====================

  /**
   * List repository issues
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} options - Query options
   */
  listIssues: (owner, repo, options = {}) => {
    const params = new URLSearchParams({
      state: options.state || 'open',
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    if (options.labels) params.append('labels', options.labels);
    if (options.assignee) params.append('assignee', options.assignee);
    return githubFetch(`/repos/${owner}/${repo}/issues?${params}`);
  },

  /**
   * Get a specific issue
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} issueNumber - Issue number
   */
  getIssue: (owner, repo, issueNumber) =>
    githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}`),

  /**
   * Get issue comments
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} issueNumber - Issue number
   */
  getIssueComments: (owner, repo, issueNumber, options = {}) => {
    const params = new URLSearchParams({
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    return githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}/comments?${params}`);
  },

  // ==================== PULL REQUESTS ====================

  /**
   * List repository pull requests
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} options - Query options
   */
  listPullRequests: (owner, repo, options = {}) => {
    const params = new URLSearchParams({
      state: options.state || 'open',
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    return githubFetch(`/repos/${owner}/${repo}/pulls?${params}`);
  },

  /**
   * Get a specific pull request
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - PR number
   */
  getPullRequest: (owner, repo, prNumber) =>
    githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`),

  /**
   * Get pull request files changed
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - PR number
   */
  getPullRequestFiles: (owner, repo, prNumber, options = {}) => {
    const params = new URLSearchParams({
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    return githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}/files?${params}`);
  },

  /**
   * Get pull request reviews
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - PR number
   */
  getPullRequestReviews: (owner, repo, prNumber) =>
    githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`),

  // ==================== COMMITS ====================

  /**
   * List repository commits
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} options - Query options
   */
  listCommits: (owner, repo, options = {}) => {
    const params = new URLSearchParams({
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    if (options.sha) params.append('sha', options.sha);
    if (options.path) params.append('path', options.path);
    if (options.author) params.append('author', options.author);
    if (options.since) params.append('since', options.since);
    if (options.until) params.append('until', options.until);
    return githubFetch(`/repos/${owner}/${repo}/commits?${params}`);
  },

  /**
   * Get a specific commit
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Commit SHA
   */
  getCommit: (owner, repo, sha) => githubFetch(`/repos/${owner}/${repo}/commits/${sha}`),

  // ==================== BRANCHES ====================

  /**
   * List repository branches
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} options - Query options
   */
  listBranches: (owner, repo, options = {}) => {
    const params = new URLSearchParams({
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    if (options.protected !== undefined) {
      params.append('protected', String(options.protected));
    }
    return githubFetch(`/repos/${owner}/${repo}/branches?${params}`);
  },

  /**
   * Get a specific branch
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Branch name
   */
  getBranch: (owner, repo, branch) =>
    githubFetch(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`),

  // ==================== FILES & CONTENT ====================

  /**
   * Get repository contents (files/directories)
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - Path within repository (default: root)
   * @param {string} ref - Branch/tag/commit reference (default: default branch)
   */
  getContents: async (owner, repo, path = '', ref = '') => {
    const params = new URLSearchParams();
    if (ref) params.append('ref', ref);
    const query = params.toString() ? `?${params}` : '';
    return githubFetch(`/repos/${owner}/${repo}/contents/${path}${query}`);
  },

  /**
   * Get file content decoded
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} ref - Branch/tag/commit reference
   */
  getFileContent: async (owner, repo, path, ref = '') => {
    const content = await github.getContents(owner, repo, path, ref);
    if (content.type !== 'file') {
      throw new Error('Path is not a file');
    }
    if (content.content) {
      content.decodedContent = atob(content.content.replace(/\n/g, ''));
    }
    return content;
  },

  /**
   * Get repository tree (full file structure)
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Tree SHA or branch name
   * @param {boolean} recursive - Whether to get full tree recursively
   */
  getTree: (owner, repo, sha = 'HEAD', recursive = true) => {
    const params = new URLSearchParams();
    if (recursive) params.append('recursive', '1');
    return githubFetch(`/repos/${owner}/${repo}/git/trees/${sha}?${params}`);
  },

  // ==================== SEARCH ====================

  /**
   * Search code in repository
   * @param {string} query - Search query
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  searchCode: (query, owner, repo, options = {}) => {
    const q = `${query} repo:${owner}/${repo}`;
    const params = new URLSearchParams({
      q,
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    return githubFetch(`/search/code?${params}`);
  },

  /**
   * Search issues in repository
   * @param {string} query - Search query
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  searchIssues: (query, owner, repo, options = {}) => {
    const q = `${query} repo:${owner}/${repo}`;
    const params = new URLSearchParams({
      q,
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    return githubFetch(`/search/issues?${params}`);
  },

  // ==================== ACTIONS/WORKFLOWS ====================

  /**
   * List repository workflows
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  listWorkflows: (owner, repo, options = {}) => {
    const params = new URLSearchParams({
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    return githubFetch(`/repos/${owner}/${repo}/actions/workflows?${params}`);
  },

  /**
   * List workflow runs
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  listWorkflowRuns: (owner, repo, options = {}) => {
    const params = new URLSearchParams({
      per_page: String(options.perPage || 30),
      page: String(options.page || 1),
    });
    if (options.status) params.append('status', options.status);
    if (options.branch) params.append('branch', options.branch);
    return githubFetch(`/repos/${owner}/${repo}/actions/runs?${params}`);
  },
};

export default github;
