# Proflow Dual AI Debate System - Deep Analysis

## Overview

The Dual AI Debate system pits two AI models — an **Analyst** (GPT-5.2) and a **Critic** (Claude Opus 4.5) — against each other in structured, multi-round debate. They argue, agree, disagree, and converge toward a synthesized conclusion. The system tracks consensus in real-time and remembers insights for future debates via persistent semantic memory.

---

## Two Debate Systems + One Collaboration System

### 1. General Debate (DebateHub page)
- Debate any topic with optional project/assignment/GitHub context
- Entry: `/Debate` route
- Context options: None, Project, Assignment, GitHub Repository

### 2. GitHub Debate (GitHubHub page)
- Repository-focused debate with deep code analysis
- Entry: GitHubHub → Debate tab (requires repo selection)
- Uses GitHub-specific entities (`GitHubDebateSession`, `GitHubDebateMessage`)

### 3. Dual-AI Collaboration (GitHubHub page - separate system)
- Gemini + Claude work in **parallel** (not sequential debate)
- Cross-pollination: each AI sees the other's response
- Generates unified artifacts
- Entry: GitHubHub → AI Collaboration tab

---

## The Two AI Roles

| Role | Model | Purpose | Color |
|------|-------|---------|-------|
| **Analyst** | GPT-5.2 (OpenAI) | Provides thorough, well-reasoned analysis. Goes first each round. References verified context. | Blue (#3B82F6) |
| **Critic** | Claude Opus 4.5 (Anthropic) | Critically evaluates the Analyst's claims. Verifies against context. Identifies gaps and alternative interpretations. Provides structured agreement assessment. | Purple (#8B5CF6) |

---

## Complete Debate Flow

```
User navigates to /Debate (DebateHub) or Debate tab in GitHubHub
        |
        v
SELECT CONTEXT (ContextSelector component)
  Options: None (general) | Project | Assignment | GitHub Repository
  Each loads different context data for the AIs to reference
        |
        v
USER ENTERS QUESTION + clicks "Start Debate"
        |
        v
startSession() - useDebateSession hook
  - Sets status = 'loading'
  - Loads context data based on type
  - Creates DebateSession record in database
  - Auto-triggers first round after 500ms
        |
        v
=== ROUND 1 (of max 5) ===

  ANALYST'S TURN:
    - buildContextPrompt() creates full context string
    - System prompt injected with rules:
      * "Use VERIFIED context as truth"
      * "Don't re-debate already agreed points"
      * "Never hallucinate or assume"
    - invokeAI() called with analyst prompt + context
    - Response saved as DebateMessage to database
    - Message added to running context
        |
        v
  CRITIC'S TURN:
    - Same context enrichment process
    - Critic explicitly formats response as:

      ## Agreement Assessment
      ### Points I AGREE with:
      - Point 1 (with reasoning)
      - Point 2

      ### Points I DISAGREE with:
      - Point 3 (with counter-argument)

      ### Points that are UNVERIFIABLE:
      - Point 4 (insufficient evidence)

      Overall agreement level: Strong/Moderate/Weak

    - extractAgreementInfo() parses this structured format
    - updateAgreedPoints() + updateContestedPoints() update context
    - Response saved as DebateMessage to database
        |
        v
  POST-ROUND PROCESSING:
    - smartSummarize() if > 8 messages (condenses older ones, keeps recent 6)
    - calculateConsensusScore()
    - hasReachedConsensus() check
        |
        v
  CONSENSUS CHECK:
    Score = (agreedPoints / (agreedPoints + openContestedPoints)) * 100

    >= 85% AND zero open contested points?
      YES -> Status = 'consensus' -> Extract & save insights -> Generate final response
      NO  -> Status = 'paused' -> User can click "Continue" for next round
        |
        v
=== ROUNDS 2-5 (same flow, building on previous context) ===
  - Each round: Analyst refines based on Critic feedback
  - Critic re-evaluates with updated agreement assessment
  - Agreed points accumulate, contested points get resolved
  - Context auto-summarized to stay within token limits
        |
        v
DEBATE ENDS when:
  - Consensus reached (score >= 85%, no open contested points)
  - Max 5 rounds reached
  - User clicks "Stop"
        |
        v
FINAL RESPONSE GENERATION
  - Uses Claude Opus 4.5 as synthesizer
  - Prompt: "Synthesize the results of this dual-AI debate"
  - Input: Full debate history + all agreed points
  - Output: Balanced, comprehensive synthesis
        |
        v
USER POST-DEBATE OPTIONS:
  - Copy Response -> clipboard
  - Save to Project -> creates Note entity in selected project
  - Ask New Question -> resets session
```

---

## State Machine

```
idle
  | (user submits question)
  v
loading (preparing context, creating session)
  | (context loaded, session created)
  v
debating (AI thinking/generating response)
  | (round completes, checking consensus)
  v
paused (user can continue or stop)
  | (user clicks continue)
  v
debating
  | (reaches consensus >= 85%)
  v
consensus (debate complete, can save)
  | OR
max_rounds (5 rounds reached, generates final response anyway)
  |
[stopped] (if user clicks stop button)
[error] (if any operation fails)
```

---

## Context Loading by Type

### None (General Topic)
- No special context loaded
- Simple debate on user's question
- No past insights retrieved

### Project
- Project name, description, goals, status
- Up to 10 tasks (with status, priority)
- Related documents
- Project notes
- Past debate insights (semantic search)
- Established facts from previous debates

### Assignment
- Assignment name, description, status, priority
- Tasks linked to assignment
- Related documents
- Past debate insights
- Established facts

### GitHub Repository
1. **Repository Memory** (HIGHEST PRIORITY if available)
   - Deep analysis from semantic chunking
   - `accumulated_context` field contains verified knowledge
   - Marked as "VERIFIED KNOWLEDGE" in prompts
2. **GitHub Data** (if memory not available)
   - README content (truncated to 1000 chars)
   - File structure (top 50 files)
   - Primary languages (top 5)
   - Open issues (top 5 with titles)
   - Open PRs (top 5 with titles)
3. **Past Debate Insights**
   - Semantic search with 0.7 similarity threshold
   - Limit: 10 insights
4. **Established High-Confidence Facts**
   - `agreed_by_both_ais = true`
   - Confidence >= 0.85
   - Pre-populate agreedPoints

---

## Consensus System

### Calculation

```javascript
consensusScore = (agreedPoints / (agreedPoints + openContestedPoints)) × 100

hasReachedConsensus = consensusScore >= 85 AND openContestedPoints === 0
```

### Edge Cases
| Scenario | Score | Result |
|----------|-------|--------|
| No points yet | 0 | Continue debating |
| Only contested points | 0 | Continue debating |
| Only agreed points | 100 | Consensus reached |
| Mix, score < 85% | Calculated | Continue debating |
| Max rounds reached (any score) | Calculated | Generates final response anyway |

### ConsensusIndicator Component
- Visual progress bar showing consensus percentage in real-time
- Updates after each Critic response
- Color-coded: red (low) → yellow (moderate) → green (high)

---

## Agreement Extraction from Critic Responses

The system parses the Critic's structured response using regex patterns:

```
Search for:
- "## Agreement Assessment" section
- "Points I AGREE with" -> agreedPoints[]
- "Points I DISAGREE with" -> contestedPoints[]
- "Points that are UNVERIFIABLE" -> contestedPoints with status='unverifiable'
- "Overall agreement level: [Strong|Moderate|Weak]"

Extracted as structured objects:
  { point: string, round: number, confidence: number }
```

---

## Smart Context Summarization

When messages exceed 8, the system prevents token overflow:

1. Keep the **last 6 messages** in full detail
2. Pass older messages to LLM summarizer
3. Extract: agreed points, contested points, decisions, key findings, narrative summary
4. Merge with existing context
5. Truncate if exceeds 4,000 characters

This lets debates run multiple rounds without losing important context or hitting token limits.

---

## Debate Memory (Persistent Knowledge Base)

The system **remembers insights** across sessions so future debates build on past knowledge.

### After a Debate Completes

```
extractInsightsFromDebate(context)
  - Agreed points -> insights with confidence 0.9
  - Key findings -> insights with confidence 0.8
  - Decisions -> insights with confidence 0.85
        |
        v
saveDebateInsights() (api/debateMemory.js)
  - Generates OpenAI embeddings (text-embedding-3-small) for each insight
  - Stores in debate_insights table:
    {
      insight_text,
      confidence_score,
      agreed_by_both_ais: true/false,
      context_type: 'github' | 'project' | 'assignment' | 'none',
      source_session_id,
      embedding (pgvector for semantic search),
      times_retrieved: 0,
      last_retrieved_at: null
    }
  - Bulk insert via db.entities.DebateInsight.bulkCreate()
```

### Before a New Debate on the Same Entity

```
findRelevantInsights(query, entityId)
  - Generate embedding for user's new question (OpenAI)
  - Semantic search via match_debate_insights RPC (pgvector)
  - Returns insights with similarity > 0.7 threshold
  - Updates retrieval stats atomically
        |
        v
getEstablishedInsights(entityId, minConfidence=0.85)
  - Retrieves high-confidence facts both AIs agreed on
  - Pre-populates agreedPoints (so they don't re-debate settled facts)
  - Included in context as "Established Facts" section
```

**Result**: Each debate on the same project/repo/assignment starts smarter than the last. Settled facts are never re-debated.

### Semantic Search Pipeline
```
User's new question
  -> Generate embedding (OpenAI text-embedding-3-small)
  -> match_debate_insights RPC (pgvector cosine similarity)
  -> Filter: similarity > 0.7
  -> Return top 10 most relevant past insights
  -> Fallback: text-based search if embeddings unavailable
```

---

## Saving Debate Results

### Save to Project

```
User clicks "Save to Project"
        |
        v
Select target project from dropdown
        |
        v
handleSave() in DebateControls:
  1. Update DebateSession:
     {
       project_id: selectedProjectId,
       final_response: responseContent,
       saved_to_project_at: new Date().toISOString()
     }

  2. Create Note entity:
     {
       workspace_id,
       project_id,
       title: "{contextLabel}: {first 50 chars of query}...",
       content: HTML-formatted final response,
       tags: ['ai-debate', contextType],
       color: '#8B5CF6' (purple),
       created_by: user email
     }
        |
        v
Note appears in project dashboard
```

### Copy Response
- Copies the final synthesized response to clipboard
- Toast notification confirms copy

---

## Critical AI Rules (System Prompts)

Both Analyst and Critic are instructed with strict rules:

### 1. Verified Knowledge Priority
- "If the context shows VERIFIED knowledge from repository memory, USE IT as truth"
- "Never hallucinate or assume about information not in your context"

### 2. Agreement Respect
- "If the context shows 'Already Agreed' points, DO NOT re-debate them"
- "If you see 'Key Decisions Made', acknowledge they're settled"

### 3. Fallback Rule
- "If asked about something not covered, say 'I don't have that information'"

### 4. Critic-Specific Rules
- "Use the provided context to verify the Analyst's claims"
- "Call out any hallucinations or unsupported claims"
- "Include explicit agreement assessment at end of every response"

---

## GitHub-Specific Debate Differences

The `features/github/debate/` folder contains GitHub-specialized versions:

| Aspect | General Debate | GitHub Debate |
|--------|---------------|---------------|
| Session entity | `DebateSession` | `GitHubDebateSession` |
| Message entity | `DebateMessage` | `GitHubDebateMessage` |
| Context | User-selected (project/assignment/none) | Pre-selected repository |
| Context loading | Via contextManager.js | GitHub API + repository memory |
| AI models | Same (GPT-5.2 + Claude Opus 4.5) | Same |
| Orchestration | Same logic | Same logic |

---

## Dual-AI Collaboration (Separate System)

`useDualAICollaboration.js` in GitHubHub is **NOT a debate** — it's parallel collaboration:

```
IDLE
  -> startParallelThinking()
PARALLEL_THINKING
  Both AIs respond simultaneously (Promise.allSettled):
    Gemini 3 Pro ("Rapid Architect") - structure, scalability, code
    Claude Opus 4.5 ("Deep Reviewer") - edge cases, security, vulnerabilities
  -> both responses received
REVIEW_READY
  -> synthesizeResponses() (cross-pollination: each AI sees other's response)
SYNTHESIZING
  -> generateArtifact()
ARTIFACT_READY
  User can save artifact as workspace document
```

### Key Differences from Debate

| Aspect | Debate | Collaboration |
|--------|--------|--------------|
| Execution | Sequential (turn-by-turn) | Parallel (simultaneous) |
| Models | GPT-5.2 + Claude Opus 4.5 | Gemini 3 Pro + Claude Opus 4.5 |
| Interaction | Argue and converge | Cross-pollinate and synthesize |
| Consensus | Tracked with scoring | No consensus tracking |
| Output | Synthesized final response | Unified artifact document |
| Memory | Persistent debate insights | No persistent memory |

---

## Database Entities

| Entity | Purpose |
|--------|---------|
| `DebateSession` | Session record: query, status, rounds, consensus score, context type, project/assignment/repo links, final response |
| `DebateMessage` | Individual message: session_id, round_number, model_role (analyst/critic), content, key_points, agrees_with_previous |
| `GitHubDebateSession` | GitHub-specific session with repository_id |
| `GitHubDebateMessage` | GitHub-specific message |
| `DebateInsight` | Persistent insight: text, confidence, agreed_by_both_ais, embedding (pgvector), retrieval stats |
| `Note` | Saved debate results (created when user saves to project) |

---

## Key Files

| File | Role |
|------|------|
| `pages/DebateHub.jsx` | Main debate page with context selector |
| `features/debate/useDebateSession.js` | State machine hook (idle->loading->debating->paused->consensus) |
| `features/debate/debateOrchestrator.js` | Round orchestration: analyst turn -> critic turn -> summarize -> consensus check |
| `features/debate/contextManager.js` | Loads context by type (project/assignment/github/none) |
| `features/debate/DebateChatInterface.jsx` | Main debate chat UI |
| `features/debate/DebateMessage.jsx` | Individual message card (blue for analyst, purple for critic) |
| `features/debate/DebateControls.jsx` | Stop/Continue/Copy/Save buttons |
| `features/debate/ConsensusIndicator.jsx` | Real-time consensus percentage visualization |
| `features/debate/ContextSelector.jsx` | Context type picker |
| `api/debateMemory.js` | Insight persistence with pgvector semantic search |
| `features/github/debate/*` | GitHub-specific debate variants |
| `features/github/useDualAICollaboration.js` | Parallel Gemini+Claude collaboration (separate from debate) |
| `api/geminiClient.js` | Google Gemini 3 Pro API wrapper |
| `api/anthropicClient.js` | Anthropic Claude API wrapper |

---

## AI Models Used

```
Debate System:
  Analyst:     GPT-5.2              (OpenAI)
  Critic:      Claude Opus 4.5      (Anthropic) - claude-opus-4-5-20251101
  Synthesizer: Claude Opus 4.5      (Anthropic) - for final response

Dual-AI Collaboration:
  Architect:   Gemini 3 Pro         (Google) - gemini-3.0-pro-001
  Reviewer:    Claude Opus 4.5      (Anthropic) - claude-opus-4-5-20251101

Embeddings (Debate Memory):
  Model:       text-embedding-3-small (OpenAI) - for semantic search
```

---

## Component Hierarchy

```
DebateHub (page)
  +-- ContextSelector (select context type + entity)
  +-- DebateChatInterface (main UI)
      +-- ConsensusIndicator (shows agreement %)
      +-- DebateMessage x N (individual message cards)
      |     Blue card = Analyst, Purple card = Critic
      +-- DebateControls (stop/continue/copy/save buttons)
      +-- useDebateSession (state management)
          +-- debateOrchestrator.runDebateRound()
          +-- contextManager.loadContext()
          +-- debateMemory.saveDebateInsights()
          +-- debateMemory.findRelevantInsights()

GitHubHub (page)
  +-- Tabs:
      +-- Repositories: RepositoryList
      +-- AI Collaboration: DualAIChatInterface
      |     +-- useDualAICollaboration hook
      |         +-- invokeGemini (parallel)
      |         +-- invokeLLM/Claude (parallel)
      +-- Debate: DebateChatInterface
            +-- Uses GitHub-specific useDebateSession
```

---

## Error Handling

| Scenario | Handling |
|----------|---------|
| AI API failure | Status set to 'error', error message displayed, user can retry |
| Failed GitHub API calls | Fall back to basic context (no repo memory) |
| Missing repository memory | Use GitHub data only (README, file structure, etc.) |
| Embedding generation failure | Save insights without embeddings, use text search fallback |
| Semantic search failure | Fallback to text-based search |
| Stop button clicked | Set shouldStopRef=true, pause after current turn completes |
| Summarization failure | Continue without summarization (may hit token limits) |
| Database save failure | Log warning but continue debate |

---

## Complete Data Flow

```
USER INPUT (Query + Context Selection)
  |
  v
startSession()
  |-- loadContext(type, data) [GitHub/Project/Assignment/None]
  |-- findRelevantInsights() [past debate memory]
  |-- getEstablishedInsights() [settled facts]
  |-- Create DebateSession in DB
  +-- setStatus('loading') -> 'debating'

runNextRound() Loop (Repeats until consensus or max_rounds):
  |
  |-- Analyst Turn:
  |   |-- buildContextPrompt(context + established facts)
  |   |-- invokeAI(analyst system prompt + context)
  |   |-- addMessageToContext(response)
  |   +-- Save DebateMessage to DB
  |
  |-- Critic Turn:
  |   |-- buildContextPrompt(context + analyst's response)
  |   |-- invokeAI(critic system prompt + context)
  |   |-- extractAgreementInfo(response)
  |   |-- updateAgreedPoints() + updateContestedPoints()
  |   +-- Save DebateMessage to DB
  |
  |-- smartSummarize() [if > 8 messages]
  |-- calculateConsensusScore()
  |-- hasReachedConsensus()
  |
  +-- If Consensus Reached or Max Rounds:
      |-- extractInsightsFromDebate()
      |-- saveDebateInsights() [with pgvector embeddings]
      |-- generateFinalResponse() [Claude Opus 4.5 synthesis]
      +-- setStatus('consensus' or 'max_rounds')

User Post-Debate Actions:
  |-- Copy Response -> clipboard
  |-- Save to Project -> creates Note in project
  +-- Ask New Question -> resetSession()
```
