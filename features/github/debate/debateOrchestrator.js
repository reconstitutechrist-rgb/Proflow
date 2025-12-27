/**
 * Debate Orchestrator
 * Manages the debate flow between GPT-5.2 (Analyst) and Claude Opus 4.5 (Critic)
 *
 * Enhanced with persistent debate memory:
 * - Saves insights after debate consensus
 * - Tracks agreed points for future sessions
 */

import {
  addMessageToContext,
  updateAgreedPoints,
  updateContestedPoints,
  buildContextPrompt,
  hasReachedConsensus,
} from './contextManager';

import { saveDebateInsights, extractInsightsFromDebate } from '@/api/debateMemory';

// AI Model configurations
const AI_MODELS = {
  analyst: {
    name: 'GPT-5.2',
    role: 'analyst',
    provider: 'openai',
    model: 'gpt-5.2', // Placeholder - use actual model ID when available
    color: '#3B82F6', // Blue
    icon: '🔵',
  },
  critic: {
    name: 'Claude Opus 4.5',
    role: 'critic',
    provider: 'anthropic',
    model: 'claude-opus-4-5-20251101',
    color: '#8B5CF6', // Purple
    icon: '🟣',
  },
};

// System prompts for each role (enhanced with memory awareness)
const SYSTEM_PROMPTS = {
  analyst: `You are an expert code analyst working as part of a dual-AI system. Your role is to provide thorough, well-reasoned analysis of GitHub repositories based on the user's questions.

CRITICAL: You may have access to VERIFIED Repository Knowledge from deep code analysis. This is real, verified information extracted from the codebase. USE IT as your primary source of truth.

Your approach:
1. Analyze the VERIFIED repository knowledge first (if provided)
2. Reference specific functions, classes, and patterns from the verified context
3. Provide clear, structured answers with specific examples from the codebase
4. Identify key patterns, potential issues, and recommendations
5. Be open to critique and willing to revise your analysis

IMPORTANT RULES:
- If the context shows "Already Agreed" points, DO NOT re-debate them
- If you see "Key Decisions Made", acknowledge and build upon them
- NEVER hallucinate or assume about code not in your context
- If asked about something not covered, say "I don't have that information"

When the Critic provides feedback:
- Consider their points carefully
- Acknowledge valid criticisms
- Defend your position with evidence FROM THE CONTEXT
- Synthesize both perspectives into improved analysis

Format your response with:
- Clear headings for different aspects of your analysis
- Specific references to verified code (file paths, function names)
- Confidence levels for your conclusions
- Key points that you believe are well-supported`,

  critic: `You are an expert code reviewer working as part of a dual-AI system. Your role is to critically evaluate the Analyst's responses and ensure accuracy against verified repository knowledge.

CRITICAL: You may have access to VERIFIED Repository Knowledge from deep code analysis. Use this to verify the Analyst's claims. Call out any hallucinations or unsupported claims.

Your approach:
1. Verify the Analyst's claims against the VERIFIED repository knowledge
2. Identify gaps, errors, or alternative interpretations
3. Provide specific, actionable feedback with evidence
4. Acknowledge strong points while highlighting inaccuracies

IMPORTANT RULES:
- If the context shows "Already Agreed" points, DO NOT re-debate them
- Focus on NEW points and unresolved issues
- If you see "Key Decisions Made", acknowledge they're settled
- NEVER hallucinate or assume about code not in your context
- Verify ALL claims against the provided context

When reviewing:
- Point out any missed considerations
- Flag any claims that aren't supported by the verified context
- Suggest alternative approaches or interpretations
- Help refine the analysis toward consensus

At the end of your response, include:
## Agreement Assessment
- Points I AGREE with (list them clearly with evidence)
- Points I DISAGREE with or want to refine (explain why)
- Points that are UNVERIFIABLE from context (flag these)
- Suggested revisions
- Overall agreement level: [Strong/Moderate/Weak]`,
};

/**
 * Run a single debate round
 * @param {Object} context - Current debate context
 * @param {string} role - 'analyst' or 'critic'
 * @param {Function} invokeAI - Function to call AI API
 * @returns {Object} Updated context and message
 */
export const runDebateRound = async (context, role, invokeAI) => {
  const model = AI_MODELS[role];
  const systemPrompt = SYSTEM_PROMPTS[role];

  // Build the context prompt
  const contextPrompt = buildContextPrompt(context);

  // Create the user message based on role and round
  let userMessage;
  if (role === 'analyst' && context.currentRound === 1) {
    // First round - analyst responds to original query
    userMessage = `Please analyze this repository based on the user's question. Use the repository context provided above.`;
  } else if (role === 'analyst') {
    // Subsequent rounds - analyst responds to critic
    const _lastCriticMessage = context.recentMessages.filter((m) => m.role === 'critic').pop();
    userMessage = `The Critic has provided feedback on your previous analysis. Please review their points and provide a refined analysis that addresses their concerns while maintaining well-supported conclusions.`;
  } else {
    // Critic reviews analyst's response
    userMessage = `Please review the Analyst's most recent response. Provide a critical evaluation, identifying strengths, weaknesses, and areas for refinement. Include your agreement assessment at the end.`;
  }

  // Call the AI
  const response = await invokeAI({
    provider: model.provider,
    model: model.model,
    systemPrompt,
    messages: [
      { role: 'user', content: contextPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  // Create the message object
  const message = {
    id: crypto.randomUUID(),
    role: model.role,
    modelName: model.name,
    content: response.content,
    round: context.currentRound,
    timestamp: new Date().toISOString(),
    tokenUsage: response.usage,
  };

  // Update context with new message
  let updatedContext = addMessageToContext(context, message);

  // If this is a critic response, extract agreement info
  if (role === 'critic') {
    const { agreedPoints, contestedPoints } = extractAgreementInfo(
      response.content,
      context.currentRound
    );
    updatedContext = updateAgreedPoints(updatedContext, agreedPoints);
    updatedContext = updateContestedPoints(updatedContext, contestedPoints);
  }

  return {
    context: updatedContext,
    message,
  };
};

/**
 * Extract agreement information from critic's response
 * Enhanced to return structured data for better tracking
 */
const extractAgreementInfo = (content, currentRound) => {
  const agreedPoints = [];
  const contestedPoints = [];

  // Look for agreement section
  const agreementMatch = content.match(/## Agreement Assessment([\s\S]*?)(?=##|$)/i);
  if (agreementMatch) {
    const agreementSection = agreementMatch[1];

    // Extract agreed points with structured format
    const agreeSection = agreementSection.match(
      /Points I AGREE with[:\s]*([\s\S]*?)(?=Points I DISAGREE|Points that are|Suggested|Overall|$)/i
    );
    if (agreeSection) {
      const lines = agreeSection[1].split('\n');
      lines.forEach((line) => {
        const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
        if (cleanLine.length > 10 && !cleanLine.toLowerCase().startsWith('point')) {
          agreedPoints.push({
            point: cleanLine.substring(0, 200),
            round: currentRound,
            confidence: 'high',
          });
        }
      });
    }

    // Extract disagreed/contested points with structured format
    const disagreeSection = agreementSection.match(
      /Points I DISAGREE with[:\s]*([\s\S]*?)(?=Points that are|Suggested|Overall|$)/i
    );
    if (disagreeSection) {
      const lines = disagreeSection[1].split('\n');
      lines.forEach((line) => {
        const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
        if (cleanLine.length > 10 && !cleanLine.toLowerCase().startsWith('point')) {
          contestedPoints.push({
            point: cleanLine.substring(0, 200),
            status: 'open',
            round: currentRound,
          });
        }
      });
    }

    // Also check for unverifiable points
    const unverifiableSection = agreementSection.match(
      /Points that are UNVERIFIABLE[:\s]*([\s\S]*?)(?=Suggested|Overall|$)/i
    );
    if (unverifiableSection) {
      const lines = unverifiableSection[1].split('\n');
      lines.forEach((line) => {
        const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
        if (cleanLine.length > 10) {
          contestedPoints.push({
            point: cleanLine.substring(0, 200),
            status: 'unverifiable',
            round: currentRound,
          });
        }
      });
    }
  }

  return { agreedPoints, contestedPoints };
};

/**
 * Run a full debate session until consensus or max rounds
 */
export const runFullDebate = async (initialContext, invokeAI, options = {}) => {
  const {
    maxRounds = 5,
    onMessage,
    onRoundComplete,
    onConsensus,
    onDebateComplete,
    shouldStop = () => false,
    sessionInfo = null, // { sessionId, workspaceId, repositoryId }
  } = options;

  let context = { ...initialContext, currentRound: 1 };
  const messages = [];

  while (context.currentRound <= maxRounds && !shouldStop()) {
    // Analyst turn
    const analystResult = await runDebateRound(context, 'analyst', invokeAI);
    context = { ...analystResult.context };
    messages.push(analystResult.message);
    onMessage?.(analystResult.message, context);

    if (shouldStop()) break;

    // Critic turn
    const criticResult = await runDebateRound(context, 'critic', invokeAI);
    context = { ...criticResult.context };
    messages.push(criticResult.message);
    onMessage?.(criticResult.message, context);

    // Check for consensus
    if (hasReachedConsensus(context)) {
      onConsensus?.(context);
      break;
    }

    onRoundComplete?.(context.currentRound, context);
    context.currentRound++;
  }

  const reachedConsensus = hasReachedConsensus(context);

  // Save insights when debate completes (if session info provided)
  if (sessionInfo && (reachedConsensus || context.currentRound >= maxRounds)) {
    try {
      await persistDebateInsights(context, sessionInfo);
      onDebateComplete?.(context, { insightsSaved: true });
    } catch (error) {
      console.error('Failed to save debate insights:', error);
      onDebateComplete?.(context, { insightsSaved: false, error });
    }
  }

  return {
    context,
    messages,
    reachedConsensus,
    totalRounds: context.currentRound,
  };
};

/**
 * Persist debate insights to the database
 * @param {Object} context - The final debate context
 * @param {Object} sessionInfo - Session metadata
 */
async function persistDebateInsights(context, sessionInfo) {
  const { sessionId, workspaceId, repositoryId } = sessionInfo;

  if (!sessionId || !workspaceId || !repositoryId) {
    console.warn('Missing session info for saving insights');
    return;
  }

  // Extract insights from the debate context
  const insights = extractInsightsFromDebate(context);

  if (insights.length === 0) {
    console.log('No insights to save from debate');
    return;
  }

  // Save to database with embeddings
  const saved = await saveDebateInsights(sessionId, insights, workspaceId, repositoryId);
  console.log(`Saved ${saved.length} insights from debate session ${sessionId}`);

  return saved;
}

/**
 * Generate final agreed response from debate
 */
export const generateFinalResponse = async (context, invokeAI) => {
  const contextPrompt = buildContextPrompt(context);

  const response = await invokeAI({
    provider: 'anthropic',
    model: 'claude-opus-4-5-20251101',
    systemPrompt: `You are synthesizing the results of a dual-AI debate. Create a clear, well-structured final response that incorporates the agreed-upon points from both the Analyst and Critic.

Your response should:
1. Present the key findings and conclusions
2. Include only well-supported points
3. Note any remaining areas of uncertainty
4. Provide actionable recommendations

Format with clear headings and be concise but thorough.`,
    messages: [
      { role: 'user', content: contextPrompt },
      {
        role: 'user',
        content: `Based on the debate above, synthesize a final, agreed-upon response to the user's original question. Focus on the points both AIs agreed upon and present a cohesive analysis.`,
      },
    ],
  });

  return response.content;
};

export { AI_MODELS };

export default {
  runDebateRound,
  runFullDebate,
  generateFinalResponse,
  AI_MODELS,
};
