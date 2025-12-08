# Changelog

All notable changes to Proflow are documented in this file.

## [2.0.0] - 2025-12-01

### Major UI/UX Overhaul

This release focuses on consolidating fragmented features, simplifying navigation, and improving the overall user experience.

---

### New Features

#### 1. Unified Documents Hub

**File:** `pages/DocumentsHub.jsx`

Consolidated 4 separate document pages into one unified interface with tabs:

- **Library Tab** - Browse, search, filter, and upload documents
- **Studio Tab** - Rich text editor with AI assistant sidebar
- **Templates Tab** - Quick AI generation from professional templates

Old routes (`/DocumentCreator`, `/DocumentStudio`, `/DocumentWorkshop`) now redirect to `/Documents`.

#### 2. Unified AI Hub

**File:** `pages/AIHub.jsx`

Combined 3 AI pages into one powerful hub:

- **Chat Tab** - Document Q&A with RAG support
- **Research Tab** - Web research with AI assistance
- **Generate Tab** - Content generation with assignment context

#### 3. Enhanced Dashboard

**File:** `pages/Dashboard.jsx`

Added two new sections:

- **Needs Attention** - Shows overdue tasks, due today, high priority, and blocked items
- **Today's Focus** - AI-suggested top 3 priorities for the day

#### 4. Task Page Multiple Views

**File:** `pages/Tasks.jsx`

Added three view modes:

- **Kanban** - Drag-and-drop board (existing)
- **List** - Detailed table view with sorting
- **Calendar** - Monthly grid timeline

Plus filter presets: All Tasks, My Tasks, Overdue, Due Today, This Week

#### 5. Workspace Modal

**File:** `features/workspace/WorkspaceModal.jsx`

Converted the full Workspaces page to a quick dropdown modal with tabs:

- Workspaces list with quick switch
- Invite members
- Manage current members

#### 6. Mobile Bottom Navigation

**File:** `components/common/MobileBottomNav.jsx`

New fixed bottom navigation for mobile devices:

- 5 nav items: Home, Work, Docs, AI, Team
- Floating action button (+) for quick create
- Quick links to new task, new document, AI chat

#### 7. Contextual AI Assistant

**File:** `features/ai/UnifiedAIAssistant.jsx`

Floating AI button that adapts to current page:

- Page-aware quick actions
- Loads workspace context automatically
- Shows recent tasks/projects/assignments based on page

#### 8. Transform Menu

**File:** `features/ai/TransformMenu.jsx`

Unified AI content transformation tool:

- Quick transforms: Summarize, Simplify, Formal, Friendly, Technical
- Custom transform with audience/style selection
- Result preview with copy/apply options

#### 9. Onboarding & Feature Discovery

**Files:**

- `features/tutorial/tutorialSteps.jsx` - Updated tutorial content
- `features/onboarding/WhatsNewModal.jsx` - What's New modal for existing users

Updated onboarding to reflect new consolidated interface with 8 modules covering all major features.

---

### Navigation Changes

#### Simplified from 14 items to 5 groups:

| Group     | Items                        |
| --------- | ---------------------------- |
| Home      | Dashboard                    |
| Work      | Projects, Assignments, Tasks |
| Documents | Documents (unified)          |
| AI        | AI Hub                       |
| Team      | Chat, Members                |

#### Updated Keyboard Shortcuts:

| Shortcut     | Action              |
| ------------ | ------------------- |
| Ctrl/Cmd + D | Dashboard           |
| Ctrl/Cmd + P | Projects            |
| Ctrl/Cmd + A | Assignments         |
| Ctrl/Cmd + T | Tasks               |
| Ctrl/Cmd + O | Documents (Library) |
| Ctrl/Cmd + W | Documents (Studio)  |
| Ctrl/Cmd + Q | AI Hub              |
| Ctrl/Cmd + C | Chat                |
| Ctrl/Cmd + K | Global Search       |

---

### Routing Changes

#### New Routes:

- `/Documents` - Unified Documents Hub
- `/DocumentsHub` - Alias for Documents
- `/AIHub` - Unified AI Hub

#### Deprecated Routes (redirect to Documents):

- `/DocumentCreator` → `/Documents?tab=templates`
- `/DocumentStudio` → `/Documents?tab=studio`
- `/DocumentWorkshop` → `/Documents?tab=studio`

#### Query Parameters:

- `/Documents?tab=library` - Library view
- `/Documents?tab=studio` - Editor view
- `/Documents?tab=studio&id={docId}` - Edit specific document
- `/Documents?tab=templates` - Template generation
- `/AIHub?tab=chat` - Document Q&A
- `/AIHub?tab=research` - Web research
- `/AIHub?tab=generate` - Content generation

---

### Files Modified

#### Core Pages:

- `index.jsx` - Updated routing and imports
- `pages/Dashboard.jsx` - Added Needs Attention & Today's Focus
- `pages/Tasks.jsx` - Added view modes and filter presets

#### New Files Created:

- `pages/DocumentsHub.jsx` - Unified document management
- `pages/AIHub.jsx` - Unified AI tools
- `features/workspace/WorkspaceModal.jsx` - Workspace management modal
- `components/common/MobileBottomNav.jsx` - Mobile navigation
- `features/ai/UnifiedAIAssistant.jsx` - Contextual AI assistant
- `features/ai/TransformMenu.jsx` - Content transformation
- `features/onboarding/WhatsNewModal.jsx` - Feature discovery modal

#### Updated Files:

- `components/common/Layout.jsx` - Navigation groups, mobile nav, AI assistant
- `features/workspace/WorkspaceSwitcher.jsx` - Modal integration
- `features/tutorial/tutorialSteps.jsx` - New tutorial content

---

### Technical Notes

- Build successful with no errors
- All existing functionality preserved
- Old routes redirect to new unified pages
- Mobile-responsive design throughout
- Dark mode support on all new components

---

### Migration Guide

For users upgrading from v1.x:

1. **Documents**: All document features are now at `/Documents`
   - Use tabs to switch between Library, Studio, and Templates
   - Bookmarks to old document pages will redirect automatically

2. **AI Tools**: All AI features are now at `/AIHub`
   - Use tabs for Chat, Research, and Generate
   - Context selector in header works across all tabs

3. **Navigation**: The sidebar is now organized into 5 groups
   - Keyboard shortcuts still work (see table above)
   - Mobile users get a bottom navigation bar

4. **Workspaces**: Access via dropdown in header
   - No longer a separate page
   - All management in modal dialog
