# Team Chat System - Complete Analysis

## 1. Overview

The Team Chat system is a real-time, threaded messaging platform built into Proflow. It supports workspace-scoped conversations organized by context (general workspace, project-specific, or assignment-specific), with real-time message delivery via Supabase Realtime, typing indicators via Supabase Presence, markdown-based rich text editing with @mentions, message virtualization for performance, and AI-powered conversation summarization.

---

## 2. Core Architecture

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `pages/Chat.jsx` | 776 | Main page component with inline virtualized message list |
| `hooks/useChat.js` | 1,113 | Central hook — all state, subscriptions, handlers |
| `features/chat/ConversationSidebar.jsx` | 528 | Thread list, context selector, filtering |
| `features/chat/EnhancedMessage.jsx` | 347 | Rich message display with markdown, reactions, pins |
| `features/chat/ThreadSearch.jsx` | 307 | Search across threads and messages with keyboard nav |
| `features/chat/ThreadSummaryButton.jsx` | 382 | AI thread summarization with task extraction |
| `features/chat/ShareToChatDialog.jsx` | 451 | Share documents/tasks/assignments to chat |
| `features/chat/ChatSessionManager.jsx` | 643 | AI chat session history management |
| `features/chat/ThreadedConversation.jsx` | 349 | Standalone thread detail view |
| `features/chat/VirtualizedMessageList.jsx` | 175 | IntersectionObserver-based virtualization (standalone) |
| `features/chat/MessageReactions.jsx` | 92 | Emoji reaction picker and display |
| `features/chat/MessageBubble.jsx` | 142 | AI chat message bubbles (user/assistant roles) |
| `features/chat/ChatSummaryButton.jsx` | 89 | Quick AI summary via AISummaryButton wrapper |
| `features/chat/SessionCreationDialog.jsx` | 208 | AI chat session creation form |
| `features/chat/ConversationHistory.jsx` | 15 | Placeholder — "Coming soon" |
| `features/chat/chatPage/ChatHeader.jsx` | 47 | Page header with gradient + summary button |
| `features/chat/chatPage/ChatNewThreadDialog.jsx` | 107 | Thread creation dialog form |
| `components/editor/RichTextEditor.jsx` | 247 | Custom markdown editor with @mentions |

**Total: 18 files, ~5,000+ lines of code**

### Import Graph

Chat.jsx directly imports:
- `ConversationSidebar` from `features/chat/ConversationSidebar`
- `EnhancedMessage` from `features/chat/EnhancedMessage`
- `ThreadSearch` from `features/chat/ThreadSearch`
- `ChatHeader`, `ChatNewThreadDialog` from `features/chat/chatPage`
- `RichTextEditor` from `components/editor/RichTextEditor`
- `useChat` from `hooks/useChat`

ChatHeader imports `ChatSummaryButton`. EnhancedMessage imports `MessageReactions`. Standalone VirtualizedMessageList imports `EnhancedMessage`.

**Note:** Several `features/chat/` components (ShareToChatDialog, ChatSessionManager, SessionCreationDialog, ThreadSummaryButton, ThreadedConversation, MessageBubble) are **not imported by any other file** currently. No `features/chat/index.js` barrel file exists. These components are available as standalone utilities for future integration or direct use.

---

## 3. Page Layout (Chat.jsx)

The page uses a **two-column grid layout** (`grid-cols-4`) filling the viewport:

```
+---------------------------+--------------------------------------------------+
|  ConversationSidebar      |  Chat Area                                       |
|  (col-span-1)             |  (col-span-3)                                    |
|                           |                                                  |
|  - Context Selector       |  Thread Header                                   |
|    (General/Project/      |  - Thread name + context badges                  |
|     Assignment)           |  - Description, participants avatars             |
|  - Search bar             |  - Search / Pin / View mode / Actions menu       |
|  - Tag filter dropdown    |                                                  |
|  - Archive toggle         |  Search Section (collapsible ThreadSearch)       |
|  - New Thread button      |                                                  |
|                           |  Pinned Messages Section (collapsible)           |
|  Pinned Threads           |                                                  |
|  ─────────────            |  Messages Area                                   |
|  All Threads              |  - Inline VirtualizedMessageList                 |
|                           |  - MessageListErrorBoundary wrapper              |
|                           |  - Drag & drop file overlay                      |
|                           |  - Typing indicators (bouncing dots)             |
|                           |                                                  |
|                           |  Reply/Edit Context Banners                      |
|                           |                                                  |
|                           |  Message Input                                   |
|                           |  - RichTextEditor (custom, markdown-based)       |
|                           |  - Hidden file input + Send button               |
+---------------------------+--------------------------------------------------+
```

### Key UI Features
- **Error Boundary**: `MessageListErrorBoundary` class component wraps the message list with retry functionality
- **Loading State**: Animated skeleton placeholders (grid layout) during initial load
- **Empty States**: "Select a conversation" when no thread selected; "Start the conversation" when thread has no messages
- **Drag & Drop Overlay**: Full-screen blur overlay with drop zone icon when dragging files
- **View Mode Toggle**: Compact (60px item height) vs. comfortable (100px item height)
- **No Context Warning**: Shown when no assignments or projects exist and context isn't 'general'
- **Thread Header Badges**: Context badges (General Workspace Chat / Project / Assignment), priority badge

---

## 4. Central Hook (useChat.js — 1,113 lines)

This is the backbone of the chat system. It manages all state, real-time subscriptions, and message operations.

### 4.1 File Validation Constants (Lines 1-42)

```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  // Images (5): jpeg, png, gif, webp, svg+xml
  // Documents (7): pdf, msword, docx, xls, xlsx, ppt, pptx
  // Text (3): plain, csv, markdown
  // Archives (2): zip, rar
  // Audio (2): mpeg, wav
  // Video (2): mp4, webm
]; // 21 MIME types total
```

`validateFile(file)` checks size limit and MIME type, returning `{ valid, error }`.

### 4.2 State Management (Lines 44-117)

**24 useState hooks:**
- Core data: `assignments`, `projects`, `messages`, `threads`, `users`
- Selection: `selectedContextId` ('general' | 'project:{id}' | 'assignment:{id}'), `currentThread`, `currentUser`
- Input: `newMessage`, `newThreadTopic`, `newThreadDescription`
- UI toggles: `loading`, `isThreadFormOpen`, `isSearchOpen`, `viewMode` ('comfortable'|'compact'), `showPinnedMessages`
- Message context: `replyToMessage`, `editingMessage`, `replyToMessageData` (map of reply-to IDs to messages)
- File handling: `uploadingFile`, `isDraggingFile`
- Real-time: `typingUsers`
- Safety: `isSending` (prevent duplicate sends), `operationLoading` (per-operation loading states: `edit-{id}`, `delete-{id}`, `pin-{id}`, `bookmark-{id}`)

**13 useRef hooks:**
- DOM: `messagesEndRef`, `messageListRef`, `fileInputRef`
- Subscriptions: `messageChannelRef`, `typingChannelRef`, `subscriptionActiveRef`, `pollingIntervalRef`
- State sync: `currentUserRef`, `selectedContextIdRef`, `initialLoadDoneRef`, `isTypingRef`
- Timers: `typingTimeoutRef`, `dragCounter`

**Derived state (useMemo + computed):**
- `currentProject` — resolved from `projects` when context is `project:{id}`
- `currentAssignment` — resolved from `assignments` when context is `assignment:{id}`
- `contextType` — 'general' | 'project' | 'assignment' string
- `currentThreadMessages` — messages filtered by `currentThread.id`
- `pinnedMessages` — filtered `is_pinned === true`
- `regularMessages` — filtered `is_pinned === false`

### 4.3 Initial Data Loading (Lines 120-210)

`loadData(forceRefresh)` performs a **parallel 5-way Promise.all** fetch:
1. `ConversationThread.filter({ workspace_id })` — sorted by `-last_activity`
2. `Assignment.filter({ workspace_id })` — sorted by `-updated_date`
3. `Project.filter({ workspace_id })` — sorted by `-updated_date`
4. `User.list()` — all users
5. `db.auth.me()` — current authenticated user

After fetch:
- Validates current context — if selected project/assignment no longer exists, falls back to 'general'
- Preserves current thread selection if it still exists in fetched data
- Otherwise auto-selects first matching thread for the current context

`loadMessages()` (lines 212-263):
- Fetches messages filtered by `workspace_id` + `thread_id`, ordered by `created_date`
- **Resolves reply-to references**: Collects all `reply_to` IDs, deduplicates, fetches each in parallel, builds `replyToMessageData` map

### 4.4 Real-Time Subscriptions (Lines 271-352)

```javascript
const channel = supabase.channel(`messages:${currentThread.id}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'messages',
    filter: `thread_id=eq.${currentThread.id}`
  }, (payload) => {
    // INSERT: deduplicate by ID, then append
    // UPDATE: replace matching message in state
    // DELETE: filter out by old.id
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') subscriptionActiveRef.current = true;
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      // Fallback: 5-second polling interval
    }
  });
```

**Fallback strategy:**
- **Primary**: Supabase Realtime `postgres_changes` subscription
- **On error/timeout**: Falls back to 5-second polling via `setInterval`
- **Always-on backup**: 15-second polling interval that only fires when `subscriptionActiveRef` is false

**Cleanup**: Both subscription and polling intervals are cleaned up on thread change and unmount.

### 4.5 Typing Indicators (Lines 364-427)

Uses **Supabase Presence** channels per thread:
```javascript
channel = supabase.channel(`typing:${currentThread.id}`, {
  config: { presence: { key: currentUser.email } }
});
// Presence events: sync, join, leave
// Each presence entry: { email, name, isTyping }
```

**Typing lifecycle:**
1. User types → `handleTyping()` tracks `{ isTyping: true }` via Presence
2. 3-second debounce timeout → tracks `{ isTyping: false }`
3. Other users see typing state via sync/join/leave events (excludes self)

Display logic in Chat.jsx (lines 604-629):
- 1 user: "Alice is typing..."
- 2 users: "Alice and Bob are typing..."
- 3+ users: "Alice and 2 others are typing..."
- Animated bouncing dots

### 4.6 Message Operations

All message operations use **optimistic updates with rollback on failure**.

| Operation | Lines | Details |
|-----------|-------|---------|
| `handleSendMessage` | 509-564 | Guards against duplicate sends via `isSending`. Optimistic input clear + rollback on failure (restores message + reply state). Creates Message, updates thread `last_activity` + `message_count`, refreshes thread list. Extracts @mentions. |
| `handleEditMessage` | 566-610 | Maintains `edit_history` array (previous content + editor + timestamp), sets `is_edited` flag + `last_edited_at`. Optimistic state update. Per-operation loading state. |
| `handleDeleteMessage` | 612-638 | Optimistic removal. On failure: rollback by re-inserting and re-sorting by `created_date`. Per-operation loading state. |
| `handlePinMessage` | 640-680 | Toggles `is_pinned` with `pinned_by` email and `pinned_at` timestamp. Optimistic update + rollback. |
| `handleBookmarkMessage` | 682-715 | Per-user `is_bookmarked_by` email array (add/remove current user). Optimistic update + rollback. |
| `handleAddReaction` | 717-744 | Appends to `reactions` array: `{ emoji, user_email, user_name, timestamp }`. Optimistic + rollback. |
| `handleRemoveReaction` | 746-769 | Filters reactions by emoji + user_email match. Optimistic + rollback. |
| `markThreadAsRead` | 434-472 | Updates `unread_counts` on thread + `read_by` on messages in parallel via `Promise.all`. |
| `extractMentions` | 474-507 | Regex: `/@(?:"([^"]+)"\|'([^']+)'\|\[([^\]]+)\]\|(\w+))/g`. Matches `@word`, `@"full name"`, `@'full name'`, `@[full name]`. Resolves to user emails via exact then partial name matching. |

### 4.7 File Handling

**Upload** (`handleFileUpload`, lines 771-818):
- Validates via `validateFile()` (size + MIME type)
- Uploads via `db.integrations.Core.UploadFile({ file })` (returns `{ file_url }`)
- Creates message with `message_type: 'file'`, `file_url`, `file_name`
- Optimistic add to messages state

**Drag & Drop** (lines 862-899):
- `handleDragEnter`: Uses `dragCounter` ref to track nested enter/leave events
- `handleDragLeave`: Decrements counter, hides overlay when counter reaches 0
- `handleDrop`: Resets counter, uploads first file via `handleFileUploadFromDrop`

### 4.8 Thread Operations

| Operation | Lines | Details |
|-----------|-------|---------|
| `handleNewThread` | 955-998 | Creates `ConversationThread` with context scoping (`assignment_id` or `project_id` based on `contextType`). Sets initial `participants: [currentUser.email]`, `created_by`, status `active`. Refreshes data + selects new thread. |
| `handlePinThread` | 1000-1013 | Toggles `is_pinned` flag with `pinned_by` + `pinned_at`. Refreshes data. |
| `handleArchiveThread` | 1015-1026 | Toggles status between `active` and `archived`. Refreshes data. |
| `handleContextSelect` | 932-947 | Parses context value to `general`, `project:{id}`, or `assignment:{id}`. Keeps ref in sync. Clears current thread. |
| `handleThreadSelect` | 949-953 | Sets current thread, clears reply/edit state. |
| `handleNewThreadSubmit` | 1028-1033 | Form submit handler — calls `handleNewThread` with topic and description. |

### 4.9 Return Value (Lines 1035-1112)

Returns **67 items** organized as:
- **24 state values** (data, selection, input, UI toggles, real-time, safety)
- **6 derived values** (currentProject, currentAssignment, contextType, currentThreadMessages, pinnedMessages, regularMessages)
- **3 refs** (messagesEndRef, messageListRef, fileInputRef)
- **12 setters** (for controlled state)
- **22 handlers** (loadData, loadMessages, scrollToBottom, all message/thread/file/typing operations)

---

## 5. Conversation Sidebar (ConversationSidebar.jsx — 528 lines)

### Context Selector (top dropdown)
- **General Workspace Chat** — Globe icon, green accent
- **Projects** section — Target icon, indigo accent. Lists all workspace projects.
- **Assignments** section — FolderOpen icon, purple accent. Lists all workspace assignments.

### Thread Filtering Pipeline
1. `filteredContextThreads` — Filters by selected context:
   - `general`: threads with no `assignment_id` AND no `project_id`
   - `project:{id}`: threads matching `project_id`
   - `assignment:{id}`: threads matching `assignment_id`
2. `filteredThreads` — Applies search query, tag filters, and archive toggle
3. Separates into `pinnedThreads` and `unpinnedThreads` for display

### Thread Item Features
- Pin indicator (yellow), unread count badge (red)
- Participant avatars (max 3 shown, "+N" overflow)
- Priority badge (hidden for 'medium')
- Tag badges (max 2 shown, "+N" overflow)
- Last activity date (formatted via `date-fns`)
- Context menu: Open, Pin/Unpin, Archive/Restore

### Filters
- Text search (name, topic, description, context_summary)
- Tag filter (checkbox dropdown, dynamically extracted from all threads)
- Show/Hide archived toggle
- Clear all filters button (appears when filters active)

### Empty States
- Context-aware: "No general threads yet", "No threads for this project yet", "No threads for this assignment yet"
- "Create First Thread" button in empty state

---

## 6. Rich Text Editor (RichTextEditor.jsx — 247 lines)

**Custom Textarea-based editor** (NOT TipTap). Uses a standard `<Textarea>` component with markdown syntax insertion.

### Formatting Toolbar
- **Bold**: Wraps selection with `**`
- **Italic**: Wraps selection with `*`
- **Code**: Wraps selection with `` ` ``
- **@Mention**: Inserts `@` and opens mention suggestions
- **Emoji Picker**: Popover with quick emojis `['👍', '❤️', '😊', '🎉', '🚀', '👏', '🔥', '✅']`
- **File Attach**: Triggers hidden file input click

### @Mention System
- Triggered by `@` keypress or mention button
- Filters team members by name or email
- Shows up to 5 suggestions in a floating dropdown
- Inserts `@Full Name` into text
- Position calculated relative to textarea

### Keyboard Shortcuts
- **Enter**: Send message (calls `onSend`)
- **Shift+Enter**: New line

### Format Help
Displays hint text: `**bold** • *italic* • \`code\` • @mention`

---

## 7. Enhanced Message (EnhancedMessage.jsx — 347 lines)

`React.memo` wrapped for performance optimization.

### Message Grouping
Messages from the same author within 5 minutes are grouped (avatar hidden, header hidden). Conditions: same `author_email`, same `message_type`, neither is pinned.

### Content Types
- **text** — Rendered via `ReactMarkdown` with `rehype-sanitize`. Custom renderers for code blocks (inline + block), paragraphs, strong, emphasis. Links open in new tab with `rel="noopener noreferrer"`.
- **file** — File card with icon, name, download link
- **voice** — Voice message card with duration display

### Visual Indicators
- `is_edited` — "edited" badge in header
- `is_pinned` — Pin icon in header
- `is_bookmarked_by` includes current user — Filled bookmark icon
- `mentioned_users` — @mention badges (shows `@username` from email)
- Reply context — Quoted reply with author name and content snippet (border-left style)

### Action Buttons (Responsive)
- **Desktop**: Hover-reveal floating toolbar (Reply, Edit, Bookmark, Pin, More→Delete)
- **Mobile**: Always-visible hamburger menu dropdown with same actions
- Edit and Delete only shown for own messages (`isOwnMessage` check)
- Touch detection via `'ontouchstart' in window || navigator.maxTouchPoints > 0`

---

## 8. Message Virtualization

### Two implementations exist:

#### 8.1 Inline in Chat.jsx (Lines 88-213) — ACTIVE
The primary implementation actually used on the page.

- **Lists ≤50 messages**: Renders all without virtualization (simple `.map()`)
- **Lists >50 messages**: Scroll-based virtualization:
  - Estimated heights: compact = 60px, comfortable = 100px
  - Buffer of 10 messages beyond visible range
  - `handleScroll` calculates visible range from `scrollTop` / `clientHeight`
  - Top/bottom spacer divs maintain scroll position
  - Wrapped in `React.memo` for performance

#### 8.2 Standalone VirtualizedMessageList.jsx (175 lines) — NOT IMPORTED BY CHAT.JSX
Uses IntersectionObserver approach:
- ResizeObserver for container height tracking
- Top/bottom sentinel elements for infinite scroll detection
- Loads 20 messages at a time when scrolling to sentinel
- Auto-scroll to bottom when new messages arrive (disabled if user scrolled up >100px from bottom)

---

## 9. Message Reactions (MessageReactions.jsx — 92 lines)

**Quick Reactions Set:** `['👍', '❤️', '😊', '🎉', '🚀', '👏', '🔥', '💯']`

- Displays grouped reaction counts with animated badges (Framer Motion scale animations)
- User's own reactions highlighted in blue (`border-blue-500`)
- Click to toggle (add/remove) reactions
- Popover emoji picker (4x2 grid) via smiley face button
- Counts aggregated from `message.reactions` array by emoji

---

## 10. Thread Search (ThreadSearch.jsx — 307 lines)

### Dual Mode
- **Default**: Shows 10 most recent threads (workspace-scoped, sorted by `-last_activity`)
- **Search**: Debounced (300ms) full-text search across threads AND messages

### Search Algorithm
1. Fetches up to 50 threads + 100 messages (workspace-scoped)
2. Client-side filter: thread topic, description, tags
3. Client-side filter: message content
4. Maps message matches back to parent threads via `thread_id`
5. Deduplicates and sorts by `last_activity`

### Keyboard Navigation
- Arrow Up/Down to navigate results
- Enter to select
- Escape to clear and blur
- ARIA: `role="combobox"`, `aria-activedescendant`, `role="option"`, `aria-selected`

### Security
`handleThreadClick` validates `thread.workspace_id === currentWorkspaceId` before selection, with console error logging for cross-workspace access attempts.

---

## 11. AI Summarization

### 11.1 ChatSummaryButton.jsx (89 lines)

Wrapper around `AISummaryButton` from `features/ai/`. Placed in page header via `ChatHeader`.

- Loads assignment context + related documents (up to 10) for enriched summarization
- Formats messages as timestamped transcript: `[time] author: content`
- Disabled when no messages or context is loading
- Props: `contentType="chat"`, `contentId={assignment_id}`

### 11.2 ThreadSummaryButton.jsx (382 lines)

Full-featured AI conversation analyzer.

- **Minimum requirement**: 5 messages to generate summary
- Uses `InvokeLLM` with structured JSON schema

**Output sections:**
- **Executive Summary** (2-3 sentences)
- **Key Decisions** (with `decision`, `decision_maker`, `rationale`, `timestamp`)
- **Action Items** (with `task`, `assignee`, `deadline`, `priority`, `context`)
- **Important Topics** (tag-like badges)
- **Participants Summary** (name, contribution description, message_count, with avatar initials)
- **Confidence Score** (0-100%)

**Create Tasks button**: Converts extracted action items into actual tasks via `onActionItemsExtracted` callback. Tracks `isCreatingTasks` and `tasksCreated` states.

UI: Animated expand/collapse with Framer Motion. Purple gradient card.

**Note:** This component is not currently imported by Chat.jsx or any other file.

---

## 12. Share to Chat (ShareToChatDialog.jsx — 451 lines)

Allows sharing **documents**, **tasks**, or **assignments** into chat threads.

### Workflow
1. Select target assignment from dropdown
2. Optionally select specific thread (tabs: "General Chat" vs "Specific Thread")
3. Toggle AI-generated summary (enabled by default)
4. Add optional custom message
5. Preview panel shows formatted message before sending

### AI Summary Generation
- Type-specific prompts:
  - **Document**: title, type, description, existing AI analysis summary
  - **Task**: title, status, priority, assigned_to, due_date, description
  - **Assignment**: name, status, priority, team size, timeline, description
- Uses `InvokeLLM` with JSON schema (`summary` + `key_highlights`)
- Auto-generates when summary checkbox is checked and assignment is selected

### Message Format
```
[Custom message]
📎 Shared Document: **Document Title**
[AI summary]
📄 Type: report | Size: 12.5 KB
```

Message created with `message_type: 'shared_item'`, tags `[itemType, 'shared']`, `linked_documents` for documents.

**Note:** This component is not currently imported by Chat.jsx or any other file.

---

## 13. AI Chat Session Manager (ChatSessionManager.jsx — 643 lines)

Manages AI chat session history (separate from team chat threads). For use in the AI Hub.

### Session Operations
- **Create**: With workspace scoping, auto-associates with current assignment
- **Rename**: Dialog with name + description fields
- **Duplicate**: Copies messages, documents, tags, query_mode, custom_json_schema
- **Pin/Unpin**: Status toggle `active` ↔ `pinned`
- **Archive/Restore**: Status toggle `active` ↔ `archived`
- **Delete**: With `confirm()` dialog, auto-creates new session if deleted was active

### Filtering
- **Status filter tabs**: All, Active, Pinned, Archived (with live counts)
- **Text search**: name, description, tags
- **Assignment filter**: If current assignment selected, shows only matching sessions

### Performance
- Visible session limit: 20, with "Load more" pagination (+20 at a time)
- `isLoadingRef` to prevent concurrent fetch calls

### Session Card Display
- Name (with pin icon if pinned), description (truncated)
- Metadata: message count, document count, relative time (`date-fns formatDistanceToNow`)
- Tags (max 3 shown, "+N" overflow)
- Active session indicator (ChevronRight)
- Hover-reveal actions menu (Rename, Duplicate, Pin, Archive, Delete)

**Note:** This component is not currently imported by Chat.jsx or any other file.

---

## 14. Threaded Conversation (ThreadedConversation.jsx — 349 lines)

Standalone thread detail view with its own data fetching.

### Features
- Thread header: topic, status badge (color-coded: green=active, blue=resolved, gray=archived), priority badge
- Metadata: participant count, message count (from fetched data), last activity date
- Thread description section
- Scrollable message list with own `db.entities.Message.filter` (workspace + thread scoped, ordered by `created_date`)
- Per-message reaction buttons (👍, ❤️) and pin/unpin toggle
- Reply input box with Enter key submit
- Close button (X) for panel dismissal
- Updates thread `last_activity` and `message_count` on message send

**Note:** This component is not currently imported by Chat.jsx or any other file.

---

## 15. Supporting Components

### SessionCreationDialog.jsx (208 lines)
AI chat session creation form.
- Fields: Thread Name (required), Description (optional), Tags (add via Enter key, click to remove)
- Context summary section showing assignment name, document count, message count
- Loading state on create

### MessageBubble.jsx (142 lines)
AI chat message display (user/assistant role distinction).
- User messages: blue bubble, right-aligned
- Assistant messages: white bubble, left-aligned with Bot avatar
- Markdown rendering via ReactMarkdown + rehype-sanitize
- Tool call status display: completed (green CheckCircle), running (blue Loader2 + spin), failed (red AlertCircle), pending (gray Clock)
- Timestamp display

**Note:** Not imported by Chat.jsx. A separate `AIMessageBubble.jsx` in `features/ai/` is used by `AIAssistantWidget`.

### chatPage/ChatHeader.jsx (47 lines)
Page header with indigo-to-purple gradient.
- "Team Chat" title with gradient text
- ChatSummaryButton (visible when thread is selected)
- "New Thread" button

### chatPage/ChatNewThreadDialog.jsx (107 lines)
Thread creation dialog form.
- Topic (required) and Description (optional) fields
- Context-aware description text: "general workspace" / "selected project" / "selected assignment"
- Disabled submit when no topic, user, or workspace
- ARIA labels for accessibility

### ConversationHistory.jsx (15 lines)
Placeholder component: "Conversation history" / "This feature is coming soon"

---

## 16. Data Entities

| Entity | Usage in Chat |
|--------|---------------|
| `ConversationThread` | Thread metadata: `name`, `topic`, `description`, `participants` (email array), `status` (active/archived), `priority`, `tags`, `unread_counts` (per-user), `assignment_id`, `project_id`, `workspace_id`, `is_pinned`, `pinned_by`, `pinned_at`, `last_activity`, `message_count`, `created_by`, `context_summary` |
| `Message` | Message content: `content`, `author_email`, `author_name`, `thread_id`, `workspace_id`, `assignment_id`, `message_type` (text/file/voice/shared_item), `reactions` (array of {emoji, user_email, user_name, timestamp}), `is_pinned`, `pinned_by`, `pinned_at`, `is_edited`, `last_edited_at`, `edit_history` (array), `is_bookmarked_by` (email array), `mentioned_users`, `reply_to`, `read_by` (array of {user_email, read_at}), `file_name`, `file_url`, `linked_documents`, `tags` |
| `AIChatSession` | AI chat sessions: `name`, `description`, `messages`, `documents`, `status` (active/pinned/archived), `assignment_id`, `workspace_id`, `created_by`, `query_mode`, `custom_json_schema`, `tags`, `message_count`, `last_activity` |
| `Assignment` | Context for assignment-scoped threads |
| `Project` | Context for project-scoped threads |
| `User` | Team member resolution for avatars, mentions, typing indicators |

---

## 17. Real-Time Data Flow

```
User types message
  → handleTyping() → Supabase Presence track({ isTyping: true })
  → 3-second debounce timeout → Presence track({ isTyping: false })

Other users see:
  → Presence sync/join/leave events
  → typingUsers state (excludes self)
  → UI: bouncing dots + "X is typing..." text

User sends message:
  → handleSendMessage()
  → Guard: isSending flag prevents duplicates
  → Optimistic: clear input + reply state
  → db.entities.Message.create()
  → Optimistic: add to messages state
  → ConversationThread.update (last_activity, message_count)
  → Refresh threads list
  → On failure: rollback (restore input + reply state)
  → Supabase Realtime INSERT event → all clients deduplicate + append

User edits message:
  → handleEditMessage()
  → Message.update (content, is_edited, last_edited_at, edit_history)
  → Optimistic state update
  → Realtime UPDATE event → replace in all clients' state

User deletes message:
  → handleDeleteMessage()
  → Optimistic removal from state
  → Message.delete()
  → On failure: rollback (re-insert + re-sort by created_date)
  → Realtime DELETE event → filter out in all clients' state

User reacts to message:
  → handleAddReaction() / handleRemoveReaction()
  → Optimistic state update
  → Message.update (reactions array)
  → On failure: rollback
  → Realtime UPDATE event → replace in all clients' state

File upload:
  → validateFile() → db.integrations.Core.UploadFile({ file })
  → Message.create (type: 'file', file_url, file_name)
  → Optimistic add to state
```

---

## 18. Key Architectural Decisions

1. **Single Central Hook**: All chat logic consolidated in `useChat.js` (1,113 lines) returning 67 items. No distributed state. Chat.jsx is purely presentational.

2. **Dual Virtualization Implementations**: Chat.jsx includes its own inline scroll-based VirtualizedMessageList (active, used on the page). A separate `VirtualizedMessageList.jsx` with IntersectionObserver exists but is not imported by Chat.jsx.

3. **Comprehensive Optimistic Updates**: All message operations (send, edit, delete, pin, bookmark, reactions) use optimistic UI with rollback on failure. Delete rollback re-sorts by `created_date`. Send rollback restores input + reply state.

4. **Multi-Context Threading**: Three context types (general, project-scoped, assignment-scoped) share the same thread infrastructure, differentiated by `assignment_id` and `project_id` fields on ConversationThread.

5. **Fallback-First Real-Time**: Primary Supabase Realtime subscription → 5-second polling on error → always-on 15-second backup polling (only fires when subscription is inactive).

6. **Two Chat Systems Coexist**: Team chat (ConversationThread + Message entities, real-time) and AI chat (AIChatSession entity, session-based). MessageBubble is for AI chat display, EnhancedMessage is for team chat display.

7. **Security**: Thread search validates `workspace_id` before selection. All queries filter by `workspace_id` for multi-tenancy. Cross-workspace access attempts are logged.

8. **Custom Rich Text Editor**: Uses a plain Textarea with markdown formatting buttons and @mention suggestions — not a WYSIWYG editor. Markdown is rendered in messages via ReactMarkdown.

9. **Participant Management**: Participants are set only on thread creation (creator's email). The `handleSendMessage` function does NOT update the participants array.

10. **Per-Operation Loading States**: `operationLoading` state object tracks loading state per individual message operation (e.g., `edit-{id}`, `delete-{id}`) to prevent concurrent operations on the same message.

11. **Several Components Not Yet Integrated**: ShareToChatDialog, ChatSessionManager, SessionCreationDialog, ThreadSummaryButton, ThreadedConversation, and MessageBubble exist in `features/chat/` but are not imported by any other file. No barrel export file exists for the chat feature module.
