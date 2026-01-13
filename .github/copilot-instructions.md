# Proflow Copilot Instructions

## Project Overview

Proflow is an AI-powered project management platform using React 19, Vite 7, TailwindCSS v4, and Supabase.

## Critical: Verify Before Claiming

- **Always verify file existence** with filesystem tools before claiming files exist or need deletion
- **Search for actual imports/usage** before reporting dead code
- Code references may exist for backwards compatibility after files are removed

## Import Pattern (Always Use @ Alias)

```javascript
import { Component } from '@/components/...';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { db } from '@/api/db';
import { cn } from '@/lib/utils';
import { TASK_STATUS, ROUTES } from '@/config/constants';
```

## Directory Structure

| Directory              | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `/pages/`              | Route page components (routed via `index.jsx`)        |
| `/components/ui/`      | shadcn/ui primitives (50+ components)                 |
| `/components/common/`  | Layout, ErrorBoundary, shared components              |
| `/features/`           | Feature modules (ai/, documents/, tasks/, workspace/) |
| `/hooks/`              | Custom React hooks (useAskAI, useChat, useWorkspace)  |
| `/api/db.js`           | Entity managers with CRUD (use `db.Entity.method()`)  |
| `/config/constants.js` | Enums: TASK_STATUS, ENTITY_TYPES, USER_ROLES          |

## Multi-Tenancy: Always Filter by workspace_id

All Supabase queries MUST include workspace_id filtering for data isolation:

```javascript
const { data } = await supabase.from('tasks').select('*').eq('workspace_id', workspaceId);
// Or use entity managers: db.Task.list({ workspace_id: workspaceId })
```

## Consolidated Hub Pages (Know the Redirects)

- `AIHub.jsx` → Chat, Research, Generate tabs (old `/Research`, `/Generate` redirect here)
- `DocumentsHub.jsx` → Library, Studio, Templates tabs (old `/DocumentCreator`, `/DocumentStudio` redirect here)
- Tab navigation via query params: `/Documents?tab=studio`, `/AIHub?tab=research`

## State Management

- **Global state**: React Context (`WorkspaceProvider`, `AuthProvider`)
- **Server state**: React Query (`@tanstack/react-query`)
- **Persistence**: localStorage (`proflow_current_user`, `active_workspace_id`)

## Styling

- Use `cn()` utility for merging Tailwind classes: `cn("base-class", condition && "conditional-class")`
- shadcn/ui components in `/components/ui/` – prefer these over custom implementations
- TipTap for rich text editing

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build (strips console.log)
npm run test         # Vitest watch mode
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format
```

## Environment Variables

```
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-key>
```

## AI Integration Points

- **Anthropic Claude** (`claude-sonnet-4-20250514`): Research, document analysis
- **OpenAI Embeddings** (`text-embedding-ada-002`): RAG/semantic search in Ask AI
- API clients: `/api/anthropicClient.js`, `/api/openaiClient.js`
