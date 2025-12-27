import { useState, useCallback, useRef } from 'react';
import { db } from '@/api/db';
import { github } from '@/api/github';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import repositoryAnalyzer from '@/api/repositoryAnalyzer';
import {
  createInitialContext,
  setRepoContext,
  setRepositoryMemory,
  smartSummarize,
  calculateConsensusScore,
  hasReachedConsensus,
} from './contextManager';
import { runDebateRound, generateFinalResponse, AI_MODELS } from './debateOrchestrator';

/**
 * Hook for managing a GitHub repository debate session
 */
export function useDebateSession() {
  const { currentWorkspaceId, currentUser } = useWorkspace();

  // Session state
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [context, setContext] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, loading, debating, paused, consensus, stopped, error
  const [error, setError] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [consensusScore, setConsensusScore] = useState(0);

  // Control refs
  const shouldStopRef = useRef(false);
  const isDebatingRef = useRef(false);

  /**
   * Mock AI invocation (replace with actual API calls)
   * TODO: Integrate with OpenAI and Anthropic APIs
   */
  const invokeAI = useCallback(
    async ({ provider, model, systemPrompt: _systemPrompt, messages: _aiMessages }) => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

      // Handle summarization requests (for smart context summarization)
      if (provider === 'summarizer') {
        return {
          content: JSON.stringify({
            agreedPoints: [],
            contestedPoints: [],
            decisions: [],
            keyFindings: [],
            narrativeSummary:
              'Discussion summary: The AIs have been analyzing the repository structure and patterns.',
          }),
          usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 },
        };
      }

      // For now, return mock responses
      // In production, this would call the actual APIs
      const isAnalyst = model.includes('gpt');
      const round = context?.currentRound || 1;

      const mockResponses = {
        analyst: [
          `## Initial Analysis\n\nBased on my review of this repository, here are my key findings:\n\n### Code Structure\nThe codebase follows a well-organized modular pattern. Key directories include src/components for UI elements and src/api for data layer interactions.\n\n### Key Patterns Identified\n1. **Component Architecture**: Uses a feature-based folder structure\n2. **State Management**: Leverages React Context and hooks\n3. **API Layer**: Clean separation with entity managers\n\n### Recommendations\n- Consider adding more comprehensive error handling\n- The test coverage could be improved\n- Documentation could be enhanced\n\n**Confidence Level**: High for structural analysis, Medium for performance assessment.`,
          `## Refined Analysis\n\nThank you for the feedback. I've reconsidered several points:\n\n### Addressing Critic's Concerns\nYou raised valid points about error handling patterns. Upon closer inspection:\n\n1. **Error Boundaries**: The app does use React Error Boundaries at key levels\n2. **API Errors**: Toast notifications are used but could be more consistent\n\n### Updated Recommendations\n- Focus on standardizing error handling across all API calls\n- Consider implementing a centralized error logging service\n\n**Confidence Level**: Higher after incorporating feedback.`,
        ],
        critic: [
          `## Critical Review\n\nThe Analyst has provided a solid foundation. Here's my assessment:\n\n### Strengths\n- Accurate identification of the component architecture\n- Good observation about state management patterns\n- Reasonable recommendations overall\n\n### Areas for Refinement\n1. **Error Handling**: The analysis could go deeper here - I see error boundaries but the API error handling varies\n2. **Performance**: No mention of potential performance considerations\n3. **Security**: Should address any security patterns observed\n\n### Missing Considerations\n- Bundle size implications\n- Accessibility patterns\n- Testing strategy analysis\n\n## Agreement Assessment\n- Points I AGREE with:\n  - The modular structure observation\n  - Feature-based folder organization\n  - Need for documentation improvements\n- Points I DISAGREE with or want to refine:\n  - Error handling assessment needs more depth\n  - Missing performance analysis\n- Overall agreement level: Moderate`,
          `## Follow-up Review\n\nThe Analyst has addressed my concerns well:\n\n### Progress Made\n- Better analysis of error handling patterns\n- Acknowledgment of areas needing improvement\n\n### Remaining Observations\n- The centralized error logging suggestion is excellent\n- We've aligned on the main structural points\n\n## Agreement Assessment\n- Points I AGREE with:\n  - Error boundary usage\n  - Need for consistent API error handling\n  - Centralized logging recommendation\n  - All structural observations\n- Points I DISAGREE with or want to refine:\n  - (None remaining)\n- Overall agreement level: Strong`,
        ],
      };

      const responseSet = isAnalyst ? mockResponses.analyst : mockResponses.critic;
      const responseIndex = Math.min(round - 1, responseSet.length - 1);

      return {
        content: responseSet[responseIndex],
        usage: {
          promptTokens: 1500,
          completionTokens: 500,
          totalTokens: 2000,
        },
      };
    },
    [context]
  );

  /**
   * Start a new debate session
   */
  const startSession = useCallback(
    async (repoFullName, query, projectId = null) => {
      if (!currentWorkspaceId || !repoFullName || !query) {
        throw new Error('Missing required parameters');
      }

      try {
        setStatus('loading');
        setError(null);
        shouldStopRef.current = false;

        const [owner, repo] = repoFullName.split('/');

        // Fetch repository context
        const [_repoData, readme, languages, issues, prs] = await Promise.all([
          github.getRepo(owner, repo),
          github.getReadme(owner, repo).catch(() => null),
          github.getLanguages(owner, repo),
          github.listIssues(owner, repo, { state: 'open', perPage: 10 }),
          github.listPullRequests(owner, repo, { state: 'open', perPage: 10 }),
        ]);

        // Get file tree for structure
        let structure = '';
        try {
          const tree = await github.getTree(owner, repo, 'HEAD', true);
          structure = tree.tree
            .filter((f) => f.type === 'blob')
            .slice(0, 50)
            .map((f) => f.path)
            .join('\n');
        } catch (e) {
          console.warn('Could not fetch tree:', e);
        }

        // Initialize context
        let newContext = createInitialContext();
        newContext.originalQuery = query;
        newContext = setRepoContext(newContext, {
          readme: readme?.decodedContent || null,
          structure,
          languages,
          openIssues: issues,
          openPRs: prs,
        });

        // Find linked repository record
        const linkedRepos = await db.entities.WorkspaceRepository.list({
          workspace_id: currentWorkspaceId,
          github_repo_full_name: repoFullName,
        });
        const linkedRepo = linkedRepos[0];

        // Fetch repository memory (deep analysis) if available
        if (linkedRepo) {
          try {
            const repoMemory = await repositoryAnalyzer.getRepositoryMemory(linkedRepo.id);
            if (repoMemory && repoMemory.analysis_status === 'completed') {
              newContext = setRepositoryMemory(newContext, repoMemory);
              console.log('Repository memory loaded successfully');
            }
          } catch (memErr) {
            console.warn('Failed to load repository memory:', memErr);
            // Non-blocking - continue without memory
          }
        }

        // Create session in database
        const dbSession = await db.entities.GitHubDebateSession.create({
          workspace_id: currentWorkspaceId,
          repository_id: linkedRepo?.id || null,
          project_id: projectId,
          user_query: query,
          status: 'active',
          current_round: 0,
          max_rounds: 5,
          consensus_score: 0,
          context_summary: {},
          agreed_points: [],
        });

        setSession(dbSession);
        setContext(newContext);
        setMessages([]);
        setCurrentRound(0);
        setConsensusScore(0);
        setStatus('debating');

        return dbSession;
      } catch (err) {
        console.error('Failed to start session:', err);
        setError(err.message);
        setStatus('error');
        throw err;
      }
    },
    [currentWorkspaceId]
  );

  /**
   * Run the next debate round
   */
  const runNextRound = useCallback(async () => {
    if (!context || !session || shouldStopRef.current) return;

    try {
      isDebatingRef.current = true;
      setStatus('debating');

      const nextRound = currentRound + 1;
      let updatedContext = { ...context, currentRound: nextRound };
      setCurrentRound(nextRound);

      // Analyst turn
      const analystResult = await runDebateRound(updatedContext, 'analyst', invokeAI);
      updatedContext = analystResult.context;

      const analystMessage = {
        ...analystResult.message,
        id: crypto.randomUUID(),
      };

      setMessages((prev) => [...prev, analystMessage]);
      setContext(updatedContext);

      // Save analyst message to DB
      await db.entities.GitHubDebateMessage.create({
        session_id: session.id,
        round_number: nextRound,
        model_role: 'analyst',
        content: analystMessage.content,
        key_points: [],
        agrees_with_previous: false,
      });

      if (shouldStopRef.current) {
        setStatus('stopped');
        return;
      }

      // Critic turn
      const criticResult = await runDebateRound(updatedContext, 'critic', invokeAI);
      updatedContext = criticResult.context;

      const criticMessage = {
        ...criticResult.message,
        id: crypto.randomUUID(),
      };

      setMessages((prev) => [...prev, criticMessage]);

      // Run smart summarization if needed
      if (updatedContext.needsSummarization) {
        try {
          updatedContext = await smartSummarize(updatedContext, invokeAI);
        } catch (sumErr) {
          console.warn('Smart summarization failed:', sumErr);
          // Continue with existing context
        }
      }

      setContext(updatedContext);

      // Calculate consensus
      const score = calculateConsensusScore(updatedContext);
      setConsensusScore(score);

      // Save critic message to DB
      await db.entities.GitHubDebateMessage.create({
        session_id: session.id,
        round_number: nextRound,
        model_role: 'critic',
        content: criticMessage.content,
        key_points: updatedContext.agreedPoints,
        agrees_with_previous: score > 70,
      });

      // Update session in DB
      await db.entities.GitHubDebateSession.update(session.id, {
        current_round: nextRound,
        consensus_score: score,
        agreed_points: updatedContext.agreedPoints,
        context_summary: {
          historySummary: updatedContext.historySummary,
          contestedPoints: updatedContext.contestedPoints,
        },
      });

      // Check for consensus
      if (hasReachedConsensus(updatedContext)) {
        setStatus('consensus');
        await db.entities.GitHubDebateSession.update(session.id, {
          status: 'consensus',
        });
      } else if (nextRound >= 5) {
        setStatus('max_rounds');
        await db.entities.GitHubDebateSession.update(session.id, {
          status: 'max_rounds',
        });
      } else {
        setStatus('paused');
      }
    } catch (err) {
      console.error('Debate round failed:', err);
      setError(err.message);
      setStatus('error');
    } finally {
      isDebatingRef.current = false;
    }
  }, [context, session, currentRound, invokeAI]);

  /**
   * Stop the current debate
   */
  const stopDebate = useCallback(async () => {
    shouldStopRef.current = true;
    setStatus('stopped');

    if (session) {
      await db.entities.GitHubDebateSession.update(session.id, {
        status: 'stopped',
      });
    }
  }, [session]);

  /**
   * Continue debate after pause
   */
  const continueDebate = useCallback(() => {
    if (status === 'paused' && !isDebatingRef.current) {
      runNextRound();
    }
  }, [status, runNextRound]);

  /**
   * Generate and get final response
   */
  const getFinalResponse = useCallback(async () => {
    if (!context) return null;

    try {
      const finalContent = await generateFinalResponse(context, invokeAI);
      return finalContent;
    } catch (err) {
      console.error('Failed to generate final response:', err);
      return null;
    }
  }, [context, invokeAI]);

  /**
   * Save debate result to a project
   */
  const saveToProject = useCallback(
    async (projectId, responseContent) => {
      if (!session || !currentWorkspaceId) return;

      // Update session with project link
      await db.entities.GitHubDebateSession.update(session.id, {
        project_id: projectId,
        final_response: responseContent,
        saved_to_project_at: new Date().toISOString(),
      });

      // Create a note in the project with the debate result
      await db.entities.Note.create({
        workspace_id: currentWorkspaceId,
        title: `GitHub Analysis: ${context?.originalQuery?.substring(0, 50)}...`,
        content: `<h2>AI Debate Result</h2><p>${responseContent.replace(/\n/g, '<br/>')}</p>`,
        project_id: projectId,
        tags: ['github', 'ai-analysis'],
        color: '#8B5CF6',
        is_pinned: false,
        created_by: currentUser?.email,
      });

      return true;
    },
    [session, currentWorkspaceId, context, currentUser]
  );

  return {
    // State
    session,
    messages,
    context,
    status,
    error,
    currentRound,
    consensusScore,
    isDebating: isDebatingRef.current,

    // Actions
    startSession,
    runNextRound,
    stopDebate,
    continueDebate,
    getFinalResponse,
    saveToProject,

    // Constants
    AI_MODELS,
  };
}

export default useDebateSession;
