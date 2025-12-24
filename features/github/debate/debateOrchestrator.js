/**
 * Debate Orchestrator
 * Manages the debate flow between GPT-5.2 (Analyst) and Claude Opus 4.5 (Critic)
 */

import {
  addMessageToContext,
  updateAgreedPoints,
  updateContestedPoints,
  buildContextPrompt,
  hasReachedConsensus,
} from './contextManager';

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

// System prompts for each role
const SYSTEM_PROMPTS = {
  analyst: `You are an expert code analyst working as part of a dual-AI system. Your role is to provide thorough, well-reasoned analysis of GitHub repositories based on the user's questions.

Your approach:
1. Analyze the repository context provided (README, structure, issues, PRs)
2. Provide clear, structured answers with specific examples from the codebase
3. Identify key patterns, potential issues, and recommendations
4. Be open to critique and willing to revise your analysis

When the Critic provides feedback:
- Consider their points carefully
- Acknowledge valid criticisms
- Defend your position with evidence when appropriate
- Synthesize both perspectives into improved analysis

Format your response with:
- Clear headings for different aspects of your analysis
- Code references where applicable
- Confidence levels for your conclusions
- Key points that you believe are well-supported`,

  critic: `You are an expert code reviewer working as part of a dual-AI system. Your role is to critically evaluate the Analyst's responses and provide constructive feedback.

Your approach:
1. Carefully review the Analyst's analysis
2. Identify gaps, errors, or alternative interpretations
3. Provide specific, actionable feedback
4. Acknowledge strong points while highlighting areas for improvement

When reviewing:
- Point out any missed considerations
- Suggest alternative approaches or interpretations
- Verify claims against the repository context
- Help refine the analysis toward consensus

At the end of your response, include:
## Agreement Assessment
- Points you AGREE with (list them clearly)
- Points you DISAGREE with or want to refine
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
    const lastCriticMessage = context.recentMessages.filter((m) => m.role === 'critic').pop();
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
    const { agreedPoints, contestedPoints } = extractAgreementInfo(response.content);
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
 */
const extractAgreementInfo = (content) => {
  const agreedPoints = [];
  const contestedPoints = [];

  // Look for agreement section
  const agreementMatch = content.match(/## Agreement Assessment([\s\S]*?)(?=##|$)/i);
  if (agreementMatch) {
    const agreementSection = agreementMatch[1];

    // Extract agreed points
    const agreeMatch = agreementSection.match(
      /(?:agree with|points? (?:I )?agree)[\s\S]*?(?=-|\n\n|$)/gi
    );
    if (agreeMatch) {
      const bulletPoints = agreementSection.match(/(?:agree[\s\S]*?)[-•]\s*([^\n]+)/gi);
      if (bulletPoints) {
        bulletPoints.forEach((point) => {
          const cleanPoint = point.replace(/^[-•]\s*/, '').trim();
          if (cleanPoint.length > 10) {
            agreedPoints.push(cleanPoint.substring(0, 200));
          }
        });
      }
    }

    // Extract disagreed/contested points
    const disagreeMatch = agreementSection.match(
      /(?:disagree|refine|concern|issue)[\s\S]*?(?=-|\n\n|$)/gi
    );
    if (disagreeMatch) {
      const bulletPoints = agreementSection.match(/(?:disagree[\s\S]*?)[-•]\s*([^\n]+)/gi);
      if (bulletPoints) {
        bulletPoints.forEach((point) => {
          const cleanPoint = point.replace(/^[-•]\s*/, '').trim();
          if (cleanPoint.length > 10) {
            contestedPoints.push(cleanPoint.substring(0, 200));
          }
        });
      }
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
    shouldStop = () => false,
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

  return {
    context,
    messages,
    reachedConsensus: hasReachedConsensus(context),
    totalRounds: context.currentRound,
  };
};

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
