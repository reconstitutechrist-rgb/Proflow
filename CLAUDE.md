# Claude Code Instructions for Proflow

## Critical: Always Verify, Never Assume

Before claiming files exist, need deletion, or are unused:

1. **Verify file existence** - Use `Glob` or `ls` to confirm files actually exist on disk before claiming they need to be deleted
2. **Verify usage** - Use `Grep` to search for actual imports/references, not just infer from related code
3. **Check filesystem state** - Code references (imports, routes, constants) may exist for backwards compatibility even after files are deleted

Do NOT:

- Assume a file exists just because it's referenced in routing/import code
- Report files as "dead code" without confirming they exist
- Make claims about the codebase without direct verification

## Tech Stack

- React 19 + React Router 7
- Vite 7 (build tool)
- TailwindCSS v4 (via Vite plugin)
- Supabase (Auth, Database, Storage)
- shadcn/ui + Radix UI (components)
- TipTap (rich text editor)
- React Query (@tanstack/react-query)
- Vitest (testing)

## Project Structure

- `/pages/` - Page components (routed via index.jsx)
- `/components/` - Reusable UI components
  - `/ui/` - shadcn/ui primitives (50+ components)
  - `/common/` - Layout, ErrorBoundary, shared components
  - `/auth/` - Authentication components
- `/features/` - Feature modules (ai/, chat/, documents/, tasks/, projects/, workspace/)
- `/hooks/` - Custom React hooks (useAskAI, useChat, useDebouncedValue)
- `/api/` - Supabase data layer
  - `db.js` - Entity managers with CRUD operations
  - `supabaseClient.js` - Supabase initialization
  - `entities.js` - Entity exports
- `/config/` - Constants and configuration
- `/lib/` - Utilities (cn, createPageUrl, toast)

## Consolidated Hub Pages

These hub pages consolidate multiple features:

- `AIHub.jsx` - Chat, Research, and Generate tabs (replaces old standalone pages)
- `DocumentsHub.jsx` - Library, Studio, and Templates tabs

Old routes redirect to these hubs for backwards compatibility.

## Code Patterns

### Import Pattern (Always use @ alias)

```javascript
import { Component } from '@/components/...';
import { useHook } from '@/hooks';
import { Entity } from '@/api/entities';
import { db } from '@/api/db';
import { cn } from '@/lib/utils';
import { ROUTES, TASK_STATUS } from '@/config/constants';
```

### State Management

- React Context for global state (WorkspaceContext, AuthProvider)
- React Query for server state
- localStorage for persistence (proflow_current_user, active_workspace_id)

### Data Fetching Pattern

```javascript
const { data, error } = await supabase.from('table').select('*').eq('workspace_id', workspaceId);
```

- Always filter by workspace_id for multi-tenancy
- Handle errors with toast notifications
- Use db.js entity managers for standard CRUD

### Styling

- Use `cn()` utility from @/lib/utils for merging Tailwind classes
- Use shadcn/ui components from @/components/ui/
- Follow existing color/spacing patterns in index.css

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier format all
npm run format:check # Check formatting
npm run test         # Run tests (watch mode)
npm run test:run     # Run tests once
npm run test:coverage # Run with coverage
```

## Commit Convention

Conventional commits required: `type(scope): message`

Types: feat, fix, chore, refactor, docs, test, style

Example: `feat(chat): add message reactions`

## Key Constants (config/constants.js)

- `TASK_STATUS`: todo, in_progress, review, done, blocked
- `TASK_PRIORITY`: low, medium, high, urgent
- `ENTITY_TYPES`: Task, Document, Project, Assignment, etc.
- `USER_ROLES`: owner, admin, member, viewer
- `WORKSPACE_ROLES`: owner, member

## Data Entities

All entities are workspace-scoped for multi-tenancy:

| Entity      | Purpose                |
| ----------- | ---------------------- |
| Project     | High-level initiative  |
| Assignment  | Project component      |
| Task        | Actionable work item   |
| Document    | Content/files          |
| Workspace   | Multi-tenant container |
| User        | User profile           |
| ChatSession | Chat history           |
| Message     | Chat messages          |

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Global Search
- `Ctrl/Cmd + D` - Dashboard
- `Ctrl/Cmd + P` - Projects
- `Ctrl/Cmd + T` - Tasks
- `Ctrl/Cmd + O` - Documents
- `Ctrl/Cmd + Q` - AI Hub
