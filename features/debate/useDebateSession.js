import { useState, useCallback, useRef } from 'react';
import { db } from '@/api/db';
import { github } from '@/api/github';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import repositoryAnalyzer from '@/api/repositoryAnalyzer';
import {
  createInitialContext,
  setRepoContext,
  setProflowContext,
  setRepositoryMemory,
  setPastInsights,
  loadPastContext,
  smartSummarize,
  calculateConsensusScore,
  hasReachedConsensus,
} from './contextManager';
import { runDebateRound, generateFinalResponse, AI_MODELS } from './debateOrchestrator';
import { saveDebateInsights, extractInsightsFromDebate } from '@/api/debateMemory';

/**
 * Hook for managing a debate session with multiple context types
 * Supports: 'none', 'project', 'assignment', 'github'
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
              'Discussion summary: The AIs have been analyzing the topic and patterns.',
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
          `## Initial Analysis\n\nBased on my review of the provided context, here are my key findings:\n\n### Key Observations\nThe information provided suggests a well-organized structure. I've identified several important patterns.\n\n### Patterns Identified\n1. **Organization**: The context shows clear organization\n2. **Approach**: There appears to be a methodical approach\n3. **Areas for Focus**: Several areas warrant attention\n\n### Recommendations\n- Consider exploring the key areas in more depth\n- Additional context could help refine the analysis\n\n**Confidence Level**: Moderate - dependent on the scope of the context provided.`,
          `## Refined Analysis\n\nThank you for the feedback. I've reconsidered several points:\n\n### Addressing Critic's Concerns\nYou raised valid points. Upon closer inspection:\n\n1. The initial observations can be further refined\n2. Additional considerations have been incorporated\n\n### Updated Recommendations\n- Focus on the key areas identified\n- Consider implementing the suggested improvements\n\n**Confidence Level**: Higher after incorporating feedback.`,
        ],
        critic: [
          `## Critical Review\n\nThe Analyst has provided a solid foundation. Here's my assessment:\n\n### Strengths\n- Accurate identification of the key patterns\n- Good observations about the structure\n- Reasonable recommendations overall\n\n### Areas for Refinement\n1. **Depth**: The analysis could go deeper in some areas\n2. **Specificity**: More specific examples would strengthen the points\n3. **Context**: Consider additional contextual factors\n\n## Agreement Assessment\n- Points I AGREE with:\n  - The organizational structure observation\n  - The methodical approach identification\n  - The need for focused attention on key areas\n- Points I DISAGREE with or want to refine:\n  - Some recommendations need more specificity\n- Overall agreement level: Moderate`,
          `## Follow-up Review\n\nThe Analyst has addressed my concerns well:\n\n### Progress Made\n- Better analysis of the key areas\n- Acknowledgment of areas needing improvement\n\n### Remaining Observations\n- The refinements are heading in the right direction\n- We've aligned on the main points\n\n## Agreement Assessment\n- Points I AGREE with:\n  - All core observations\n  - The refined recommendations\n  - The approach to addressing concerns\n- Points I DISAGREE with or want to refine:\n  - (None remaining)\n- Overall agreement level: Strong`,
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
   * Build context for Proflow project
   */
  const buildProjectContext = async (newContext, project) => {
    try {
      const [tasks, assignments, documents, notes] = await Promise.all([
        db.entities.Task.filter({ project_id: project.id, workspace_id: currentWorkspaceId }),
        db.entities.Assignment.filter({ project_id: project.id, workspace_id: currentWorkspaceId }),
        db.entities.Document.filter({
          assigned_to_project: project.id,
          workspace_id: currentWorkspaceId,
        }),
        db.entities.Note.filter({ project_id: project.id, workspace_id: currentWorkspaceId }),
      ]);

      return setProflowContext(newContext, {
        project,
        tasks: tasks || [],
        assignments: assignments || [],
        documents: documents || [],
        notes: notes || [],
      });
    } catch (err) {
      console.warn('Failed to load project context:', err);
      return setProflowContext(newContext, { project });
    }
  };

  /**
   * Build context for Proflow assignment
   */
  const buildAssignmentContext = async (newContext, assignment) => {
    try {
      const [tasks, documents] = await Promise.all([
        db.entities.Task.filter({ assignment_id: assignment.id, workspace_id: currentWorkspaceId }),
        db.entities.Document.filter({ workspace_id: currentWorkspaceId }),
      ]);

      // Filter documents that are assigned to this assignment
      const assignmentDocs = documents.filter((doc) =>
        doc.assigned_to_assignments?.includes(assignment.id)
      );

      return setProflowContext(newContext, {
        assignment,
        tasks: tasks || [],
        documents: assignmentDocs || [],
      });
    } catch (err) {
      console.warn('Failed to load assignment context:', err);
      return setProflowContext(newContext, { assignment });
    }
  };

  /**
   * Build context for GitHub repository
   */
  const buildGitHubContext = async (newContext, repoFullName) => {
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

    let updatedContext = setRepoContext(newContext, {
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
          updatedContext = setRepositoryMemory(updatedContext, repoMemory);
          console.log('Repository memory loaded successfully');
        }
      } catch (memErr) {
        console.warn('Failed to load repository memory:', memErr);
      }

      // Load past debate insights using semantic search
      try {
        const pastContext = await loadPastContext(linkedRepo.id, updatedContext.originalQuery);
        if (pastContext.relevantInsights.length > 0 || pastContext.establishedFacts.length > 0) {
          updatedContext = setPastInsights(
            updatedContext,
            pastContext.relevantInsights,
            pastContext.establishedFacts
          );
          console.log(
            `Loaded ${pastContext.relevantInsights.length} relevant insights, ${pastContext.establishedFacts.length} established facts`
          );

          // Pre-populate agreed points from established facts
          if (pastContext.establishedFacts.length > 0) {
            updatedContext.agreedPoints = pastContext.establishedFacts.map((f) => ({
              point: f.insight_text,
              round: 'established',
              confidence: 'high',
            }));
          }
        }
      } catch (insightErr) {
        console.warn('Failed to load past insights:', insightErr);
      }
    }

    return { context: updatedContext, linkedRepo };
  };

  /**
   * Start a new debate session
   * @param {string} query - The user's question
   * @param {string} contextType - 'none' | 'project' | 'assignment' | 'github'
   * @param {Object} contextData - The context data (project, assignment, or repo info)
   */
  const startSession = useCallback(
    async (query, contextType = 'none', contextData = null) => {
      if (!currentWorkspaceId || !query) {
        throw new Error('Missing required parameters');
      }

      try {
        setStatus('loading');
        setError(null);
        shouldStopRef.current = false;

        // Initialize context
        let newContext = createInitialContext();
        newContext.originalQuery = query;
        newContext.contextType = contextType;

        let linkedRepo = null;

        // Build context based on type
        switch (contextType) {
          case 'project':
            if (contextData) {
              newContext = await buildProjectContext(newContext, contextData);
            }
            break;

          case 'assignment':
            if (contextData) {
              newContext = await buildAssignmentContext(newContext, contextData);
            }
            break;

          case 'github':
            if (contextData?.repoFullName) {
              const result = await buildGitHubContext(newContext, contextData.repoFullName);
              newContext = result.context;
              linkedRepo = result.linkedRepo;
            }
            break;

          case 'none':
          default:
            // No additional context needed
            break;
        }

        // Create session in database
        const dbSession = await db.entities.DebateSession.create({
          workspace_id: currentWorkspaceId,
          context_type: contextType,
          project_id: contextType === 'project' ? contextData?.id : null,
          assignment_id: contextType === 'assignment' ? contextData?.id : null,
          repository_id: contextType === 'github' ? linkedRepo?.id : null,
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
      await db.entities.DebateMessage.create({
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
        }
      }

      setContext(updatedContext);

      // Calculate consensus
      const score = calculateConsensusScore(updatedContext);
      setConsensusScore(score);

      // Save critic message to DB
      await db.entities.DebateMessage.create({
        session_id: session.id,
        round_number: nextRound,
        model_role: 'critic',
        content: criticMessage.content,
        key_points: updatedContext.agreedPoints,
        agrees_with_previous: score > 70,
      });

      // Update session in DB
      await db.entities.DebateSession.update(session.id, {
        current_round: nextRound,
        consensus_score: score,
        agreed_points: updatedContext.agreedPoints,
        context_summary: {
          historySummary: updatedContext.historySummary,
          contestedPoints: updatedContext.contestedPoints,
        },
      });

      // Check for consensus
      const reachedConsensus = hasReachedConsensus(updatedContext);
      const reachedMaxRounds = nextRound >= 5;

      if (reachedConsensus || reachedMaxRounds) {
        // Save debate insights when debate completes
        try {
          const insights = extractInsightsFromDebate(updatedContext);
          if (insights.length > 0) {
            await saveDebateInsights(
              session.id,
              insights,
              currentWorkspaceId,
              session.repository_id // May be null for non-GitHub debates
            );
            console.log(`Saved ${insights.length} insights from debate`);
          }
        } catch (saveErr) {
          console.warn('Failed to save debate insights:', saveErr);
        }

        if (reachedConsensus) {
          setStatus('consensus');
          await db.entities.DebateSession.update(session.id, {
            status: 'consensus',
          });
        } else {
          setStatus('max_rounds');
          await db.entities.DebateSession.update(session.id, {
            status: 'max_rounds',
          });
        }
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
  }, [context, session, currentRound, invokeAI, currentWorkspaceId]);

  /**
   * Stop the current debate
   */
  const stopDebate = useCallback(async () => {
    shouldStopRef.current = true;
    setStatus('stopped');

    if (session) {
      await db.entities.DebateSession.update(session.id, {
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
      await db.entities.DebateSession.update(session.id, {
        project_id: projectId,
        final_response: responseContent,
        saved_to_project_at: new Date().toISOString(),
      });

      // Create a note in the project with the debate result
      const contextLabel = {
        none: 'General Analysis',
        project: 'Project Analysis',
        assignment: 'Assignment Analysis',
        github: 'GitHub Analysis',
      }[context?.contextType || 'none'];

      await db.entities.Note.create({
        workspace_id: currentWorkspaceId,
        title: `${contextLabel}: ${context?.originalQuery?.substring(0, 50)}...`,
        content: `<h2>AI Debate Result</h2><p>${responseContent.replace(/\n/g, '<br/>')}</p>`,
        project_id: projectId,
        tags: ['ai-debate', context?.contextType || 'general'],
        color: '#8B5CF6',
        is_pinned: false,
        created_by: currentUser?.email,
      });

      return true;
    },
    [session, currentWorkspaceId, context, currentUser]
  );

  /**
   * Reset the session to start a new debate
   */
  const resetSession = useCallback(() => {
    setSession(null);
    setMessages([]);
    setContext(null);
    setStatus('idle');
    setError(null);
    setCurrentRound(0);
    setConsensusScore(0);
    shouldStopRef.current = false;
    isDebatingRef.current = false;
  }, []);

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
    resetSession,

    // Constants
    AI_MODELS,
  };
}

export default useDebateSession;
