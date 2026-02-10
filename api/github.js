// GitHub API Integration for Proflow
// Provides authenticated access to GitHub repositories, issues, PRs, commits, and files

import { supabase } from './supabaseClient';

// Use Edge Function proxy in production to avoid CORS issues
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const USE_PROXY = import.meta.env.PROD; // Use proxy in production only
const GITHUB_PROXY_URL = `${SUPABASE_URL}/functions/v1/github-proxy`;
const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Get the current user's GitHub access token
 * First tries Supabase session, then falls back to localStorage
 * @returns {Promise<string|null>} GitHub access token or null if not connected
 */
export const getGitHubToken = async () => {
  // First try to get from current session (available right after OAuth)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.provider_token) {
    // Also store it for future use
    const githubIdentity = session.user?.identities?.find((id) => id.provider === 'github');
    if (githubIdentity) {
      localStorage.setItem('github_provider_token', session.provider_token);
    }
    return session.provider_token;
  }

  // Fall back to stored token
  return localStorage.getItem('github_provider_token');
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

  // Check for token in session or localStorage
  const hasSessionToken = !!session?.provider_token;
  const hasStoredToken = !!localStorage.getItem('github_provider_token');
  const hasToken = hasSessionToken || hasStoredToken;

  return {
    connected: !!githubIdentity && hasToken,
    identity: githubIdentity || null,
    hasToken,
  };
};

/**
 * Connect GitHub account via Supabase Identity Linking
 * Uses linkIdentity to add GitHub as a linked provider to the current session.
 * Requires "Enable Manual Linking" in Supabase Auth dashboard settings.
 * @param {string} redirectTo - URL to redirect to after OAuth
 * @returns {Promise<{data: object, error: object|null}>}
 */
export const connectGitHub = async (redirectTo = window.location.href) => {
  console.log('[GitHub Connect] Calling linkIdentity with redirectTo:', redirectTo);
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'github',
    options: {
      scopes: 'repo read:org read:user',
      redirectTo,
    },
  });

  console.log('[GitHub Connect] linkIdentity result:', { data, error });
  if (error) {
    console.error('[GitHub Connect] linkIdentity error:', error.message, error);
  }

  return { data, error };
};

/**
 * Make authenticated GitHub API request
 * Uses Edge Function proxy in production to avoid CORS issues
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

  let response;

  if (USE_PROXY) {
    // In production, use the Edge Function proxy to avoid CORS issues
    const proxyUrl = `${GITHUB_PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}`;
    response = await fetch(proxyUrl, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-github-token': token,
        ...options.headers,
      },
      body: options.body,
    });
  } else {
    // In development, call GitHub API directly
    response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    });
  }

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

  // ==================== WRITE OPERATIONS ====================

  /**
   * Create or update a file in a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path in repository
   * @param {string} content - File content (will be base64 encoded)
   * @param {string} message - Commit message
   * @param {string} branch - Branch name
   * @param {string} [sha] - SHA of file being replaced (required for updates)
   * @returns {Promise<Object>} Commit and content info
   */
  createOrUpdateFile: async (owner, repo, path, content, message, branch, sha = null) => {
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64 encoding
      branch,
    };

    if (sha) {
      body.sha = sha;
    }

    return githubFetch(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  /**
   * Create a new branch from an existing branch
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branchName - Name for the new branch
   * @param {string} fromBranch - Source branch to create from (default: default branch)
   * @returns {Promise<Object>} Reference info for new branch
   */
  createBranch: async (owner, repo, branchName, fromBranch = 'main') => {
    // First, get the SHA of the source branch
    const sourceRef = await githubFetch(
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(fromBranch)}`
    );
    const sha = sourceRef.object.sha;

    // Create the new branch reference
    return githubFetch(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    });
  },

  /**
   * Create a pull request
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} title - PR title
   * @param {string} body - PR description
   * @param {string} head - Branch containing changes
   * @param {string} base - Branch to merge into (default: main)
   * @returns {Promise<Object>} Pull request info
   */
  createPullRequest: async (owner, repo, title, body, head, base = 'main') => {
    return githubFetch(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    });
  },

  /**
   * Check if a branch exists
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Branch name
   * @returns {Promise<boolean>} True if branch exists
   */
  branchExists: async (owner, repo, branch) => {
    try {
      await githubFetch(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
      return true;
    } catch (error) {
      if (error.message.includes('not found')) {
        return false;
      }
      throw error;
    }
  },

  /**
   * Get repository default branch
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<string>} Default branch name
   */
  getDefaultBranch: async (owner, repo) => {
    const repoInfo = await githubFetch(`/repos/${owner}/${repo}`);
    return repoInfo.default_branch;
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

  /**
   * Compare two commits
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} base - Base commit/branch
   * @param {string} head - Head commit/branch
   */
  compareCommits: (owner, repo, base, head) =>
    githubFetch(`/repos/${owner}/${repo}/compare/${base}...${head}`),

  /**
   * List Dependabot alerts for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} options - Query options
   */
  listDependabotAlerts: (owner, repo, options = {}) => {
    const params = new URLSearchParams({
      state: options.state || 'open',
      per_page: String(options.perPage || 30),
    });
    return githubFetch(`/repos/${owner}/${repo}/dependabot/alerts?${params}`);
  },
};

export default github;
