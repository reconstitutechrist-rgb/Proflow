# Proflow Deep Analysis - Features, Functionality, Workflows & Pipelines

## Executive Summary

Proflow is a **multi-tenant project management and AI collaboration platform** built with React 19.2, Supabase 2.86, and three AI provider integrations (Google Gemini, Anthropic Claude, OpenAI). It combines traditional PM tools (tasks, projects, documents) with advanced AI capabilities (RAG, dual-AI debate, project memory), real-time team chat, and GitHub integration.

**Tech Stack**: React 19.2 + React Router 7.9 + Vite 7.2 + TailwindCSS 4.1 + Supabase 2.86 + TipTap 3.11 + React Query 5.90 + Framer Motion 12.4 + Recharts 2.15 + Zod 3.24 + React Hook Form 7.54 + Hello Pangea DnD 18.0

**17 Pages | 16 API Modules | 49 UI Primitives | 14 Feature Modules | 15 Custom Hooks**

---

## 1. CORE ARCHITECTURE

### Bootstrap & Rendering Pipeline
```
main.jsx → QueryClient → App.jsx → index.jsx (Router)
  → AuthProvider → Router → ProtectedContent
    → Auth check (getSession) → AuthPage OR Layout + Routes
      → Layout: sidebar, nav, floating widgets, ErrorBoundary
        → Page components (eager or lazy-loaded)
```

- **Eager-loaded pages**: Dashboard, Projects, Assignments, Tasks, DocumentsHub
- **Lazy-loaded pages**: Chat, AIHub, GitHubHub, DebateHub, Preferences, Workspaces, ProjectDashboard, Users, Documentation
- **Preloading**: 6 of 9 lazy pages preloaded 1 second after auth succeeds (Users, Chat, AIHub, DebateHub, GitHubHub, ProjectDashboard). **Not preloaded**: Preferences, Workspaces, Documentation
- **Route format**: PascalCase paths (`/Dashboard`, `/Tasks`, `/Projects`)
- **Backward compat redirects**: `/Generate` → `/DocumentsHub?tab=templates`, `/Research` → redirect, `/DocumentCreator` → redirect, `/DocumentStudio` → redirect, `/DocumentWorkshop` → redirect
- **Note**: `/AskAI` is a direct route to `AskAI.jsx`, NOT a redirect

### Build Configuration (vite.config.js)
- React plugin with TailwindCSS via Vite plugin
- Path alias: `@` → project root
- Optimizes `@google/generative-ai` for bundling
- Strips `console`/`debugger` in production builds
- **Manual code-splitting chunks**:
  - `vendor-react`: React, React DOM, React Router
  - `vendor-radix`: All Radix UI components
  - `vendor-editor`: TipTap editor
  - `vendor-charts`: Recharts
  - `vendor-animation`: Framer Motion
  - `vendor-utils`: Date utilities
  - `vendor-supabase`: Supabase JS
  - `vendor-dnd`: Drag & drop
  - `vendor-ai`: Google Generative AI
- Chunk size warning limit: 200KB

### Multi-Tenancy Model
- **Every entity** is workspace-scoped via `workspace_id` foreign key
- **RLS enforcement** via `workspace_members` table
- **Function filters disabled** in db.js to prevent loading all records without workspace_id
- **Workspace initialization priority**: localStorage → user metadata → default workspace → first available → auto-create personal workspace
- **Cross-workspace data isolation** with `CrossWorkspaceValidator` component

### Entity Relationship Map
```
Workspace (multi-tenant root)
├── User (workspace members with roles: owner, admin, member, viewer)
├── Project (high-level initiative)
│   ├── Assignment (project component/deliverable)
│   │   ├── Task (actionable work item)
│   │   └── Document (linked content)
│   ├── ProjectMemory (AI context bank)
│   ├── ProjectChatHistory (project brain - verbatim recall)
│   └── ProjectDocumentChunk (RAG chunks)
├── Document (standalone or linked, with DocumentActivity audit trail)
├── Task (standalone or linked to assignment)
├── ChatSession → Message (team communication)
├── ConversationThread (threaded discussions)
├── AIResearchChat (research conversations)
├── WorkspaceRepository (linked GitHub repos)
├── RepositoryMemory (GitHub repo context)
├── GitHubDebateSession → GitHubDebateMessage (AI debates)
├── Note (personal workspace notes)
├── Folder (document organization)
└── WorkflowPattern (recognized workflow templates)
```

### All 17 Pages
| Page | Status | Purpose |
|------|--------|---------|
| Dashboard.jsx | Eager | Home with AI priorities, needs attention, team activity |
| Projects.jsx | Eager | Project grid with filters |
| Assignments.jsx | Eager | Assignment management |
| Tasks.jsx | Eager | Kanban/List/Calendar task board |
| DocumentsHub.jsx | Eager | Document Library/Studio/Templates tabs |
| Documents.jsx | Legacy | Still a full routed page (loads both legacy and workspace documents, not just a redirect) |
| AskAI.jsx | Active | Specialized AI chat for document analysis (NOT deprecated) |
| AIHub.jsx | Lazy | Consolidated AI hub (Chat/Research/Generate tabs) |
| Chat.jsx | Lazy | Team messaging with threads |
| DebateHub.jsx | Lazy | Dual-AI debate interface |
| GitHubHub.jsx | Lazy | GitHub repo analysis + dual-AI chat |
| ProjectDashboard.jsx | Lazy | Per-project workspace (largest page - 79KB) |
| Preferences.jsx | Lazy | User settings (Profile/Notifications/Integrations) |
| Workspaces.jsx | Lazy | Workspace CRUD + member management |
| Users.jsx | Lazy | Team directory + invite system |
| Documentation.jsx | Lazy | 4 guides: Testing, Developer, User, Migration |
| AuthPage.jsx | N/A | Login/signup (shown when unauthenticated) |

---

## 2. AUTHENTICATION & SESSION MANAGEMENT

### Auth Flow
1. `AuthProvider` calls `supabase.auth.getSession()` on mount
2. Listens to `supabase.auth.onAuthStateChange()` for session updates
3. Syncs user to localStorage (`proflow_current_user`)
4. **GitHub OAuth tokens** stored in localStorage when available (provider_token, refresh_token)
5. Tokens cleared on sign out

### AuthPage
- Email/password login and signup
- Full name capture on signup
- Stores user info in localStorage
- Page reload on auth success triggers full re-initialization

### Protected Routes
- `ProtectedContent` component wraps all routes
- Shows `AuthLoader` during initialization
- Shows `AuthPage` when `!isAuthenticated`
- Wraps authenticated content in `Layout` with `Suspense` for lazy routes

---

## 3. WORKSPACE MANAGEMENT

### Workspace Context (OptimizedWorkspaceContext)
- **Performance**: Memoized `currentWorkspaceId` prevents unnecessary re-renders
- **Request deduplication**: Prevents duplicate workspace loads
- **30-second cache**: Avoids repeated API calls
- **Optimistic updates with rollback**: Fast UI response, server sync with error recovery
- **Auto-sync**: Ensures user exists in `workspace_members` table for RLS compliance

### Workspace Features
- `WorkspaceSwitcher` - Dropdown to switch between workspaces
- `WorkspaceModal` - Full workspace selection/creation modal
- `WorkspaceEmptyState` - Empty workspace messaging
- `WorkspaceErrorBoundary` - Workspace-specific error handling
- `WorkspaceLoadingState` - Loading skeleton for workspace
- `WorkspaceHealthCheck` - Verify workspace data integrity
- `WorkspacePerformanceMonitor` - Runtime performance tracking
- `WorkspaceCompletionStatus` - Completion metrics dashboard
- `WorkflowPatternRecognition` - Detect and suggest workflow templates
- `CrossWorkspaceValidator` - Validate multi-workspace data integrity

### Workspaces Page (Workspaces.jsx)
- **Create workspace**: Name, description, type selector (Personal/Team/Client)
- **Workspace type visuals**: Icons (briefcase/users/building) + color gradients per type
- **Switch workspace**: Click to activate, highlighted in grid
- **Delete workspace**: Owner-only, cannot delete default workspace
- **Invite members**: Email validation with regex, case-insensitive matching
- **Manage members**: Remove members dialog (cannot remove owner or self if not owner)
- **Auto-setup**: Creator added to `workspace_members` as role='owner' for RLS
- **Workspace settings**: Color and icon stored in JSON settings field

---

## 4. DASHBOARD

### Today's Focus
- AI-suggested top 3 priorities from current tasks
- Factors: overdue status, due date proximity, priority level, blocked status

### Needs Attention Section
- Overdue tasks (past due_date)
- Tasks due today
- High priority unresolved tasks
- Blocked tasks requiring action

### Team Activity Widget
- Recent tasks, documents, messages, assignments (last 24 hours)
- Shows who did what across the workspace

### Additional Widgets
- **Notes** - Collapsible personal workspace notes
- **Partner Activity** - Team member activity feeds
- **Upcoming Tasks** - Forward-looking task list
- **Widget preferences** persisted to localStorage

---

## 5. TASK MANAGEMENT

### Task Board (Kanban)
- **4 Kanban columns**: todo, in_progress, review, completed (note: `constants.js` defines 5 statuses including `done` and `blocked` — the Kanban board uses `completed` instead of `done` and doesn't show `blocked` as a column)
- **Drag-and-drop** between columns
- **Inline task creation** within each column
- **Task handoff system** for reassignment
- **Delete confirmation** dialogs
- **Active tab** persisted to localStorage

### Task Views
- **Kanban** - Drag-and-drop board
- **List** - Tabular view with sorting
- **Calendar** - Date-based view

### Filtering & Search
- **Presets**: All Tasks, My Tasks, Overdue, Due Today, This Week
- **Filters**: Assignment, Priority, Search text
- **Smart sorting**: By priority, due date, overdue status
- **URL parameter support**: `?preset=`, `?view=`, `?assignment=`, `?create=true`

### Bulk Operations
- Multi-select with checkboxes
- Bulk status change
- Bulk priority change
- Bulk delete with confirmation

### Task Form Fields
- Title, description, status, priority, due date
- Assignment linking
- Workspace member assignment
- AI keyword generation (currently disabled)

### Related Components
- `SmartTaskSearch` - Intelligent search across tasks
- `SmartTaskSuggestions` - AI-powered task suggestions
- `TaskDependencyTracker` - Track inter-task dependencies
- `TaskHandoff` - Hand off tasks to team members
- `QuickTaskCreationDialog` - Rapid task creation modal
- `AIConversationalTaskMaker` - Create tasks via AI conversation
- `ActionItemsToTasksConverter` - Extract action items from text as tasks

---

## 6. DOCUMENT MANAGEMENT

### Document Library
- **Grid and List views** with toggle
- **Folder structure** - Hierarchical organization with drag-drop
- **Quick filters**: All, Starred, Recent (top 20), Trash
- **Context filters**: Project, Assignment
- **Type filter**: contract, specification, design, report, presentation, other
- **Search**: By title, filename, description

### Document Upload Pipeline
```
Select files → Validate (100MB max via DocumentUploader, 50MB via DocumentControlPanel) → Upload to Supabase Storage
  → Create Document entity → Link to project/assignment
    → Auto-detect related documents → Suggest outdating
      → Extract content for RAG embeddings
```
- **Retry logic** with exponential backoff
- **Multi-file concurrent upload** (up to 3 workers)
- **Duplicate detection**
- **Rate limit handling**

### Document Operations
- **Star/Unstar** favorites
- **Soft delete** (move to trash, preserve folder reference)
- **Restore** from trash to original folder
- **Permanent delete** (hard delete)
- **Bulk operations** (delete/restore multiple)
- **Empty trash** (bulk permanent delete)
- **Move to folder** via drag-drop or dialog
- **Link to project/assignment**

### Document AI Features
- **Document Control Panel** - AI analysis workflow:
  ```
  UPLOAD → ANALYZING → PREVIEW → APPLYING → COMPLETE (or ERROR)
  ```
  - Runs AI analysis on uploaded document
  - Proposes changes with approve/reject per change
  - Batch approve/reject per document
  - User can edit proposed text before applying
  - Change grouping by document
  - Summary stats: total/approved/rejected/pending/applied/high-confidence/low-confidence

- **Document Q&A** - Ask questions about document content
- **Document Summarization** - AI-generated summaries
- **Related Document Suggestions** - RAG-powered similarity search
- **Document Outdating** - Mark docs as outdated with replacement tracking
  - AI finds related documents via `ragHelper`
  - Moves outdated to `/Outdated` folder
  - Clears AI caches to prevent outdated content in AI responses
  - Tracks `replaced_by` and `replacement_reason`

### Document Version & Collaboration
- **Version History** tracking
- **Comment System** (DocumentComments)
- **Change Diff View** with side-by-side comparison
- **Change Preview Cards**
- **Activity Audit Trail** - All operations logged:
  - CREATED, UPLOADED, EDITED, DELETED, RESTORED, PERMANENTLY_DELETED
  - STARRED, UNSTARRED, MOVED, DOWNLOADED, VIEWED

### Document Export & Sharing
- **Presentation Mode** - Full-screen document presentation
- **Share Button** - Share document dialog
- **Document Packager** - Package documents for export

---

## 7. PROJECT MANAGEMENT

### Project Hub
- **Grid view** with create/edit/delete
- **Filters**: Search, Status (planning/active/on_hold/completed/cancelled — hardcoded in `api/db.js`, not exported from `constants.js`), Priority
- **Navigate to**: Project dashboard or assignments
- **Legacy support**: Handles projects without workspace_id

### Project Dashboard (largest page - 79KB)
- **Theme switcher** (light/dark mode per project)
- **Assignments section** with embedded task board
- **Tasks** with filters (status, priority, search)
- **Documents** section with upload
- **Project Memory/Brain** integration
- **AI Assistant Panel** with document control
- **Document analysis** and proposed changes
- **Analysis progress** tracking
- **Document summaries** with expandable details

### Project Health & Insights
- `ProjectHealthOverview` - Health metrics (healthy/at_risk/critical)
- `ProjectInsights` - Analytics and insights dashboard

### Project AI Integration
- **Project Memory** (projectMemory.js) - Summarized context bank:
  - `getProjectMemory()` - Load accumulated project context
  - `updateProjectMemoryFromChat()` - AI learns from conversations
  - `buildProjectMemoryPrompt()` - Inject context into AI prompts

- **Project Brain** (projectBrain.js) - Verbatim message recall:
  - `storeProjectMessage()` - Archive messages for future retrieval
  - `buildProjectBrainContext()` - Find similar past conversations

---

## 8. AI SYSTEM (The Most Complex Feature Area)

### AI Hub (3 Tabs)
1. **Chat Tab** - Conversational AI with document context
2. **Research Tab** - AI research assistant with source tracking
3. **Generate Tab** - Content generation capabilities

### useAskAI Hook (1749 lines - Core AI Engine)

#### RAG Pipeline
```
Upload documents → Extract text (PDF/file)
  → Semantic chunking with structure analysis
    → Generate embeddings (OpenAI text-embedding-ada-002 or simulated)
      → Cache embeddings in Document entity
        → On query: find similar chunks → inject into LLM prompt
```
- **Concurrent processing**: Up to 3 file processing workers
- **Cost tracking**: Per-document and per-session embedding costs
- **Caching**: Embeddings cached on Document entity for reuse
- **Fallback**: Simulated embeddings when real embeddings unavailable

#### Session Management
- **Save/Load/Delete** sessions with full state preservation
- **Auto-save drafts** to localStorage every 60 seconds
- **24-hour draft expiration** with restore notification
- **Conflict detection**: Warns if loading session with unsaved changes
- **Export**: PDF and Markdown with full metadata (RAG info, timestamps, costs)

#### Project Integration
- When project selected, auto-loads project memory
- Stores messages in project brain for future context
- After session save, updates project memory bank
- Builds prompts with both memory (summarized) and brain (verbatim) context

#### AI Models Available
```
GEMINI_ARCHITECT: gemini-3.0-pro-001
CLAUDE_DEEP_THINKER: claude-opus-4-5-20251101
CLAUDE_QA_REVIEWER: claude-sonnet-4-5-20250514
CLAUDE_FAST: claude-haiku-4-5-20250514
```

### AI Feature Components
| Component | Purpose |
|-----------|---------|
| `AIResearchAssistant` | Research mode with source tracking |
| `ContextAwareChat` | Context-aware conversations |
| `SmartContextDetector` | Auto-detect relevant project/doc context |
| `PromptBuilderWizard` | Guided prompt creation |
| `UnifiedAIAssistant` | Floating unified AI interface |
| `AIProjectExpert` | Project-specific AI assistant |
| `AIDocumentAnalyzer` | Analyze document content |
| `AIDocumentStructurer` | Restructure document organization |
| `AIConversationalTaskMaker` | Create tasks via conversation |
| `ActionItemsToTasksConverter` | Extract action items as tasks |
| `TransformMenu` | Text transformation options |
| `AISummaryButton` | Document summarization |
| `AIWritingAssistant` | Grammar and style checking |
| `GrammarAssistant` | Grammar fixes |
| `AudienceRewriter` | Rewrite for different audiences |
| `ContentRewriter` | General content rewriting |
| `AIReviewPanel` / `EnhancedAIReviewPanel` | Review AI suggestions |
| `TaskProposalPanel` | Propose tasks from content |
| `AIAssistantWidget` | Floating AI widget |

### AskAI Page (AskAI.jsx - NOT Deprecated)
The AskAI page is **still actively used** as a specialized AI chat interface for document analysis:
- Uses the full `useAskAI` hook (1749 lines)
- **Left sidebar**: Document upload, assignment/project selection, embedding status
- **Main area**: Chat messages + input
- **Dialogs**: Save session, export, load session, delete confirmation
- **Enhancement overlays**: Onboarding tutorial, quick start guide, keyboard shortcuts, session templates, cost estimator
- **Keyboard shortcuts**: Cmd/Ctrl+Enter (send), Cmd+U (upload), Cmd+N (new), Cmd+S (save)
- **Capacity warnings**: Alerts at 60 docs / 300 messages thresholds
- **Suggested questions**: Pre-built prompts for common analysis tasks
- Delegates UI to sub-components: `AskAIHeader`, `AskAIDocumentSidebar`, `AskAIChatArea`, `AskAIDialogs`

### AI Spotlight (Cmd/Ctrl+J)
- Command palette-style AI access from any page
- **Categories**: Chat & Assistant, Research, Generate & Create, Task Assistance
- **Actions**: Chat with AI, Chat with Documents, Research Assistant, Web Research, Generate Document, Write Content, Prioritize Tasks, Plan Project, Schedule Assistance
- **Context-aware suggestions**: Different options based on current page (Tasks, Projects, Documents, Assignments)
- **Recent actions**: Saved to localStorage
- Navigates to routes with optional `prompt` parameter pre-filled
- Lazy-loaded for performance

### Global Search (Ctrl+K)
- Command palette interface searching across all entity types
- **Searches**: Projects, Assignments, Documents, Tasks, Messages
- **Quick Actions**: Create Task, Create Document, Open AI Hub, Dashboard, Team Directory
- **Recent searches**: localStorage-backed (max 5 saved)
- **Workspace-aware**: All queries filtered by `currentWorkspaceId`
- Emits `CustomEvent('globalSearchResult')` on selection for cross-component communication
- All queries limited to 20 results, displayed as top 5 per category
- Lazy-loaded for performance

---

## 9. DEBATE SYSTEM

### Architecture
```
User selects context (none/project/assignment/GitHub repo)
  → Enter question/prompt
    → Debate Orchestrator manages dual-AI conversation
      → Two AI models argue different perspectives
        → Consensus Indicator tracks agreement score
          → Auto-generates synthesis when consensus reached
            → Results saveable to project/documents
```

### Components
| Component | Role |
|-----------|------|
| `DebateChatInterface` | Main debate chat UI |
| `DebateMessage` | Individual debate message display |
| `DebateControls` | Start/stop/reset debate |
| `ConsensusIndicator` | Visual consensus progress |
| `ContextSelector` | Select debate scope |

### Backend
- `debateOrchestrator.js` - Orchestrates dual AI debate turns
- `contextManager.js` - Manages debate context loading
- `useDebateSession.js` - State management hook
- `debateMemory.js` (api/) - Debate context persistence

---

## 10. GITHUB INTEGRATION

### Connection Pipeline
```
User clicks "Connect GitHub" → Supabase OAuth (scopes: repo, read:org, read:user)
  → Provider token stored in localStorage
    → githubFetch() uses token for API calls
      → Production: Edge Function proxy (CORS avoidance)
      → Development: Direct API calls
```

### Features
- **Repository linking**: Connect GitHub repos to workspace
- **Public repo support**: `PublicRepoUrlInput` for unauthenticated access (60/hr rate limit)
- **Repository analysis**: Code analysis via `repositoryAnalyzer.js`
- **Dual-AI chat**: Two AI models discuss repository code
- **Artifact generation**: Create documentation/analysis artifacts
- **Completeness analysis**: Evaluate artifact quality
- **Save to workspace**: Store AI-generated content as workspace documents
- **Repository memory**: Persistent context about repositories (`useRepositoryMemory`)

### GitHub API Client (api/github.js)
- **Token management**: Session-first, localStorage fallback
- **URL parsing**: Supports full URLs and `owner/repo` slugs
- **Rate limit detection**: Identifies and handles 403 rate limit responses
- **Error categorization**: Distinguishes 404 vs 403 vs other errors

### Hooks
| Hook | Purpose |
|------|---------|
| `useGitHubConnection` | Connection state, connect/disconnect |
| `useGitHubRepos` | Repository listing and operations |
| `useDualAICollaboration` | Dual-AI conversation logic |
| `useRepositoryMemory` | Repository context management |

---

## 11. TEAM CHAT

### useChat Hook (1113 lines)

#### Real-time Architecture
```
Supabase Realtime subscription (primary)
  ↕
15-second fallback polling (when realtime fails)
  ↕
Optimistic updates (instant UI feedback)
```

#### Features
- **Thread management**: Scoped to workspace/project/assignment context
- **Message operations**: Send, edit, delete with optimistic updates
- **Emoji reactions**: Add/remove reactions on messages
- **Message pinning**: Pin/unpin important messages
- **Bookmarking**: Per-user message bookmarks
- **Typing indicators**: Real-time via Supabase presence channel
- **File sharing**: Upload files to messages with drag-drop
- **Reply threads**: Messages can reply to other messages
- **@Mentions**: Extract and record mentioned users
- **Read status**: `read_by` array with timestamps per message
- **Chat summaries**: AI-generated thread summaries
- **View modes**: Comfortable and compact

### UI Components
- `VirtualizedMessageList` - Performance-optimized rendering for large message lists
- `ConversationSidebar` - Thread list with search
- `EnhancedMessage` - Rich message display
- `MessageReactions` - Emoji reaction UI
- `ThreadedConversation` - Nested thread display
- `ThreadSearch` - Search within conversations
- `ShareToChatDialog` - Share items to chat
- `SessionCreationDialog` - Create new chat sessions
- `ChatSummaryButton` / `ThreadSummaryButton` - AI summaries

### TeamChat Bubble
- Floating chat widget available on all pages
- Route-aware: auto-filters by project on ProjectDashboard
- Accessible without navigating to full Chat page

---

## 12. LAYOUT & NAVIGATION

### Desktop Navigation Structure
```
Top Header:
  ├── Mobile menu trigger (Sheet)
  ├── ProFlow logo
  ├── Navigation dropdowns:
  │   ├── Home: Dashboard
  │   ├── Work: Projects, Assignments, Tasks
  │   ├── Documents: Documents Hub
  │   ├── AI: AI Hub, AI Debate, GitHub
  │   └── Team: Chat, Members
  ├── Workspace Switcher
  ├── Notification bell (unread count badge)
  └── User profile dropdown (avatar, name, role)

Sidebar (desktop):
  ├── ProFlow branding
  ├── Navigation groups with icons
  ├── Active page indicator
  └── User profile card with role badge
```

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+K | Global Search |
| Ctrl+D | Dashboard |
| Ctrl+P | Projects |
| Ctrl+A | Assignments |
| Ctrl+T | Tasks |
| Ctrl+O | Documents |
| Ctrl+W | Documents Studio tab |
| Ctrl+Q | AI Hub |
| Ctrl+C | Chat |
| Ctrl+R | AI Hub Research tab |
| Ctrl+U | Users |
| Cmd/Ctrl+J | AI Spotlight |

### Floating Components (always available)
- `ConnectionStatus` banner
- `WorkspacePerformanceMonitor`
- `GlobalSearch` (Ctrl+K) - lazy loaded
- `AISpotlight` (Cmd/Ctrl+J) - lazy loaded
- `UnifiedAIAssistant`
- `TeamChatBubble` (route-aware)
- `BugReporter` (dev only)
- `WhatsNewModal` (feature discovery)
- `MobileBottomNav`
- `TutorialOverlay`

### Notification System
- Loads essential notifications: overdue tasks, tasks due soon, newly assigned, assignment status changes
- Filters to high-priority actionable items only
- Max 5 shown, auto-refreshes every 5 minutes
- Types: urgent, warning, success, info with actionUrl navigation

### Preferences Page (Preferences.jsx)
- **Profile Tab**: Full name (read-only), email (read-only), department, job title, phone, bio, avatar upload. Sidebar shows role, member since, last active.
- **Notifications Tab**: 5 toggle switches: email_notifications, task_reminders, project_updates, assignment_mentions, document_shares
- **Integrations Tab**: GitHubConnectionCard (connect/disconnect GitHub OAuth), placeholder slots for future integrations (Slack, Jira)
- Tab state synced to URL query parameters
- Uses `db.auth.me()` / `db.auth.updateMe()` for persistence

### Users Page (Users.jsx)
- **Team directory**: Lists workspace members with profile cards
- **Two view modes**: "workspace" (current workspace members) and "all" (all system users)
- **Search**: By name, email, department, job title
- **Filter by role**: admin, project_manager, team_member, client
- **Invite system**: Email-based invite to workspace with validation
- **Pending invites**: Shows emails invited but not yet registered
- **User cards**: Name, email, phone, department, bio, last active, assignment count
- **Statistics bar**: Admin, PM, team member, client counts
- **Owner marking**: Synthetic user entry created if owner not in users list

### Documentation Page (Documentation.jsx)
4 comprehensive guides for workspace architecture:
1. **Testing Checklist** - Security tests (cross-workspace isolation), page-level tests, workflow scenarios
2. **Developer Guide** - WorkspaceContext usage, 5 workspace rules (filter, add workspace_id, maintain on update, validate operations, wait for workspace_id)
3. **User Guide** - Workspace types (Personal/Team/Client), getting started, data isolation
4. **Migration Guide** - Scripts for migrating existing data to workspace architecture

---

## 13. ONBOARDING & TUTORIALS

### WhatsNewModal
- Feature discovery for new/updated features
- Shows on first visit or after updates

### TutorialOverlay
- Interactive in-app tutorials
- Step-by-step walkthroughs of features

### Tutorial Provider
- Context provider for tutorial state
- Tracks completion across sessions

### Additional Tutorial Files
- `tutorialSteps.jsx` - Step definitions for guided walkthroughs
- `TutorialButton.jsx` - UI trigger for tutorials

---

## 14. DEVTOOLS (Development Only)

### BugReporter System (/features/devtools/)
- **BugReporter** - Visual bug reporting tool (dev environment only)
- **BugReporterProvider** - Context provider for bug reporting state
- **DevToolsPanel** - Developer tools panel
- **ElementSelector** - Click-to-select DOM element for bug reports
- **ScreenshotAnnotator** - Annotate screenshots with markers/arrows
- **SelectionHighlight** - Visual highlight of selected elements
- **PromptGenerator** - Generate prompts from bug context
- **ToolBar** - Devtools toolbar UI

---

## 15. DATA LAYER & API ARCHITECTURE

### Entity Manager Pattern (db.js)
```javascript
// Proxy-based entity creation
const Entity = db.entities.EntityName;

// Available methods
Entity.list(filters, sortOrder, limit)      // Get multiple
Entity.filter(filterObj, sortOrder, limit)   // Filter (workspace_id required)
Entity.get(id)                              // Single by ID
Entity.create(data)                         // Create new
Entity.bulkCreate(dataArray)                // Batch create
Entity.update(id, data)                     // Update
Entity.delete(id)                           // Remove
Entity.count(filters)                       // Count
```

### AI API Layer
| Module | Purpose |
|--------|---------|
| `geminiClient.js` | Google Gemini API integration |
| `openaiClient.js` | OpenAI API integration |
| `anthropicClient.js` | Anthropic Claude API integration |
| `projectMemory.js` | Project memory CRUD + prompt building |
| `projectBrain.js` | Verbatim message storage + recall |
| `documentControl.js` | Document AI analysis operations |
| `repositoryAnalyzer.js` | GitHub code analysis |
| `debateMemory.js` | Debate context persistence |

### Integration Functions
| Function | Purpose |
|----------|---------|
| `InvokeLLM()` | Call LLM with prompt/system_prompt |
| `UploadFile()` | Upload file to Supabase storage |
| `ExtractDataFromUploadedFile()` | PDF text extraction |
| `ragHelper()` | Embeddings, similarity search, related docs |
| `exportSessionToPdf()` | Session to PDF conversion |

### All 16 API Modules
| Module | Purpose |
|--------|---------|
| `db.js` | Proxy-based entity managers with CRUD + workspace filtering |
| `supabaseClient.js` | Supabase client initialization |
| `entities.js` | Entity exports and type definitions |
| `integrations.js` | InvokeLLM, UploadFile, ExtractDataFromUploadedFile |
| `functions.js` | ragHelper, exportSessionToPdf, anthropicResearch |
| `github.js` | GitHub OAuth + API client (new, in-progress) |
| `geminiClient.js` | Google Gemini API integration |
| `openaiClient.js` | OpenAI API integration |
| `anthropicClient.js` | Anthropic Claude API integration |
| `projectMemory.js` | Project memory CRUD + prompt building |
| `projectBrain.js` | Verbatim message storage + recall |
| `documentControl.js` | Document AI analysis operations |
| `repositoryAnalyzer.js` | GitHub code analysis |
| `debateMemory.js` | Debate context persistence |
| `codeParser.js` | Code parsing utilities |
| `index.js` | API exports |

### Config Files
| File | Contents |
|------|----------|
| `constants.js` | Entity types, statuses, priorities, roles, AI models, file limits, pagination, debounce delays, routes, memory limits |
| `aiModels.js` | AI model-specific configurations and settings |

---

## 16. ALL CUSTOM HOOKS

| Hook | Lines | Purpose |
|------|-------|---------|
| `useAskAI` | 1749 | Core AI engine: RAG pipeline, session mgmt, project memory/brain, cost tracking, export |
| `useChat` | 1113 | Team chat: realtime subscriptions, threads, reactions, pinning, bookmarks, typing, file sharing, mentions, read status |
| `useDocumentControl` | 517 | AI document analysis workflow: UPLOAD→ANALYZING→PREVIEW→APPLYING→COMPLETE, change approve/reject |
| `useAskAISessions` | 386 | Session CRUD: save/load/delete with conflict detection, project memory updates |
| `useDocumentActions` | 380 | Document CRUD with activity logging: star, soft delete, restore, permanent delete, bulk ops, empty trash |
| `useDocumentFilters` | 262 | Search + filter: quick filters (All/Starred/Recent/Trash), context filters, type filter, smart counts |
| `useDocumentOutdating` | 259 | AI-powered related doc discovery, mark outdated with replacement tracking, folder management, cache clearing |
| `useAskAIDraft` | 207 | localStorage draft persistence: 60s auto-save, 24-hour expiration, restore notification |
| `useAskAIExport` | 157 | PDF and Markdown export with full metadata (RAG info, timestamps, embedding costs) |
| `useConnectionStatus` | 154 | Dual monitoring (browser + Supabase realtime), exponential backoff reconnection, periodic 30s checks |
| `useDocumentActivity` | 148 | Activity audit trail: log operations (11 action types), fetch with filters |
| `useDocumentDiff` | 135 | Change preview with applied/rejected tracking, batch accept/reject/reset, stats |
| `useDebouncedValue` | 25 | Generic debounce with 300ms default |
| `useSwipeGesture` | - | Touch gesture detection for mobile |
| `use-mobile` | - | Mobile viewport detection |

---

## 17. PERFORMANCE OPTIMIZATIONS

| Optimization | Implementation |
|-------------|---------------|
| React Query | 5-min staleTime, 1 retry, no refetch on window focus |
| Workspace cache | 30-second cache with request deduplication |
| Memoized context | Prevents unnecessary re-renders |
| Lazy loading | Non-core pages loaded on demand |
| Preloading | Lazy pages preloaded 1s after auth |
| Virtualized lists | Chat messages use virtualized rendering |
| Concurrent upload | Up to 3 file processing workers |
| Embedding cache | Document embeddings cached for reuse |
| Exponential backoff | API retries with increasing delays |
| Optimistic updates | Immediate UI feedback with server sync |
| Debouncing | Search 300ms, Input 150ms, Resize 100ms |

---

## 18. ERROR HANDLING & RESILIENCE

| Pattern | Usage |
|---------|-------|
| ErrorBoundary | Wraps all pages + specific feature areas |
| Toast notifications | User-friendly error/success/warning feedback |
| Confirmation dialogs | All destructive actions require confirmation |
| Rate limit detection | GitHub API + general API rate limit handling |
| Connection monitoring | Dual monitoring (browser + Supabase) with reconnection |
| Draft auto-save | 24-hour localStorage backup of AI sessions |
| Conflict detection | Warns before overwriting unsaved work |
| Abort controllers | Cancellable long-running operations |
| Fallback polling | 15s polling when Supabase realtime disconnects |
| Activity audit trail | Full document operation logging |

---

## 19. REUSABLE UI COMPONENTS

### /components/ui/ (49 shadcn/ui Primitives)
**Form**: accordion, alert, alert-dialog, badge, breadcrumb, button, card, checkbox, dropdown-menu, form, input, input-otp, label, pagination, radio-group, select, textarea, toggle, tooltip
**Layout**: aspect-ratio, carousel, collapsible, dialog, drawer, hover-card, navigation-menu, popover, progress, resizable, scroll-area, separator, sheet, skeleton, slider, switch, table, tabs
**Rich Content**: chart, command, context-menu, menubar, rich-text-editor (TipTap)
**Notifications**: sonner (toast provider), toast, toaster, use-toast

### /components/common/ (16 Shared Components)
| Component | Purpose |
|-----------|---------|
| `Layout.jsx` (44KB) | Main app layout with header, sidebar, floating widgets |
| `sidebar.jsx` (21KB) | Navigation sidebar with project/assignment tree |
| `FolderStructure.jsx` (14KB) | Hierarchical folder browser with drag-drop |
| `ProjectAssignmentStructure.jsx` (9KB) | Project/assignment hierarchy tree |
| `PresentationMode.jsx` (12KB) | Full-screen document presentation |
| `VoiceInput.jsx` (7KB) | Voice-to-text input capture |
| `SwipeableListItem.jsx` (7KB) | Mobile swipe actions on list items |
| `ShareButton.jsx` (6KB) | Share document dialog |
| `EmptyState.jsx` (6KB) | Generic empty state messaging |
| `ErrorBoundary.jsx` (5KB) | React error boundary with fallback UI |
| `MobileBottomNav.jsx` (5KB) | Mobile bottom navigation bar |
| `ConnectionStatus.jsx` (4KB) | Network/Supabase connection indicator |
| `DroppableFolder.jsx` (4KB) | Folder drag-drop target |
| `PageSkeleton.jsx` (3KB) | Loading skeleton for pages |
| `DroppableZone.jsx` (2KB) | Generic drag-drop target zone |
| `DocumentViewToggle.jsx` (1KB) | Switch between list/grid/gallery view |

### /components/ Additional Directories
| Directory | Contents |
|-----------|----------|
| `/ai/` | AISpotlight and AI-related UI |
| `/auth/` | AuthProvider, login/signup components |
| `/dashboard/` | DashboardNotes, RecentActivity, QualityControlDashboard, PartnerActivity, StatsOverview |
| `/dialogs/` | CreateFolderDialog, MoveToFolderDialog, FileShareDialog, ConfirmationDialog |
| `/documents/` | DocumentLibrary, DocumentLibraryNew, DocumentList, DocumentPreviewPanel, DocumentSidebar, DocumentActivityPanel, ProjectTree, QuickFilters, OutdatedDocumentBadge |
| `/editor/` | Rich text editor (TipTap integration) |
| `/forms/` | Form components |
| `/search/` | GlobalSearch, EnhancedSearch |
| `/workspace/` | Workspace context and management components |

---

## 20. ALL FEATURE MODULES (14 Domains)

| Module | Key Components |
|--------|---------------|
| **ai/** (25+ files) | AIResearchAssistant, ContextAwareChat, SmartContextDetector, PromptBuilderWizard, UnifiedAIAssistant, AIProjectExpert, AIDocumentAnalyzer, AIDocumentStructurer, AIConversationalTaskMaker, ActionItemsToTasksConverter, AIWritingAssistant, GrammarAssistant, AudienceRewriter, ContentRewriter, TransformMenu, AISummaryButton, AIReviewPanel, EnhancedAIReviewPanel, TaskProposalPanel, AIAssistantWidget, AIMessageBubble |
| **ai/askAI/** | AskAIChatArea, AskAIDialogs, AskAIDocumentSidebar, AskAIHeader |
| **assignments/** | AssignmentForm, AssignmentDetails, AssignmentProgress, LinkDocumentToAssignmentDialog |
| **chat/** | ChatSessionManager, ConversationSidebar, ConversationHistory, EnhancedMessage, MessageBubble, MessageReactions, VirtualizedMessageList, ThreadedConversation, ThreadSearch, ShareToChatDialog, SessionCreationDialog, ChatSummaryButton, ThreadSummaryButton |
| **chat/chatPage/** | ChatHeader, ChatNewThreadDialog |
| **debate/** | DebateChatInterface, DebateMessage, DebateControls, ConsensusIndicator, ContextSelector |
| **devtools/** | BugReporter, BugReporterProvider, DevToolsPanel, ElementSelector, PromptGenerator, ScreenshotAnnotator, SelectionHighlight, ToolBar |
| **documents/** (22 files) | DocumentUploader, DocumentControlPanel, DocumentVersionHistory, DocumentComments, DocumentPreview, DocumentQA, DocumentTemplates, DocumentPackager, DocumentRestoreDialog, DocumentDuplicateDialog, AnalysisProgress, ChangeDiffView, ChangeEditModal, ChangePreviewCard, ConfidenceBadge, ContextualContentHub, EnhancedDocumentSearch, LinkDocumentToProjectDialog, RelatedContentSuggestions, RelatedDocumentsSuggestionPanel, DraggableDocument, PackageViewer |
| **github/** | RepositoryList, RepositoryPicker, RepositoryAnalysisStatus, PublicRepoUrlInput (new), DualAIChatInterface, ArtifactViewer, CompletenessAnalysis, GitHubConnectionCard, PromptTemplates |
| **github/debate/** | ConsensusIndicator, DebateChatInterface, DebateControls, DebateMessage (GitHub-specific debate) |
| **onboarding/** | WhatsNewModal |
| **projects/** | ProjectForm, ProjectGrid, ProjectDetails, ProjectHealthOverview, ProjectInsights |
| **projects/dashboard/** | ProjectAIAssistant, ProjectDocumentsSection, ProjectTeamNotes |
| **research/** | DecisionCapture, ResearchSuggestions |
| **tasks/** | TaskBoard, TaskForm (implied), TaskFilters (implied), SmartTaskSearch, SmartTaskSuggestions, TaskDependencyTracker, TaskHandoff, TaskItem, QuickTaskCreationDialog |
| **teamchat/** | TeamChatBubble (floating chat widget, route-aware) |
| **tutorial/** | TutorialOverlay, TutorialProvider, TutorialButton, tutorialSteps (interactive walkthroughs) |
| **workspace/** | OptimizedWorkspaceContext, WorkspaceContext, WorkspaceSwitcher, WorkspaceModal, WorkspaceEmptyState, WorkspaceErrorBoundary, WorkspaceLoadingState, WorkspaceHealthCheck, WorkspacePerformanceMonitor, CrossWorkspaceValidator, WorkflowPatternRecognition, WorkspaceCompletionStatus |

---

## 21. DEPENDENCIES (package.json)

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.0 | Core framework |
| react-dom | 19.2.0 | DOM rendering |
| react-router | 7.9.6 | Routing |
| @supabase/supabase-js | 2.86.0 | Backend/database |
| @tanstack/react-query | 5.90.11 | Server state management |
| tailwindcss | 4.1.17 | Styling |
| @tiptap/* | 3.11.1 | Rich text editor |
| framer-motion | 12.4.7 | Animations |
| recharts | 2.15.1 | Charts/graphs |
| lucide-react | 0.475.0 | Icons |
| sonner | 2.0.1 | Toast notifications |
| @google/generative-ai | 0.24.1 | Gemini API |
| openai | 6.15.0 | OpenAI GPT API |
| @anthropic-ai/sdk | 0.71.2 | Anthropic Claude API |
| zod | 3.24.2 | Schema validation |
| react-hook-form | 7.54.2 | Form management |
| react-markdown | 9.0.1 | Markdown rendering |
| dompurify | 3.3.0 | HTML sanitization |
| @hello-pangea/dnd | 18.0.1 | Drag & drop |
| @radix-ui/* | various | 20+ UI primitives |

### Dev Dependencies
| Package | Purpose |
|---------|---------|
| vitest | Testing framework |
| @testing-library/* | Testing utilities |
| eslint + plugins | Linting |
| prettier | Formatting |
| husky + lint-staged | Git hooks (pre-commit checks) |

---

## 22. SECURITY MODEL

| Layer | Implementation |
|-------|---------------|
| Auth | Supabase Auth with session management |
| RLS | Row Level Security via workspace_members table |
| Data isolation | All queries filtered by workspace_id |
| Function filter block | db.js blocks function filters to prevent data leakage |
| Token management | GitHub tokens in localStorage, cleared on sign out |
| Input validation | Form-level validation before submission + Zod schemas |
| HTML sanitization | DOMPurify for user-generated content |
| File size limits | 10MB file, 5MB image, 25MB document (via constants.js `FILE_LIMITS`). 100MB upload limit is hardcoded in `DocumentUploader.jsx`, 50MB in `DocumentControlPanel.jsx` |
| Workspace membership | Auto-ensured on workspace load via workspace_members |
| Case-insensitive email | Prevents RLS bypass via email casing |

---

## 23. CURRENT GIT STATUS (In-Progress Work)

Modified files indicate active GitHub integration work:
- `api/github.js` - GitHub API client changes
- `features/github/RepositoryList.jsx` - Repository list updates
- `features/github/index.js` - Feature exports
- `features/github/useGitHubRepos.js` - Repos hook changes
- `pages/GitHubHub.jsx` - Hub page updates
- `features/github/PublicRepoUrlInput.jsx` - **New file** (untracked)

Recent commits focus on GitHub API integration, Supabase auth, and AI collaboration features.
