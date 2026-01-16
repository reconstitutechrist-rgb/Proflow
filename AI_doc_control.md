# AI Assistant Document Control Feature - Design Document

## Overview

This feature adds intelligent document control capabilities to the Project Dashboard AI Assistant. When a user uploads a document, the AI analyzes it and suggests specific edits to existing project documents, rather than replacing entire documents.

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI ASSISTANT DOCUMENT CONTROL                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: UPLOAD                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  📎 Upload Document                                                     │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Drag & drop or click to upload                                   │  │ │
│  │  │  Supports: PDF, DOCX, TXT, MD                                     │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                         │ │
│  │  Auto-link to: Website Redesign Q1 (current project)                   │ │
│  │  [ ] Also link to assignment: [Select Assignment ▼]                    │ │
│  │  [ ] Also link to task: [Select Task ▼]                                │ │
│  │                                                                         │ │
│  │  [Analyze Document]                                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                    ↓                                         │
│                                                                              │
│  STEP 2: AI ANALYSIS (Loading State)                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  🔍 Analyzing document...                                               │ │
│  │  ━━━━━━━━━━━━━━━━━━━━░░░░░  75%                                        │ │
│  │                                                                         │ │
│  │  ✓ Extracted content from "Q1_Budget_Update.pdf"                       │ │
│  │  ✓ Found 4 related documents in project                                 │ │
│  │  ◌ Identifying sections to update...                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                    ↓                                         │
│                                                                              │
│  STEP 3: PREVIEW CHANGES                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  📋 Proposed Changes                                     [Approve All]  │ │
│  │                                                                         │ │
│  │  Found 3 documents with sections to update:                             │ │
│  │                                                                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │  📄 Project Brief.docx                              [Expand ▼]  │    │ │
│  │  │  2 sections to update • 87% confidence                          │    │ │
│  │  │                                                                  │    │ │
│  │  │  Section: "Budget Overview" (Page 3)                            │    │ │
│  │  │  ┌────────────────────────────────────────────────────────────┐│    │ │
│  │  │  │ CURRENT:                                                    ││    │ │
│  │  │  │ "Total budget: $150,000 allocated across Q1-Q2"            ││    │ │
│  │  │  │                                                             ││    │ │
│  │  │  │ PROPOSED:                                                   ││    │ │
│  │  │  │ "Total budget: $175,000 allocated across Q1-Q2             ││    │ │
│  │  │  │  (increased from $150,000 per board approval 01/10)"       ││    │ │
│  │  │  └────────────────────────────────────────────────────────────┘│    │ │
│  │  │                                                                  │    │ │
│  │  │  [✓ Approve]  [✕ Reject]  [✏️ Edit]                            │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │  📄 Technical Spec.docx                             [Expand ▼]  │    │ │
│  │  │  1 section to update • 72% confidence                           │    │ │
│  │  │  ...                                                             │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                         │ │
│  │  ─────────────────────────────────────────────────────────────────     │ │
│  │  Summary: 3 documents, 5 sections, estimated 2 min to apply            │ │
│  │                                                                         │ │
│  │  [Cancel]                              [Apply 5 Approved Changes]      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                    ↓                                         │
│                                                                              │
│  STEP 4: APPLY CHANGES                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  ✅ Changes Applied Successfully                                        │ │
│  │                                                                         │ │
│  │  Updated 3 documents:                                                   │ │
│  │  • Project Brief.docx - 2 sections updated                              │ │
│  │  • Technical Spec.docx - 1 section updated                              │ │
│  │  • Timeline.docx - 2 sections updated                                   │ │
│  │                                                                         │ │
│  │  📎 "Q1_Budget_Update.pdf" saved to project documents                  │ │
│  │                                                                         │ │
│  │  [View Updated Documents]  [Upload Another]  [Done]                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Components

### 1. Upload Section (Collapsed State)

```
┌─────────────────────────────────────────────────────────────┐
│  📎 Upload document to update project files    [Upload ▲]   │
└─────────────────────────────────────────────────────────────┘
```

### 2. Upload Section (Expanded State)

```
┌─────────────────────────────────────────────────────────────┐
│  📎 Document Control                           [Collapse ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │                                                        │  │
│  │        📄 Drop file here or click to browse           │  │
│  │           PDF, DOCX, TXT, MD (max 10MB)               │  │
│  │                                                        │  │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                                              │
│  Link to:                                                    │
│  ✓ Project: Website Redesign Q1 (auto)                      │
│  ☐ Assignment: [Select... ▼]                                │
│  ☐ Task: [Select... ▼]                                      │
│                                                              │
│  [Cancel]                              [Analyze & Compare]  │
└─────────────────────────────────────────────────────────────┘
```

### 3. Change Preview Card (Collapsed)

```
┌─────────────────────────────────────────────────────────────┐
│  📄 Project Brief.docx                                      │
│  2 sections to update • 87% match                [Expand ▼] │
│                                                              │
│  ○ Budget Overview (Page 3)                                 │
│  ○ Timeline Updates (Page 5)                                │
│                                                              │
│  [✓ Approve All]  [✕ Reject All]                           │
└─────────────────────────────────────────────────────────────┘
```

### 4. Change Preview Card (Expanded with Diff)

```
┌─────────────────────────────────────────────────────────────┐
│  📄 Project Brief.docx                        [Collapse ▲]  │
│  2 sections to update • 87% match                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SECTION 1: Budget Overview (Page 3)                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ - Total budget: $150,000 allocated across Q1-Q2         ││
│  │ + Total budget: $175,000 allocated across Q1-Q2         ││
│  │ +   (increased from $150,000 per board approval 01/10)  ││
│  └─────────────────────────────────────────────────────────┘│
│  [✓ Approve]  [✕ Reject]  [✏️ Edit]                        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  SECTION 2: Timeline Updates (Page 5)                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ - Phase 2 deadline: March 15, 2025                      ││
│  │ + Phase 2 deadline: March 30, 2025                      ││
│  │ +   (extended 2 weeks per stakeholder request)          ││
│  └─────────────────────────────────────────────────────────┘│
│  [✓ Approve]  [✕ Reject]  [✏️ Edit]                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5. Edit Change Modal

```
┌─────────────────────────────────────────────────────────────┐
│  ✏️ Edit Proposed Change                              [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Document: Project Brief.docx                               │
│  Section: Budget Overview (Page 3)                          │
│                                                              │
│  Original Text:                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Total budget: $150,000 allocated across Q1-Q2           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  New Text (editable):                                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Total budget: $175,000 allocated across Q1-Q2           ││
│  │ (increased from $150,000 per board approval 01/10)      ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  [Cancel]                                   [Save & Approve] │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Proposed Change Object

```javascript
{
  id: 'change_123',
  documentId: 'doc_456',
  documentTitle: 'Project Brief.docx',
  sectionName: 'Budget Overview',
  pageNumber: 3,
  confidenceScore: 0.87,

  originalText: 'Total budget: $150,000 allocated across Q1-Q2',
  proposedText: 'Total budget: $175,000 allocated across Q1-Q2\n(increased from $150,000 per board approval 01/10)',

  // Location info for surgical edit
  startIndex: 1245,
  endIndex: 1298,

  status: 'pending', // 'pending' | 'approved' | 'rejected' | 'applied'

  // User edits (if they modify the proposed text)
  userEditedText: null,
}
```

### Analysis Result Object

```javascript
{
  uploadedDocument: {
    id: 'upload_789',
    fileName: 'Q1_Budget_Update.pdf',
    fileSize: 245000,
    extractedContent: '...',
    linkedToProject: 'proj_123',
    linkedToAssignment: null,
    linkedToTask: null,
  },

  affectedDocuments: [
    {
      documentId: 'doc_456',
      documentTitle: 'Project Brief.docx',
      totalChanges: 2,
      overallConfidence: 0.87,
      changes: [ /* array of Proposed Change objects */ ]
    },
    // ... more documents
  ],

  summary: {
    totalDocuments: 3,
    totalChanges: 5,
    estimatedTime: '2 min',
  }
}
```

---

## Technical Implementation

### 1. AI Analysis Function

```javascript
async function analyzeDocumentForUpdates(uploadedContent, projectDocuments) {
  // Call RAG helper with special intent
  const result = await ragHelper({
    endpoint: 'analyzeDocumentUpdates',
    uploadedContent: uploadedContent,
    projectDocuments: projectDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content || doc.extractedText,
    })),
  });

  return result.proposedChanges;
}
```

### 2. Apply Changes Function

```javascript
async function applyDocumentChanges(approvedChanges) {
  const results = [];

  for (const change of approvedChanges) {
    const document = await db.entities.Document.get(change.documentId);

    // Surgical edit - replace only the specific section
    const updatedContent =
      document.content.substring(0, change.startIndex) +
      (change.userEditedText || change.proposedText) +
      document.content.substring(change.endIndex);

    // Update with version history
    await db.entities.Document.update(change.documentId, {
      content: updatedContent,
      version: incrementVersion(document.version),
      version_history: [
        ...document.version_history,
        {
          version: document.version,
          content: document.content,
          change_notes: `AI-assisted update: ${change.sectionName}`,
          created_date: new Date().toISOString(),
        },
      ],
    });

    results.push({ documentId: change.documentId, success: true });
  }

  return results;
}
```

---

## State Management

```javascript
const [documentControlState, setDocumentControlState] = useState({
  // UI State
  isExpanded: false,
  currentStep: 'upload', // 'upload' | 'analyzing' | 'preview' | 'applying' | 'complete'

  // Upload State
  uploadedFile: null,
  linkedAssignment: null,
  linkedTask: null,

  // Analysis State
  analysisProgress: 0,
  analysisStatus: '',

  // Changes State
  proposedChanges: [],
  expandedDocuments: new Set(),

  // Results State
  appliedChanges: [],
  savedDocumentId: null,
});
```

---

## Edge Cases & Error Handling

1. **No matching documents found**
   - Show message: "No related documents found. The uploaded document will be saved to the project."
   - Allow user to proceed with just saving the document

2. **Low confidence matches**
   - Show warning badge for matches < 50% confidence
   - Require explicit approval (no "Approve All" for low confidence)

3. **Document is locked/being edited**
   - Show warning that document is in use
   - Queue changes for later or skip

4. **Large documents**
   - Show progress for extraction
   - Paginate changes if > 10 sections

5. **User cancels mid-process**
   - Confirm cancellation
   - Clean up any partial state

6. **AI fails to extract/analyze**
   - Show error message
   - Offer retry or manual upload without analysis

---

## Future Enhancements (Phase 2)

1. **Batch upload** - Upload multiple documents at once
2. **Change templates** - Save common change patterns
3. **Undo applied changes** - Revert individual changes
4. **Scheduled updates** - Apply changes at a specific time
5. **Approval workflow** - Require manager approval for certain documents
6. **Change history** - View all AI-assisted changes over time

---

## Confirmed Decisions

1. ✅ **Uploaded document storage**: Always saved to `/Miscellaneous` folder, even if user rejects all proposed changes. The uploaded document is a source/reference that may need to be reviewed later if AI suggestions were incorrect.

2. ✅ **Edit capability**: User can only edit the proposed new text (not the original text being replaced). The original text is just shown for reference.

3. ✅ **Reject All**: Include "Reject All" option at the document level to reject all changes for one document at once.

4. ⏸️ **Notifications**: Deferred to Phase 2 - not included in initial implementation.

---

## AI Autonomy & Precision Specification

### Core Principles

The AI must operate with **surgical precision** - modifying only what is explicitly supported by the uploaded document, with zero assumptions or extrapolations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI BEHAVIOR HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. EVIDENCE-BASED ONLY                                                      │
│     └─ Every proposed change MUST trace directly to content in uploaded doc │
│                                                                              │
│  2. SCOPE CONTAINMENT                                                        │
│     └─ Changes limited to the exact subject matter of the uploaded doc      │
│                                                                              │
│  3. NO INFERENCE CHAINS                                                      │
│     └─ If A changes, do NOT assume B must also change                       │
│                                                                              │
│  4. CONTEXTUAL AWARENESS                                                     │
│     └─ Use project memory to understand relationships, NOT to expand scope  │
│                                                                              │
│  5. EXPLICIT > IMPLICIT                                                      │
│     └─ Only modify what is explicitly stated, never what is implied         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Deep Analysis Requirements

#### Phase 1: Content Extraction & Classification

Before any matching occurs, the AI must perform deep content analysis:

```javascript
const contentAnalysis = {
  // What is this document actually about?
  primarySubject: {
    domain: 'feature', // 'feature' | 'budget' | 'timeline' | 'technical' | 'policy' | etc.
    specificArea: 'user-authentication', // The exact feature/area
    scope: 'password-reset-flow', // The specific aspect being addressed
  },

  // What facts are being stated?
  explicitFacts: [
    {
      statement: 'Password reset now requires email + SMS verification',
      confidence: 1.0, // Directly quoted from document
      sourceLocation: 'Page 2, Paragraph 3',
      verbatimQuote: '...implementing dual-factor verification for password resets...',
    },
  ],

  // What is NOT being addressed (equally important)
  outOfScope: [
    'Login flow',
    'Registration flow',
    'Session management',
    'Other authentication features',
  ],

  // Explicit boundaries stated in document
  statedBoundaries: ['This update applies only to password reset functionality'],
};
```

#### Phase 2: Scope Boundary Enforcement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCOPE BOUNDARY RULES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  UPLOADED DOCUMENT: "Password Reset Flow Update"                            │
│                                                                              │
│  ✅ CAN MODIFY:                                                              │
│     • Sections explicitly about password reset                              │
│     • Text that directly references password reset functionality            │
│     • Technical specs for password reset API endpoints                      │
│                                                                              │
│  ❌ CANNOT MODIFY (even if seems related):                                   │
│     • Login flow documentation (different feature)                          │
│     • User registration process (different feature)                         │
│     • General authentication overview (too broad)                           │
│     • Security policies (unless password reset specifically mentioned)      │
│     • API documentation for other endpoints                                 │
│                                                                              │
│  ⚠️  REQUIRES EXPLICIT USER CONFIRMATION:                                    │
│     • Sections that mention password reset alongside other features         │
│     • Overview documents that list multiple features                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Phase 3: Change Justification Requirements

Every proposed change MUST include:

```javascript
const proposedChange = {
  id: 'change_123',
  documentId: 'doc_456',
  sectionName: 'Password Reset Flow',

  // The actual change
  originalText: 'Password reset requires email verification',
  proposedText: 'Password reset requires email + SMS verification',

  // REQUIRED: Evidence chain (no evidence = no change proposed)
  evidence: {
    // Direct quote from uploaded document that justifies this change
    sourceQuote: 'All password resets must now include SMS verification as secondary factor',
    sourceLocation: 'Uploaded doc, Page 2, Section 3.1',

    // Why this specific text was matched
    matchReason: 'exact_subject_match', // NOT 'related_topic' or 'possibly_affected'

    // Confidence breakdown
    confidence: {
      subjectMatch: 0.98, // Is this about the same subject?
      factualAlignment: 0.95, // Does the new info contradict/update the old?
      scopeContainment: 1.0, // Is this within the document's stated scope?
      overall: 0.97,
    },
  },

  // REQUIRED: Scope justification
  scopeJustification: {
    withinPrimarySubject: true,
    withinSpecificArea: true,
    withinStatedScope: true,
    crossesFeatureBoundary: false, // If true, change is NOT proposed
    requiresUserConfirmation: false,
  },

  // What this change does NOT affect (explicit non-impact statement)
  nonImpact: [
    'Login flow remains unchanged',
    'Registration process not affected',
    'Session management unchanged',
  ],
};
```

---

### Anti-Hallucination Safeguards

#### Rule 1: No Inference Chains

```
❌ PROHIBITED REASONING:
   "The password reset flow changed"
   → "Therefore login might be affected"
   → "I should check login documentation"
   → "This login text seems related, I'll suggest a change"

✅ REQUIRED REASONING:
   "The password reset flow changed"
   → "I will ONLY look for text explicitly about password reset"
   → "This section mentions password reset directly"
   → "The uploaded doc explicitly states X, which updates this text"
```

#### Rule 2: Explicit Evidence Requirement

```javascript
// Before proposing ANY change, AI must answer:
const changeValidation = {
  questions: [
    {
      question: 'Is there a direct quote in the uploaded document that supports this change?',
      required: true,
      answer: null, // Must be filled with actual quote
    },
    {
      question: 'Does this change modify ONLY the specific subject of the uploaded document?',
      required: true,
      answer: null, // Must be 'yes' to proceed
    },
    {
      question: 'Could this change affect functionality outside the uploaded document scope?',
      required: true,
      answer: null, // Must be 'no' to proceed without user confirmation
    },
    {
      question: 'Am I making any assumptions not explicitly stated in the uploaded document?',
      required: true,
      answer: null, // Must be 'no' to proceed
    },
  ],

  // If any answer is wrong, change is NOT proposed
  proceedWithChange: false,
};
```

#### Rule 3: Contextual Memory Usage Guidelines

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTEXTUAL MEMORY USAGE RULES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ USE MEMORY TO:                                                           │
│     • Understand project structure and document relationships               │
│     • Identify which documents contain relevant subject matter              │
│     • Understand terminology and naming conventions                         │
│     • Verify scope boundaries (what belongs to which feature)               │
│     • Confirm that a section is actually about the subject in question     │
│                                                                              │
│  ❌ DO NOT USE MEMORY TO:                                                    │
│     • Expand the scope of changes beyond uploaded document                  │
│     • Infer that related features should also be updated                    │
│     • Make assumptions about what "should" change                           │
│     • Fill in gaps not explicitly stated in uploaded document               │
│     • Suggest "improvements" beyond what was uploaded                       │
│                                                                              │
│  MEMORY PROVIDES CONTEXT, NOT PERMISSION TO EXPAND SCOPE                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Thoroughness Requirements

#### Deep Document Analysis (Not Surface-Level)

```javascript
const analysisDepth = {
  // Surface level (INSUFFICIENT)
  surfaceLevel: {
    approach: 'Keyword matching',
    example: 'Find documents containing "password"',
    problem: 'May match unrelated content, miss context',
  },

  // Deep level (REQUIRED)
  deepLevel: {
    approach: 'Semantic understanding + scope validation',
    steps: [
      {
        step: 1,
        name: 'Subject Identification',
        action: 'Determine the exact subject, feature, and scope of uploaded document',
        output: 'Precise scope definition with boundaries',
      },
      {
        step: 2,
        name: 'Fact Extraction',
        action: 'Extract every factual statement from uploaded document',
        output: 'List of explicit facts with source locations',
      },
      {
        step: 3,
        name: 'Document Discovery',
        action: 'Find project documents that address the EXACT same subject',
        output: 'Candidate documents filtered by subject match',
      },
      {
        step: 4,
        name: 'Section-Level Analysis',
        action: 'Within each candidate document, identify sections about exact subject',
        output: 'Specific sections (not whole documents) for review',
      },
      {
        step: 5,
        name: 'Text Comparison',
        action: 'Compare existing text against extracted facts',
        output: 'Specific text that contradicts or is outdated by new facts',
      },
      {
        step: 6,
        name: 'Change Generation',
        action: 'Generate minimal change to align existing text with new facts',
        output: 'Proposed changes with full evidence chain',
      },
      {
        step: 7,
        name: 'Scope Verification',
        action: 'Verify each change stays within stated scope',
        output: 'Final validated changes or flagged for user review',
      },
    ],
  },
};
```

#### Minimal Change Principle

```
The AI should modify the MINIMUM amount of text necessary to reflect the update.

EXAMPLE:
  Uploaded Document States: "Budget increased from $150K to $175K"

  Existing Text:
  "The project has a total budget of $150,000, allocated across Q1 and Q2.
   This budget covers development, design, and testing phases. The finance
   team approved this allocation in December."

  ❌ WRONG (Over-modification):
  "The project has a total budget of $175,000, allocated across Q1 and Q2.
   This budget covers development, design, and testing phases. The finance
   team approved this increased allocation in January."

  ✅ CORRECT (Minimal change):
  "The project has a total budget of $175,000 (increased from $150,000),
   allocated across Q1 and Q2. This budget covers development, design, and
   testing phases. The finance team approved this allocation in December."

  WHY: Only the budget figure was explicitly updated. The approval date and
  other details were NOT mentioned in the uploaded document, so they should
  NOT be modified.
```

---

### Integration with Existing Memory Systems

```javascript
const memoryIntegration = {
  // Pull from existing project memory
  contextSources: [
    {
      source: 'projectMemory',
      use: 'Understand project structure, features, and relationships',
      restriction: 'Read-only context, not scope expansion',
    },
    {
      source: 'documentRelationships',
      use: 'Know which documents relate to which features',
      restriction: 'For filtering candidates, not adding to change scope',
    },
    {
      source: 'featureBoundaries',
      use: 'Understand where one feature ends and another begins',
      restriction: 'For scope containment validation',
    },
    {
      source: 'terminologyMapping',
      use: 'Understand project-specific terminology',
      restriction: 'For accurate matching, not inference',
    },
  ],

  // How memory helps WITHOUT expanding scope
  memoryBenefits: {
    accurateMatching: 'Memory helps identify correct documents to search',
    scopeValidation: 'Memory helps verify changes stay within feature boundaries',
    terminologyUnderstanding: 'Memory helps interpret project-specific terms',
    relationshipAwareness: 'Memory helps understand what NOT to touch',
  },

  // What memory should NOT do
  memoryRestrictions: {
    noScopeExpansion: 'Memory cannot justify changes outside uploaded doc scope',
    noInference: 'Memory cannot be used to infer unstated changes',
    noAssumptions: 'Memory cannot fill gaps in uploaded document',
  },
};
```

---

### Quality Assurance Checklist

Before presenting ANY change to the user, the AI must verify:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRE-PROPOSAL VERIFICATION CHECKLIST                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  □ 1. EVIDENCE EXISTS                                                        │
│       Can I point to a specific quote in the uploaded document?             │
│       If NO → Do not propose change                                         │
│                                                                              │
│  □ 2. SUBJECT MATCH IS EXACT                                                 │
│       Is this section about the EXACT same subject as uploaded doc?         │
│       If NO → Do not propose change                                         │
│                                                                              │
│  □ 3. NO FEATURE BOUNDARY CROSSING                                           │
│       Does this change stay within the same feature/area?                   │
│       If NO → Do not propose change (or flag for explicit user decision)   │
│                                                                              │
│  □ 4. CHANGE IS MINIMAL                                                      │
│       Am I modifying only what is necessary to reflect the update?          │
│       If NO → Reduce change scope                                           │
│                                                                              │
│  □ 5. NO ASSUMPTIONS MADE                                                    │
│       Is every part of my proposed change explicitly supported?             │
│       If NO → Remove unsupported parts                                      │
│                                                                              │
│  □ 6. NO INFERENCE CHAINS                                                    │
│       Am I proposing this because of direct evidence, not "logic"?          │
│       If NO → Do not propose change                                         │
│                                                                              │
│  □ 7. CONFIDENCE IS HIGH                                                     │
│       Is my overall confidence > 80%?                                       │
│       If NO → Flag for user review with lower confidence indicator         │
│                                                                              │
│  □ 8. NON-IMPACT VERIFIED                                                    │
│       Have I confirmed what this change does NOT affect?                    │
│       If NO → Document non-impact before proposing                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Error Prevention: Common Mistakes to Avoid

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMMON AI MISTAKES TO AVOID                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MISTAKE 1: "Helpful" Over-Modification                                      │
│  ─────────────────────────────────────────                                   │
│  Symptom: AI suggests changes to "related" content not in uploaded doc      │
│  Example: User uploads budget update, AI also updates timeline              │
│  Prevention: ONLY modify what is EXPLICITLY stated in uploaded document    │
│                                                                              │
│  MISTAKE 2: Logical Inference                                                │
│  ─────────────────────────────────────────                                   │
│  Symptom: AI reasons "if X changed, Y probably changed too"                 │
│  Example: "Since auth flow changed, session handling might need update"     │
│  Prevention: No inference chains - require explicit evidence for EVERY change│
│                                                                              │
│  MISTAKE 3: Context Bleeding                                                 │
│  ─────────────────────────────────────────                                   │
│  Symptom: AI uses project memory to justify scope expansion                 │
│  Example: "Memory shows these features are related, so I'll update both"   │
│  Prevention: Memory is for UNDERSTANDING context, not EXPANDING scope      │
│                                                                              │
│  MISTAKE 4: Keyword-Based Matching                                           │
│  ─────────────────────────────────────────                                   │
│  Symptom: AI matches based on shared keywords, not actual subject           │
│  Example: Matching "user authentication" to "user preferences" (both "user")│
│  Prevention: Deep semantic analysis of actual subject matter               │
│                                                                              │
│  MISTAKE 5: Completeness Assumptions                                         │
│  ─────────────────────────────────────────                                   │
│  Symptom: AI assumes uploaded doc covers all changes that should be made   │
│  Example: "This must be everything, so I'll update all related docs"       │
│  Prevention: Uploaded doc defines CEILING of changes, not floor            │
│                                                                              │
│  MISTAKE 6: Improving Beyond Scope                                           │
│  ─────────────────────────────────────────                                   │
│  Symptom: AI "improves" text while making updates                           │
│  Example: Rewriting sentences for clarity while changing a number           │
│  Prevention: Minimal changes only - preserve original text structure        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Confidence Scoring Model

```javascript
const confidenceModel = {
  // Each factor contributes to overall confidence
  factors: {
    subjectExactMatch: {
      weight: 0.3,
      description: 'Is this section about the EXACT same subject?',
      scoring: {
        1.0: 'Exact same subject (e.g., "Password Reset" → "Password Reset")',
        0.7: 'Same feature, different aspect (e.g., "Password Reset" → "Authentication Overview")',
        0.3: 'Related but different (e.g., "Password Reset" → "Login Flow")',
        0.0: 'Different subject entirely',
      },
    },

    evidenceDirectness: {
      weight: 0.3,
      description: 'How directly does uploaded doc support this change?',
      scoring: {
        1.0: 'Direct quote explicitly states this change',
        0.7: 'Strong implication with clear supporting text',
        0.3: 'Weak implication requiring interpretation',
        0.0: 'No supporting evidence in uploaded document',
      },
    },

    scopeContainment: {
      weight: 0.25,
      description: 'Does this change stay within stated boundaries?',
      scoring: {
        1.0: 'Fully within stated scope of uploaded document',
        0.5: 'Partially within scope, some ambiguity',
        0.0: 'Outside stated scope',
      },
    },

    changeMinimality: {
      weight: 0.15,
      description: 'Is this the minimum change necessary?',
      scoring: {
        1.0: 'Only changes what is explicitly outdated',
        0.7: 'Minor additional changes for coherence',
        0.3: 'Significant rewrites beyond necessity',
        0.0: 'Major modifications not justified by evidence',
      },
    },
  },

  // Thresholds
  thresholds: {
    autoApproveEligible: 0.9, // High confidence, minimal risk
    standardProposal: 0.7, // Normal confidence, show to user
    flaggedForReview: 0.5, // Lower confidence, highlight concerns
    doNotPropose: 0.5, // Below this, don't even suggest
  },
};
```

---

## Summary

This design provides:

- **Simplified upload** with auto-linking to project
- **Intelligent analysis** that finds related documents
- **Diff preview** showing exactly what will change
- **Flexible approval** (individual or bulk)
- **Surgical edits** that preserve document integrity
- **Version history** for all changes

Ready to implement once you confirm this matches your vision.
