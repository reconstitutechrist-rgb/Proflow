/**
 * Debate Memory Service
 *
 * Provides persistent memory for AI debates through:
 * - Saving insights from completed debates
 * - Semantic search for relevant past insights
 * - Retrieval of established high-confidence facts
 *
 * Uses Supabase pgvector for vector similarity search
 * and OpenAI text-embedding-3-small for embeddings.
 */

import { db } from './db';
import { supabase } from './supabaseClient';
import { generateEmbedding, isOpenAIConfigured } from './openaiClient';

/**
 * Save insights from a completed debate session
 * @param {string} sessionId - The debate session ID
 * @param {Array} insights - Array of insight objects
 * @param {string} workspaceId - The workspace ID
 * @param {string} repositoryId - The repository ID
 * @returns {Promise<Array>} Created insight records
 */
export async function saveDebateInsights(sessionId, insights, workspaceId, repositoryId) {
  if (!insights || insights.length === 0) {
    return [];
  }

  if (!isOpenAIConfigured()) {
    console.warn('OpenAI not configured - insights will be saved without embeddings');
  }

  try {
    // Generate embeddings for each insight
    const insightsWithEmbeddings = await Promise.all(
      insights.map(async (insight) => {
        let embedding = null;

        if (isOpenAIConfigured()) {
          try {
            embedding = await generateEmbedding(insight.insight_text);
          } catch (error) {
            console.warn(`Failed to generate embedding for insight: ${error.message}`);
          }
        }

        return {
          workspace_id: workspaceId,
          repository_id: repositoryId,
          source_session_id: sessionId,
          insight_type: insight.insight_type || 'general',
          insight_text: insight.insight_text,
          confidence_score: insight.confidence_score ?? 0.8,
          source_round: insight.source_round || null,
          agreed_by_both_ais: insight.agreed_by_both_ais ?? false,
          embedding: embedding,
        };
      })
    );

    // Bulk insert insights
    const created = await db.entities.DebateInsight.bulkCreate(insightsWithEmbeddings);
    console.log(`Saved ${created.length} debate insights for session ${sessionId}`);

    return created;
  } catch (error) {
    console.error('Error saving debate insights:', error);
    throw error;
  }
}

/**
 * Find relevant past insights using semantic search
 * @param {string} query - The search query
 * @param {string} repositoryId - The repository ID
 * @param {Object} options - Search options
 * @param {number} options.limit - Max results (default: 10)
 * @param {number} options.threshold - Similarity threshold 0-1 (default: 0.7)
 * @returns {Promise<Array>} Matching insights with similarity scores
 */
export async function findRelevantInsights(query, repositoryId, options = {}) {
  const { limit = 10, threshold = 0.7 } = options;

  if (!isOpenAIConfigured()) {
    console.warn('OpenAI not configured - falling back to text-based search');
    return fallbackTextSearch(query, repositoryId, limit);
  }

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Call the semantic search function
    const { data, error } = await supabase.rpc('match_debate_insights', {
      query_embedding: queryEmbedding,
      p_repository_id: repositoryId,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('Semantic search error:', error);
      return fallbackTextSearch(query, repositoryId, limit);
    }

    // Update retrieval stats for matched insights
    if (data && data.length > 0) {
      await updateRetrievalStats(data.map((d) => d.id));
    }

    return data || [];
  } catch (error) {
    console.error('Error in findRelevantInsights:', error);
    return fallbackTextSearch(query, repositoryId, limit);
  }
}

/**
 * Fallback text-based search when embeddings are not available
 */
async function fallbackTextSearch(query, repositoryId, limit) {
  try {
    // Simple text search using ILIKE (case-insensitive)
    const { data, error } = await supabase
      .from('debate_insights')
      .select(
        'id, insight_type, insight_text, confidence_score, agreed_by_both_ais, times_retrieved'
      )
      .eq('repository_id', repositoryId)
      .ilike('insight_text', `%${query}%`)
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Add mock similarity score
    return (data || []).map((d) => ({ ...d, similarity: 0.5 }));
  } catch (error) {
    console.error('Fallback text search error:', error);
    return [];
  }
}

/**
 * Update retrieval statistics for insights
 * Uses raw SQL increment via RPC to avoid race conditions
 */
async function updateRetrievalStats(insightIds) {
  if (!insightIds || insightIds.length === 0) return;

  try {
    const now = new Date().toISOString();

    // Use raw SQL to increment times_retrieved atomically
    const { error } = await supabase.rpc('increment_insight_retrieval', {
      insight_ids: insightIds,
      retrieved_at: now,
    });

    // If the RPC doesn't exist, fall back to simple update
    if (error && error.code === 'PGRST202') {
      // RPC function not found - use simple update (won't increment atomically)
      await Promise.all(
        insightIds.map((id) =>
          supabase.from('debate_insights').update({ last_retrieved_at: now }).eq('id', id)
        )
      );
    } else if (error) {
      console.warn('Failed to update retrieval stats:', error.message);
    }
  } catch (error) {
    // Non-critical, just log
    console.warn('Failed to update retrieval stats:', error.message);
  }
}

/**
 * Get established high-confidence insights for a repository
 * These are insights that both AIs agreed on with high confidence
 * @param {string} repositoryId - The repository ID
 * @param {Object} options - Query options
 * @param {number} options.minConfidence - Minimum confidence (default: 0.85)
 * @param {number} options.limit - Max results (default: 20)
 * @returns {Promise<Array>} Established insights
 */
export async function getEstablishedInsights(repositoryId, options = {}) {
  const { minConfidence = 0.85, limit = 20 } = options;

  try {
    // Try to use the database function first
    const { data, error } = await supabase.rpc('get_established_insights', {
      p_repository_id: repositoryId,
      min_confidence: minConfidence,
    });

    if (error) {
      // Fallback to direct query
      console.warn('get_established_insights RPC failed, using direct query:', error.message);
      return fallbackGetEstablished(repositoryId, minConfidence, limit);
    }

    return data || [];
  } catch (error) {
    console.error('Error getting established insights:', error);
    return fallbackGetEstablished(repositoryId, minConfidence, limit);
  }
}

/**
 * Fallback direct query for established insights
 */
async function fallbackGetEstablished(repositoryId, minConfidence, limit) {
  try {
    const { data, error } = await supabase
      .from('debate_insights')
      .select('id, insight_type, insight_text, confidence_score, times_retrieved, created_date')
      .eq('repository_id', repositoryId)
      .eq('agreed_by_both_ais', true)
      .gte('confidence_score', minConfidence)
      .order('confidence_score', { ascending: false })
      .order('times_retrieved', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Fallback established insights query failed:', error);
    return [];
  }
}

/**
 * Get all insights for a repository (for debugging/admin)
 * @param {string} repositoryId - The repository ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} All insights
 */
export async function getRepositoryInsights(repositoryId, options = {}) {
  const { limit = 50, offset: _offset = 0 } = options;

  try {
    const insights = await db.entities.DebateInsight.list(
      { repository_id: repositoryId },
      '-confidence_score',
      limit
    );

    return insights;
  } catch (error) {
    console.error('Error getting repository insights:', error);
    return [];
  }
}

/**
 * Delete old or low-quality insights
 * @param {string} repositoryId - The repository ID
 * @param {Object} options - Cleanup options
 * @returns {Promise<number>} Number of deleted insights
 */
export async function cleanupInsights(repositoryId, options = {}) {
  const {
    maxAge = 90, // days
    minConfidence = 0.5,
    keepAgreed = true,
  } = options;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    let query = supabase
      .from('debate_insights')
      .delete()
      .eq('repository_id', repositoryId)
      .lt('created_date', cutoffDate.toISOString())
      .lt('confidence_score', minConfidence);

    if (keepAgreed) {
      query = query.eq('agreed_by_both_ais', false);
    }

    const { data, error } = await query.select('id');

    if (error) throw error;

    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} old insights for repository ${repositoryId}`);

    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up insights:', error);
    return 0;
  }
}

/**
 * Format insights for context injection
 * @param {Array} insights - Array of insights
 * @param {Object} options - Format options
 * @returns {string} Formatted context string
 */
export function formatInsightsForContext(insights, options = {}) {
  const { includeConfidence = true, maxLength = 3000 } = options;

  if (!insights || insights.length === 0) {
    return '';
  }

  let context = '';

  insights.forEach((insight) => {
    const typeLabel = insight.insight_type?.toUpperCase() || 'INSIGHT';
    const confidenceLabel = includeConfidence
      ? ` (${Math.round((insight.confidence_score || 0.8) * 100)}% confidence)`
      : '';

    const line = `- [${typeLabel}] ${insight.insight_text}${confidenceLabel}\n`;

    if (context.length + line.length <= maxLength) {
      context += line;
    }
  });

  return context.trim();
}

/**
 * Extract insights from debate context
 * Called when a debate reaches consensus
 * @param {Object} context - The debate context
 * @returns {Array} Extracted insights
 */
export function extractInsightsFromDebate(context) {
  const insights = [];

  // Convert agreed points to insights
  if (context.agreedPoints?.length > 0) {
    context.agreedPoints.forEach((point) => {
      const pointText = typeof point === 'string' ? point : point.point;
      const round = typeof point === 'object' ? point.round : null;

      insights.push({
        insight_type: 'decision',
        insight_text: pointText,
        confidence_score: 0.9,
        source_round: round,
        agreed_by_both_ais: true,
      });
    });
  }

  // Convert key findings to insights
  if (context.keyFindings?.length > 0) {
    context.keyFindings.forEach((finding) => {
      insights.push({
        insight_type: finding.category || 'pattern',
        insight_text: finding.finding,
        confidence_score: 0.8,
        source_round: null,
        agreed_by_both_ais: false,
      });
    });
  }

  // Convert decisions log to insights
  if (context.decisionsLog?.length > 0) {
    context.decisionsLog.forEach((decision) => {
      insights.push({
        insight_type: 'decision',
        insight_text: `${decision.decision}${decision.reasoning ? ` (Rationale: ${decision.reasoning})` : ''}`,
        confidence_score: 0.85,
        source_round: decision.round,
        agreed_by_both_ais: true,
      });
    });
  }

  return insights;
}

export default {
  saveDebateInsights,
  findRelevantInsights,
  getEstablishedInsights,
  getRepositoryInsights,
  cleanupInsights,
  formatInsightsForContext,
  extractInsightsFromDebate,
};
