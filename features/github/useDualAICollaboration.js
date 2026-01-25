/**
 * useDualAICollaboration Hook
 *
 * Manages the "Ping-Pong" state between Gemini (Rapid Architect) and Claude (Deep Thinker).
 * This hook is isolated from useDebateSession.js to avoid coupling with consensus/voting logic.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { invokeGemini, isGeminiConfigured } from '@/api/geminiClient';
import { invokeLLM, isAnthropicConfigured } from '@/api/anthropicClient';
import { AI_MODELS } from '@/config/aiModels';
import { performSemanticSearch } from '@/api/repositoryAnalyzer';
import { github } from '@/api/github';

/**
 * Collaboration status states
 */
export const COLLABORATION_STATUS = {
  IDLE: 'idle',
  PARALLEL_THINKING: 'parallel_thinking',
  REVIEW_READY: 'review_ready',
  SYNTHESIZING: 'synthesizing',
  ARTIFACT_READY: 'artifact_ready',
};

/**
 * Default system prompts for each AI role (used when no template selected)
 */
const DEFAULT_PROMPTS = {
  gemini: `You are Gemini, the "Rapid Architect" and Lead Engineer.

ROLE:
- Focus on structural integrity, scalability, modern patterns, and implementation speed
- Provide concrete code structures, file organizations, and library choices
- Be bold and decisive in your recommendations

CONTEXT:
- Current date is January 2026
- You are working with a React/Vite/Supabase stack
- The user needs help planning or implementing features

OUTPUT FORMAT:
- Use markdown with clear sections
- Include code blocks with syntax highlighting
- Provide file structure recommendations when relevant
- Be specific about implementation details`,

  claude: `You are Claude Opus 4.5, the "Deep Reviewer" and Staff Security Engineer.

ROLE:
- Focus on edge cases, race conditions, security vulnerabilities, and logical fallacies
- Analyze requirements for hidden complexity
- Critique architectural decisions deeply and constructively

CONTEXT:
- Current date is January 2026
- You are reviewing code and plans for a React/Vite/Supabase application

OUTPUT FORMAT:
- Use markdown with clear sections
- Highlight potential issues with severity levels
- Suggest specific mitigations for each concern
- Be thorough but constructive`,
};

/**
 * Cross-pollination and synthesis prompts (constant across templates)
 */
const CROSS_PROMPTS = {
  CROSS_POLLINATION_GEMINI: `The "Deep Reviewer" (Claude Opus) has analyzed the problem.

Review their insights below and refine your architectural plan to address their concerns while maintaining your focus on speed and structure.

Specifically:
1. Acknowledge valid concerns
2. Update your plan to address security/edge case issues
3. Provide revised code or structure if needed
4. Explain any trade-offs you're making`,

  CROSS_POLLINATION_CLAUDE: `The "Rapid Architect" (Gemini) has proposed a solution.

Critique their specific implementation plan below:
1. Find what they missed (edge cases, security issues, race conditions)
2. Verify their code structure for correctness
3. Check for potential security vulnerabilities
4. Suggest improvements while acknowledging good decisions`,

  ARTIFACT_SYNTHESIS: `Synthesize the collaboration into a comprehensive document.

Based on the conversation between the Architect and Deep Reviewer:
1. Create a unified implementation plan
2. Include all agreed-upon code structures
3. Document remaining concerns and how they'll be addressed
4. Format as a complete, actionable specification

Output a well-structured markdown document.`,
};

/**
 * Custom hook for managing dual AI collaboration
 * @returns {Object} Collaboration state and functions
 */
export const useDualAICollaboration = () => {
  // Message history for each AI
  const [geminiMessages, setGeminiMessages] = useState([]);
  const [claudeMessages, setClaudeMessages] = useState([]);

  // Loading states
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [isClaudeLoading, setIsClaudeLoading] = useState(false);

  // Collaboration status
  const [collaborationStatus, setCollaborationStatus] = useState(COLLABORATION_STATUS.IDLE);

  // Generated artifact
  const [artifact, setArtifact] = useState(null);

  // Error states
  const [errors, setErrors] = useState({ gemini: null, claude: null });

  // Current prompts (can be overridden by templates)
  const [currentPrompts, setCurrentPrompts] = useState({
    gemini: DEFAULT_PROMPTS.gemini,
    claude: DEFAULT_PROMPTS.claude,
  });

  // Original user prompt (for completeness analysis)
  const [originalPrompt, setOriginalPrompt] = useState('');

  /**
   * Check if both AI services are configured
   */
  const checkConfiguration = useCallback(() => {
    const issues = [];
    if (!isGeminiConfigured()) {
      issues.push('Gemini API key not configured');
    }
    if (!isAnthropicConfigured()) {
      issues.push('Anthropic API key not configured');
    }
    return issues;
  }, []);

  /**
   * Set prompts from a template
   * @param {Object} template - Template with geminiPrompt and claudePrompt
   */
  const setTemplatePrompts = useCallback((template) => {
    if (template && template.geminiPrompt && template.claudePrompt) {
      setCurrentPrompts({
        gemini: template.geminiPrompt,
        claude: template.claudePrompt,
      });
    } else {
      setCurrentPrompts({
        gemini: DEFAULT_PROMPTS.gemini,
        claude: DEFAULT_PROMPTS.claude,
      });
    }
  }, []);

  /**
   * Start parallel thinking - both AIs respond simultaneously
   * @param {string} userPrompt - The user's input
   * @param {Array} contextFiles - Optional array of {path, content, language} objects
   * @param {Object} template - Optional template with geminiPrompt and claudePrompt
   * @param {Object} repoContext - Optional context like { securityAlerts: [], repoFullName: 'owner/repo' }
   */
  const startParallelThinking = useCallback(
    async (userPrompt, contextFiles = [], template = null, repoContext = null) => {
      const configIssues = checkConfiguration();
      if (configIssues.length > 0) {
        toast.error(configIssues.join('. '));
        return;
      }

      // Update prompts if template provided
      const geminiSystemPrompt = template?.geminiPrompt || currentPrompts.gemini;
      const claudeSystemPrompt = template?.claudePrompt || currentPrompts.claude;

      setCollaborationStatus(COLLABORATION_STATUS.PARALLEL_THINKING);
      setIsGeminiLoading(true);
      setIsClaudeLoading(true);
      setErrors({ gemini: null, claude: null });
      setOriginalPrompt(userPrompt);

      // Build context from files
      const fileContext = contextFiles
        .map((f) => `File: ${f.path}\n\`\`\`${f.language || ''}\n${f.content}\n\`\`\``)
        .join('\n\n');

      // Add security context if available (Security Data Fusion - Rec #3)
      let securityContext = '';
      if (repoContext?.securityAlerts?.length > 0) {
        securityContext = `\n\n[SECURITY ALERTS FOUND IN REPOSITORY]:\n${repoContext.securityAlerts
          .map((a) => `- ${a.security_advisory?.summary} (${a.security_vulnerability?.severity}) in ${a.dependency?.package?.name}`)
          .join('\n')}\nPlease consider these vulnerabilities in your response.`;
      }

      // Add semantic RAG context if repo is provided (Rec #1)
      let semanticContext = '';
      if (repoContext?.repoFullName) {
        try {
          const [owner, repo] = repoContext.repoFullName.split('/');
          const repoData = await github.getRepo(owner, repo);
          // Find memory ID for this repo
          const memories = await import('@/api/db').then(m => m.db.entities.RepositoryMemory.list({ repository_id: repoData.id }));
          
          if (memories.length > 0) {
            const relevantChunks = await performSemanticSearch(memories[0].id, userPrompt);
            if (relevantChunks.length > 0) {
              semanticContext = `\n\n[RELEVANT CODE SNIPPETS FOUND VIA SEMANTIC SEARCH]:\n${relevantChunks
                .map(c => `File: ${c.file_path}\n\`\`\`\n${c.content}\n\`\`\``)
                .join('\n\n')}`;
            }
          }
        } catch (err) {
          console.warn('Semantic search failed for context:', err);
        }
      }

      const fullPrompt = `${fileContext}${securityContext}${semanticContext}\n\nUser Request: ${userPrompt}`;
      const userMsg = { role: 'user', content: userPrompt };

      // Add user message to both histories
      setGeminiMessages((prev) => [...prev, userMsg]);
      setClaudeMessages((prev) => [...prev, userMsg]);

      try {
        // Fire both APIs simultaneously
        const [geminiResult, claudeResult] = await Promise.allSettled([
          invokeGemini({
            model: AI_MODELS.ARCHITECT.id,
            systemPrompt: geminiSystemPrompt,
            messages: [...geminiMessages, { role: 'user', content: fullPrompt }],
            temperature: 0.8,
          }),
          invokeLLM({
            model: AI_MODELS.DEEP_THINKER.id,
            system_prompt: claudeSystemPrompt,
            prompt: fullPrompt,
          }),
        ]);

        // Handle Gemini result
        if (geminiResult.status === 'fulfilled') {
          setGeminiMessages((prev) => [
            ...prev,
            { role: 'assistant', content: geminiResult.value, timestamp: Date.now() },
          ]);
        } else {
          const errorMsg = geminiResult.reason?.message || 'Gemini request failed';
          setErrors((prev) => ({ ...prev, gemini: errorMsg }));
          toast.error(`Gemini: ${errorMsg}`);
        }

        // Handle Claude result
        if (claudeResult.status === 'fulfilled') {
          setClaudeMessages((prev) => [
            ...prev,
            { role: 'assistant', content: claudeResult.value, timestamp: Date.now() },
          ]);
        } else {
          const errorMsg = claudeResult.reason?.message || 'Claude request failed';
          setErrors((prev) => ({ ...prev, claude: errorMsg }));
          toast.error(`Claude: ${errorMsg}`);
        }

        // Only move to review_ready if at least one succeeded
        if (geminiResult.status === 'fulfilled' || claudeResult.status === 'fulfilled') {
          setCollaborationStatus(COLLABORATION_STATUS.REVIEW_READY);
        } else {
          setCollaborationStatus(COLLABORATION_STATUS.IDLE);
          toast.error('Both AI services encountered errors');
        }
      } catch (err) {
        toast.error('Failed to start parallel thinking: ' + err.message);
        setCollaborationStatus(COLLABORATION_STATUS.IDLE);
      } finally {
        setIsGeminiLoading(false);
        setIsClaudeLoading(false);
      }
    },
    [geminiMessages, claudeMessages, checkConfiguration]
  );

  /**
   * Synthesize responses - cross-pollinate between AIs
   */
  const synthesizeResponses = useCallback(async () => {
    const lastGemini = geminiMessages.filter((m) => m.role === 'assistant').pop()?.content;
    const lastClaude = claudeMessages.filter((m) => m.role === 'assistant').pop()?.content;

    if (!lastGemini && !lastClaude) {
      toast.error('Both models must respond before synthesis');
      return;
    }

    setCollaborationStatus(COLLABORATION_STATUS.SYNTHESIZING);
    setIsGeminiLoading(true);
    setIsClaudeLoading(true);

    try {
      const synthesisPromises = [];

      // Cross-pollinate: send Claude's feedback to Gemini (if both exist)
      if (lastGemini && lastClaude) {
        synthesisPromises.push(
          invokeGemini({
            model: AI_MODELS.ARCHITECT.id,
            systemPrompt: currentPrompts.gemini,
            messages: [
              ...geminiMessages,
              {
                role: 'user',
                content: `${CROSS_PROMPTS.CROSS_POLLINATION_GEMINI}\n\n--- CLAUDE'S FEEDBACK ---\n${lastClaude}`,
              },
            ],
            temperature: 0.7,
          }).then((response) => {
            setGeminiMessages((prev) => [
              ...prev,
              { role: 'assistant', content: response, type: 'synthesis', timestamp: Date.now() },
            ]);
            return { ai: 'gemini', response };
          })
        );

        // Cross-pollinate: send Gemini's proposal to Claude
        synthesisPromises.push(
          invokeLLM({
            model: AI_MODELS.DEEP_THINKER.id,
            system_prompt: currentPrompts.claude,
            prompt: `${CROSS_PROMPTS.CROSS_POLLINATION_CLAUDE}\n\n--- GEMINI'S PROPOSAL ---\n${lastGemini}`,
          }).then((response) => {
            setClaudeMessages((prev) => [
              ...prev,
              { role: 'assistant', content: response, type: 'synthesis', timestamp: Date.now() },
            ]);
            return { ai: 'claude', response };
          })
        );
      }

      await Promise.allSettled(synthesisPromises);
      toast.success('Cross-pollination complete!');
      setCollaborationStatus(COLLABORATION_STATUS.REVIEW_READY);
    } catch (error) {
      toast.error('Failed to synthesize responses: ' + error.message);
      setCollaborationStatus(COLLABORATION_STATUS.REVIEW_READY);
    } finally {
      setIsGeminiLoading(false);
      setIsClaudeLoading(false);
    }
  }, [geminiMessages, claudeMessages, currentPrompts]);

  /**
   * Generate final artifact document
   */
  const generateArtifact = useCallback(async () => {
    const allMessages = [
      ...geminiMessages.map((m) => ({ ...m, source: 'gemini' })),
      ...claudeMessages.map((m) => ({ ...m, source: 'claude' })),
    ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const conversationHistory = allMessages
      .map((m) => {
        const sourceLabel = m.source === 'gemini' ? '[Gemini Architect]' : '[Claude Deep Thinker]';
        return `${sourceLabel} (${m.role}):\n${m.content}`;
      })
      .join('\n\n---\n\n');

    setIsClaudeLoading(true);

    try {
      const artifactContent = await invokeLLM({
        model: AI_MODELS.QA_REVIEWER.id,
        system_prompt: CROSS_PROMPTS.ARTIFACT_SYNTHESIS,
        prompt: `Create a comprehensive document from this dual-AI collaboration:\n\n${conversationHistory}`,
      });

      setArtifact({
        content: artifactContent,
        generatedAt: new Date().toISOString(),
        originalPrompt,
        sources: {
          geminiMessages: geminiMessages.length,
          claudeMessages: claudeMessages.length,
        },
      });

      setCollaborationStatus(COLLABORATION_STATUS.ARTIFACT_READY);
      toast.success('Artifact generated successfully!');
    } catch (error) {
      toast.error('Failed to generate artifact: ' + error.message);
    } finally {
      setIsClaudeLoading(false);
    }
  }, [geminiMessages, claudeMessages, originalPrompt]);

  /**
   * Send a follow-up message to a specific AI
   * @param {string} message - User message
   * @param {string} target - 'gemini' or 'claude'
   */
  const sendFollowUp = useCallback(
    async (message, target) => {
      const userMsg = { role: 'user', content: message };

      if (target === 'gemini') {
        setGeminiMessages((prev) => [...prev, userMsg]);
        setIsGeminiLoading(true);

        try {
          const response = await invokeGemini({
            model: AI_MODELS.ARCHITECT.id,
            systemPrompt: currentPrompts.gemini,
            messages: [...geminiMessages, userMsg],
            temperature: 0.8,
          });

          setGeminiMessages((prev) => [
            ...prev,
            { role: 'assistant', content: response, timestamp: Date.now() },
          ]);
        } catch (error) {
          toast.error('Gemini: ' + error.message);
        } finally {
          setIsGeminiLoading(false);
        }
      } else if (target === 'claude') {
        setClaudeMessages((prev) => [...prev, userMsg]);
        setIsClaudeLoading(true);

        try {
          const response = await invokeLLM({
            model: AI_MODELS.DEEP_THINKER.id,
            system_prompt: currentPrompts.claude,
            prompt: message,
          });

          setClaudeMessages((prev) => [
            ...prev,
            { role: 'assistant', content: response, timestamp: Date.now() },
          ]);
        } catch (error) {
          toast.error('Claude: ' + error.message);
        } finally {
          setIsClaudeLoading(false);
        }
      }
    },
    [geminiMessages, claudeMessages, currentPrompts]
  );

  /**
   * Reset the collaboration session
   */
  const resetSession = useCallback(() => {
    setGeminiMessages([]);
    setClaudeMessages([]);
    setCollaborationStatus(COLLABORATION_STATUS.IDLE);
    setArtifact(null);
    setErrors({ gemini: null, claude: null });
  }, []);

  /**
   * Get the last response from each AI
   */
  const getLastResponses = useCallback(() => {
    return {
      gemini: geminiMessages.filter((m) => m.role === 'assistant').pop()?.content || null,
      claude: claudeMessages.filter((m) => m.role === 'assistant').pop()?.content || null,
    };
  }, [geminiMessages, claudeMessages]);

  return {
    // State
    geminiMessages,
    claudeMessages,
    isGeminiLoading,
    isClaudeLoading,
    collaborationStatus,
    artifact,
    errors,
    originalPrompt,
    currentPrompts,

    // Actions
    startParallelThinking,
    synthesizeResponses,
    generateArtifact,
    sendFollowUp,
    resetSession,
    getLastResponses,
    checkConfiguration,
    setTemplatePrompts,

    // Constants
    COLLABORATION_STATUS,
  };
};

export default useDualAICollaboration;
