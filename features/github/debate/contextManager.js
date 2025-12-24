/**
 * Context Manager for Dual-AI Debate System
 * Handles sliding window memory, summarization, and key points tracking
 */

// Maximum messages to keep in full detail
const MAX_FULL_MESSAGES = 10;
// Maximum characters for context summary
const MAX_SUMMARY_LENGTH = 4000;

/**
 * Context state structure
 */
export const createInitialContext = () => ({
  // Full message history (sliding window)
  recentMessages: [],
  // Condensed summary of older messages
  historySummary: '',
  // Key points both AIs have agreed on
  agreedPoints: [],
  // Points that are still contested
  contestedPoints: [],
  // Repository context (cached)
  repoContext: {
    readme: null,
    structure: null,
    languages: {},
    recentCommits: [],
    openIssues: [],
    openPRs: [],
  },
  // User's original query
  originalQuery: '',
  // Current round number
  currentRound: 0,
});

/**
 * Add a message to the context
 * Implements sliding window - older messages get summarized
 */
export const addMessageToContext = (context, message) => {
  const newMessages = [...context.recentMessages, message];

  // If we have too many messages, summarize older ones
  if (newMessages.length > MAX_FULL_MESSAGES) {
    const messagesToSummarize = newMessages.slice(0, newMessages.length - MAX_FULL_MESSAGES);
    const messagesToKeep = newMessages.slice(-MAX_FULL_MESSAGES);

    // Create summary of older messages
    const newSummary = summarizeMessages(messagesToSummarize, context.historySummary);

    return {
      ...context,
      recentMessages: messagesToKeep,
      historySummary: newSummary,
    };
  }

  return {
    ...context,
    recentMessages: newMessages,
  };
};

/**
 * Summarize messages into a condensed format
 */
const summarizeMessages = (messages, existingSummary) => {
  // Extract key points from messages
  const keyPoints = messages.map((msg) => {
    const role = msg.role === 'analyst' ? 'Analyst' : 'Critic';
    // Take first 200 chars of content as summary
    const content = msg.content.substring(0, 200);
    return `[Round ${msg.round}] ${role}: ${content}...`;
  });

  const newSummary = keyPoints.join('\n');

  // Combine with existing summary, keeping within limit
  let combined = existingSummary ? `${existingSummary}\n\n${newSummary}` : newSummary;

  // Truncate if too long
  if (combined.length > MAX_SUMMARY_LENGTH) {
    combined = combined.substring(combined.length - MAX_SUMMARY_LENGTH);
    // Find first newline to start at a clean point
    const firstNewline = combined.indexOf('\n');
    if (firstNewline > 0) {
      combined = '...' + combined.substring(firstNewline);
    }
  }

  return combined;
};

/**
 * Update agreed points based on AI response analysis
 */
export const updateAgreedPoints = (context, newPoints) => {
  // Merge new agreed points, avoiding duplicates
  const existingSet = new Set(context.agreedPoints.map((p) => p.toLowerCase()));
  const uniqueNewPoints = newPoints.filter((point) => !existingSet.has(point.toLowerCase()));

  return {
    ...context,
    agreedPoints: [...context.agreedPoints, ...uniqueNewPoints],
  };
};

/**
 * Update contested points
 */
export const updateContestedPoints = (context, newPoints) => {
  return {
    ...context,
    contestedPoints: newPoints,
  };
};

/**
 * Set repository context (cached GitHub data)
 */
export const setRepoContext = (context, repoData) => {
  return {
    ...context,
    repoContext: {
      ...context.repoContext,
      ...repoData,
    },
  };
};

/**
 * Build the full context string for AI prompt
 * Optimized for token efficiency
 */
export const buildContextPrompt = (context, maxTokens = 8000) => {
  const parts = [];

  // 1. Repository Context (most important)
  if (context.repoContext.readme) {
    parts.push(`## Repository README\n${truncateText(context.repoContext.readme, 1500)}`);
  }

  if (context.repoContext.structure) {
    parts.push(`## File Structure\n${truncateText(context.repoContext.structure, 500)}`);
  }

  if (Object.keys(context.repoContext.languages).length > 0) {
    const langs = Object.entries(context.repoContext.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, bytes]) => `${lang}: ${formatBytes(bytes)}`)
      .join(', ');
    parts.push(`## Languages\n${langs}`);
  }

  if (context.repoContext.openIssues.length > 0) {
    const issues = context.repoContext.openIssues
      .slice(0, 5)
      .map((i) => `- #${i.number}: ${i.title}`)
      .join('\n');
    parts.push(`## Open Issues (${context.repoContext.openIssues.length} total)\n${issues}`);
  }

  if (context.repoContext.openPRs.length > 0) {
    const prs = context.repoContext.openPRs
      .slice(0, 5)
      .map((pr) => `- #${pr.number}: ${pr.title}`)
      .join('\n');
    parts.push(`## Open Pull Requests (${context.repoContext.openPRs.length} total)\n${prs}`);
  }

  // 2. User's Original Query
  parts.push(`## User's Question\n${context.originalQuery}`);

  // 3. Agreed Points (if any)
  if (context.agreedPoints.length > 0) {
    parts.push(`## Agreed Points\n${context.agreedPoints.map((p) => `- ${p}`).join('\n')}`);
  }

  // 4. Contested Points (if any)
  if (context.contestedPoints.length > 0) {
    parts.push(
      `## Points Under Discussion\n${context.contestedPoints.map((p) => `- ${p}`).join('\n')}`
    );
  }

  // 5. History Summary (if exists)
  if (context.historySummary) {
    parts.push(`## Previous Discussion Summary\n${context.historySummary}`);
  }

  // 6. Recent Messages (most recent context)
  if (context.recentMessages.length > 0) {
    const recentMsgs = context.recentMessages
      .map((msg) => {
        const role = msg.role === 'analyst' ? '🔵 Analyst' : '🟣 Critic';
        return `${role} (Round ${msg.round}):\n${msg.content}`;
      })
      .join('\n\n');
    parts.push(`## Recent Discussion\n${recentMsgs}`);
  }

  // Join all parts
  let fullContext = parts.join('\n\n---\n\n');

  // Truncate if too long (rough token estimate: 1 token ≈ 4 chars)
  const maxChars = maxTokens * 4;
  if (fullContext.length > maxChars) {
    fullContext = fullContext.substring(0, maxChars) + '\n\n[Context truncated for length]';
  }

  return fullContext;
};

/**
 * Calculate consensus score based on agreed vs contested points
 */
export const calculateConsensusScore = (context) => {
  const agreedCount = context.agreedPoints.length;
  const contestedCount = context.contestedPoints.length;
  const total = agreedCount + contestedCount;

  if (total === 0) return 0;
  return Math.round((agreedCount / total) * 100);
};

/**
 * Check if consensus has been reached
 */
export const hasReachedConsensus = (context, threshold = 85) => {
  const score = calculateConsensusScore(context);
  return score >= threshold && context.contestedPoints.length === 0;
};

// Helper functions
const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default {
  createInitialContext,
  addMessageToContext,
  updateAgreedPoints,
  updateContestedPoints,
  setRepoContext,
  buildContextPrompt,
  calculateConsensusScore,
  hasReachedConsensus,
};
