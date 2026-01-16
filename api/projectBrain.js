/**
 * Project Brain - Verbatim Recall System
 *
 * Stores every chat message and document chunk with vector embeddings
 * for semantic search. Enables exact recall of past conversations
 * and document content.
 *
 * Key principle: NO SUMMARIES - store actual content verbatim.
 */

import { supabase } from './supabaseClient';
import { generateEmbedding, isOpenAIConfigured } from './openaiClient';

/**
 * Semantic chunking - splits text at sentence boundaries with overlap
 * @param {string} text - Text to chunk
 * @param {number} maxChunkSize - Maximum chars per chunk (default 1000)
 * @param {number} overlap - Overlap between chunks (default 200)
 * @returns {Array} Array of chunk objects with text and index
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
      index: chunkIndex,
    });
  }

  return chunks;
}

/**
 * Store a chat message with embedding for future recall
 * @param {string} projectId - Project UUID
 * @param {string} workspaceId - Workspace UUID
 * @param {Object} message - Message object with type and content
 * @param {string} sessionId - Optional session UUID
 * @returns {Promise<Object>} Created message record
 */
export async function storeProjectMessage(projectId, workspaceId, message, sessionId = null) {
  if (!projectId || !workspaceId || !message?.content) {
    console.warn('storeProjectMessage: Missing required parameters');
    return null;
  }

  let embedding = null;

  // Generate embedding for semantic search
  if (isOpenAIConfigured() && message.content.trim().length > 0) {
    try {
      embedding = await generateEmbedding(message.content);
    } catch (error) {
      console.warn('Failed to generate message embedding:', error.message);
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_chat_history')
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        session_id: sessionId,
        message_type: message.type || 'user',
        message_content: message.content,
        embedding,
        created_by: message.createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing project message:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error storing project message:', error);
    return null;
  }
}

/**
 * Search past chat messages by semantic similarity
 * @param {string} query - Search query text
 * @param {string} projectId - Project UUID
 * @param {Object} options - Search options (limit, threshold)
 * @returns {Promise<Array>} Matching messages with similarity scores
 */
export async function searchProjectChat(query, projectId, options = {}) {
  const { limit = 30, threshold = 0.5 } = options;

  if (!query || !projectId) {
    return [];
  }

  // Use text search if OpenAI not configured
  if (!isOpenAIConfigured()) {
    return fallbackTextSearch('project_chat_history', 'message_content', query, projectId, limit);
  }

  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('search_project_chat', {
      query_embedding: queryEmbedding,
      p_project_id: projectId,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('Chat search RPC error:', error);
      return fallbackTextSearch('project_chat_history', 'message_content', query, projectId, limit);
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchProjectChat:', error);
    return fallbackTextSearch('project_chat_history', 'message_content', query, projectId, limit);
  }
}

/**
 * Store document chunks with embeddings for a project
 * @param {string} projectId - Project UUID
 * @param {string} workspaceId - Workspace UUID
 * @param {Object} document - Document object with id, name, content
 * @returns {Promise<number>} Number of chunks stored
 */
export async function storeProjectDocument(projectId, workspaceId, document) {
  const { documentId, documentName, content, contentHash } = document;

  if (!projectId || !workspaceId || !documentId || !content) {
    console.warn('storeProjectDocument: Missing required parameters');
    return 0;
  }

  try {
    // Check if already indexed (by document_id)
    const { data: existing } = await supabase
      .from('project_document_chunks')
      .select('id')
      .eq('document_id', documentId)
      .eq('project_id', projectId)
      .limit(1);

    if (existing?.length > 0) {
      console.log(`Document ${documentName} already indexed for this project`);
      return 0;
    }

    // Chunk the document
    const chunks = semanticChunk(content, 1000, 200);

    if (chunks.length === 0) {
      console.log(`No chunks generated for document ${documentName}`);
      return 0;
    }

    let storedCount = 0;

    // Generate embeddings and insert chunks
    for (const chunk of chunks) {
      let embedding = null;

      if (isOpenAIConfigured()) {
        try {
          embedding = await generateEmbedding(chunk.text);
        } catch (error) {
          console.warn(`Failed to embed chunk ${chunk.index}:`, error.message);
        }
      }

      const { error } = await supabase.from('project_document_chunks').insert({
        workspace_id: workspaceId,
        project_id: projectId,
        document_id: documentId,
        chunk_index: chunk.index,
        chunk_text: chunk.text,
        embedding,
        document_name: documentName,
        content_hash: contentHash || null,
      });

      if (!error) {
        storedCount++;
      } else {
        console.warn(`Failed to store chunk ${chunk.index}:`, error.message);
      }
    }

    console.log(`Indexed ${storedCount} chunks from ${documentName}`);
    return storedCount;
  } catch (error) {
    console.error('Error storing project document:', error);
    return 0;
  }
}

/**
 * Search document content by semantic similarity
 * @param {string} query - Search query text
 * @param {string} projectId - Project UUID
 * @param {Object} options - Search options (limit, threshold)
 * @returns {Promise<Array>} Matching chunks with similarity scores
 */
export async function searchProjectDocuments(query, projectId, options = {}) {
  const { limit = 20, threshold = 0.5 } = options;

  if (!query || !projectId) {
    return [];
  }

  // Use text search if OpenAI not configured
  if (!isOpenAIConfigured()) {
    return fallbackTextSearch('project_document_chunks', 'chunk_text', query, projectId, limit);
  }

  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('search_project_documents', {
      query_embedding: queryEmbedding,
      p_project_id: projectId,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('Document search RPC error:', error);
      return fallbackTextSearch('project_document_chunks', 'chunk_text', query, projectId, limit);
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchProjectDocuments:', error);
    return fallbackTextSearch('project_document_chunks', 'chunk_text', query, projectId, limit);
  }
}

/**
 * Fallback text search when embeddings are unavailable
 */
async function fallbackTextSearch(table, column, query, projectId, limit) {
  try {
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('project_id', projectId)
      .ilike(column, `%${query}%`)
      .order('created_date', { ascending: false })
      .limit(limit);

    return (data || []).map((d) => ({ ...d, similarity: 0.5 }));
  } catch (error) {
    console.error('Fallback text search error:', error);
    return [];
  }
}

/**
 * Build context from project brain for AI prompt
 * Searches both chat history and documents, returns combined context
 * @param {string} query - User's question/message
 * @param {string} projectId - Project UUID
 * @param {Object} options - Search options
 * @returns {Promise<string>} Formatted context string for AI prompt
 */
export async function buildProjectBrainContext(query, projectId, options = {}) {
  const { chatLimit = 20, docLimit = 15, threshold = 0.5 } = options;

  if (!query || !projectId) {
    return '';
  }

  try {
    // Search both in parallel
    const [chatResults, docResults] = await Promise.all([
      searchProjectChat(query, projectId, { limit: chatLimit, threshold }),
      searchProjectDocuments(query, projectId, { limit: docLimit, threshold }),
    ]);

    let context = '';

    // Add relevant chat history
    if (chatResults.length > 0) {
      context += '\n\n=== RELEVANT PAST CONVERSATIONS ===\n';
      chatResults.forEach((msg) => {
        const type = msg.message_type === 'user' ? 'User' : 'Assistant';
        const similarity = msg.similarity ? ` (${Math.round(msg.similarity * 100)}% relevant)` : '';
        context += `${type}${similarity}: ${msg.message_content}\n\n`;
      });
    }

    // Add relevant document content
    if (docResults.length > 0) {
      context += '\n\n=== RELEVANT DOCUMENT CONTENT ===\n';
      docResults.forEach((chunk) => {
        const similarity = chunk.similarity
          ? ` (${Math.round(chunk.similarity * 100)}% relevant)`
          : '';
        context += `[From: ${chunk.document_name || 'Unknown Document'}]${similarity}\n${chunk.chunk_text}\n\n`;
      });
    }

    if (context) {
      context += '=== END PROJECT MEMORY ===\n';
    }

    return context;
  } catch (error) {
    console.error('Error building project brain context:', error);
    return '';
  }
}

/**
 * Get statistics about project brain content
 * @param {string} projectId - Project UUID
 * @returns {Promise<Object>} Stats object
 */
export async function getProjectBrainStats(projectId) {
  if (!projectId) {
    return { messageCount: 0, documentCount: 0, chunkCount: 0 };
  }

  try {
    const [{ count: messageCount }, { count: chunkCount }] = await Promise.all([
      supabase
        .from('project_chat_history')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId),
      supabase
        .from('project_document_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId),
    ]);

    // Get unique document count
    const { data: docs } = await supabase
      .from('project_document_chunks')
      .select('document_id')
      .eq('project_id', projectId);

    const uniqueDocs = new Set(docs?.map((d) => d.document_id) || []);

    return {
      messageCount: messageCount || 0,
      documentCount: uniqueDocs.size,
      chunkCount: chunkCount || 0,
    };
  } catch (error) {
    console.error('Error getting project brain stats:', error);
    return { messageCount: 0, documentCount: 0, chunkCount: 0 };
  }
}

/**
 * Delete all brain data for a project (use with caution)
 * @param {string} projectId - Project UUID
 * @returns {Promise<boolean>} Success status
 */
export async function clearProjectBrain(projectId) {
  if (!projectId) {
    return false;
  }

  try {
    await Promise.all([
      supabase.from('project_chat_history').delete().eq('project_id', projectId),
      supabase.from('project_document_chunks').delete().eq('project_id', projectId),
    ]);

    console.log(`Cleared project brain for project ${projectId}`);
    return true;
  } catch (error) {
    console.error('Error clearing project brain:', error);
    return false;
  }
}

/**
 * Delete all chunks for a document from a project
 * Used when unlinking a document from a project
 * @param {string} documentId - Document UUID
 * @param {string} projectId - Project UUID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteProjectDocumentChunks(documentId, projectId) {
  if (!documentId || !projectId) {
    console.warn('deleteProjectDocumentChunks: Missing required parameters');
    return false;
  }

  try {
    const { error } = await supabase
      .from('project_document_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting document chunks:', error);
      return false;
    }

    console.log(`Deleted chunks for document ${documentId} from project ${projectId}`);
    return true;
  } catch (error) {
    console.error('Error deleting document chunks:', error);
    return false;
  }
}

/**
 * Re-index a document when its content changes
 * Deletes old chunks and creates new ones with fresh embeddings
 * Used by Document Control after applying edits
 * @param {string} projectId - Project UUID
 * @param {string} workspaceId - Workspace UUID
 * @param {Object} document - Document object with id, name, content, contentHash
 * @returns {Promise<number>} Number of chunks stored
 */
export async function reindexProjectDocument(projectId, workspaceId, document) {
  const { documentId, documentName, content, contentHash } = document;

  if (!projectId || !workspaceId || !documentId || !content) {
    console.warn('reindexProjectDocument: Missing required parameters');
    return 0;
  }

  try {
    // Step 1: Check if content actually changed by comparing hash
    const { data: existing } = await supabase
      .from('project_document_chunks')
      .select('content_hash')
      .eq('document_id', documentId)
      .eq('project_id', projectId)
      .limit(1);

    if (existing?.[0]?.content_hash && existing[0].content_hash === contentHash) {
      console.log(`Document ${documentName} unchanged, skipping re-index`);
      return 0;
    }

    // Step 2: Delete old chunks for this document
    const { error: deleteError } = await supabase
      .from('project_document_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting old chunks:', deleteError);
    } else {
      console.log(`Deleted old chunks for ${documentName}`);
    }

    // Step 3: Re-index with fresh content
    return storeProjectDocument(projectId, workspaceId, document);
  } catch (error) {
    console.error('Error re-indexing document:', error);
    return 0;
  }
}

export default {
  storeProjectMessage,
  searchProjectChat,
  storeProjectDocument,
  searchProjectDocuments,
  buildProjectBrainContext,
  getProjectBrainStats,
  clearProjectBrain,
  deleteProjectDocumentChunks,
  reindexProjectDocument,
};
