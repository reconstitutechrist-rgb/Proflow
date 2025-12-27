// InvokeLLM available from './integrations' when needed
import {
  generateEmbedding,
  generateEmbeddings as generateOpenAIEmbeddings,
  isOpenAIConfigured,
  EMBEDDING_CONFIG,
} from './openaiClient';

// Similarity weights for document matching
const SIMILARITY_WEIGHTS = {
  CONTENT_MATCH: 0.5,
  TITLE_MATCH: 0.25,
  PROJECT_MATCH: 0.15,
  ASSIGNMENT_MATCH: 0.1,
};

// Thresholds for similarity matching
const SIMILARITY_THRESHOLDS = {
  MIN_CONTENT_SIMILARITY: 0.3,
  MIN_TITLE_SIMILARITY: 0.5,
  MIN_OVERALL_SCORE: 0.35,
  MAX_SUGGESTIONS: 10,
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

/**
 * Calculate title similarity using Levenshtein distance
 * Normalizes titles by removing version numbers, dates, and common suffixes
 */
function calculateTitleSimilarity(title1, title2) {
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/v?\d+\.?\d*\.?\d*/g, '') // Remove version numbers
      .replace(/\d{4}[-/]\d{2}[-/]\d{2}/g, '') // Remove dates
      .replace(/\(copy\)/gi, '') // Remove copy indicators
      .replace(/\b(final|draft|revised|updated|new|old)\b/gi, '') // Remove status words
      .replace(/[^a-z0-9]/g, ' ') // Replace non-alphanumeric with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

  const t1 = normalize(title1);
  const t2 = normalize(title2);

  if (t1 === t2) return 1.0;
  if (t1.length === 0 || t2.length === 0) return 0;

  const distance = levenshteinDistance(t1, t2);
  const maxLength = Math.max(t1.length, t2.length);

  return 1 - distance / maxLength;
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) return 0;

  return dotProduct / (norm1 * norm2);
}

/**
 * Generate a simple embedding for text content
 * In production, this would use OpenAI or another embedding model
 */
function generateSimpleEmbedding(text) {
  if (!text || text.length === 0) return Array(384).fill(0);

  // Create a deterministic embedding based on text content
  // This ensures the same text always produces the same embedding
  const embedding = Array(384).fill(0);
  const normalizedText = text.toLowerCase();

  for (let i = 0; i < normalizedText.length; i++) {
    const charCode = normalizedText.charCodeAt(i);
    const idx = (i * 17 + charCode * 31) % 384;
    embedding[idx] += (charCode - 96) / 26;
  }

  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

/**
 * Semantic chunking - splits text at sentence boundaries with overlap
 * This preserves context better than fixed-size chunking
 * @param {string} text - Text to chunk
 * @param {number} maxChunkSize - Maximum chunk size (default 1000 chars)
 * @param {number} overlap - Overlap between chunks (default 200 chars)
 * @returns {Array} Array of chunk objects
 */
function semanticChunk(text, maxChunkSize = 1000, overlap = 200) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split by sentence-ending punctuation while keeping the punctuation
  const sentencePattern = /([^.!?]+[.!?]+\s*)/g;
  const sentences = text.match(sentencePattern) || [text];

  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    // If adding this sentence exceeds max size and we have content, save current chunk
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        chunkType: 'semantic',
        index: chunkIndex++,
      });

      // Keep overlap from previous chunk (approximately overlap chars worth of words)
      const words = currentChunk.split(' ');
      const overlapWordCount = Math.ceil(overlap / 6); // ~6 chars per word average
      currentChunk = words.slice(-overlapWordCount).join(' ') + ' ';
    }
    currentChunk += sentence;
  }

  // Add remaining content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      chunkType: 'semantic',
      index: chunkIndex,
    });
  }

  return chunks;
}

/**
 * Simple fixed-size chunking (fallback for when semantic chunking isn't suitable)
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Size of each chunk (default 500 chars)
 * @returns {Array} Array of chunk objects
 */
function simpleChunk(text, chunkSize = 500) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push({
      text: text.substring(i, i + chunkSize),
      chunkType: 'simple',
      index: chunks.length,
    });
  }
  return chunks;
}

// Research function - stub implementation
// Can be replaced with actual research API integration
export const anthropicResearch = async (params) => {
  const { query, context } = params;

  // Stub implementation - returns placeholder data
  return {
    success: true,
    message: 'Research function not configured. Please set up your preferred research API.',
    results: [],
    summary: 'Research results placeholder',
  };
};

// RAG (Retrieval Augmented Generation) helper - stub implementation
// Supports multiple endpoints: generateEmbeddings, findSimilarChunks
export const ragHelper = async (params) => {
  const {
    endpoint,
    query,
    documents,
    context: _context,
    documentId: _documentId,
    content,
    fileName,
    chunkingStrategy,
    chunks,
    topK,
    cachedEmbeddings,
  } = params;

  // Handle different RAG endpoints
  if (endpoint === 'generateEmbeddings') {
    // Check if cached embeddings were provided
    if (cachedEmbeddings) {
      return {
        data: {
          chunks: cachedEmbeddings.chunks || [],
          embeddings: cachedEmbeddings.embeddings || [],
          embeddingModel: cachedEmbeddings.model || 'simulated',
          chunkingStrategy: cachedEmbeddings.chunking_strategy || 'simple',
          structureAnalysis: cachedEmbeddings.structure_analysis || null,
          tokenCount: cachedEmbeddings.token_count || 0,
          estimatedCost: 0, // No cost for cached
          fromCache: true,
        },
      };
    }

    const textContent = content || '';
    const tokenCount = Math.ceil(textContent.length / 4); // Rough token estimate

    // Use semantic chunking for better context preservation
    const useSemanticChunking = chunkingStrategy !== 'simple';
    const generatedChunks = useSemanticChunking
      ? semanticChunk(textContent, 1000, 200) // 1000 char chunks with 200 char overlap
      : simpleChunk(textContent, 500);

    // Check if OpenAI is configured for real embeddings
    if (isOpenAIConfigured()) {
      try {
        // Generate real embeddings using OpenAI
        const chunkTexts = generatedChunks.map((c) => c.text);
        const realEmbeddings = await generateOpenAIEmbeddings(chunkTexts);

        // Cost: $0.02 per 1M tokens for text-embedding-3-small
        const estimatedCost = (tokenCount * 0.02) / 1000000;

        return {
          data: {
            chunks: generatedChunks,
            embeddings: realEmbeddings,
            embeddingModel: EMBEDDING_CONFIG.model, // 'text-embedding-3-small'
            chunkingStrategy: useSemanticChunking ? 'semantic' : 'simple',
            structureAnalysis: null,
            tokenCount: tokenCount,
            estimatedCost: estimatedCost,
            fromCache: false,
            dimensions: EMBEDDING_CONFIG.dimensions, // 1536
          },
        };
      } catch (error) {
        console.error('OpenAI embedding error, falling back to simulated:', error);
        // Fall through to simulated embeddings
      }
    }

    // Fallback: Generate simulated embeddings
    const simulatedEmbeddings = generatedChunks.map((chunk) => generateSimpleEmbedding(chunk.text));

    const estimatedCost = (tokenCount * 0.0001) / 1000; // Simulated cost

    return {
      data: {
        chunks: generatedChunks,
        embeddings: simulatedEmbeddings,
        embeddingModel: 'simulated',
        chunkingStrategy: useSemanticChunking ? 'semantic' : 'simple',
        structureAnalysis: null,
        tokenCount: tokenCount,
        estimatedCost: estimatedCost,
        fromCache: false,
        dimensions: 384, // Simulated dimensions
      },
    };
  }

  if (endpoint === 'findSimilarChunks') {
    const inputChunks = chunks || [];
    const k = topK || 15; // Increased default from 5 to 15 for better coverage

    if (inputChunks.length === 0) {
      return { data: { chunks: [], usingRealEmbeddings: false } };
    }

    // Check if we should use real embeddings
    const hasRealEmbeddings = inputChunks[0]?.embedding?.length === EMBEDDING_CONFIG.dimensions;

    if (isOpenAIConfigured() && hasRealEmbeddings) {
      try {
        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query || '');

        // Score all chunks by cosine similarity with the query
        const scoredChunks = inputChunks.map((chunk) => ({
          ...chunk,
          score: cosineSimilarity(queryEmbedding, chunk.embedding),
        }));

        // Sort by score descending and take top K
        const topChunks = scoredChunks
          .sort((a, b) => b.score - a.score)
          .slice(0, Math.min(k, inputChunks.length))
          .filter((chunk) => chunk.score > 0.1); // Filter out very low relevance

        return {
          data: {
            chunks: topChunks,
            usingRealEmbeddings: true,
            queryEmbeddingDimensions: queryEmbedding.length,
          },
        };
      } catch (error) {
        console.error('OpenAI similarity search error, falling back to simulated:', error);
        // Fall through to simulated search
      }
    }

    // Fallback: Use simulated embeddings with cosine similarity
    const queryEmbedding = generateSimpleEmbedding(query || '');
    const scoredChunks = inputChunks.map((chunk) => {
      const chunkEmbedding = chunk.embedding || generateSimpleEmbedding(chunk.text);
      return {
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunkEmbedding),
      };
    });

    const topChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(k, inputChunks.length));

    return {
      data: {
        chunks: topChunks,
        usingRealEmbeddings: false,
      },
    };
  }

  if (endpoint === 'findRelatedDocuments') {
    // Find related documents based on content and title similarity
    const {
      newDocumentContent,
      newDocumentTitle,
      projectId,
      assignmentIds = [],
      existingDocuments = [],
      minOverallScore = SIMILARITY_THRESHOLDS.MIN_OVERALL_SCORE,
      maxSuggestions = SIMILARITY_THRESHOLDS.MAX_SUGGESTIONS,
    } = params;

    if (!existingDocuments || existingDocuments.length === 0) {
      return {
        data: {
          suggestions: [],
          totalCandidates: 0,
          processingTime: 0,
        },
      };
    }

    const startTime = Date.now();

    // Generate embedding for the new document content
    const newDocEmbedding = generateSimpleEmbedding(newDocumentContent || '');

    // Calculate similarity scores for each existing document
    const scoredDocuments = existingDocuments
      .filter((doc) => !doc.is_outdated && doc.document_type !== 'folder_placeholder')
      .map((doc) => {
        // Content similarity using embeddings
        const docContent = doc.content || doc.extracted_text || '';
        const docEmbedding = generateSimpleEmbedding(docContent);
        const contentSimilarity = cosineSimilarity(newDocEmbedding, docEmbedding);

        // Title similarity using Levenshtein
        const titleSimilarity = calculateTitleSimilarity(
          newDocumentTitle || '',
          doc.title || doc.file_name || ''
        );

        // Project match bonus
        const projectMatch = projectId && doc.assigned_to_project === projectId;

        // Assignment match bonus
        const assignmentMatch =
          assignmentIds.length > 0 &&
          doc.assigned_to_assignments?.some((id) => assignmentIds.includes(id));

        // Calculate weighted overall score
        let overallScore = 0;
        overallScore += contentSimilarity * SIMILARITY_WEIGHTS.CONTENT_MATCH;
        overallScore += titleSimilarity * SIMILARITY_WEIGHTS.TITLE_MATCH;
        if (projectMatch) overallScore += SIMILARITY_WEIGHTS.PROJECT_MATCH;
        if (assignmentMatch) overallScore += SIMILARITY_WEIGHTS.ASSIGNMENT_MATCH;

        // Build match reasons
        const matchReasons = [];
        if (contentSimilarity >= SIMILARITY_THRESHOLDS.MIN_CONTENT_SIMILARITY) {
          matchReasons.push('content_similar');
        }
        if (titleSimilarity >= SIMILARITY_THRESHOLDS.MIN_TITLE_SIMILARITY) {
          matchReasons.push('title_similar');
        }
        if (projectMatch) matchReasons.push('same_project');
        if (assignmentMatch) matchReasons.push('same_assignment');

        return {
          documentId: doc.id,
          title: doc.title || doc.file_name || 'Untitled',
          fileName: doc.file_name,
          confidenceScore: Math.min(overallScore, 1.0),
          matchReasons,
          contentSimilarity,
          titleSimilarity,
          projectMatch,
          assignmentMatch,
          previewSnippet:
            (docContent || '').substring(0, 200) + (docContent?.length > 200 ? '...' : ''),
          lastUpdated: doc.updated_date || doc.created_date,
          folderPath: doc.folder_path,
          assignedToProject: doc.assigned_to_project,
        };
      })
      .filter((doc) => doc.confidenceScore >= minOverallScore && doc.matchReasons.length > 0)
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, maxSuggestions);

    const processingTime = Date.now() - startTime;

    return {
      data: {
        suggestions: scoredDocuments,
        totalCandidates: existingDocuments.length,
        processingTime,
      },
    };
  }

  // Default fallback for unknown endpoints
  return {
    data: {
      success: true,
      message: 'RAG helper not configured. Please set up your preferred RAG implementation.',
      response: 'RAG response placeholder',
      sources: [],
    },
  };
};

/**
 * Export a chat/research session to PDF format.
 *
 * @description This is a stub implementation. To enable PDF export,
 * integrate with a PDF generation library (e.g., jsPDF, pdfmake, or Puppeteer)
 * or a server-side PDF generation service.
 *
 * @param {Object} params - Export parameters
 * @param {Object} params.session - Session metadata (id, name, dates, etc.)
 * @param {Array<Object>} params.messages - Array of message objects to include in the PDF
 * @param {string} params.title - Title for the PDF document
 *
 * @returns {Promise<Object>} Export result
 * @returns {boolean} returns.success - Whether the export was successful
 * @returns {string} returns.message - Status message
 * @returns {string|null} returns.pdfUrl - URL to download the generated PDF (null if not configured)
 *
 * @example
 * const result = await exportSessionToPdf({
 *   session: { id: 'sess-123', name: 'Research Session' },
 *   messages: [{ content: 'Hello', author: 'user@example.com' }],
 *   title: 'My Research Export'
 * });
 */
export const exportSessionToPdf = async (params) => {
  const { session, messages, title } = params;

  // Stub implementation
  return {
    success: true,
    message: 'PDF export not configured. Please set up your preferred PDF generation library.',
    pdfUrl: null,
  };
};

export default {
  anthropicResearch,
  ragHelper,
  exportSessionToPdf,
};
