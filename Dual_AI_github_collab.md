# Dual AI GitHub Collaboration Feature

## Summary
Build a "Symmetric Dual-Expert" collaboration tool where **Gemini 3 Pro** (Rapid Architect) and **Claude Opus 4.5** (Deep Thinker) work together to analyze issues, plan features, and generate comprehensive documentation with code.

---

## Feature Overview

### User Flow
1. User selects a linked GitHub repository
2. User selects a **Prompt Template** (e.g., "Coding")
3. User describes their issue/feature request
4. **Both AIs respond simultaneously** (parallel thinking)
5. User clicks **"Synthesize & Cross-Critique"** to cross-pollinate responses
6. AIs refine their analysis based on each other's input
7. When ready, an **Artifact/Document** is generated
8. User clicks **"Analyze for Completeness"** (Claude Sonnet 4.5 reviews everything)
9. User reviews, edits, and **saves to Document Library**
10. Optional: **Commit to GitHub** as .md file (creates feature branch)

---

## Architecture Decision: Strict Hook Isolation

**IMPORTANT:** We will NOT modify `features/debate/useDebateSession.js`. The Debate Hub logic is too specific (consensus rounds, voting).

Instead, we create a **dedicated** `useDualAICollaboration` hook for the "Ping-Pong" state between Gemini and Claude.

---

## Phase 1: API Layer & Configuration

### 1.1 Create Gemini API Client
**New File:** `api/geminiClient.js`

- Model: `gemini-3.0-pro-001`
- Enable `response_mime_type: 'application/json'` for structured planning
- Safety settings: `BLOCK_NONE` for coding tasks
- Environment: `VITE_GEMINI_API_KEY`

### 1.2 Update Anthropic Client
**Modify:** `api/anthropicClient.js`

- Ensure dynamic model selection between:
  - `claude-opus-4-5-20251101` (Chat/Deep Thinking)
  - `claude-sonnet-4-5-20250929` (Analysis/QA)

### 1.3 Create AI Models Config
**New File:** `config/aiModels.js`

```javascript
export const AI_MODELS = {
  ARCHITECT: { id: 'gemini-3.0-pro-001', name: 'Gemini 3 Pro', provider: 'google' },
  DEEP_THINKER: { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', provider: 'anthropic' },
  QA_REVIEWER: { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic' }
};
```

### 1.4 Update Constants
**Modify:** `config/constants.js`

```javascript
export const AI_MODELS = {
  // Legacy
  GPT4: 'gpt-4',
  GPT35: 'gpt-3.5-turbo',
  CLAUDE_3_OPUS: 'claude-3-opus',

  // Current Generation (2026)
  GEMINI_ARCHITECT: 'gemini-3.0-pro-001',
  CLAUDE_DEEP_THINKER: 'claude-opus-4-5-20251101',
  CLAUDE_QA_REVIEWER: 'claude-sonnet-4-5-20250929',
};
```

### 1.5 Update GitHub API
**Modify:** `api/github.js`

Add methods:
- `createOrUpdateFile(owner, repo, path, content, message, branch)`
- `createBranch(owner, repo, branchName, fromBranch)`
- `createPullRequest(owner, repo, title, body, head, base)`

**Safety:** Always create feature branch `feature/ai-collab-{timestamp}` instead of pushing to main.

---

## Phase 2: State Management (The Collaboration Hook)

### 2.1 Create useDualAICollaboration Hook
**New File:** `features/github/useDualAICollaboration.js`

#### State Object
```javascript
{
  status: 'idle' | 'parallel_thinking' | 'review_ready' | 'synthesizing',
  geminiMessages: [],
  claudeMessages: [],
  isGeminiLoading: false,
  isClaudeLoading: false,
  consensusArtifact: null
}
```

#### System Prompts
```javascript
const PROMPTS = {
  GEMINI_ARCHITECT: `
    You are Gemini 3, the "Rapid Architect" and Lead Engineer.
    Role: Focus on structural integrity, scalability, modern patterns, and implementation speed.
    Context: Current date is January 2026.
    Output: Provide concrete code structures, file organizations, and library choices.
    Be bold and decisive.
  `,
  CLAUDE_DEEP_THINKER: `
    You are Claude Opus 4.5, the "Deep Reviewer" and Staff Security Engineer.
    Role: Focus on edge cases, race conditions, security vulnerabilities, and logical fallacies.
    Context: Current date is January 2026.
    Output: Analyze requirements for hidden complexity. Critique architectural decisions deeply.
  `,
  CROSS_POLLINATION_GEMINI: `
    The "Deep Reviewer" (Claude Opus) has analyzed the problem.
    Review their insights below and refine your architectural plan to address their concerns
    while maintaining your focus on speed and structure.
  `,
  CROSS_POLLINATION_CLAUDE: `
    The "Rapid Architect" (Gemini 3) has proposed a solution.
    Critique their specific implementation plan below. Find what they missed.
    Verify their code structure for security and correctness.
  `
};
```

#### Key Functions
- `startParallelThinking(userPrompt, contextFiles)` - Fire both APIs simultaneously using `Promise.allSettled`
- `synthesizeResponses()` - Cross-pollinate: send Gemini's output to Claude and vice versa
- `resetSession()` - Clear all state

#### Full Implementation
```javascript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { invokeGemini } from '@/api/geminiClient';
import { invokeLLM as invokeAnthropic } from '@/api/anthropicClient';
import { AI_MODELS } from '@/config/constants';

export const useDualAICollaboration = () => {
  const [geminiMessages, setGeminiMessages] = useState([]);
  const [claudeMessages, setClaudeMessages] = useState([]);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [isClaudeLoading, setIsClaudeLoading] = useState(false);
  const [collaborationStatus, setCollaborationStatus] = useState('idle');

  const startParallelThinking = useCallback(async (userPrompt, contextFiles = []) => {
    setCollaborationStatus('parallel_thinking');
    setIsGeminiLoading(true);
    setIsClaudeLoading(true);

    const fileContext = contextFiles.map(f =>
      `File: ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``
    ).join('\n\n');

    const fullPrompt = fileContext ? `${fileContext}\n\nUser Request: ${userPrompt}` : userPrompt;
    const userMsg = { role: 'user', content: userPrompt };

    setGeminiMessages(prev => [...prev, userMsg]);
    setClaudeMessages(prev => [...prev, userMsg]);

    try {
      const [geminiResult, claudeResult] = await Promise.allSettled([
        invokeGemini({
          model: AI_MODELS.GEMINI_ARCHITECT,
          systemPrompt: PROMPTS.GEMINI_ARCHITECT,
          messages: [...geminiMessages, userMsg],
          temperature: 0.8
        }),
        invokeAnthropic({
          model: AI_MODELS.CLAUDE_DEEP_THINKER,
          system_prompt: PROMPTS.CLAUDE_DEEP_THINKER,
          prompt: fullPrompt
        })
      ]);

      if (geminiResult.status === 'fulfilled') {
        setGeminiMessages(prev => [...prev, { role: 'assistant', content: geminiResult.value }]);
      } else {
        toast.error("Gemini failed: " + geminiResult.reason.message);
      }

      if (claudeResult.status === 'fulfilled') {
        setClaudeMessages(prev => [...prev, { role: 'assistant', content: claudeResult.value }]);
      } else {
        toast.error("Claude failed: " + claudeResult.reason.message);
      }

      setCollaborationStatus('review_ready');
    } catch (err) {
      toast.error("Both AI services encountered errors.");
    } finally {
      setIsGeminiLoading(false);
      setIsClaudeLoading(false);
    }
  }, [geminiMessages, claudeMessages]);

  const synthesizeResponses = useCallback(async () => {
    const lastGemini = geminiMessages[geminiMessages.length - 1]?.content;
    const lastClaude = claudeMessages[claudeMessages.length - 1]?.content;

    if (!lastGemini || !lastClaude) {
      toast.error("Both models must respond before synthesis.");
      return;
    }

    setCollaborationStatus('synthesizing');
    setIsGeminiLoading(true);
    setIsClaudeLoading(true);

    try {
      await Promise.allSettled([
        invokeGemini({
          model: AI_MODELS.GEMINI_ARCHITECT,
          systemPrompt: PROMPTS.GEMINI_ARCHITECT,
          messages: [
            ...geminiMessages,
            { role: 'user', content: `${PROMPTS.CROSS_POLLINATION_GEMINI}\n\n--- CLAUDE'S FEEDBACK ---\n${lastClaude}` }
          ]
        }).then(response => {
          setGeminiMessages(prev => [...prev, { role: 'assistant', content: response, type: 'synthesis' }]);
        }),

        invokeAnthropic({
          model: AI_MODELS.CLAUDE_DEEP_THINKER,
          system_prompt: PROMPTS.CLAUDE_DEEP_THINKER,
          prompt: `${PROMPTS.CROSS_POLLINATION_CLAUDE}\n\n--- GEMINI'S PROPOSAL ---\n${lastGemini}`
        }).then(response => {
          setClaudeMessages(prev => [...prev, { role: 'assistant', content: response, type: 'synthesis' }]);
        })
      ]);

      toast.success("Cross-pollination complete!");
    } catch (error) {
      toast.error("Failed to synthesize responses.");
    } finally {
      setIsGeminiLoading(false);
      setIsClaudeLoading(false);
      setCollaborationStatus('idle');
    }
  }, [geminiMessages, claudeMessages]);

  const resetSession = useCallback(() => {
    setGeminiMessages([]);
    setClaudeMessages([]);
    setCollaborationStatus('idle');
  }, []);

  return {
    geminiMessages,
    claudeMessages,
    isGeminiLoading,
    isClaudeLoading,
    collaborationStatus,
    startParallelThinking,
    synthesizeResponses,
    resetSession
  };
};
```

---

## Phase 3: UI Components

### 3.1 Dual AI Chat Interface
**New File:** `features/github/DualAIChatInterface.jsx`

Features:
- **Resizable panels** using `components/ui/resizable.jsx`
- Left column: Gemini 3 (blue theme, "Architectural View")
- Right column: Claude Opus 4.5 (orange theme, "Logic View")
- **"Synthesize & Cross-Critique"** button appears when `status === 'review_ready'`
- Synthesis messages styled with purple gradient

```jsx
import React, { useState } from 'react';
import { Bot, BrainCircuit, Send, RefreshCw, ArrowLeftRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Badge } from '@/components/ui/badge';
import { useDualAICollaboration } from './useDualAICollaboration';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const DualAIChatInterface = ({ contextFiles = [] }) => {
  const [input, setInput] = useState('');
  const {
    geminiMessages,
    claudeMessages,
    isGeminiLoading,
    isClaudeLoading,
    collaborationStatus,
    startParallelThinking,
    synthesizeResponses,
    resetSession
  } = useDualAICollaboration();

  const handleSend = () => {
    if (!input.trim()) return;
    startParallelThinking(input, contextFiles);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Dual-Expert Collaboration</h3>
            <p className="text-xs text-muted-foreground">Gemini 3 Architect × Claude Opus 4.5</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {collaborationStatus === 'review_ready' && (
            <Button onClick={synthesizeResponses} className="bg-purple-600 hover:bg-purple-700 animate-pulse" size="sm">
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Synthesize & Cross-Critique
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={resetSession}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Split Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* LEFT: Gemini */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full bg-blue-50/5 dark:bg-blue-950/10">
              <div className="px-4 py-2 border-b flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-blue-600">Gemini 3 Pro</span>
                <Badge variant="outline" className="text-[10px]">Architect</Badge>
              </div>
              <ScrollArea className="flex-1 p-4">
                {geminiMessages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} type="gemini" />
                ))}
                {isGeminiLoading && <ThinkingIndicator label="Architecting..." />}
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT: Claude */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full bg-orange-50/5 dark:bg-orange-950/10">
              <div className="px-4 py-2 border-b flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-600">Claude Opus 4.5</span>
                <Badge variant="outline" className="text-[10px]">Deep Thinker</Badge>
              </div>
              <ScrollArea className="flex-1 p-4">
                {claudeMessages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} type="claude" />
                ))}
                {isClaudeLoading && <ThinkingIndicator label="Deep thinking..." />}
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-card">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your feature or issue..."
            className="pr-12 min-h-[80px]"
            disabled={isGeminiLoading || isClaudeLoading}
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2"
            onClick={handleSend}
            disabled={!input.trim() || isGeminiLoading || isClaudeLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DualAIChatInterface;
```

### 3.2 Completeness Analysis Panel
**New File:** `features/github/CompletenessAnalysis.jsx`

- Read-only view after artifact generation
- Uses **Claude Sonnet 4.5** to check artifact against:
  - Original user prompt
  - Proflow coding standards (from `.claude/rules`)
- Highlights missing details and suggests improvements

### 3.3 Artifact Viewer
**New File:** `features/github/ArtifactViewer.jsx`

- Markdown preview with code highlighting
- Edit mode toggle
- "Analyze for Completeness" button (top)
- "Save to Documents" button
- "Commit to GitHub" button (creates feature branch)

---

## Phase 4: Integration

### 4.1 Add Tab to GitHubHub
**Modify:** `pages/GitHubHub.jsx`

- Add "AI Collaboration" tab
- Pass repository context files to DualAIChatInterface

### 4.2 GitHub Safety
- When committing, create branch `feature/ai-collab-{timestamp}` instead of pushing to main
- Include option to create Pull Request

---

## Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `config/constants.js` | Add 2026 AI model IDs | MODIFY |
| `config/aiModels.js` | Centralized model registry | NEW |
| `api/geminiClient.js` | Gemini 3 Pro API client | NEW |
| `api/github.js` | Add createBranch, createPullRequest | MODIFY |
| `features/github/useDualAICollaboration.js` | Isolated collaboration logic | NEW |
| `features/github/DualAIChatInterface.jsx` | Split-view UI with resizable panels | NEW |
| `features/github/ArtifactViewer.jsx` | Document viewer/editor | NEW |
| `features/github/CompletenessAnalysis.jsx` | Sonnet 4.5 QA panel | NEW |
| `pages/GitHubHub.jsx` | Add AI Collaboration tab | MODIFY |

---

## Verification & Guardrails

1. **Date Awareness:** System prompts include "Current Date: January 2026"
2. **GitHub Safety:** Always create feature branch, never push to main
3. **Token Limits:**
   - Gemini 3: 2M+ context - can feed entire file tree
   - Claude Opus 4.5: Feed Gemini summary + specific files only
4. **Resilience:** If one API fails, UI doesn't crash - allows retry

---

## Environment Variables

```
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key
```
