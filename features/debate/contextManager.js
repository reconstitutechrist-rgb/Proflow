/**
 * Context Manager for Dual-AI Debate System
 * Handles smart LLM summarization, context management, and structured tracking
 *
 * Enhanced to support multiple context types:
 * - 'none': General topic debates
 * - 'project': Proflow project context
 * - 'assignment': Proflow assignment context
 * - 'github': GitHub repository context
 */

import {
  findRelevantInsights,
  getEstablishedInsights,
  formatInsightsForContext,
} from '@/api/debateMemory';

// Configuration
const MAX_FULL_MESSAGES = 6; // Keep last 6 messages in full detail
const MAX_SUMMARY_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 12000;
const SUMMARIZATION_TRIGGER = 8; // Trigger summarization when > 8 messages

/**
 * Context state structure (enhanced for multiple context types)
 */
export const createInitialContext = () => ({
  // Full message history (sliding window)
  recentMessages: [],

  // Condensed summary of older messages (LLM-generated)
  historySummary: '',

  // Structured memory (LLM-extracted)
  agreedPoints: [], // [{point, round, confidence}]
  contestedPoints: [], // [{point, status, resolution}]
  decisionsLog: [], // [{decision, round, reasoning}]
  keyFindings: [], // [{finding, source, category}]

  // Context type tracking
  contextType: 'none', // 'none' | 'project' | 'assignment' | 'github'

  // Proflow context (for project/assignment)
  proflowContext: {
    project: null,
    assignment: null,
    tasks: [],
    documents: [],
    notes: [],
  },

  // Repository context (for github - cached GitHub data)
  repoContext: {
    readme: null,
    structure: null,
    languages: {},
    recentCommits: [],
    openIssues: [],
    openPRs: [],
  },

  // Repository memory (deep analysis from Part 1)
  repositoryMemory: null,

  // Past debate insights (semantic retrieval)
  pastInsights: [], // Semantically relevant insights from past debates
  establishedFacts: [], // High-confidence agreed points from past sessions

  // User's original query
  originalQuery: '',

  // Current round number
  currentRound: 0,

  // Track if summarization is needed
  needsSummarization: false,
});

/**
 * Add a message to the context
 * Implements smart sliding window
 */
export const addMessageToContext = (context, message) => {
  const newMessages = [...context.recentMessages, message];

  // Check if we need summarization
  const needsSummarization = newMessages.length > SUMMARIZATION_TRIGGER;

  // If we have too many messages, mark for summarization
  if (newMessages.length > MAX_FULL_MESSAGES + 2) {
    const messagesToKeep = newMessages.slice(-MAX_FULL_MESSAGES);

    return {
      ...context,
      recentMessages: messagesToKeep,
      needsSummarization: true,
    };
  }

  return {
    ...context,
    recentMessages: newMessages,
    needsSummarization,
  };
};

/**
 * Smart summarization using LLM
 * Called after each round to extract structured information
 *
 * @param {Object} context - Current debate context
 * @param {Function} invokeAI - Function to invoke AI for summarization
 * @returns {Object} Updated context with extracted information
 */
export const smartSummarize = async (context, invokeAI) => {
  if (!context.needsSummarization && context.recentMessages.length <= MAX_FULL_MESSAGES) {
    return context;
  }

  const messagesToSummarize = context.recentMessages.slice(0, -MAX_FULL_MESSAGES);

  if (messagesToSummarize.length === 0) {
    return { ...context, needsSummarization: false };
  }

  // Build summarization prompt
  const summarizationPrompt = buildSummarizationPrompt(
    messagesToSummarize,
    context.historySummary,
    context.agreedPoints,
    context.contestedPoints
  );

  try {
    // Call LLM for smart summarization
    const result = await invokeAI({
      provider: 'summarizer',
      model: 'gpt-4o-mini', // Use fast model for summarization
      systemPrompt: SUMMARIZATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: summarizationPrompt }],
    });

    // Parse the structured response
    const extracted = parseSummarizationResponse(result.content);

    // Merge with existing context
    return {
      ...context,
      historySummary: mergeHistorySummary(context.historySummary, extracted.narrativeSummary),
      agreedPoints: mergeAgreedPoints(context.agreedPoints, extracted.agreedPoints),
      contestedPoints: extracted.contestedPoints || context.contestedPoints,
      decisionsLog: [...context.decisionsLog, ...(extracted.decisions || [])],
      keyFindings: [...context.keyFindings, ...(extracted.keyFindings || [])],
      recentMessages: context.recentMessages.slice(-MAX_FULL_MESSAGES),
      needsSummarization: false,
    };
  } catch (error) {
    console.warn('Smart summarization failed, using fallback:', error);
    // Fallback to simple summarization
    return {
      ...context,
      historySummary: fallbackSummarize(messagesToSummarize, context.historySummary),
      recentMessages: context.recentMessages.slice(-MAX_FULL_MESSAGES),
      needsSummarization: false,
    };
  }
};

/**
 * System prompt for LLM summarization
 */
const SUMMARIZATION_SYSTEM_PROMPT = `You are a precise debate summarizer. Extract structured information from AI debate exchanges.

Your job is to:
1. Identify points both AIs have explicitly agreed on
2. Track contested points and their resolution status
3. Log key decisions and their reasoning
4. Extract important findings
5. Write a concise narrative summary preserving critical context

DISCARD:
- Pleasantries and filler text
- Redundant restatements
- Meta-commentary about the debate itself

Output JSON with this exact structure:
{
  "agreedPoints": [{"point": "...", "round": 1, "confidence": "high|medium|low"}],
  "contestedPoints": [{"point": "...", "status": "open|resolved", "resolution": "..."}],
  "decisions": [{"decision": "...", "round": 1, "reasoning": "..."}],
  "keyFindings": [{"finding": "...", "source": "Analyst|Critic", "category": "architecture|pattern|issue|recommendation"}],
  "narrativeSummary": "500-word max summary preserving critical technical details"
}`;

/**
 * Build prompt for summarization
 */
const buildSummarizationPrompt = (messages, existingSummary, agreedPoints, contestedPoints) => {
  const parts = [];

  if (existingSummary) {
    parts.push(`## Previous Summary\n${existingSummary}`);
  }

  if (agreedPoints.length > 0) {
    parts.push(
      `## Already Agreed Points\n${agreedPoints
        .map((p) => (typeof p === 'string' ? `- ${p}` : `- ${p.point} (Round ${p.round})`))
        .join('\n')}`
    );
  }

  if (contestedPoints.length > 0) {
    parts.push(
      `## Currently Contested\n${contestedPoints
        .map((p) => (typeof p === 'string' ? `- ${p}` : `- ${p.point}`))
        .join('\n')}`
    );
  }

  parts.push('## Messages to Summarize');
  messages.forEach((msg) => {
    const role = msg.role === 'analyst' ? 'Analyst' : 'Critic';
    parts.push(`### ${role} (Round ${msg.round})\n${msg.content}`);
  });

  parts.push('\nExtract structured information and create a narrative summary.');

  return parts.join('\n\n');
};

/**
 * Parse LLM summarization response
 */
const parseSummarizationResponse = (content) => {
  if (!content) {
    return {
      agreedPoints: [],
      contestedPoints: [],
      decisions: [],
      keyFindings: [],
      narrativeSummary: '',
    };
  }

  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // If JSON parsing fails, extract what we can
  }

  // Fallback: return basic structure
  return {
    agreedPoints: [],
    contestedPoints: [],
    decisions: [],
    keyFindings: [],
    narrativeSummary: content.substring(0, 500),
  };
};

/**
 * Merge history summaries
 */
const mergeHistorySummary = (existing, newSummary) => {
  if (!newSummary) return existing;
  if (!existing) return newSummary;

  let combined = `${existing}\n\n---\n\n${newSummary}`;

  // Truncate if too long
  if (combined.length > MAX_SUMMARY_LENGTH) {
    combined = combined.substring(combined.length - MAX_SUMMARY_LENGTH);
    const firstNewline = combined.indexOf('\n');
    if (firstNewline > 0) {
      combined = '...' + combined.substring(firstNewline);
    }
  }

  return combined;
};

/**
 * Merge agreed points, avoiding duplicates
 */
const mergeAgreedPoints = (existing, newPoints) => {
  if (!newPoints || newPoints.length === 0) return existing;

  const existingStrings = new Set(
    existing.map((p) => (typeof p === 'string' ? p : p.point).toLowerCase())
  );

  const unique = newPoints.filter((p) => {
    const pointStr = (typeof p === 'string' ? p : p.point).toLowerCase();
    return !existingStrings.has(pointStr);
  });

  return [...existing, ...unique];
};

/**
 * Fallback summarization (when LLM fails)
 */
const fallbackSummarize = (messages, existingSummary) => {
  const keyPoints = messages.map((msg) => {
    const role = msg.role === 'analyst' ? 'Analyst' : 'Critic';
    const content = msg.content.substring(0, 300);
    return `[R${msg.round}] ${role}: ${content}...`;
  });

  const newSummary = keyPoints.join('\n');
  return mergeHistorySummary(existingSummary, newSummary);
};

/**
 * Set Proflow context (project or assignment data)
 */
export const setProflowContext = (context, data) => {
  return {
    ...context,
    proflowContext: {
      ...context.proflowContext,
      ...data,
    },
  };
};

/**
 * Set repository memory (from deep analysis)
 */
export const setRepositoryMemory = (context, memory) => {
  return {
    ...context,
    repositoryMemory: memory,
  };
};

/**
 * Load past insights and established facts for an entity
 * Called before starting a new debate session
 *
 * @param {string} entityId - The entity ID (repository, project, or assignment)
 * @param {string} query - The user's query (for semantic search)
 * @param {Object} options - Load options
 * @param {string} options.contextType - Context type: 'github', 'project', or 'assignment'
 * @returns {Promise<Object>} Object with relevantInsights and establishedFacts
 */
export async function loadPastContext(entityId, query, options = {}) {
  const { contextType = 'github' } = options;

  try {
    const [relevantInsights, establishedFacts] = await Promise.all([
      findRelevantInsights(query, entityId, { limit: 10, threshold: 0.7, contextType }),
      getEstablishedInsights(entityId, { minConfidence: 0.85, limit: 15, contextType }),
    ]);

    return {
      relevantInsights: relevantInsights || [],
      establishedFacts: establishedFacts || [],
    };
  } catch (error) {
    console.warn('Failed to load past context:', error.message);
    return {
      relevantInsights: [],
      establishedFacts: [],
    };
  }
}

/**
 * Set past insights in context
 */
export const setPastInsights = (context, pastInsights, establishedFacts) => {
  return {
    ...context,
    pastInsights: pastInsights || [],
    establishedFacts: establishedFacts || [],
  };
};

/**
 * Update agreed points based on AI response analysis
 */
export const updateAgreedPoints = (context, newPoints) => {
  return {
    ...context,
    agreedPoints: mergeAgreedPoints(context.agreedPoints, newPoints),
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
 * Add a decision to the log
 */
export const addDecision = (context, decision, round, reasoning) => {
  return {
    ...context,
    decisionsLog: [
      ...context.decisionsLog,
      { decision, round, reasoning, timestamp: new Date().toISOString() },
    ],
  };
};

/**
 * Add a key finding
 */
export const addKeyFinding = (context, finding, source, category) => {
  return {
    ...context,
    keyFindings: [...context.keyFindings, { finding, source, category }],
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
 * Build Proflow project context section for AI prompt
 */
const buildProjectContextSection = (proflow) => {
  const sections = [];

  if (proflow.project) {
    sections.push(`### Project: ${proflow.project.name}`);
    if (proflow.project.description) {
      sections.push(`Description: ${proflow.project.description}`);
    }
    if (proflow.project.goals) {
      sections.push(`Goals: ${proflow.project.goals}`);
    }
    if (proflow.project.status) {
      sections.push(`Status: ${proflow.project.status}`);
    }
  }

  if (proflow.tasks?.length > 0) {
    sections.push(`\n### Tasks (${proflow.tasks.length} total)`);
    proflow.tasks.slice(0, 10).forEach((task) => {
      sections.push(
        `- [${task.status}] ${task.title}${task.priority ? ` (${task.priority})` : ''}`
      );
    });
    if (proflow.tasks.length > 10) {
      sections.push(`... and ${proflow.tasks.length - 10} more tasks`);
    }
  }

  if (proflow.documents?.length > 0) {
    sections.push(`\n### Related Documents (${proflow.documents.length})`);
    proflow.documents.slice(0, 5).forEach((doc) => {
      sections.push(`- ${doc.name || doc.title}`);
    });
  }

  if (proflow.notes?.length > 0) {
    sections.push(`\n### Notes (${proflow.notes.length})`);
    proflow.notes.slice(0, 5).forEach((note) => {
      sections.push(`- ${note.title}`);
    });
  }

  return sections.join('\n');
};

/**
 * Build Proflow assignment context section for AI prompt
 */
const buildAssignmentContextSection = (proflow) => {
  const sections = [];

  if (proflow.assignment) {
    sections.push(`### Assignment: ${proflow.assignment.name}`);
    if (proflow.assignment.description) {
      sections.push(`Description: ${proflow.assignment.description}`);
    }
    if (proflow.assignment.status) {
      sections.push(`Status: ${proflow.assignment.status}`);
    }
    if (proflow.assignment.priority) {
      sections.push(`Priority: ${proflow.assignment.priority}`);
    }
  }

  if (proflow.tasks?.length > 0) {
    sections.push(`\n### Tasks (${proflow.tasks.length} total)`);
    proflow.tasks.slice(0, 10).forEach((task) => {
      sections.push(`- [${task.status}] ${task.title}`);
    });
  }

  if (proflow.documents?.length > 0) {
    sections.push(`\n### Related Documents (${proflow.documents.length})`);
    proflow.documents.slice(0, 5).forEach((doc) => {
      sections.push(`- ${doc.name || doc.title}`);
    });
  }

  return sections.join('\n');
};

/**
 * Get context type label for display
 */
const getContextTypeLabel = (contextType) => {
  const labels = {
    none: 'General Topic',
    project: 'Proflow Project',
    assignment: 'Proflow Assignment',
    github: 'GitHub Repository',
  };
  return labels[contextType] || 'Unknown';
};

/**
 * Build the full context string for AI prompt
 * Enhanced with repository memory and structured state
 */
export const buildContextPrompt = (context, maxTokens = 8000) => {
  const parts = [];

  // Context type header
  parts.push(`## Debate Context: ${getContextTypeLabel(context.contextType)}`);

  // Type-specific context
  switch (context.contextType) {
    case 'project':
      if (context.proflowContext.project || context.proflowContext.tasks?.length > 0) {
        parts.push(`## Project Context\n${buildProjectContextSection(context.proflowContext)}`);
      }
      break;

    case 'assignment':
      if (context.proflowContext.assignment || context.proflowContext.tasks?.length > 0) {
        parts.push(
          `## Assignment Context\n${buildAssignmentContextSection(context.proflowContext)}`
        );
      }
      break;

    case 'github':
      // Repository Memory (VERIFIED knowledge - highest priority)
      if (context.repositoryMemory?.accumulated_context) {
        parts.push(
          `## VERIFIED Repository Knowledge\n${context.repositoryMemory.accumulated_context}`
        );
        parts.push(
          '\nUse this VERIFIED KNOWLEDGE. Do not assume or hallucinate about code not described above.'
        );
      }

      // Repository Context (GitHub data)
      if (context.repoContext.readme && !context.repositoryMemory) {
        parts.push(`## Repository README\n${truncateText(context.repoContext.readme, 1000)}`);
      }

      if (context.repoContext.structure && !context.repositoryMemory) {
        parts.push(`## File Structure\n${truncateText(context.repoContext.structure, 400)}`);
      }

      if (Object.keys(context.repoContext.languages).length > 0 && !context.repositoryMemory) {
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
      break;

    case 'none':
    default:
      parts.push('This is a general topic debate with no specific project context.');
      break;
  }

  // Past Debate Insights (from previous sessions) - for any context type
  if (context.pastInsights?.length > 0) {
    const insightsText = formatInsightsForContext(context.pastInsights, { maxLength: 2000 });
    if (insightsText) {
      parts.push(
        `## Previously Established Insights\nThese were discovered in past debates:\n${insightsText}`
      );
    }
  }

  if (context.establishedFacts?.length > 0) {
    const facts = context.establishedFacts
      .slice(0, 10)
      .map((f) => `- ${f.insight_text}`)
      .join('\n');
    parts.push(
      `## Established Facts (High Confidence)\nThese facts were agreed upon by both AIs in previous debates:\n${facts}`
    );
  }

  // Debate State Summary
  parts.push('## Current Debate State');

  // Already agreed (do not re-debate)
  if (context.agreedPoints.length > 0) {
    const agreedList = context.agreedPoints
      .map((p) => (typeof p === 'string' ? `- ${p}` : `- ${p.point} (Round ${p.round})`))
      .join('\n');
    parts.push(`### Already Agreed (do not re-debate):\n${agreedList}`);
  }

  // Resolved contests (only objects with status can be resolved)
  const resolved = context.contestedPoints.filter(
    (p) => typeof p === 'object' && p.status === 'resolved'
  );
  if (resolved.length > 0) {
    const resolvedList = resolved
      .map((p) => `- ${p.point}: ${p.resolution || 'Resolved'}`)
      .join('\n');
    parts.push(`### Resolved Issues:\n${resolvedList}`);
  }

  // Still open (strings or objects without 'resolved' status)
  const open = context.contestedPoints.filter(
    (p) => typeof p === 'string' || (typeof p === 'object' && p.status !== 'resolved')
  );
  if (open.length > 0) {
    const openList = open
      .map((p) => (typeof p === 'string' ? `- ${p}` : `- ${p.point}`))
      .join('\n');
    parts.push(`### Still Under Discussion:\n${openList}`);
  }

  // Key decisions made
  if (context.decisionsLog.length > 0) {
    const decisions = context.decisionsLog
      .slice(-5)
      .map((d) => `- [R${d.round}] ${d.decision}`)
      .join('\n');
    parts.push(`### Key Decisions Made:\n${decisions}`);
  }

  // User's Original Query
  parts.push(`## User's Question\n${context.originalQuery}`);

  // History Summary (LLM-generated)
  if (context.historySummary) {
    parts.push(`## Discussion Summary\n${context.historySummary}`);
  }

  // Recent Messages (full detail for recent context)
  if (context.recentMessages.length > 0) {
    const recentMsgs = context.recentMessages
      .map((msg) => {
        const role = msg.role === 'analyst' ? 'Analyst' : 'Critic';
        return `${role} (Round ${msg.round}):\n${msg.content}`;
      })
      .join('\n\n');
    parts.push(`## Recent Exchange\n${recentMsgs}`);
  }

  // Join all parts
  let fullContext = parts.join('\n\n---\n\n');

  // Truncate if too long
  const maxChars = Math.min(maxTokens * 4, MAX_CONTEXT_LENGTH);
  if (fullContext.length > maxChars) {
    fullContext = fullContext.substring(0, maxChars) + '\n\n[Context truncated for length]';
  }

  return fullContext;
};

/**
 * Build repository memory prompt section
 * For use when memory is available
 */
export const buildRepositoryMemoryPrompt = (memory) => {
  if (!memory || memory.analysis_status !== 'completed') {
    return null;
  }

  return memory.accumulated_context;
};

/**
 * Calculate consensus score based on agreed vs contested points
 */
export const calculateConsensusScore = (context) => {
  const agreedCount = context.agreedPoints.length;
  // Handle both string and object formats for contested points
  const openContested = context.contestedPoints.filter(
    (p) => typeof p === 'string' || (typeof p === 'object' && p.status !== 'resolved')
  ).length;
  const total = agreedCount + openContested;

  if (total === 0) return 0;
  return Math.round((agreedCount / total) * 100);
};

/**
 * Check if consensus has been reached
 */
export const hasReachedConsensus = (context, threshold = 85) => {
  const score = calculateConsensusScore(context);
  // Handle both string and object formats for contested points
  const openContested = context.contestedPoints.filter(
    (p) => typeof p === 'string' || (typeof p === 'object' && p.status !== 'resolved')
  ).length;
  return score >= threshold && openContested === 0;
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
  smartSummarize,
  setProflowContext,
  setRepositoryMemory,
  loadPastContext,
  setPastInsights,
  updateAgreedPoints,
  updateContestedPoints,
  addDecision,
  addKeyFinding,
  setRepoContext,
  buildContextPrompt,
  buildRepositoryMemoryPrompt,
  calculateConsensusScore,
  hasReachedConsensus,
};
