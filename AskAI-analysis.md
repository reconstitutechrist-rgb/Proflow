# Deep Analysis: Ask AI Feature

## Overview

The Ask AI feature is a sophisticated, multi-layered AI assistant system within Proflow. It's consolidated under the **AIHub** (`pages/AIHub.jsx`) with three tabs: **Chat**, **Research**, and **Debate**. The system integrates multi-LLM providers, RAG (Retrieval-Augmented Generation), project memory, verbatim recall, and session management.

---

## Architecture Diagram

```
AIHub (pages/AIHub.jsx)
├── Chat Tab ──────► useAskAI hook ──────► Anthropic Claude (primary LLM)
│   ├── AskAIHeader                        ├── OpenAI (embeddings)
│   ├── AskAIDocumentSidebar               ├── RAG pipeline (api/functions.js)
│   ├── AskAIChatArea                      ├── ProjectMemory (summaries)
│   └── AskAIDialogs                       └── ProjectBrain (verbatim recall)
│
├── Research Tab ──► AIResearchAssistant ──► Anthropic Claude + Web Search
│
└── Debate Tab ────► useDebateSession ─────► Claude Sonnet (analyst) + Haiku (critic)
                                            └── DebateMemory (insights)

Storage Layer:
├── Supabase (PostgreSQL + pgvector)
│   ├── chat_sessions        (session metadata + messages JSONB)
│   ├── ai_research_chats    (research queries/responses)
│   ├── project_memories     (accumulated project context)
│   ├── project_chat_history (verbatim messages + vector embeddings)
│   ├── debate_sessions      (debate state + consensus tracking)
│   ├── debate_messages      (individual debate turns)
│   └── debate_insights      (extracted insights)
└── localStorage
    ├── askAI_draft_v1       (auto-save drafts, 24h expiry)
    └── proflow_files        (uploaded file base64)
```

---

## 1. Chat Tab (Core Ask AI)

### Key Files
| File | Purpose |
|------|---------|
| [hooks/useAskAI.js](hooks/useAskAI.js) (~1,750 lines) | Core state management hook |
| [api/integrations.js](api/integrations.js) | Unified LLM interface |
| [api/anthropicClient.js](api/anthropicClient.js) | Anthropic Claude client |
| [api/openaiClient.js](api/openaiClient.js) | OpenAI embeddings client |
| [api/geminiClient.js](api/geminiClient.js) | Gemini alternative client |
| [api/functions.js](api/functions.js) | RAG helper (chunking, embeddings, similarity) |
| [api/projectMemory.js](api/projectMemory.js) | Project memory bank |
| [api/projectBrain.js](api/projectBrain.js) | Verbatim recall system |
| [features/ai/askAI/AskAIHeader.jsx](features/ai/askAI/AskAIHeader.jsx) | Header with session/export controls |
| [features/ai/askAI/AskAIChatArea.jsx](features/ai/askAI/AskAIChatArea.jsx) | Chat interface |
| [features/ai/askAI/AskAIDocumentSidebar.jsx](features/ai/askAI/AskAIDocumentSidebar.jsx) | Document upload & management |
| [features/ai/askAI/AskAIDialogs.jsx](features/ai/askAI/AskAIDialogs.jsx) | Save/export/delete/load dialogs |

### Data Flow: User Message to AI Response

```
1. User types message
   └─► handleSendMessage() (useAskAI.js:969)

2. Input Validation
   ├── Check message or documents exist
   └── Enforce limit: 400 messages max

3. Create user message object
   { id, type: 'user', content, timestamp, excludedFromContext: false }

4. Document Context Assembly
   ├── Filter active documents (includedInContext !== false)
   ├── Separate by embedding type:
   │   ├── docsWithRealEmbeddings (OpenAI)
   │   ├── docsWithSimulatedEmbeddings (fallback)
   │   └── docsWithoutEmbeddings
   └── RAG Retrieval (if enabled):
       └── ragHelper('findSimilarChunks', { query, chunks, topK: 15 })
           └── Returns relevantChunks with documentName, text, relevanceScore

5. System Prompt Construction
   ├── Base: "You are a helpful AI assistant analyzing documents..."
   ├── + Project context (if selected)
   ├── + Project Memory Bank (buildProjectMemoryPrompt())
   ├── + Project Brain context (buildProjectBrainContext(), threshold 0.5)
   ├── + Assignment context (if selected)
   └── + Relevant document chunks with relevance scores

6. LLM Invocation
   └── InvokeLLM({ prompt: systemPrompt + fullPromptContent })
       └── Routes to anthropicClient.invokeLLM()
           Model: claude-sonnet-4-5-20250514 (default)
           Max tokens: 4096

7. Response Processing
   ├── Create AI message with RAG metadata
   ├── Store in ProjectBrain (non-blocking, verbatim)
   └── Update state
```

### Document Upload & Embedding Pipeline

```
1. File Validation
   ├── Max 100 documents per session
   └── Max 10MB per file

2. Content Extraction
   ├── .txt/.md/.csv/.json → Direct text decode
   ├── .pdf → UploadFile() → ExtractDataFromUploadedFile()
   └── Other → Attempt text decode with fallback

3. Deduplication
   └── SHA-256 content hash → check against session docs

4. RAG Embedding (if enabled)
   ├── Check cached embeddings in Document entity by contentHash
   ├── ragHelper('generateEmbeddings', { content, fileName, chunkingStrategy: 'auto' })
   │   ├── Semantic chunking: sentence boundaries, 1000 char chunks, 200 char overlap
   │   └── Simple chunking fallback: 500 char fixed-size chunks
   ├── If OpenAI configured → real embeddings (text-embedding-3-small, 1536 dims)
   └── Fallback → simulated embeddings (384 dims, deterministic)

5. Document Summarization
   └── For docs >5000 chars → InvokeLLM() for summary

6. Concurrent processing: max 3 parallel uploads via worker queue
```

### Session Management

- **Save**: Stores to `ChatSession` entity in Supabase with all messages, documents (including embedding cache), metadata, and cost tracking
- **Load**: Restores full state including RAG metadata and document embeddings
- **Auto-save drafts**: localStorage every 60 seconds, 24h expiry
- **Export**: Markdown and PDF formats
- **Search/Sort**: By name, date, message count

### Project Memory System ([api/projectMemory.js](api/projectMemory.js))

Maintains an **evolving summary** of project knowledge across sessions:

```javascript
{
  summary: "",              // Rolling project summary
  key_insights: "[]",       // Extracted insights
  technical_decisions: "[]",// Recorded decisions
  document_summaries: "[]", // Document synopses
  accumulated_context: "",  // Max 20,000 chars
  conversation_count,
  document_count
}
```

Updated via LLM analysis after each session save. Fed into system prompt for future conversations.

### Project Brain System ([api/projectBrain.js](api/projectBrain.js))

Stores **verbatim** message content with vector embeddings for semantic search:
- No summarization - preserves exact user/AI exchanges
- 1536-dim OpenAI embeddings per chunk
- Sentence-boundary chunking (1000 chars, 200 overlap)
- Cosine similarity search with configurable threshold (default 0.5)
- Automatically enriches future conversations with relevant past context

---

## 2. Research Tab

### Key File: [features/ai/AIResearchAssistant.jsx](features/ai/AIResearchAssistant.jsx)

### Workflow
1. User selects context (Project/Assignment/General)
2. Toggles web search on/off
3. Submits research query
4. Backend calls Anthropic Claude with context
5. Returns structured response with:
   - Research type badges (compliance, licenses, permits, legal, industry_standards)
   - Confidence scores (0-100)
   - Recommended actions
   - Suggested documents
6. Results saved to `ai_research_chats` table
7. "Generate Document with AI Studio" button for follow-up

---

## 3. Debate Tab

### Key Files
| File | Purpose |
|------|---------|
| [features/debate/DebateChatInterface.jsx](features/debate/DebateChatInterface.jsx) | Debate UI |
| [features/debate/useDebateSession.js](features/debate/useDebateSession.js) | Debate state/logic |
| [api/debateMemory.js](api/debateMemory.js) | Insight extraction |

### Workflow
```
1. User submits query + context (project/assignment/github)
2. Loop up to max_rounds (default 5):
   ├── Analyst AI (Claude Sonnet) provides analysis
   ├── Critic AI (Claude Haiku) reviews and challenges
   ├── Calculate consensus score (0-100)
   └── Stop if consensus ≥ threshold OR max rounds reached
3. Generate final synthesized response
4. Optionally save insights to project via debate_insights table
```

### Debate Data Model
```
debate_sessions: { context_type, status, current_round, consensus_score, agreed_points, contested_points, final_response }
debate_messages: { role (analyst/critic), content, round }
debate_insights: { linked to project/assignment/github, searchable }
```

---

## 4. LLM Provider Configuration

| Provider | Client File | Models | Purpose | Env Variable |
|----------|-------------|--------|---------|-------------|
| Anthropic | [api/anthropicClient.js](api/anthropicClient.js) | `claude-sonnet-4-5-20250514` (default), `claude-haiku-4-5-20250514` (fast) | Primary LLM for chat, research, debate | `VITE_ANTHROPIC_API_KEY` |
| OpenAI | [api/openaiClient.js](api/openaiClient.js) | `text-embedding-3-small` (embeddings), `gpt-4o-mini`/`gpt-4o` (LLM fallback) | Embeddings for RAG | `VITE_OPENAI_API_KEY` |
| Gemini | [api/geminiClient.js](api/geminiClient.js) | `gemini-3.0-pro-001` | Alternative LLM, streaming support | `VITE_GEMINI_API_KEY` |

### Fallback Chain
1. Anthropic configured? → Use Claude
2. Not configured → Stub response with console warning
3. OpenAI embeddings fail → Simulated embeddings (384-dim, deterministic)
4. Project Brain search fails → Fall back to text search

---

## 5. RAG Pipeline ([api/functions.js](api/functions.js))

### Endpoints
| Endpoint | Purpose |
|----------|---------|
| `generateEmbeddings` | Chunks content + generates embeddings (real or simulated) |
| `findSimilarChunks` | Cosine similarity search, returns top K chunks (score > 0.1) |
| `findRelatedDocuments` | Weighted scoring: content(0.5) + title(0.25) + project(0.15) + assignment(0.1) |

### Similarity Functions
- `cosineSimilarity()` - Vector dot product
- `calculateTitleSimilarity()` - Levenshtein distance (normalized)
- `generateSimpleEmbedding()` - Deterministic 384-dim fallback

---

## 6. UI Component Hierarchy (Chat Tab)

```
AIHub
├── Header (Context Selector + Tab Switcher)
├── Capacity Warning Card (conditional)
└── TabsContent[chat]
    ├── AskAIHeader
    │   ├── Templates Button
    │   ├── Keyboard Shortcuts Button
    │   ├── Smart RAG Toggle + Cost Display
    │   ├── Export Dropdown (Markdown/PDF)
    │   ├── Sessions Sheet (search, sort, session list)
    │   ├── Save/Update Session Button
    │   └── New Conversation Button
    ├── Main Content (2-column layout)
    │   ├── AskAIDocumentSidebar (w-80)
    │   │   ├── Document Upload Zone (drag-drop)
    │   │   ├── Document List (visibility toggles)
    │   │   ├── RAG Embedding Status Badges
    │   │   └── Auto-loaded Docs Indicator
    │   └── AskAIChatArea
    │       ├── Message Scroll Area
    │       │   ├── Message Bubbles (user/AI/error)
    │       │   ├── RAG Metadata Badges
    │       │   └── Message Actions (copy, edit, delete, context toggle)
    │       ├── Suggested Questions
    │       └── Input Area (textarea + voice + send)
    └── AskAIDialogs (save, export, delete, load)
```

### Additional AI Components
- **AIAssistantWidget** ([features/ai/AIAssistantWidget.jsx](features/ai/AIAssistantWidget.jsx)): Floating chat widget available on all pages, supports task creation from conversation
- **ContextAwareChat** ([features/ai/ContextAwareChat.jsx](features/ai/ContextAwareChat.jsx)): Assignment-specific chat with auto-loaded linked documents and threads
- **AIMessageBubble** ([features/ai/AIMessageBubble.jsx](features/ai/AIMessageBubble.jsx)): Rich message rendering with markdown, syntax highlighting, and tool call display

---

## 7. Cross-Feature Integration

| Integration | How |
|-------------|-----|
| **Projects** | Chat context enriched with project metadata; ProjectMemory accumulates across sessions |
| **Assignments** | Assignment context included in prompts; documents auto-loaded by assignment |
| **Documents** | Uploaded to chat, embedded for RAG, linked to projects/assignments |
| **Tasks** | AIAssistantWidget can create tasks from conversation; research suggests action items |
| **GitHub** | Debate system supports `context_type: 'github'` with repository context |

---

## 8. Performance Optimizations

1. **Ref-based atomic counters** for concurrent upload tracking (avoids race conditions)
2. **Lazy client initialization** (LLM clients created only when API keys exist)
3. **Embedding cache** in Document entity by contentHash (reuses across sessions)
4. **Batch embedding** (up to 100 texts per OpenAI request)
5. **Shallow comparison** for session modification detection (count checks before deep comparison)
6. **Max 3 concurrent uploads** via worker queue
7. **Auto-save drafts** in localStorage (avoids unnecessary DB writes)

---

## 9. Limits & Constants ([config/constants.js](config/constants.js))

```javascript
MEMORY_LIMITS = {
  MAX_DOCUMENTS: 100,
  MAX_MESSAGES: 400,
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10 MB
  WARNING_DOCUMENTS: 60,             // 60% capacity warning
  WARNING_MESSAGES: 300,             // 75% capacity warning
}

AI_MODELS = {
  GEMINI_ARCHITECT: 'gemini-3.0-pro-001',
  CLAUDE_DEEP_THINKER: 'claude-opus-4-5-20251101',
  CLAUDE_QA_REVIEWER: 'claude-sonnet-4-5-20250514',
  CLAUDE_FAST: 'claude-haiku-4-5-20250514',
}
```

---

## 10. Routing

| Route | Destination | Notes |
|-------|-------------|-------|
| `/AIHub` | `AIHub.jsx` | Main consolidated page |
| `/AIHub?tab=chat` | Chat tab | Default tab |
| `/AIHub?tab=research` | Research tab | |
| `/AIHub?tab=debate` | Debate tab | |
| `/AskAI` | `AskAI.jsx` | Deprecated standalone page |
| `/Research` | Redirects to `/AIHub?tab=research` | Backwards compatibility |
| `/Debate` | `DebateHub.jsx` | Separate debate page |

---

## 11. Known Inconsistency: Embedding Model Name Mismatch

**IMPORTANT BUG/INCONSISTENCY**: The codebase has a mismatch between the actual embedding model used and the model name checked in filtering logic:

- **Actual model used** ([api/openaiClient.js:38](api/openaiClient.js#L38)): `text-embedding-3-small`
- **Model name set by RAG helper** ([api/functions.js:277](api/functions.js#L277)): Uses `EMBEDDING_CONFIG.model` → `'text-embedding-3-small'`
- **But filtering logic checks for old model name** in multiple places:
  - [hooks/useAskAI.js:1011](hooks/useAskAI.js#L1011): `doc.embeddingModel === 'text-embedding-ada-002'`
  - [hooks/useAskAI.js:1366](hooks/useAskAI.js#L1366): `doc.embeddingModel === 'text-embedding-ada-002'`
  - [hooks/useAskAI.js:1459](hooks/useAskAI.js#L1459): `doc.embeddingModel === 'text-embedding-ada-002'`
  - [features/ai/askAI/AskAIDocumentSidebar.jsx:326](features/ai/askAI/AskAIDocumentSidebar.jsx#L326): `doc.embeddingModel === 'text-embedding-ada-002'`
  - [hooks/useAskAIExport.js:93](hooks/useAskAIExport.js#L93): `doc.embeddingModel === 'text-embedding-ada-002'`

This means **documents processed with real OpenAI embeddings (`text-embedding-3-small`) will NOT be recognized as having "real embeddings"** by the `docsWithRealEmbeddings` filter at line 1459, and will fall through to the simulated/no-embeddings path during RAG retrieval at line 1011. The RAG pipeline would still work (chunks/embeddings exist), but the metadata reporting and some code paths may incorrectly treat them as simulated.

Meanwhile, [hooks/useAskAI.js:542](hooks/useAskAI.js#L542) correctly checks for `'text-embedding-3-small'`.

---

## 12. Unused Split Hooks

Three additional hooks exist but are **exported and never imported** anywhere:
- [hooks/useAskAIDraft.js](hooks/useAskAIDraft.js) - Draft auto-save logic (duplicated in main useAskAI)
- [hooks/useAskAIExport.js](hooks/useAskAIExport.js) - Export functionality (duplicated in main useAskAI)
- [hooks/useAskAISessions.js](hooks/useAskAISessions.js) - Session persistence (duplicated in main useAskAI)

These appear to be an abandoned refactoring attempt to split the monolithic 1,750-line `useAskAI.js` into smaller hooks. They are exported from `hooks/index.js` but never consumed.

---

## 13. Complete AI Feature Component Inventory

### Core AskAI Components ([features/ai/askAI/](features/ai/askAI/))
| Component | Purpose |
|-----------|---------|
| `AskAIHeader.jsx` | Session management, RAG toggle, export, templates |
| `AskAIChatArea.jsx` | Message display, input, suggested questions |
| `AskAIDocumentSidebar.jsx` | Document upload, embedding status, context selector |
| `AskAIDialogs.jsx` | Save/export/delete/load session dialogs |
| `index.js` | Barrel exports |

### AI Feature Components ([features/ai/](features/ai/))
| Component | Purpose | Used By |
|-----------|---------|---------|
| `AIAssistantWidget.jsx` | Floating chat widget (bottom-right) | Used within `UnifiedAIAssistant` |
| `AIConversationalTaskMaker.jsx` | Natural language → task creation | AIAssistantWidget |
| `AIDocumentAnalyzer.jsx` | Document analysis capabilities | - |
| `AIDocumentStructurer.jsx` | Document structure analysis | - |
| `AIMessageBubble.jsx` | Rich message rendering (markdown, code, tools) | AIAssistantWidget |
| `AIProjectExpert.jsx` | Project-specific AI expertise | - |
| `AIResearchAssistant.jsx` | Research tab with web search | AIHub Research tab |
| `AIReviewPanel.jsx` | Code/document review panel | - |
| `AISummaryButton.jsx` | One-click AI summarization | ChatSummaryButton, DocumentPreview |
| `AIWritingAssistant.jsx` | Writing assistance features | - |
| `ActionItemsToTasksConverter.jsx` | Extract action items → tasks | - |
| `AudienceRewriter.jsx` | Rewrite content for different audiences | - |
| `ContentRewriter.jsx` | Content rewriting/paraphrasing | - |
| `ContextAwareChat.jsx` | Assignment-specific chat with threads | - |
| `EnhancedAIReviewPanel.jsx` | Enhanced review with more features | - |
| `GrammarAssistant.jsx` | Grammar checking | - |
| `PromptBuilderWizard.jsx` | Guided prompt construction | - |
| `SmartContextDetector.jsx` | Auto-detect relevant context | AIAssistantWidget |
| `TaskProposalPanel.jsx` | Bulk task proposal from AI | AIAssistantWidget |
| `TransformMenu.jsx` | Text transformation options | - |
| `UnifiedAIAssistant.jsx` | **Global AI wrapper** | Layout.jsx (rendered on all pages) |

### Debate Components ([features/debate/](features/debate/))
| Component | Purpose |
|-----------|---------|
| `DebateChatInterface.jsx` | Main debate UI |
| `DebateControls.jsx` | Start/stop/pause controls |
| `DebateMessage.jsx` | Individual debate message display |
| `ConsensusIndicator.jsx` | Visual consensus score |
| `ContextSelector.jsx` | Context type picker |
| `contextManager.js` | Context data management |
| `debateOrchestrator.js` | Debate round orchestration |
| `useDebateSession.js` | Debate state hook |
| `index.js` | Barrel exports |

### Research Components ([features/research/](features/research/))
| Component | Purpose |
|-----------|---------|
| `ResearchSuggestions.jsx` | Contextual research question suggestions (compliance, risk, legal) |
| `DecisionCapture.jsx` | Capture decisions from research |

### Enhancement Components ([components/](components/))
| Component | Purpose |
|-----------|---------|
| `OnboardingTutorial.jsx` | Interactive first-time tour |
| `QuickStartGuide.jsx` | Quick start overlay for new users |
| `KeyboardShortcuts.jsx` | Keyboard shortcuts help modal |
| `SessionTemplates.jsx` | Pre-configured session templates |
| `CostEstimator.jsx` | Embedding cost preview before processing |

### Global AI Presence
- **`UnifiedAIAssistant`** is imported in [components/common/Layout.jsx](components/common/Layout.jsx) and rendered on **every page** of the application
- This wraps `AIAssistantWidget` which provides the floating chat bubble in the bottom-right corner
- Uses `SmartContextDetector` to infer context from the current URL/page

---

## 14. Research Tab Sub-Features

The Research tab within AIHub has two sub-tabs:
1. **AI Research** - Main research interface with `AIResearchAssistant`
2. **History** - Displays past research queries from `ai_research_chats` table (last 50)

The `ResearchSuggestions` component generates **contextual research questions** based on assignment metadata:
- Critical Compliance questions
- Risk Assessment questions
- Industry-specific queries
- Location-aware suggestions

---

## 15. Conversation History Window

When building the prompt for the LLM, the system includes the **last 100 messages** from active (non-excluded) conversation history ([useAskAI.js:1081](hooks/useAskAI.js#L1081)). This was increased from a previous limit for better context retention.

Full text of non-RAG documents is capped at **4000 characters** per document ([useAskAI.js:1076](hooks/useAskAI.js#L1076)).

---

## 16. Auto-Linked Documents

When a user selects a Project or Assignment context in the Chat tab, the system automatically loads linked documents ([AIHub.jsx:143-184](pages/AIHub.jsx#L143-L184)):
- **Assignment context**: Documents where `assigned_to_assignments` includes the assignment ID
- **Project context**: Documents where `assigned_to_project` matches the project ID
- Excludes folder placeholders and docs without file URLs
- Filters out outdated documents
- Uses cached embeddings when available from `Document.embedding_cache`
- Documents needing processing are flagged with `needsProcessing: true`
- A `processLinkedDocuments()` function can batch-process unembedded linked docs

---

## Summary of Capabilities

The Ask AI feature provides:

1. **Document Q&A with RAG** - Upload documents, semantic chunking, embedding-based retrieval, context-aware responses
2. **Multi-provider LLM** - Anthropic Claude (primary), OpenAI (embeddings), Gemini (alternative)
3. **Project Memory** - Evolving summaries accumulated across chat sessions
4. **Project Brain** - Verbatim recall via semantic vector search
5. **Session Management** - Save/load/search/export sessions with full state preservation
6. **Auto-save Drafts** - localStorage persistence with 24h expiry
7. **AI Research** - Structured research with confidence scores, actions, and web search
8. **AI Debate** - Multi-round analyst/critic debate with consensus tracking
9. **Global AI Widget** - `UnifiedAIAssistant` rendered on every page via Layout.jsx, with task creation, smart context detection
10. **Voice Input** - Speech-to-text for all AI interfaces
11. **Cost Tracking** - Embedding cost estimation and display
12. **Cross-feature Integration** - Projects, assignments, documents, tasks, and GitHub
13. **Auto-linked Documents** - Automatic document loading based on project/assignment context
14. **AI Document Tools** - Summarization (AISummaryButton), analysis, structuring, writing assistance, grammar checking, content rewriting
15. **Contextual Research Suggestions** - Dynamic question generation based on assignment metadata
