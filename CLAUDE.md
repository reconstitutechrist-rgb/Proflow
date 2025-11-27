# CLAUDE.md - Proflow Development Guide

## Project Overview

**Proflow** is an AI-powered project and document management platform built with React and Vite. It provides intelligent workspaces for teams to manage assignments, tasks, documents, conduct AI-assisted research, and collaborate effectively.

## Quick Reference

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 18.2 + Vite 6.1 |
| Routing | React Router DOM 7.2 |
| UI Components | Radix UI + Shadcn/ui (new-york style) |
| Styling | Tailwind CSS 3.4 |
| Icons | Lucide React |
| Animations | Framer Motion 12.4 |
| Forms | React Hook Form + Zod |
| Rich Text | React Quill |
| Charts | Recharts 2.15 |
| Backend | Supabase (migrated from Base44) |

## Project Structure

```
Proflow/
├── api/                    # API layer and data access
│   ├── index.js           # Central export point
│   ├── base44Client.js    # Supabase data client
│   ├── supabaseClient.js  # Supabase connection
│   ├── entities.js        # Entity exports (Task, Document, etc.)
│   ├── integrations.js    # LLM and file operations
│   └── functions.js       # Research and RAG helpers
├── components/
│   ├── ui/                # Shadcn/ui components (50+ components)
│   └── workspace/         # Workspace context and providers
├── hooks/                 # Custom React hooks
├── lib/
│   └── utils.js          # Utility functions (cn, createPageUrl)
├── *.jsx                  # Page and feature components (root level)
├── App.jsx               # App entry component
├── main.jsx              # React entry point
├── index.jsx             # Router and page definitions
├── Layout.jsx            # Main layout with navigation
└── Configuration Files:
    ├── vite.config.js
    ├── tailwind.config.js
    ├── components.json
    ├── eslint.config.js
    └── postcss.config.js
```

## Architecture Patterns

### Import Aliases

The project uses `@/` as the root alias:
```javascript
import { Button } from "@/components/ui/button";
import { Task, Document } from "@/api/entities";
import { cn } from "@/lib/utils";
```

### Component Patterns

**Page Components** (root level .jsx files):
- Named exports: `export default function PageName()`
- Use `useWorkspace()` hook for workspace context
- Follow loading/error/content pattern
- Filter data by `workspace_id`

**UI Components** (components/ui/):
- Shadcn/ui style with `forwardRef` pattern
- Use `cva` for variants (class-variance-authority)
- Use `cn()` utility for className merging

### Data Layer

**Entity Operations:**
```javascript
import { Task, Document, Assignment } from "@/api/entities";
import { base44 } from "@/api/base44Client";

// List all
const tasks = await Task.list();

// Filter with workspace
const tasks = await Task.filter({ workspace_id: currentWorkspaceId });

// CRUD operations
await Task.create({ title: "New Task", workspace_id });
await Task.update(id, { status: "completed" });
await Task.delete(id);

// Auth
const user = await base44.auth.me();
```

**Available Entities:**
- `Task` - Tasks with status, priority, due dates
- `Document` - Files and content
- `Assignment` - Work assignments
- `Project` - Project containers
- `Workspace` - Multi-tenant workspaces
- `User` - User profiles
- `Message` - Chat messages
- `ConversationThread` - Chat threads
- `ChatSession` - AI chat sessions
- `Note` - User notes
- `Folder` - Document folders
- `AIResearchChat` - Research sessions
- `DocumentComment` - Document comments
- `WorkflowPattern` - Workflow patterns

### Workspace Context

All data operations must respect workspace boundaries:

```javascript
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

function MyComponent() {
  const { currentWorkspaceId, currentWorkspace, currentUser } = useWorkspace();

  // Always filter by workspace
  const data = await Entity.filter({ workspace_id: currentWorkspaceId });
}
```

### State Management

- **Global State:** WorkspaceContext for workspace data
- **Local State:** useState/useEffect for component state
- **Form State:** React Hook Form with Zod validation

## Key Files Reference

| File | Purpose |
|------|---------|
| `index.jsx:1` | Router definitions and lazy-loaded pages |
| `Layout.jsx:97` | Main layout with navigation |
| `Dashboard.jsx:33` | Dashboard page |
| `Tasks.jsx:45` | Task management page |
| `Documents.jsx` | Document management |
| `Workspaces.jsx:47` | Workspace management |
| `components/workspace/WorkspaceContext.jsx:37` | Workspace provider |
| `api/base44Client.js:37` | Data client with entity managers |

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` or `/Dashboard` | Dashboard | Main overview |
| `/Projects` | Projects | Project management |
| `/Assignments` | Assignments | Assignment tracking |
| `/Tasks` | Tasks | Task board |
| `/Documents` | Documents | Document management |
| `/DocumentStudio` | DocumentStudio | Document editor |
| `/DocumentWorkshop` | DocumentWorkshop | Document creation |
| `/Chat` | Chat | Team communication |
| `/Research` | Research | AI research assistant |
| `/AskAI` | AskAI | RAG-based Q&A |
| `/Generate` | Generate | Content generation |
| `/Users` | Users | User management |
| `/Workspaces` | Workspaces | Workspace management |
| `/Preferences` | Preferences | User settings |

## UI Component Usage

### Shadcn/ui Components

Located in `components/ui/`. Common components:

```javascript
// Buttons
import { Button } from "@/components/ui/button";
<Button variant="default|destructive|outline|secondary|ghost|link" size="default|sm|lg|icon">

// Cards
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dialogs
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Forms
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Feedback
import { toast } from "sonner";
toast.success("Operation successful");
toast.error("Operation failed");
```

### Icons

Use Lucide React icons:
```javascript
import { Plus, Trash2, Edit, Settings, User, Loader2 } from "lucide-react";
```

### Class Utilities

```javascript
import { cn } from "@/lib/utils";

// Merge conditional classes
<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "large" && "large-class"
)}>
```

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development Conventions

### Code Style

1. **Functional Components:** Use function declarations with hooks
2. **Named Exports:** Use `export default function ComponentName()`
3. **File Extension:** `.jsx` for all React components
4. **Styling:** Tailwind CSS classes, avoid inline styles
5. **State:** useState for local, context for global

### Component Structure Pattern

```javascript
import React, { useState, useEffect } from "react";
import { EntityName } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { toast } from "sonner";

export default function ComponentName() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId) {
      loadData();
    }
  }, [currentWorkspaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await EntityName.filter({ workspace_id: currentWorkspaceId });
      setData(result);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Component content */}
    </div>
  );
}
```

### Error Handling

- Wrap components with `<ErrorBoundary>`
- Use try/catch for async operations
- Show user-friendly toast messages
- Log errors to console for debugging

### Loading States

```javascript
if (loading) {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}
```

## AI Integration Points

The application integrates AI throughout:

| Component | Purpose |
|-----------|---------|
| `AIResearchAssistant.jsx` | Research with AI |
| `AskAI.jsx` | RAG-based document Q&A |
| `AIAssistantWidget.jsx` | Context-aware assistant |
| `AITaskAssistantPanel.jsx` | Task creation with AI |
| `AIDocumentAnalyzer.jsx` | Document analysis |
| `AIWritingAssistant.jsx` | Writing suggestions |
| `DocumentGenerator.jsx` | AI content generation |

AI functions are defined in `api/integrations.js` and `api/functions.js`.

## Testing Considerations

When testing workspace isolation:
1. Verify data filtered by `workspace_id`
2. Test workspace switching behavior
3. Confirm no cross-workspace data leakage
4. Test permission boundaries

## Common Patterns

### Creating New Pages

1. Create `PageName.jsx` in root directory
2. Add lazy import in `index.jsx`
3. Add route in `index.jsx` Routes
4. Add navigation item in `Layout.jsx` if needed

### Adding New Entities

1. Add table mapping in `api/base44Client.js` entityToTableName
2. Export from `api/entities.js`
3. Create corresponding Supabase table

### Form Handling

```javascript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: "", description: "" },
});
```

## Performance Notes

- **Code Splitting:** Pages are lazy-loaded via `React.lazy()`
- **Virtualization:** Large lists use virtualization
- **Memoization:** Expensive computations use `useMemo`
- **Auto-save:** Documents auto-save every 30 seconds

## Keyboard Shortcuts

Global shortcuts (Ctrl/Cmd + key):
- `K` - Global search
- `D` - Dashboard
- `P` - Projects
- `A` - Assignments
- `T` - Tasks
- `O` - Documents
- `C` - Chat
- `R` - Research

## Related Documentation

- `README.md` - Basic project info and AI models
- `PROJECT_ANALYSIS.md` - Detailed feature analysis
- `TESTING_PHASE1.md` - Testing documentation
- `QUICK_TEST_SETUP.md` - Test setup guide
