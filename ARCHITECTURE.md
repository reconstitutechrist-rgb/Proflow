# Proflow Architecture Guide

## Overview

Proflow is an AI-powered project management platform built with React 19, Vite, and Supabase.

## Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS v4
- **UI Components**: Shadcn/ui, Radix UI
- **State Management**: React Context, React Query
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI**: Anthropic Claude API, OpenAI Embeddings

---

## Application Structure

```
proflow/
├── api/                    # API layer and entities
│   ├── db.js              # Supabase client
│   └── entities.js        # Data entity definitions
├── components/
│   ├── auth/              # Authentication components
│   ├── common/            # Shared components (Layout, ErrorBoundary)
│   ├── editor/            # Text editor components
│   ├── search/            # Global search
│   └── ui/                # Shadcn UI components
├── features/              # Feature-based modules
│   ├── ai/                # AI features (Assistant, Transform, etc.)
│   ├── documents/         # Document management
│   ├── onboarding/        # Onboarding & tutorials
│   ├── research/          # Research features
│   ├── tutorial/          # Tutorial system
│   └── workspace/         # Workspace management
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── pages/                 # Page components (routes)
└── index.jsx              # App entry point & routing
```

---

## Core Pages

### Navigation Groups

| Group | Pages | Description |
|-------|-------|-------------|
| **Home** | Dashboard | Overview, attention items, priorities |
| **Work** | Projects, Assignments, Tasks | Work management hierarchy |
| **Documents** | Documents (Hub) | Library, Studio, Templates |
| **AI** | AI Hub | Chat, Research, Generate |
| **Team** | Chat, Members | Communication & team management |

### Page Details

#### Dashboard (`/Dashboard`)
- Needs Attention section (overdue, due today, high priority, blocked)
- Today's Focus (AI-suggested priorities)
- Quick stats and recent activity

#### Documents Hub (`/Documents`)
- **Library Tab**: Browse, search, filter, upload documents
- **Studio Tab**: Rich text editor with AI sidebar
- **Templates Tab**: Quick AI generation from templates

#### AI Hub (`/AIHub`)
- **Chat Tab**: Document Q&A with RAG support
- **Research Tab**: Web research with AI assistance
- **Generate Tab**: Content generation with assignment context

#### Tasks (`/Tasks`)
- **Kanban View**: Drag-and-drop board
- **List View**: Table with sorting
- **Calendar View**: Monthly timeline
- Filter presets: All, My Tasks, Overdue, Due Today, This Week

---

## Key Features

### Workspace Management
- Multi-tenant workspaces
- Context-based filtering (all entities scoped by workspace_id)
- Quick workspace switching via header dropdown
- Workspace management modal (create, invite, members)

### AI Integration
- **Contextual AI Assistant**: Floating button that adapts to current page
- **Transform Menu**: Quick content transformations (summarize, simplify, etc.)
- **Document AI**: Conversational assistant in document editor
- **RAG Support**: Document embeddings for Q&A

### Mobile Support
- Bottom navigation bar with 5 items
- Floating action button for quick create
- Responsive layouts throughout

---

## Data Entities

| Entity | Description |
|--------|-------------|
| `Project` | High-level initiative |
| `Assignment` | Project component with scope |
| `Task` | Actionable work item |
| `Document` | Content with metadata |
| `User` | User profile |
| `Workspace` | Multi-tenant container |
| `AIResearchChat` | Research history |

All entities are filtered by `workspace_id` for multi-tenancy.

---

## Routing

### Active Routes
```
/                    → Dashboard
/Dashboard           → Dashboard
/Projects            → Projects list
/Assignments         → Assignments list
/Tasks               → Tasks with multiple views
/Documents           → Documents Hub (Library/Studio/Templates)
/AIHub               → AI Hub (Chat/Research/Generate)
/Chat                → Team chat
/Users               → Team members
/Preferences         → User settings
```

### Deprecated Routes (redirect to Documents)
```
/DocumentCreator     → /Documents?tab=templates
/DocumentStudio      → /Documents?tab=studio
/DocumentWorkshop    → /Documents?tab=studio
```

### Query Parameters
```
/Documents?tab=library           - Library view
/Documents?tab=studio            - Editor view
/Documents?tab=studio&id={docId} - Edit specific document
/Documents?tab=templates         - Template generation
/AIHub?tab=chat                  - Document Q&A
/AIHub?tab=research              - Web research
/AIHub?tab=generate              - Content generation
/Tasks?view=kanban|list|calendar - Task view mode
/Tasks?filter=all|my-tasks|overdue|due-today|this-week
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Global Search |
| `Ctrl/Cmd + D` | Dashboard |
| `Ctrl/Cmd + P` | Projects |
| `Ctrl/Cmd + A` | Assignments |
| `Ctrl/Cmd + T` | Tasks |
| `Ctrl/Cmd + O` | Documents (Library) |
| `Ctrl/Cmd + W` | Documents (Studio) |
| `Ctrl/Cmd + Q` | AI Hub |
| `Ctrl/Cmd + C` | Chat |

---

## Context Providers

```jsx
<AuthProvider>           // Authentication state
  <WorkspaceProvider>    // Current workspace context
    <TutorialProvider>   // Tutorial state
      <Layout>           // Navigation, sidebar, header
        <Routes />       // Page routing
      </Layout>
    </TutorialProvider>
  </WorkspaceProvider>
</AuthProvider>
```

---

## Development

### Scripts
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Environment Variables
```
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-key>
```

---

## Recent Changes (v2.0.0)

See `CHANGELOG.md` for detailed information about:
- Unified Documents Hub
- Unified AI Hub
- Enhanced Dashboard
- Task multiple views
- Workspace modal
- Mobile navigation
- Contextual AI assistant
- Transform menu
- Onboarding updates
