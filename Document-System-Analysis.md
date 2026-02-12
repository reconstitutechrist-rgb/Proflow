# Proflow Automated Document Updating System - Deep Analysis

## Overview

The automated document updating system is Proflow's "ultimate secretary/assistant/document filing system." When a new document is uploaded, the system automatically:

1. **Finds related/outdated documents** and retires them (filing)
2. **Proposes surgical text edits** to existing documents based on new facts (assistant)

Both pipelines work together to ensure workspace documents stay current, organized, and free of stale information.

---

## Architecture: Two Parallel Pipelines

### Pipeline 1: Smart Outdating (Document Lifecycle Management)

**Purpose**: When you upload a new document, automatically find old documents it replaces and manage the transition.

**Trigger**: `DocumentUploader.jsx` with `isUpdateMode` toggled on

**End-to-end flow**:

```
User uploads "Q2 Budget Report v3.pdf"
        |
        v
System extracts text content from the file
        |
        v
AI (via RAG/embeddings) searches ALL active workspace documents
  for: content similarity, title similarity, same project, same assignment
        |
        v
Results: "Q2 Budget Report v2.pdf" (92% match), "Budget Draft.docx" (78% match)
        |
        v
Shows RelatedDocumentsSuggestionPanel:
  "These documents may be outdated by your upload"
  with confidence scores and match reasons
        |
        v
User selects which ones to mark as outdated
        |
        v
System automatically:
  - Moves old docs to /Outdated folder
  - Records WHO outdated them, WHEN, and WHY
  - Links old -> new via `replaced_by` field
  - Clears AI caches (so AI never cites outdated info)
  - Preserves original folder path (for restore)
```

#### Key Files

| File | Role |
|------|------|
| `features/documents/DocumentUploader.jsx` | Upload UI with optional Update Mode toggle |
| `hooks/useDocumentOutdating.js` (259 lines) | Core outdating logic: search, select, mark outdated, restore |
| `features/documents/RelatedDocumentsSuggestionPanel.jsx` | UI showing found related documents with confidence scores |
| `features/documents/DocumentRestoreDialog.jsx` | Restore previously outdated documents |
| `components/documents/OutdatedDocumentBadge.jsx` | Visual indicator on outdated document cards (also exports `OutdatedIndicator` icon-only variant) |

#### useDocumentOutdating Hook - State & Functions

**State**:
```javascript
isSearching: boolean         // AI search in progress
suggestions: []              // Found related documents
selectedDocuments: Set       // User-selected for outdating
searchError: null            // Error state
```

**Key Function: `findRelatedDocuments()`**
- Input: `{ content, title, fileName, projectId, assignmentIds }`
- Loads all active documents: `Document.filter({ workspace_id, is_outdated: false })`
- Filters to searchable docs (no folders, has content)
- Calls `ragHelper({ endpoint: 'findRelatedDocuments' })` for AI similarity matching
- Returns suggestions with: `documentId, title, confidenceScore, matchReasons, previewSnippet, folderPath, lastUpdated`

**Key Function: `markAsOutdated()`**
- Input: `documentIds[], replacementDocId, reason, currentUserEmail`
- For each document, applies these database updates:

```javascript
{
  is_outdated: true,
  outdated_date: new Date().toISOString(),
  outdated_by: currentUserEmail,
  replaced_by: replacementDocId,          // Links old -> new document
  replacement_reason: reason,
  outdated_from_folder: doc.folder_path,  // Preserve original location
  folder_path: '/Outdated',              // Move to Outdated folder

  // Clear AI processing data (prevents AI from citing stale info)
  ai_processed: false,
  ai_processed_date: null,
  ai_processed_model: null,
  embedding_cache: null
}
```

**Key Function: `restoreDocument()`**
- Reverses outdating: restores folder path, clears outdated flags
- Returns document to original folder (`outdated_from_folder`)

**Additional Functions:**
- `toggleDocumentSelection(documentId)` - Toggles a document's membership in the `selectedDocuments` Set
- `selectAllSuggestions()` / `clearSelections()` - Bulk selection helpers for the suggestion list
- `getReplacementDocument(documentId)` - Fetches the linked replacement document info by ID (used by DocumentRestoreDialog and OutdatedDocumentBadge)
- `reset()` - Clears all state (isSearching, suggestions, selectedDocuments, searchError)

**Computed Properties (returned by hook):**
- `hasSelections: boolean` - Whether any documents are currently selected (`selectedDocuments.size > 0`)
- `selectedCount: number` - Number of currently selected documents (`selectedDocuments.size`)

#### Match Reasons

The AI search returns documents with these match types:
- `content_similar` - Document content is semantically similar
- `title_similar` - Document titles match
- `same_project` - Same project scope
- `same_assignment` - Same assignment scope

---

### Pipeline 2: Surgical Document Control (Auto-Update Content)

**Purpose**: Read a new upload, find existing documents with overlapping content, and propose **specific text edits** backed by evidence from the new document.

**Trigger**: `DocumentControlPanel.jsx` (independent from DocumentUploader)

**Rendered in**: `pages/ProjectDashboard.jsx` - appears within the project dashboard view

**End-to-end flow**:

```
User uploads "Updated Auth Spec.md" via Document Control Panel
        |
        v
PHASE 1 - EXTRACT (10%)
  Extract text from uploaded file (.txt, .md, .json, .pdf)
  Limit: first 10,000 characters for search
        |
        v
PHASE 2 - ANALYZE (30%)
  AI reads document and extracts ONLY explicit facts:
  {
    statement: "The password reset now requires 2FA verification",
    confidence: 0.95,
    sourceLocation: "Section 3.2",
    verbatimQuote: "All reset flows must include 2FA as of March 2026"
  }
  Also identifies: primarySubject, domain, scope, outOfScope, statedBoundaries
        |
        v
PHASE 3 - MATCH (50%)
  Semantic search via Project Brain finds existing documents
  with sections about the same subject
  - Builds queries from: specificArea, scope, first 5 facts
  - Calls searchProjectDocuments() per query (10 results each, 0.4 threshold)
  - Deduplicates by document_id + chunk_index
  - Returns top 10 documents sorted by max similarity
        |
        v
PHASE 4 - PROPOSE (70%)
  For each matching document section, AI generates surgical edits:
  {
    document: "Security Policies.docx",
    section: "Password Reset Flow",
    originalText: "Users can reset via email link",
    proposedText: "Users can reset via email link with mandatory 2FA verification",
    sourceQuote: "All reset flows must include 2FA as of March 2026",
    confidence: { subjectMatch: 0.9, factual: 0.95, scope: 0.85, overall: 0.88 }
  }
  - Filter out changes below DO_NOT_PROPOSE threshold (0.3)
        |
        v
PHASE 5 - PREVIEW (100%)
  User sees every proposed change with:
  - Red/green diff view (word-level via ChangeDiffView)
  - Evidence citation (exact quote from uploaded doc)
  - 8-point validation checklist
  - Confidence badge (color-coded via ConfidenceBadge)

  Per change: Approve | Reject | Edit (via ChangeEditModal)
  Per document: Approve All | Reject All
        |
        v
PHASE 6 - APPLY
  System applies approved changes:
  - Updates document text (applied in reverse order to preserve string positions)
  - Creates version history entry with content hash
  - Bumps version "1.0" -> "1.1.{timestamp}"
  - Records who applied and change notes
        |
        v
PHASE 7 - COMPLETE
  Shows: which documents updated, new version numbers, links to view them
```

#### Key Files

| File | Role |
|------|------|
| `features/documents/DocumentControlPanel.jsx` (539 lines) | Main UI - collapsible card with full workflow |
| `hooks/useDocumentControl.js` (517 lines) | State machine and orchestration |
| `api/documentControl.js` (792 lines) | AI analysis, matching, change generation, application |
| `features/documents/ChangePreviewCard.jsx` (346 lines) | Individual change display with diff and evidence |
| `features/documents/ChangeDiffView.jsx` | Word-level red/green diff rendering |
| `features/documents/ChangeEditModal.jsx` | Edit proposed text before applying |
| `features/documents/ConfidenceBadge.jsx` | Color-coded confidence score display |
| `features/documents/AnalysisProgress.jsx` | Progress bar during analysis |
| `features/documents/documentControlTypes.js` | Constants: `CONFIDENCE_THRESHOLDS`, `CONFIDENCE_WEIGHTS`, `CHANGE_STATUS`, `CONTROL_STEPS` |

#### State Machine

```
UPLOAD ──────────────────────────────────────────────────────────┐
  File selected, optional link to assignment/task               |
  Validate file size (<100MB) and type                          |
  "Analyze & Compare" button                                    |
                                                                |
  startAnalysis()                                               |
       |                                                        |
       v                                                        |
ANALYZING (with progress 0-100%)                                |
  Progress bar with status messages                             |
  Cancel button (aborts via AbortController)                    |
       |                                                        |
       +------ error -----> ERROR                               |
       |                      Retry button -> back to UPLOAD    |
       v                                                        |
PREVIEW                                                         |
  Changes found: review, approve/reject, edit                   |
  No matches: option to save doc without changes                |
  "Apply Changes" button                                        |
       |                                                        |
       v                                                        |
APPLYING (progress)                                             |
       |                                                        |
       v                                                        |
COMPLETE                                                        |
  Success summary, "View Updated Documents", "Upload Another"  |
  "Upload Another" -> back to UPLOAD ───────────────────────────┘
```

#### useDocumentControl Hook - State

```javascript
{
  isExpanded: false,            // Panel collapsed/expanded
  currentStep: 'UPLOAD',       // Current state machine step
  uploadedFile: null,           // The uploaded file object
  linkedAssignment: null,       // Optional linked assignment
  linkedTask: null,             // Optional linked task
  analysisProgress: 0,          // 0-100 progress
  analysisStatus: '',           // Human-readable status message
  contentAnalysis: null,        // Extracted facts from uploaded doc
  proposedChanges: [],          // Array of ProposedChange objects
  affectedDocuments: [],        // Changes grouped by document
  expandedDocuments: Set,       // Which doc groups are expanded in UI
  appliedChanges: [],           // Results after applying
  savedDocumentId: null,        // ID of saved uploaded document
  error: null                   // Error message if any
}
```

---

## API Layer: documentControl.js

### `extractFileContent(file)` (lines 42-81)
- Text files (.txt, .md, .json): Read directly via FileReader
- PDF files: Text extraction (placeholder for pdf.js)
- Returns first 10,000 characters

### `analyzeUploadedDocument(content, fileName)` (lines 87-190)
Uses LLM with strict schema to extract:
```javascript
{
  primarySubject: {
    domain: string,          // 'feature', 'budget', 'timeline', etc.
    specificArea: string,    // 'user-authentication'
    scope: string            // 'password-reset-flow'
  },
  explicitFacts: [{
    statement: string,
    confidence: 0.0-1.0,
    sourceLocation: string,
    verbatimQuote: string    // Direct quote as evidence
  }],
  outOfScope: [],            // What the document does NOT address
  statedBoundaries: []       // Explicit scope limitations
}
```

**Critical constraint**: ONLY explicit facts with verbatim quotes. No inference, no assumptions.

### `findMatchingSections(contentAnalysis, projectId, workspaceId)` (lines 196-277)
1. Builds search queries from subject + first 5 facts
2. Calls `searchProjectDocuments()` per query (10 results, 0.4 similarity threshold)
3. Deduplicates by document_id + chunk_index
4. Returns top 10 documents sorted by max similarity

### `generateProposedChanges(contentAnalysis, matchingSections, fileName)` (lines 283-433)
For each matching document:
1. Combines relevant text chunks
2. Calls LLM with strict constraints:
   - ONLY propose changes for exact subject matches
   - Each change MUST have verbatim quote evidence
   - Make MINIMAL changes only
   - Do NOT modify related topics or expand scope
   - If existing text doesn't contradict new facts, don't propose changes
3. Post-processes with confidence scoring
4. Filters out changes below 0.3 threshold

### `calculateConfidence(change)` (lines 438-457)
Post-processes a raw change from the LLM and calculates a detailed confidence breakdown:
```javascript
{
  subjectMatch: 0.0-1.0,       // How closely the change targets the exact subject
  factualAlignment: 0.0-1.0,   // How well the evidence supports the change
  scopeContainment: 0.0-1.0,   // Whether the change stays within stated boundaries
  changeMinimality: 0.0-1.0,   // How minimal the edit is (via calculateMinimality)
  overall: 0.0-1.0             // Weighted average using CONFIDENCE_WEIGHTS
}
```

### `calculateMinimality(original, proposed)` (lines 462-479)
Calculates how minimal a proposed change is compared to the original text:
- Uses length ratio comparison
- Measures word overlap between original and proposed text
- Returns a 0.0-1.0 score (higher = more minimal change)

### `applyDocumentChanges(approvedChanges, userId, workspaceId)` (lines 485-621)
For each approved change:
1. Fetches document from database
2. Gets content from `extracted_text` or `embedding_cache.chunks`
3. Calculates content hash
4. Applies text replacements in **reverse order** (preserves string positions)
5. Creates version history entry
6. Updates document with new content and version

### `saveUploadedDocument(file, projectId, workspaceId, userId)` (lines 626-667)
Saves the uploaded file as a new workspace document:
- Uploads to Supabase Storage
- Extracts first 50,000 chars for indexing
- Creates document record in `/Miscellaneous` folder

### `runDocumentControlAnalysis(file, projectId, workspaceId, onProgress)` (lines 672-792)
**Orchestrator function** that runs the full 7-phase pipeline end-to-end:
1. Calls `extractFileContent()` → progress 10%
2. Calls `analyzeUploadedDocument()` → progress 30%
3. Calls `findMatchingSections()` → progress 50%
4. Calls `generateProposedChanges()` → progress 70%
5. Returns results → progress 100%

Accepts an `onProgress` callback for real-time UI updates with `{ progress, status }` objects. This is the primary entry point called by `useDocumentControl` hook's `startAnalysis()` function.

---

## Data Structures

### ProposedChange Object
```javascript
{
  id: 'change_1234567890',
  documentId: 'uuid',                    // Target document to modify
  documentTitle: 'Security Policies.docx',
  sectionName: 'Password Reset Flow',
  pageNumber: null,
  originalText: 'Users can reset via email link',
  proposedText: 'Users can reset via email link with mandatory 2FA',
  startIndex: 1542,                      // Position in document content
  endIndex: 1575,
  status: 'pending',                     // pending | approved | rejected | applied
  userEditedText: null,                  // Set if user edits the proposal
  evidence: {
    sourceQuote: 'All reset flows must include 2FA as of March 2026',
    sourceLocation: 'Section 3.2, Paragraph 1',
    matchReason: 'exact_subject_match',  // or 'related_topic'
    confidence: {
      subjectMatch: 0.9,
      factualAlignment: 0.95,
      scopeContainment: 0.85,
      changeMinimality: 0.9,
      overall: 0.88
    }
  },
  scopeJustification: {
    withinPrimarySubject: true,
    withinSpecificArea: true,
    withinStatedScope: true,
    crossesFeatureBoundary: false,
    requiresUserConfirmation: false      // true if confidence < 0.7
  },
  nonImpact: []                          // Things explicitly not affected
}
```

### Outdated Document Fields
```javascript
{
  is_outdated: true,
  outdated_date: '2026-02-11T10:30:00.000Z',
  outdated_by: 'user@example.com',
  replaced_by: 'uuid-of-new-document',
  replacement_reason: 'Updated Q2 budget figures',
  outdated_from_folder: '/Finance/Reports',    // Original location (for restore)
  folder_path: '/Outdated',                    // Current location

  // AI isolation (prevents citing stale info)
  ai_processed: false,
  ai_processed_date: null,
  ai_processed_model: null,
  embedding_cache: null
}
```

---

## Confidence System

### Thresholds
| Threshold | Value | Behavior |
|-----------|-------|----------|
| `AUTO_APPROVE_ELIGIBLE` | 0.9 | High confidence, eligible for auto-approve |
| `STANDARD_PROPOSAL` | 0.7 | Normal confidence, shown to user |
| `FLAGGED_FOR_REVIEW` | 0.5 | Low confidence, highlighted with warning |
| `DO_NOT_PROPOSE` | 0.3 | Too uncertain, filtered out entirely |

### Scoring Weights
| Factor | Weight | What It Measures |
|--------|--------|-----------------|
| Subject exact match | 0.30 | Does the change target the exact same subject? |
| Evidence directness | 0.30 | Is there a direct verbatim quote as proof? |
| Scope containment | 0.25 | Does the change stay within stated boundaries? |
| Change minimality | 0.15 | Is the change as small as possible? |

### 8-Point Validation Checklist (shown in UI)
1. Evidence exists for this change
2. Subject match verified
3. Within stated scope
4. Within primary subject area
5. Within specific area
6. No feature boundary crossing
7. Factual alignment confirmed
8. Change is minimal

---

## Safety Guardrails

| Guardrail | Implementation |
|-----------|---------------|
| **Evidence-only** | Every proposed change must have a verbatim quote from the uploaded document as proof. No inference chains allowed. |
| **Scope containment** | AI is forbidden from modifying "related" topics. Only exact subject matches generate proposals. |
| **Confidence filtering** | Changes below 0.3 confidence are never shown. Changes below 0.7 require explicit user confirmation. |
| **User approval required** | Nothing changes without explicit approve/reject per individual change. |
| **Full reversibility** | Version history with content hashes. Outdated documents can be restored to original folder. |
| **AI context isolation** | Outdated documents have all AI caches cleared so AI never references stale information. |
| **Minimal changes** | AI instructed to make the smallest possible edit. If existing text doesn't contradict, no change proposed. |
| **Reverse-order application** | Changes applied from bottom to top of document to preserve string positions. |

---

## How Both Pipelines Connect

When a document is uploaded, the user can leverage **either or both** pipelines:

```
                    New Document Uploaded
                           |
              +------------+------------+
              |                         |
              v                         v
     Pipeline 1: Outdating      Pipeline 2: Control
     (Document Lifecycle)       (Content Updates)
              |                         |
              v                         v
     Find & retire old docs     Find & edit related docs
     Move to /Outdated          Propose surgical changes
     Clear AI caches            User reviews & approves
     Link old -> new            Apply with version history
              |                         |
              +------------+------------+
                           |
                           v
              Workspace documents are now:
              - Old versions filed away
              - Existing docs updated with new facts
              - Full audit trail maintained
              - AI only references current info
```

### Pipeline 1 (Outdating) answers: "Which documents does this new file REPLACE?"
### Pipeline 2 (Control) answers: "Which documents need their CONTENT UPDATED based on new facts?"

Together they form a complete document intelligence system: new information comes in, old documents get filed away, and existing documents get their content surgically updated with tracked, evidence-based, user-approved changes.

---

## UI Component Tree

```
DocumentUploader.jsx
├── File picker / drag-drop zone
├── Update Mode toggle
├── RelatedDocumentsSuggestionPanel.jsx
│   ├── Suggestion cards with confidence scores
│   ├── Match reason badges
│   └── "Mark as Outdated" action
└── Uses: useDocumentOutdating hook

DocumentControlPanel.jsx
├── Upload step (file + assignment/task linking)
├── AnalysisProgress.jsx (progress bar during analysis)
├── Preview step
│   └── ChangePreviewCard.jsx (per affected document)
│       ├── ChangeDiffView.jsx (word-level red/green diff)
│       ├── ConfidenceBadge.jsx (color-coded score)
│       ├── ChangeEditModal.jsx (edit proposed text)
│       └── ValidationPopover (8-point checklist)
├── Apply step (progress)
├── Complete step (success summary)
└── Uses: useDocumentControl hook

DocumentRestoreDialog.jsx
├── Restore outdated documents
└── Uses: useDocumentOutdating hook

OutdatedDocumentBadge.jsx
├── Tooltip: when, who, why, replacement link, original folder
└── Also exports: OutdatedIndicator (icon-only inline variant for lists/tables)
```

---

## Performance Constraints

| Limit | Value | Purpose |
|-------|-------|---------|
| Content extraction | 10,000 chars | Manageable size for AI analysis |
| Search results per query | 10 | Prevent excessive matching |
| Top matched documents | 10 | Focus on most relevant |
| Facts used for queries | First 5 | Targeted search, not exhaustive |
| Stored extracted text | 50,000 chars | Balance between completeness and storage |
| UI preview text | 1,000 chars | Readable in interface |
| Max file size | 100 MB | Upload limit |
