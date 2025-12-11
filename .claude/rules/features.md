---
paths: features/**/*.jsx
---

# Feature Module Rules

## Structure

Each feature is self-contained in `/features/[feature-name]/`:

```
features/tasks/
├── TaskBoard.jsx        # Main feature component
├── TaskFilters.jsx      # Sub-component
├── TaskCard.jsx         # Sub-component
└── index.js             # Exports (optional)
```

## Imports

- Import shared components from `@/components/`
- Import hooks from `@/hooks/`
- Import API from `@/api/entities` or `@/api/db`
- Use `@/` alias, never relative paths outside feature

## Context Usage

```javascript
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useAuth } from '@/components/auth/AuthProvider';

const { currentWorkspaceId } = useWorkspace();
const { user } = useAuth();
```

## Data Fetching

- Use React Query for server state when appropriate
- Always include `workspace_id` in queries
- Handle loading and error states

## Component Size

- Feature components can be large and complex
- Break into sub-components when logic becomes unwieldy
- Co-locate related components in same feature folder

## Cross-Feature Communication

- Use context for shared state (workspace, auth)
- Emit events via callbacks, not direct imports
- Keep features loosely coupled
