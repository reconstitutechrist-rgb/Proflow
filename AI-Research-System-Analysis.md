# Proflow AI Research & Document Creation System - Deep Analysis

## Overview

The AI Research system allows users to have AI-powered research conversations, upload documents for context, leverage RAG (Retrieval Augmented Generation) for grounded responses, and ultimately save or export the results. The system maintains persistent project memory so AI "remembers" past discussions.

---

## Three Entry Points for AI Research

### 1. AI Hub - Chat Tab (`pages/AIHub.jsx`)
- Conversational AI with document context
- Upload documents to the sidebar → they get embedded via RAG
- Ask questions, get AI responses informed by your documents
- Select a project/assignment for context → linked documents auto-load

### 2. AI Hub - Research Tab (`pages/AIHub.jsx` → `AIResearchAssistant.jsx`)
- Dedicated research mode with structured output
- Select project/assignment/context scope
- Ask research questions → system calls Anthropic backend via `db.functions.invoke('anthropicResearch', {...})`
- Responses include: sources, recommended actions, suggested document titles
- Research history saved to `AIResearchChat` entity
- "Generate Document" button to create documents from research findings

### 3. AskAI Page (`pages/AskAI.jsx`)
- Specialized document analysis interface (still active, NOT deprecated)
- Left sidebar for document upload + embedding status
- Full session management (save/load/delete)
- Enhancement overlays: onboarding tutorial, quick start guide, keyboard shortcuts, session templates, cost estimator
- Keyboard shortcuts: Cmd/Ctrl+Enter (send), Cmd+U (upload), Cmd+N (new), Cmd+S (save)
- Capacity warnings at 60 docs / 300 messages thresholds

---

## How a Research Conversation Works

```
User selects project/assignment context
        |
        v
Linked documents auto-load (useAskAI.js:1484-1550)
  - Filters documents linked to selected project/assignment
  - Checks for cached embeddings (ai_processed + embedding_cache)
  - Reuses cached embeddings if available
  - Processes missing ones with processLinkedDocuments()
        |
        v
User uploads additional documents (optional)
  - processAndEmbedDocument() (useAskAI.js:833-942)
  - Content hashing (SHA-256) for deduplication
  - Check Document entity for cached embeddings
  - If cached: reuse immediately (zero cost)
  - If new: semantic chunking -> generate embeddings -> cache on Document entity
  - Concurrent processing (up to 3 workers)
  - Cost tracking per document
        |
        v
User asks question
        |
        v
handleSendMessage() (useAskAI.js:969-1200)
  |
  |-- RAG enabled? Find similar chunks (top 15) from all loaded docs
  |     via ragHelper({ endpoint: 'findSimilarChunks' })
  |     Inject into system prompt with relevance scores
  |
  |-- Project Memory loaded? Inject summarized context
  |     via buildProjectMemoryPrompt()
  |
  |-- Project Brain loaded? Find similar past conversations
  |     via buildProjectBrainContext()
  |
  +-- Call InvokeLLM() with enriched prompt
        |
        v
AI Response returned with metadata:
  {
    content: "Based on the documents...",
    ragMetadata: {
      usedRAG: true,
      chunksRetrieved: 8,
      totalChunksSearched: 145,
      usingRealEmbeddings: true
    },
    source_documents: ["Auth Spec.md", "Security Policy.docx"],
    confidence_score: 0.87
  }
        |
        v
Message stored in project brain for future recall
  via storeProjectMessage()
```

---

## The RAG Pipeline (How Documents Inform AI)

```
Document uploaded or auto-linked from project
        |
        v
Extract text content
  - Text files (.txt, .md, .json): read directly via FileReader
  - PDFs: text extraction
        |
        v
Content hashing (SHA-256)
  - Check for duplicate in current session
  - Check Document entity database for cached embeddings
        |
        v
Semantic chunking (api/functions.js:141-181)
  - Split by sentences with overlap
  - Structure analysis (headings, sections, paragraphs)
        |
        v
Generate embeddings
  - Primary: OpenAI text-embedding-3-small (real embeddings)
  - Fallback: simulated embeddings via generateSimpleEmbedding()
  - Cost tracked per document
        |
        v
Cache on Document entity for reuse across sessions:
  embedding_cache: {
    chunks: [...],
    embeddings: [...],
    model: 'text-embedding-3-small',
    chunking_strategy: 'semantic',
    structure_analysis: {...},
    token_count: 4523,
    estimated_cost: 0.0012
  }
        |
        v
On each user query:
  ragHelper({ endpoint: 'findSimilarChunks' })
  -> Returns top 15 most relevant chunks across all documents
  -> Injected into LLM system prompt with relevance scores
  -> AI responds grounded in document content
```

---

## How AI Content Becomes Documents

There are **4 paths** from AI conversation to saved/persistent content:

### Path 1: Save Session (Primary Path)

```
User clicks "Save Session" in header
        |
        v
handleSaveSession() (useAskAI.js:1202-1291)
  - Serializes entire conversation to ChatSession entity:
    {
      name: "Auth Research - Feb 2026",
      description: "Research on authentication patterns",
      messages: [{
        id, type: 'user'|'ai',
        content: "...",
        timestamp,
        excludedFromContext: false,
        ragMetadata: { usedRAG, chunksRetrieved, ... },
        source_documents: ["doc1.md", "doc2.pdf"]
      }],
      documents: [{
        id, name, content,
        includedInContext: true,
        chunks: [...],
        embeddings: [...],
        embeddingModel: 'text-embedding-3-small'
      }],
      project_id, assignment_id, context_type,
      message_count: 24,
      total_embedding_cost: 0.0045,
      auto_generated_summary: "Discussed auth patterns...",
      last_activity: ISO timestamp,
      status: 'active'
    }
  - Saved to database
  - Updates project memory bank (updateProjectMemoryFromChat)
  - Session appears in session list for future loading
```

**Access**: AI Hub → Sessions panel → Load any saved session

### Path 2: Export to PDF or Markdown

```
User clicks "Export" -> selects format
        |
        +---> PDF Export (useAskAIExport.js)
        |       Calls exportSessionToPdf() (api/functions.js)
        |       Downloads structured .pdf file
        |
        +---> Markdown Export (useAskAIExport.js)
                Generates structured .md with:
                  # Session Title
                  Export date, project/assignment context

                  ## Documents Used
                  - Doc name | embedding model | chunks | tokens | cost | cache status

                  ## Conversation
                  ### User (10:30 AM)
                  Question text...

                  ### AI Assistant (10:31 AM)
                  Response text...
                  > RAG: 8 chunks retrieved, confidence 0.87

                  ## Session Metadata
                  Total messages, embedding cost, RAG usage stats

                Downloads as .md file
```

**Access**: Downloaded to user's filesystem

### Path 3: Generate Document from Research

```
Research Assistant shows AI response with:
  - Research findings
  - Suggested document titles
  - Recommended actions
        |
        v
User clicks "Generate Document" (AIResearchAssistant.jsx:194-215)
        |
        v
handleGenerateDocumentFromResearch() builds context:
  {
    fromResearch: 'true',
    assignmentId: 'uuid',
    projectId: 'uuid',
    assignmentName: 'Auth Module',
    researchQuestion: 'What auth patterns should we use?',
    researchType: 'technical_analysis',
    suggestedDocTitle: 'Authentication Architecture Proposal',
    recommendedActions: JSON.stringify([...]),
    researchSummary: 'Based on analysis of 5 documents...'
  }
        |
        v
Navigates to DocumentCreator page with query params
  (NOTE: This route is referenced but the page is not yet fully implemented -
   this is a gap in the current system)
```

**Status**: Route referenced but DocumentCreator page not yet built

### Path 4: GitHub Hub - Save AI Artifacts as Documents

```
In GitHubHub, dual-AI analyzes repository code
        |
        v
AI generates artifacts (documentation, analysis reports, etc.)
        |
        v
User clicks "Save to Workspace"
        |
        v
Creates Document entity directly:
  Document.create({
    workspace_id,
    title: artifact.title,
    extracted_text: artifact.content,
    document_type: 'report',
    assigned_to_project: projectId,
    created_date: new Date().toISOString()
  })
        |
        v
Document appears on Documents page immediately
```

**Access**: Documents page → document appears in library

### Summary: Where Saved Content Lives

| Save Method | Stored In | Accessible From |
|-------------|-----------|-----------------|
| Save Session | `ChatSession` entity (database) | AI Hub → Load Session |
| Export PDF | Downloaded .pdf file | User's filesystem |
| Export Markdown | Downloaded .md file | User's filesystem |
| Generate from Research | `Document` entity (planned) | Documents page |
| GitHub artifact save | `Document` entity | Documents page |

---

## Project Memory & Brain (Persistent AI Context)

### Project Memory (Summarized Context Bank)

```
After saving a session with project selected:
        |
        v
updateProjectMemoryFromChat() (api/projectMemory.js)
  - Extracts key insights, decisions, and facts from conversation
  - Stores as summarized context in ProjectMemory entity
        |
        v
Next conversation with same project:
        |
        v
getProjectMemory() loads accumulated context
        |
        v
buildProjectMemoryPrompt() injects into system prompt:
  "PROJECT CONTEXT: This project is about building an auth system.
   Key decisions made: Use OAuth 2.0, JWT tokens, 2FA required.
   Current status: Authentication module 70% complete.
   Open questions: Session timeout duration not yet decided."
        |
        v
AI has full project history without user re-explaining
```

### Project Brain (Verbatim Message Recall)

```
Every AI message in a project conversation:
        |
        v
storeProjectMessage() (api/projectBrain.js)
  - Archives exact message content
  - Indexes for semantic search
        |
        v
Next conversation with similar question:
        |
        v
buildProjectBrainContext() finds similar past messages:
  "3 days ago you discussed password reset flow and decided:
   'We should use time-limited tokens with a 15-minute expiry.
   The reset email should include the user's first name.'"
        |
        v
AI can reference exact past statements with context
```

### How Memory & Brain Work Together

```
New conversation with Project X selected
        |
        v
Load Project Memory (summarized):
  "This project uses OAuth 2.0 with JWT tokens.
   Key focus areas: authentication, authorization, session management."
        |
        v
Load Project Brain (verbatim, query-relevant):
  "On Feb 8 you said: 'Password reset must use 2FA verification.'
   On Feb 9 you decided: 'Session timeout should be 30 minutes.'"
        |
        v
Both injected into system prompt
        |
        v
AI responds with full project awareness:
  "Based on your previous decision to require 2FA for password resets
   and the 30-minute session timeout, I recommend..."
```

---

## Draft Auto-Save (Safety Net)

```
Every 60 seconds while chatting (useAskAIDraft.js)
        |
        v
Auto-save to localStorage (key: 'askAI_draft_v1'):
  {
    messages: [...],
    documents: [...],
    contextSelection: { projectId, assignmentId },
    embeddingCost: 0.0034,
    timestamp: Date.now()
  }
        |
        v
On page reload (within 24 hours):
  Toast notification: "Recovered unsaved draft from 2 hours ago"
  Actions: [Restore] [Discard]
        |
        v
On "Restore": Full conversation state restored
On "Discard": Draft cleared, fresh start
        |
        v
After 24 hours: Draft automatically expires and is cleared
```

---

## Session Management (useAskAISessions.js)

### Session Operations
- **Save**: Create new or update existing session with full state
- **Load**: Restore session with conflict detection (warns if unsaved changes)
- **Delete**: Remove session with cascade reset if currently loaded
- **Search**: Filter sessions by name, sort by date/name/message count
- **New Conversation**: Guards with confirmation if unsaved work exists

### Session Load Flow
```
User clicks session in sidebar
        |
        v
Check for unsaved changes (shallow comparison)
        |
        +--> Changes detected: "You have unsaved changes. Load anyway?"
        |       [Load Anyway] [Cancel]
        |
        v
Load session from database
  - Restore all messages with metadata
  - Restore all documents with embeddings
  - Restore context selection (project/assignment)
  - Restore embedding cost tracking
        |
        v
After save: Update project memory bank
  updateProjectMemoryFromChat() extracts and stores insights
```

---

## Key Files & Their Roles

| File | Lines | Purpose |
|------|-------|---------|
| `hooks/useAskAI.js` | 1750 | **Master hook**: Chat state, RAG pipeline, message handling, session save, project memory/brain integration |
| `hooks/useAskAISessions.js` | 387 | Session CRUD: save/load/delete with conflict detection |
| `hooks/useAskAIDraft.js` | 208 | Draft auto-save to localStorage with 24-hour expiration |
| `hooks/useAskAIExport.js` | 158 | Export to PDF and Markdown with full metadata |
| `pages/AIHub.jsx` | 733 | **Main orchestrator**: Chat, Research, Generate tabs with document sidebar |
| `pages/AskAI.jsx` | Active | Specialized document analysis AI interface |
| `features/ai/AIResearchAssistant.jsx` | 400+ | Research mode: structured output, document generation button |
| `features/ai/askAI/AskAIChatArea.jsx` | 300+ | Chat message display, input, suggested questions |
| `features/ai/askAI/AskAIDialogs.jsx` | 300+ | Save/Export/Delete/Load session dialogs |
| `features/ai/askAI/AskAIDocumentSidebar.jsx` | — | Document upload, embedding status, context management |
| `features/ai/askAI/AskAIHeader.jsx` | — | Session controls, settings |
| `api/integrations.js` | 156 | `InvokeLLM()`, `UploadFile()`, `ExtractDataFromUploadedFile()` |
| `api/functions.js` | 200+ | `ragHelper()`, `exportSessionToPdf()`, embedding generation |
| `api/projectMemory.js` | — | Project memory bank: get, update, build prompt |
| `api/projectBrain.js` | — | Verbatim message recall: store, search, build context |

---

## AI Models Used

```
GEMINI_ARCHITECT:    gemini-3.0-pro-001         (Google)
CLAUDE_DEEP_THINKER: claude-opus-4-5-20251101   (Anthropic)
CLAUDE_QA_REVIEWER:  claude-sonnet-4-5-20250514 (Anthropic)
CLAUDE_FAST:         claude-haiku-4-5-20250514  (Anthropic)

Embedding Model: text-embedding-3-small         (OpenAI)
Fallback:        simulated embeddings           (built-in)
```

---

## Current Gap: DocumentCreator Page

The **Generate Document from Research** path (Path 3) references a `DocumentCreator` page that would:
1. Receive research context via URL query parameters
2. Pre-fill a document with AI-generated content from research findings
3. Allow user to edit and refine
4. Save as a formal `Document` entity to the workspace

This route is referenced in `AIResearchAssistant.jsx` line 214 but the destination page is not yet implemented. Current workarounds:
- Export to Markdown → manually upload to Documents page
- Save session → reference later from AI Hub
- Use GitHubHub's "Save to Workspace" pattern (which does create Document entities directly)

### NOTE: Intended Design for Generate Document

The AI should generate a **professionally formatted and structured document** that appears as a **side panel** before the user sends it to the document page. The flow should be:

1. User clicks "Generate Document" from a research/chat response
2. AI generates a polished, professionally structured document (not raw chat output)
3. Document appears in a **side panel preview** where the user can review, edit, and refine
4. User confirms and sends the finalized document to the Documents page as a formal `Document` entity

This keeps the user in control while ensuring documents are publication-ready before they enter the document library.

---

## Complete Data Flow Diagram

```
USER INPUT (Chat / Research / AskAI)
        |
        v
DOCUMENT UPLOAD (processAndEmbedDocument)
        |  <- SHA-256 hash for dedup
        |  <- Check Document entity for cached embeddings
        |  <- Semantic chunking + embedding generation
        |  <- Cache embeddings on Document entity
        v
CONTEXT ENRICHMENT
        |  <- Project Memory (summarized insights)
        |  <- Project Brain (verbatim past messages)
        |  <- RAG chunks (top 15 relevant)
        v
LLM CALL (InvokeLLM -> Claude/Gemini)
        |
        v
AI RESPONSE (with RAG metadata + source documents)
        |
        v
PERSIST OPTIONS:
        |
        +-> Save Session -> ChatSession entity (full state)
        |     -> Updates Project Memory bank
        |
        +-> Export -> PDF or Markdown file (download)
        |
        +-> Generate Document -> DocumentCreator (planned)
        |     -> Would create Document entity
        |
        +-> Draft Auto-Save -> localStorage (60s interval, 24hr expiry)
        |
        +-> Project Brain -> storeProjectMessage() (automatic)
        |
        v
DOCUMENTS PAGE (DocumentsHub)
  - View, edit, delete documents
  - Link to projects/assignments
  - Upload triggers Document Control & Outdating pipelines
```
