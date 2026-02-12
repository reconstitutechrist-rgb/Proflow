# Proflow GitHub Integration System - Deep Analysis

## Overview

The GitHub integration system enables users to connect GitHub repositories, perform deep AI-powered code analysis, and engage in dual-AI collaboration (Gemini 3 Pro + Claude Opus 4.5). It supports both authenticated (OAuth) and unauthenticated (public repo) workflows, with persistent repository memory, semantic RAG, and direct GitHub commit capabilities.

---

## 1. GitHub OAuth Connection Flow

### How Users Connect

**Files Involved:**
- `api/github.js` - OAuth authentication, token management, API client
- `features/github/useGitHubConnection.js` - Connection state management hook
- `features/github/GitHubConnectionCard.jsx` - UI component (used in Preferences page)
- `pages/GitHubHub.jsx` - Main page with connection-aware rendering

### OAuth Implementation

`connectGitHub()` (`api/github.js:65-94`):
- Calls `supabase.auth.signInWithOAuth()` with GitHub provider
- **Scopes requested:** `repo` (full repo access), `read:org`, `read:user`
- Uses `skipBrowserRedirect: true` for manual redirect control
- Redirects to GitHub OAuth URL via `window.location.href`

### Token Storage (Dual Storage Strategy)

`getGitHubToken()` (`api/github.js:17-34`):
1. **Session Storage (Primary):** Gets `provider_token` from active Supabase session
2. **localStorage Fallback:** Persists as `github_provider_token` for future sessions
3. Priority: Session token first, then localStorage, then null

### Connection Status Check

`checkGitHubConnection()` (`api/github.js:40-56`):
- Returns `connected: true` only when BOTH:
  - GitHub identity exists in Supabase user object
  - Valid token available (session OR localStorage)
- Returns: `{ connected, identity, hasToken }`

### CORS Handling (Production vs Development)

`githubFetch()` (`api/github.js:184-242`):
- **Development:** Calls GitHub API directly with `Authorization: Bearer` header
- **Production:** Routes through Supabase Edge Function proxy (`/functions/v1/github-proxy`) to avoid CORS
- Proxy URL constructed from `VITE_SUPABASE_URL` environment variable
- Token passed via `x-github-token` header to the proxy

### Connection Hook: useGitHubConnection

`features/github/useGitHubConnection.js`:
- **State:** `isConnected`, `isLoading`, `githubUser`, `error`, `isConnecting`
- `connect(redirectTo)` - Initiates OAuth flow, returns `{success, error}`
- `disconnect()` - Clears local state only; instructs user to revoke via GitHub settings (Supabase can't unlink client-side)
- `refresh()` - Re-checks connection status
- On token expiry: clears state, shows "GitHub token expired"

### GitHubConnectionCard Component

`features/github/GitHubConnectionCard.jsx`:
- Used in the **Preferences page** (integrations tab)
- Shows connect/disconnect buttons
- Displays GitHub user avatar and username when connected
- Loading state with spinner
- Error state with descriptive messages

---

## 2. GitHub API Client

### Full API Surface (`api/github.js:247-718`)

The `github` object provides authenticated access to the GitHub REST API:

**User:**
- `getCurrentUser()` - Get authenticated user
- `getUserOrgs()` - List user's organizations

**Repositories:**
- `listUserRepos(options)` - List accessible repos (sort, pagination, type filter)
- `getRepo(owner, repo)` - Get specific repository
- `getReadme(owner, repo)` - Get README with base64 decoding
- `getLanguages(owner, repo)` - Get language breakdown (bytes)
- `getContributors(owner, repo)` - List contributors

**Issues:**
- `listIssues(owner, repo, options)` - List issues (state, labels, assignee filters)
- `getIssue(owner, repo, issueNumber)` - Get specific issue
- `getIssueComments(owner, repo, issueNumber)` - Get issue comments

**Pull Requests:**
- `listPullRequests(owner, repo, options)` - List PRs
- `getPullRequest(owner, repo, prNumber)` - Get specific PR
- `getPullRequestFiles(owner, repo, prNumber)` - Get changed files
- `getPullRequestReviews(owner, repo, prNumber)` - Get reviews

**Commits:**
- `listCommits(owner, repo, options)` - List commits (sha, path, author, since/until filters)
- `getCommit(owner, repo, sha)` - Get specific commit with file changes

**Branches:**
- `listBranches(owner, repo, options)` - List branches
- `getBranch(owner, repo, branch)` - Get specific branch

**Files & Content:**
- `getContents(owner, repo, path, ref)` - Get directory or file contents
- `getFileContent(owner, repo, path, ref)` - Get file with base64 decoding
- `getTree(owner, repo, sha, recursive)` - Get full file tree

**Search:**
- `searchCode(query, owner, repo)` - Search code in repository
- `searchIssues(query, owner, repo)` - Search issues in repository

**Write Operations:**
- `createOrUpdateFile(owner, repo, path, content, message, branch, sha)` - Create/update file with UTF-8 safe base64 encoding
- `createBranch(owner, repo, branchName, fromBranch)` - Create branch from source ref SHA
- `createPullRequest(owner, repo, title, body, head, base)` - Create PR
- `branchExists(owner, repo, branch)` - Check if branch exists
- `getDefaultBranch(owner, repo)` - Get default branch name

**Actions/Workflows:**
- `listWorkflows(owner, repo)` - List CI/CD workflows
- `listWorkflowRuns(owner, repo, options)` - List workflow runs (status, branch filters)

**Other:**
- `compareCommits(owner, repo, base, head)` - Compare two commits
- `listDependabotAlerts(owner, repo, options)` - List open Dependabot alerts

### Public API Access

`githubPublicFetch()` (`api/github.js:144-174`):
- **No authentication required** - works without OAuth
- Rate limit: 60 requests/hour per IP
- Used for public repository analysis
- Handles: 404 (not found), 403 (rate limited with reset time), generic errors

### URL Parsing

`parseGitHubUrl()` (`api/github.js:106-134`):
- Supports: `https://github.com/owner/repo`, `github.com/owner/repo`, `owner/repo`
- Strips `.git` suffix, handles extra path segments (e.g., `/tree/main/...`)

### Error Handling

All API calls handle:
- **401:** "Token expired. Please reconnect."
- **403:** Rate limit check (shows reset time) or permission denied
- **404:** "Resource not found"
- **5xx:** Generic error with status code

---

## 3. Repository Management

### useGitHubRepos Hook

`features/github/useGitHubRepos.js` (282 lines):

**State:**
- `userRepos` / `isLoadingUserRepos` / `userReposError` - GitHub-accessible repos
- `linkedRepos` / `isLoadingLinked` / `linkedError` - Workspace-linked repos
- `selectedRepo` / `repoDetails` / `isLoadingDetails` - Currently browsing repo

### Listing User Repos

`fetchUserRepos()` (lines 33-51):
- Calls `github.listUserRepos()` with sort by `updated`, 50 per page
- Stores in `userRepos` state for UI rendering

### Linking Repos (Authenticated)

`linkRepository(repo)` (lines 79-118):
1. **Deduplication:** Checks if `github_repo_id` already linked
2. Creates `WorkspaceRepository` entity with: workspace_id, github_repo_id, full_name, url, description, default_branch, is_private, linked_by, sync_enabled
3. Updates local state immediately
4. **Non-blocking analysis:** Triggers `repositoryAnalyzer.startAnalysis()` in background

### Linking Public Repos (No Auth)

`linkPublicRepository(repoData)` (lines 132-171):
- Same as `linkRepository` but forces `is_private: false`
- Deduplication by `github_repo_full_name` (not ID, since public fetch may return different shape)
- Same background analysis trigger

### Selecting a Repo for Browsing

`selectRepository(repoFullName)` (lines 176-207):
- Parallel fetches: repo details, README, languages, branches (10 max)
- Combines into `repoDetails` object for display

### Unlinking

`unlinkRepository(repoId)` (lines 123-126):
- Deletes `WorkspaceRepository` entity
- Removes from local state
- UI shows confirmation dialog: "This will remove access for all workspace members. Debate history will be preserved."

### Convenience Methods

- `getIssues(owner, repo, options)`
- `getPullRequests(owner, repo, options)`
- `getCommits(owner, repo, options)`
- `getFileTree(owner, repo, sha)`
- `getFileContent(owner, repo, path, ref)`

### Auto-load on Workspace Change

`useEffect` (lines 244-249): Automatically fetches linked repos when `currentWorkspaceId` changes.

---

## 4. Public Repository URL Input

### PublicRepoUrlInput Component

`features/github/PublicRepoUrlInput.jsx` (266 lines):

**Features:**
- Input with **auto-paste detection** - automatically fetches preview when GitHub URL pasted
- Supports Enter key to submit
- **Live preview card** showing: full name, "Public" badge, language, star count, fork count
- Private repo detection with helpful message to connect OAuth
- Error states for invalid URLs

**URL Parsing:** Uses `parseGitHubUrl()` supporting multiple formats (full URL, domain/path, owner/repo shorthand)

**Flow:**
1. User pastes/types GitHub URL
2. `fetchRepoPreview()` parses URL, calls `githubPublicFetch('/repos/{owner}/{repo}')`
3. If private → shows error with OAuth prompt
4. If public → shows preview card with stats
5. User clicks "Link Repository" → calls `onLink(preview)` callback

---

## 5. Repository Picker Modal

### RepositoryPicker Component

`features/github/RepositoryPicker.jsx` (295 lines):

**Features:**
- Dialog modal (`max-w-2xl`, `max-h-[80vh]`)
- Search by full name or description (client-side filter)
- **Checkbox multi-select** for batch linking
- Already-linked repos grayed out with "Linked" badge (disabled)
- Private repos show "Private" badge
- Batch link with success/failure count toasts

**Flow:**
1. Opens dialog → fetches user repos if not loaded
2. User searches and selects repos via checkboxes
3. "Link (N)" button processes each repo sequentially
4. Shows success count and error count via toast notifications
5. Closes dialog and triggers `onRepositoryLinked` callback

---

## 6. Deep Code Analysis Pipeline (4-Phase)

### Overview

`api/repositoryAnalyzer.js` (1033 lines) implements a 4-phase analysis pipeline that runs in the background when repositories are linked.

### Configuration

```
maxFilesToAnalyze: 100     (total files budget)
maxFileSizeKb: 500         (skip files > 500KB)
delayBetweenFiles: 50ms    (GitHub API rate limiting)
maxContextLength: 15,000   (AI prompt character limit)
chunkSize: 2,000 chars     (for semantic embeddings)
chunkOverlap: 200 chars    (overlap between chunks)
```

### Code Parser (`api/codeParser.js`, 580 lines)

Supports **multi-language parsing**:
- **JavaScript/TypeScript** - exports, imports, functions, classes, React hooks, components
- **Python** - classes, functions, imports, decorators
- **Go** - structs, interfaces, functions, packages
- **Rust** - structs, enums, traits, impl blocks, functions

Also provides:
- `isPriorityFile(path)` - Identifies key files (README, package.json, index, etc.)
- `shouldSkipFile(path)` - Filters out node_modules, .git, build artifacts, etc.
- `extractFolderStructure(paths)` - Builds folder hierarchy with file counts
- `parsePackageJson(content)` - Extracts dependencies and devDependencies
- `detectLanguage(filePath)` - Maps file extensions to languages

### Phase 1: Structure Analysis

`analyzeStructure(owner, repo)` (lines 159-216):
- **Parallel fetches:** repo data, full tree (recursive), README, languages, latest commit
- Uses `.catch(() => fallback)` for resilience (one failure doesn't block others)
- Filters to files only (not directories)
- **File prioritization:** README > package.json > index files > others
- **Budget allocation:** 70% priority files, 30% regular files (up to 100 total)
- Extracts folder structure hierarchy

### Phase 2: Deep File Analysis

`analyzeKeyFiles(owner, repo, files)` (lines 221-353):
- Fetches and parses each file's content via `codeParser.parseFile()`
- **Extracts:**
  - Exported APIs (functions, classes, constants)
  - Entry points (main, init, start, run, bootstrap, setup)
  - React hooks (custom hooks)
  - React components
  - Classes with inheritance
  - Internal dependencies (file-to-file imports)
  - External packages (npm dependencies from package.json)
- **Pattern detection:** Custom React Hooks, Manager Pattern, Service Pattern, Controller Pattern, API Layer
- 50ms delay between files for rate limiting
- Results limited to 50 entries per category for context size

### Phase 3: AI Insights Generation

`generateInsights(structureData, analysisData)` (lines 427-451):
- Builds **architecture summary:** Language breakdown (%), folder structure with purposes, coding patterns, key exports
- Builds **documentation summary** from README
- Extracts **key insights** categorized by scale, architecture, React patterns, dependencies
- Creates **accumulated context** - structured markdown document (max 15,000 chars) containing everything from Phases 1-3

### Phase 4: Semantic Embeddings

`generateSemanticEmbeddings(memoryId, owner, repo, files)` (lines 456-498):
- Chunks code files (2,000 chars with 200 char overlap)
- Generates vector embeddings via **Gemini** (`gemini.getEmbeddings()`)
- Stores in `repository_code_chunks` table (with pgvector)
- 100ms delay per chunk for rate limiting
- Clears existing chunks before regenerating

### Analysis Orchestration

`startAnalysis(repositoryId, workspaceId, repoFullName)` (lines 27-71):
1. Creates or updates `RepositoryMemory` entity (status: `analyzing`)
2. Fires `runAnalysis()` in background (non-blocking, fire-and-forget)
3. On failure: sets `analysis_status: 'failed'` with error message

`runAnalysis(memoryId, owner, repo)` (lines 76-132):
- Runs all 4 phases sequentially
- **Progressive persistence:** Updates database after each phase
- On any phase failure: catches error, sets status to `failed`, re-throws

### Semantic Search

`performSemanticSearch(memoryId, query, matchCount)` (lines 137-154):
- Generates embedding for user query via Gemini
- Calls `match_code_chunks` Supabase RPC function (pgvector cosine similarity)
- Threshold: 0.5 similarity minimum
- Default: returns top 5 matching chunks

### Analysis Freshness

`checkAnalysisFreshness(repositoryId, owner, repo)` (lines 752-810):
- **No memory:** `needsRefresh: true, reason: 'no_memory'`
- **Failed:** `needsRefresh: true, reason: 'previous_failure'`
- **In progress:** `needsRefresh: false, reason: 'in_progress'`
- **New commits:** Compares `last_commit_sha` with latest commit → marks stale
- **Time-based:** Analysis > 24 hours old → recommends refresh

### Incremental Analysis

`incrementalAnalysis(repositoryId, workspaceId, owner, repo)` (lines 868-953):
- If > 30 new commits → triggers full re-analysis
- If <= 30 commits → only re-analyzes changed files (up to 20)
- Gets changed files from commit details
- Builds **delta context** with: recent commit messages, new/modified APIs, classes, hooks, dependencies
- Updates `delta_context`, `last_incremental_at`, `commits_since_full_analysis`

### Refresh Convenience

`refreshIfNeeded(repositoryId, workspaceId, owner, repo)` (lines 1012-1025):
- Checks freshness, decides between incremental or full analysis
- Returns `{ status: 'fresh' }` if no refresh needed

---

## 7. Dual-AI Collaboration System

### Philosophy

"Ping-Pong" collaboration between two specialized AIs working in parallel:
- **Gemini 3 Pro (Rapid Architect):** Fast, solution-focused, code generation, bold recommendations
- **Claude Opus 4.5 (Deep Thinker):** Security-focused, edge cases, race conditions, logical fallacies

This is **separate** from the Debate system (which has consensus/voting logic). The collaboration hook is intentionally isolated from `useDebateSession.js`.

### Status Machine

```
IDLE → PARALLEL_THINKING → REVIEW_READY → SYNTHESIZING → REVIEW_READY → ARTIFACT_READY
```

### Hook: useDualAICollaboration

`features/github/useDualAICollaboration.js` (505 lines):

**State:**
- `geminiMessages` / `claudeMessages` - Separate message histories
- `isGeminiLoading` / `isClaudeLoading` - Independent loading states
- `collaborationStatus` - Current workflow stage
- `artifact` - Generated document
- `errors` - `{ gemini: null, claude: null }` independent error tracking
- `currentPrompts` - Active system prompts (from template or defaults)
- `originalPrompt` - User's original request (for completeness analysis)

**Actions:**
- `startParallelThinking(userPrompt, contextFiles, template, repoContext)` - Fire both AIs simultaneously
- `synthesizeResponses()` - Cross-pollinate between AIs
- `generateArtifact()` - Create unified document
- `sendFollowUp(message, target)` - Send to specific AI ('gemini' or 'claude') individually
- `resetSession()` - Clear all state
- `getLastResponses()` - Get last assistant response from each AI
- `checkConfiguration()` - Verify both API keys configured
- `setTemplatePrompts(template)` - Apply template prompts

### Default Prompts

**Gemini (Rapid Architect):**
- Focus: structural integrity, scalability, modern patterns, implementation speed
- Output: code structures, file organizations, library choices

**Claude (Deep Reviewer):**
- Focus: edge cases, race conditions, security vulnerabilities, logical fallacies
- Output: severity-level issues, specific mitigations, constructive critique

### Parallel Thinking Flow

`startParallelThinking()` (lines 170-286):

1. **Configuration check** - Verifies both Gemini and Anthropic API keys
2. **Context assembly:**
   - File context (from selected files)
   - Security alerts (Dependabot vulnerabilities)
   - Semantic RAG (code chunks from repository memory via pgvector search)
   - User prompt
3. **Simultaneous execution** - `Promise.allSettled([Gemini request, Claude request])`
4. **Independent error handling** - Each AI's failure is isolated; one can fail without blocking the other
5. **Status progression** - Moves to `REVIEW_READY` if at least one AI succeeds

### Cross-Pollination (Synthesis)

`synthesizeResponses()` (lines 291-356):
- **Claude's feedback → Gemini:** "Review their insights, refine your plan, address security concerns"
- **Gemini's proposal → Claude:** "Critique their implementation, find edge cases, check security"
- Both run simultaneously via `Promise.allSettled()`
- Result: Each AI refines their original response based on the other's critique

### Artifact Generation

`generateArtifact()` (lines 361-400):
- Combines ALL messages from both AIs in chronological order
- Uses **Claude Sonnet 4.5 (QA_REVIEWER)** to synthesize a unified document
- Dedicated synthesis prompt: "Create a unified implementation plan with agreed-upon code structures"
- Artifact includes: content, generatedAt timestamp, originalPrompt, message counts

### Follow-Up Messages

`sendFollowUp(message, target)` (lines 410-455):
- Sends a message to a **specific** AI individually (not parallel)
- Target: `'gemini'` or `'claude'`
- Adds user message to that AI's history only
- Gets response and appends to that AI's message history

---

## 8. Prompt Templates System

### 6 Built-in Templates

`features/github/PromptTemplates.jsx` (383 lines):

| Template | Gemini Role | Claude Role |
|----------|------------|-------------|
| **Coding** | Rapid Architect - code quality, patterns, implementation | Deep Reviewer - security, race conditions, error handling |
| **Planning** | Solution Architect - ADRs, file structure, data model | Staff Engineer - scalability, security, edge cases |
| **Debugging** | Debugging Expert - reproduce, isolate, trace, fix | Root Cause Analyst - symptom analysis, regression risk |
| **Brainstorm** | Creative Technologist - alternative approaches, prototypes | Critical Thinker - challenge assumptions, stress-test ideas |
| **Documentation** | Technical Writer - clear, comprehensive docs | Documentation Reviewer - accuracy, completeness, examples |
| **Deploy & DevOps** | DevOps Engineer - CI/CD configs, deployment steps | SRE - security, reliability, observability |

Each template has specialized system prompts and output format requirements for both AIs.

**UI:** Horizontal button row with template icons, ring highlight on active template, "Active" badge.

---

## 9. DualAIChatInterface Component

`features/github/DualAIChatInterface.jsx` (372 lines):

### Layout

- **Split-panel** with `ResizablePanelGroup` (horizontal)
- Left panel: Gemini (blue-tinted background, "Architecting..." thinking indicator)
- Right panel: Claude (orange-tinted background, "Deep thinking..." indicator)
- `ResizableHandle` with drag handle between panels
- Minimum panel size: 30%

### Controls

**Top control bar:**
- Title: "Dual-Expert Collaboration" / "Gemini 3 Pro x Claude Opus 4.5"
- "Synthesize & Cross-Critique" button (animated purple pulse) - appears when `REVIEW_READY` and not loading
- "Generate Document" button - appears when messages exist and not loading

**Prompt templates bar:** Horizontal template selector

**Input area:**
- Textarea with `Ctrl+Enter` to send
- Disabled while any AI is loading

### Security Data Fusion

On repo selection, automatically fetches Dependabot alerts:
```javascript
github.listDependabotAlerts(owner, repo)
  .then(alerts => setSecurityAlerts(alerts))
```
Alerts are passed to `startParallelThinking()` as `repoContext.securityAlerts`.

---

## 10. Artifact Management

### ArtifactViewer Component

`features/github/ArtifactViewer.jsx` (448 lines):

**Edit/Preview Toggle:**
- Edit mode: Monospace textarea for raw markdown editing
- Preview mode: Rendered markdown via ReactMarkdown with prose styling

**Actions:**
1. **Copy** - Copy content to clipboard
2. **Download** - Download as `.md` file (Blob + createObjectURL)
3. **Save to Docs** - Creates `Document` entity in workspace
4. **Analyze Completeness** - Triggers QA scoring
5. **Commit to GitHub** - Creates branch + commit + optional PR

### Save to Workspace Documents

`handleSaveToDocuments()` in `GitHubHub.jsx` (lines 59-107):
- Creates `Document` entity with:
  - `folder_path: '/ai-collaboration/'`
  - `file_type: 'markdown'`
  - `status: 'draft'`
  - `metadata: { source: 'dual-ai-collaboration', repository, generated_at }`
- Toast with "View" action linking to Documents page

### Commit to GitHub

`handleCommitToGitHub()` in `ArtifactViewer.jsx` (lines 104-186):

**Safety check:** Verifies analysis freshness before committing:
- If repo has new commits since analysis → shows confirmation dialog with SHA comparison

**Workflow:**
1. Get default branch
2. Create feature branch: `feature/ai-collab-{timestamp}`
3. Commit file to `docs/{fileName}` in the new branch
4. Optionally create PR with generated body describing the AI collaboration
5. Opens PR URL in new browser tab

**Commit dialog fields:**
- File name (default: `ai-collaboration-plan.md`)
- Commit message (default: `docs: add AI collaboration plan`)
- "Create pull request automatically" checkbox (default: checked)

---

## 11. Completeness Analysis (QA Scoring)

### CompletenessAnalysis Component

`features/github/CompletenessAnalysis.jsx` (408 lines):

**Model:** Claude Sonnet 4.5 (QA_REVIEWER)

**Checks 5 categories:**
1. **Requirements Coverage** - Does it address the original request? All goals covered?
2. **Technical Completeness** - Code examples complete? File paths clear? Dependencies documented?
3. **Edge Cases & Error Handling** - Error scenarios? Graceful degradation?
4. **Security Considerations** - Obvious security issues? Input validation? Secrets handling?
5. **Best Practices** - Modern patterns? Maintainable? Anti-patterns?

**Output (JSON):**
```json
{
  "overallScore": 0-100,
  "summary": "Brief overall assessment",
  "categories": [{
    "name": "Category Name",
    "score": 0-100,
    "severity": "pass|info|warning|error",
    "findings": [{
      "title": "Finding",
      "description": "Details",
      "severity": "pass|info|warning|error",
      "suggestion": "How to improve"
    }]
  }],
  "missingElements": ["List of missing elements"],
  "suggestions": ["Prioritized improvements"]
}
```

**Score Colors:** >= 80 green, >= 60 yellow, < 60 red

**Severity Visual Config:**
- Pass: green (CheckCircle2)
- Info: blue (Info)
- Warning: yellow (AlertTriangle)
- Error: red (AlertCircle)

---

## 12. Security Data Fusion (Dependabot Alerts)

### Integration Flow

1. When a repo is selected in `DualAIChatInterface`, Dependabot alerts are fetched automatically
2. `github.listDependabotAlerts(owner, repo)` - fetches open alerts (default: 30 per page)
3. Alerts formatted and injected into AI prompts as:
   ```
   [SECURITY ALERTS FOUND IN REPOSITORY]:
   - SQL Injection vulnerability (high) in sqlite3
   - XSS vulnerability (critical) in lodash
   Please consider these vulnerabilities in your response.
   ```
4. Both Gemini and Claude receive these alerts and consider them in recommendations

### Alert Data Structure
```javascript
{
  security_advisory: { summary: "Vulnerability description" },
  security_vulnerability: { severity: "high|critical|moderate|low" },
  dependency: { package: { name: "package-name" } }
}
```

---

## 13. Repository Memory (Persistent Context)

### useRepositoryMemory Hook

`features/github/useRepositoryMemory.js` (192 lines):

**State:** `memory`, `status` (idle/loading/analyzing/completed/failed/stale), `error`, `isLoading`

**Computed booleans:** `isAnalyzing`, `isCompleted`, `isStale`, `isFailed`

**Key methods:**
- `fetchMemory()` - Load existing analysis data from `RepositoryMemory` entity
- `triggerAnalysis(workspaceId)` - Start new analysis + poll for completion (5-minute timeout, 5-second intervals)
- `getAIContext()` - Returns pre-formatted 15KB markdown context for AI prompts (only when completed)
- `getSummary()` - Returns structured summary: `{ filesAnalyzed, totalFiles, languages, patterns, keyInsights, lastAnalyzed }`
- `checkFreshness()` - Check if analysis is current
- `refresh()` - Re-fetch memory data

### RepositoryMemory Entity Fields

```
id, workspace_id, repository_id

// Analysis metadata
analysis_status: 'idle|analyzing|completed|failed|stale'
analysis_started_at, analysis_completed_at, analysis_error

// Phase 1 results
file_structure (JSON), total_files, languages_breakdown (JSON)
readme_content, last_commit_sha

// Phase 2 results
exported_apis (JSON), key_classes (JSON), entry_points (JSON)
internal_dependencies (JSON), external_packages (JSON)
coding_patterns (JSON), files_analyzed

// Phase 3 results
architecture_summary (text), documentation_summary (text)
key_insights (JSON), accumulated_context (text, ~15KB)

// Incremental updates
delta_context (text), last_incremental_at
commits_since_full_analysis

// Phase 4 (separate table: repository_code_chunks)
// file_path, content (2000 char chunks), embedding (vector), metadata
```

### Semantic RAG Integration

In `useDualAICollaboration.js` (lines 201-221):
1. When user sends a message, look up `RepositoryMemory` for the selected repo
2. Call `performSemanticSearch(memoryId, userPrompt)` for top 5 relevant code chunks
3. Format as `[RELEVANT CODE SNIPPETS FOUND VIA SEMANTIC SEARCH]` with file paths and code blocks
4. Inject into AI prompts alongside security alerts and file context

---

## 14. Repository Analysis Status Components

`features/github/RepositoryAnalysisStatus.jsx` (182 lines):

### RepositoryAnalysisStatus

Badge component with tooltip showing analysis state:

| Status | Icon | Color | Description |
|--------|------|-------|-------------|
| Pending | Clock | Gray | Analysis will start shortly |
| Analyzing | Loader2 (spinning) | Blue (pulse) | Deep code analysis in progress |
| Completed | CheckCircle2 | Green | N files analyzed |
| Failed | XCircle | Red | Error message |
| Stale | AlertTriangle | Yellow | New commits detected |
| Idle | Brain | Gray | No analysis data |

**Rich tooltip** shows (when completed): languages, coding patterns, analysis date.

### RepositoryAnalysisProgress

Progress bar component (only renders during `analyzing` status):
- Shows `files_analyzed / total_files` with percentage bar
- Blue themed with spinning loader icon
- Explanation text: "Deep analysis extracts functions, classes, patterns, and dependencies"

---

## 15. GitHubHub Page Structure

### Page States

`pages/GitHubHub.jsx` (370 lines):

**Loading:** Full-screen centered spinner with "Loading GitHub integration..."

**Not Connected:**
- Header with GitHub icon, "Connect GitHub for Full Access" button (links to Preferences)
- Blue info banner: "Paste any public repository URL below to get started"
- Repository list (works without OAuth via public URL input)
- Error alert if present

**Connected:**
- Header with GitHub avatar, username, "Connected" badge, Settings link
- Three tabs with icons:

### Tab: Repositories
- `RepositoryList` component with `onSelectRepository` callback
- Selecting a repo navigates to Debate tab

### Tab: AI Collaboration
- **Layout:** Flexible split - full width when no artifact, 50/50 split when artifact exists
- Left: `DualAIChatInterface` with repo context
- Right: `ArtifactViewer` or `CompletenessAnalysis` (toggle)

### Tab: Debate
- **Disabled** when no repo selected (shows placeholder card)
- Uses `DebateChatInterface` from `@/features/debate` with `contextType="github"`
- Context data: `{ repoFullName, github_repo_full_name }`
- "Back to Repositories" button clears selection

---

## 16. Complete Data Flow

```
1. USER CONNECTS GITHUB
   ├─ connectGitHub() → Supabase OAuth
   ├─ GitHub redirects back with code
   ├─ Supabase exchanges code for provider_token
   ├─ Token stored in session + localStorage
   └─ Production: API calls routed through Edge Function proxy for CORS

2. USER LINKS REPOSITORY
   ├─ Via RepositoryPicker (OAuth repos) OR PublicRepoUrlInput (no auth)
   ├─ Create WorkspaceRepository record (workspace-scoped)
   └─ TRIGGER: startAnalysis() (non-blocking)

3. BACKGROUND ANALYSIS (4 PHASES)
   ├─ Phase 1: analyzeStructure()
   │  ├─ Parallel fetch: tree, README, languages, commits
   │  ├─ Filter & prioritize files (70/30 split)
   │  └─ Save to RepositoryMemory
   │
   ├─ Phase 2: analyzeKeyFiles()
   │  ├─ Parse each file (JS, Python, Go, Rust)
   │  ├─ Extract APIs, classes, hooks, patterns, dependencies
   │  └─ Save to RepositoryMemory
   │
   ├─ Phase 3: generateInsights()
   │  ├─ Build architecture summary
   │  ├─ Extract key insights
   │  └─ Create accumulated context (15KB max)
   │
   └─ Phase 4: generateSemanticEmbeddings()
      ├─ Chunk code (2000 chars + 200 overlap)
      ├─ Generate embeddings via Gemini
      └─ Store in repository_code_chunks (pgvector)

4. USER STARTS DUAL AI COLLABORATION
   ├─ Select prompt template (Coding/Planning/Debug/Brainstorm/Docs/Deploy)
   ├─ Enter request
   └─ Click Send

5. PARALLEL THINKING
   ├─ Assemble context:
   │  ├─ File context (if provided)
   │  ├─ Security alerts (Dependabot)
   │  ├─ Semantic RAG chunks (pgvector similarity search)
   │  └─ User prompt
   │
   ├─ Promise.allSettled([Gemini, Claude])
   │  ├─ Gemini 3 Pro: Architecture/code/structure
   │  └─ Claude Opus 4.5: Critiques/concerns/edge cases
   │
   └─ Status: REVIEW_READY (if at least one succeeds)

6. CROSS-POLLINATION (Optional)
   ├─ Claude's feedback → Gemini: Refine architecture
   ├─ Gemini's proposal → Claude: Critique implementation
   └─ Both run simultaneously

7. FOLLOW-UP (Optional)
   └─ Send additional messages to specific AI individually

8. ARTIFACT GENERATION
   ├─ Combine all messages chronologically
   ├─ Claude Sonnet 4.5 synthesizes unified document
   └─ Status: ARTIFACT_READY

9. ARTIFACT ACTIONS
   ├─ Edit in textarea / Preview as rendered markdown
   ├─ Copy to clipboard
   ├─ Download as .md file
   ├─ Save to workspace Documents (creates Document entity)
   ├─ Analyze completeness (QA score 0-100)
   └─ Commit to GitHub:
      ├─ Safety: Check analysis freshness (warn if stale)
      ├─ Create feature branch (feature/ai-collab-{timestamp})
      ├─ Commit file to docs/ folder
      └─ Create PR (optional, opens in new tab)

10. COMPLETENESS ANALYSIS
    ├─ Original prompt + artifact
    ├─ Claude Sonnet 4.5 (QA_REVIEWER)
    ├─ Checks: requirements, technical, edge cases, security, best practices
    └─ Returns: overall score, category scores, findings, missing elements

11. FRESHNESS MONITORING
    ├─ Commit-based: Compare last_commit_sha with latest
    ├─ Time-based: > 24 hours → recommend refresh
    ├─ Incremental: < 30 commits → analyze only changed files
    └─ Full re-analysis: > 30 commits or no existing memory
```

---

## Key Files & Their Roles

| File | Lines | Purpose |
|------|-------|---------|
| `api/github.js` | 721 | OAuth, token management, full GitHub REST API client, URL parsing, CORS proxy |
| `api/repositoryAnalyzer.js` | 1033 | 4-phase analysis engine, semantic search, freshness checking, incremental updates |
| `api/codeParser.js` | 580 | Multi-language code parsing (JS, Python, Go, Rust), file prioritization, folder structure |
| `pages/GitHubHub.jsx` | 370 | Main page: 3 tabs (Repos, AI Collaboration, Debate), artifact panel, save to docs |
| `features/github/useDualAICollaboration.js` | 505 | Parallel thinking, cross-pollination, artifact generation, follow-ups |
| `features/github/useGitHubRepos.js` | 282 | Repository CRUD, linking/unlinking, background analysis triggers |
| `features/github/useGitHubConnection.js` | 99 | Connection state management, connect/disconnect |
| `features/github/useRepositoryMemory.js` | 192 | Persistent analysis context, polling, AI context retrieval |
| `features/github/DualAIChatInterface.jsx` | 372 | Split-panel chat UI with resizable panels |
| `features/github/ArtifactViewer.jsx` | 448 | Artifact lifecycle: edit, download, save, commit to GitHub |
| `features/github/CompletenessAnalysis.jsx` | 408 | QA scoring system (5 categories, 0-100 score) |
| `features/github/PromptTemplates.jsx` | 383 | 6 specialized template definitions + selector UI |
| `features/github/PublicRepoUrlInput.jsx` | 266 | URL parsing, auto-paste, preview card, public repo linking |
| `features/github/RepositoryPicker.jsx` | 295 | Multi-select repo picker modal with search |
| `features/github/RepositoryList.jsx` | 258 | Linked repos display with unlink confirmation |
| `features/github/RepositoryAnalysisStatus.jsx` | 182 | Status badge + progress bar components |
| `features/github/GitHubConnectionCard.jsx` | ~100 | Connect/disconnect card (used in Preferences page) |
| `features/github/index.js` | 30 | Feature module exports (includes debate re-exports) |

---

## AI Models Used

```
Gemini 3 Pro (ARCHITECT)      - Parallel thinking, embeddings generation
Claude Opus 4.5 (DEEP_THINKER) - Parallel thinking, cross-pollination
Claude Sonnet 4.5 (QA_REVIEWER) - Artifact synthesis, completeness analysis
```

---

## Architectural Decisions

### 1. Hybrid Authentication
OAuth + localStorage + public API support. Users can analyze public repos without connecting GitHub. Full access requires OAuth.

### 2. Non-blocking Analysis
`startAnalysis()` fires analysis in background. User can immediately use the repo. Failed analysis doesn't block UI. Analysis data enriches AI prompts when available.

### 3. Promise.allSettled() for Dual-AI
One AI failure doesn't block the other. User sees partial results (better UX than error state). Independent error handling per AI with individual toast notifications.

### 4. Semantic Chunking with Overlap
2,000 char chunks with 200 char overlap. Preserves context at chunk boundaries. Reduces semantic discontinuities. Fits in embedding model context windows.

### 5. Progressive Database Persistence
Analysis results saved after each phase (not just at the end). If Phase 3 fails, Phase 1 and 2 data is already persisted.

### 6. CORS Proxy for Production
Development calls GitHub directly. Production routes through Supabase Edge Function to avoid browser CORS restrictions.

### 7. Incremental Updates
Small changes (< 30 commits) only re-analyze changed files. Saves time and API calls. Falls back to full re-analysis for large changes.
