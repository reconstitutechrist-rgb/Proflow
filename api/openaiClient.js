/**
 * OpenAI Client for embeddings
 *
 * This module provides wrapper functions for OpenAI's API,
 * primarily for embeddings generation (text-embedding-3-small).
 *
 * Note: LLM calls have been migrated to Anthropic Claude (see anthropicClient.js).
 * The LLM functions here are kept as fallback but not actively used.
 */

import OpenAI from 'openai';

// Lazy-initialized OpenAI client
// Only created when actually needed and API key is available
let openai = null;

/**
 * Get or create the OpenAI client instance
 * @returns {OpenAI} OpenAI client
 * @throws {Error} If API key is not configured
 */
function getOpenAIClient() {
  if (!openai) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY in .env');
    }
    openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }
  return openai;
}

// Embedding model configuration
export const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-small', // 1536 dimensions, $0.02/1M tokens
  dimensions: 1536,
};

// LLM model configuration
export const LLM_CONFIG = {
  default: 'gpt-4o-mini', // Fast, cheap, good for most tasks
  advanced: 'gpt-4o', // More capable, higher cost
};

/**
 * Check if OpenAI is configured
 * @returns {boolean} True if API key is set
 */
export function isOpenAIConfigured() {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}

/**
 * Generate embedding for a single text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector (1536 dimensions)
 */
export async function generateEmbedding(text) {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY in .env');
  }

  // Truncate text if too long (max ~8000 tokens for embedding model)
  const truncatedText = text.substring(0, 30000);

  const response = await getOpenAIClient().embeddings.create({
    model: EMBEDDING_CONFIG.model,
    input: truncatedText,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function generateEmbeddings(texts) {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY in .env');
  }

  if (texts.length === 0) {
    return [];
  }

  // Truncate each text and filter empty
  const truncatedTexts = texts.map((t) => t.substring(0, 30000)).filter((t) => t.trim().length > 0);

  if (truncatedTexts.length === 0) {
    return [];
  }

  // OpenAI allows batch embedding (up to 2048 texts)
  // For larger batches, we'd need to chunk
  const batchSize = 100;
  const allEmbeddings = [];

  for (let i = 0; i < truncatedTexts.length; i += batchSize) {
    const batch = truncatedTexts.slice(i, i + batchSize);

    const response = await getOpenAIClient().embeddings.create({
      model: EMBEDDING_CONFIG.model,
      input: batch,
    });

    allEmbeddings.push(...response.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

/**
 * Invoke LLM for chat completion
 * @param {Object} params - LLM parameters
 * @param {string} params.prompt - User prompt
 * @param {string} [params.system_prompt] - System prompt
 * @param {Object} [params.response_json_schema] - JSON schema for structured output
 * @param {string} [params.model] - Model to use (default: gpt-4o-mini)
 * @returns {Promise<string|Object>} LLM response
 */
export async function invokeLLM({ prompt, system_prompt, response_json_schema, model }) {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY in .env');
  }

  const messages = [];

  if (system_prompt) {
    messages.push({ role: 'system', content: system_prompt });
  }

  messages.push({ role: 'user', content: prompt });

  const requestParams = {
    model: model || LLM_CONFIG.default,
    messages,
  };

  // If JSON schema provided, request JSON output
  if (response_json_schema) {
    requestParams.response_format = { type: 'json_object' };
    // Add schema hint to system prompt
    if (!system_prompt) {
      messages.unshift({
        role: 'system',
        content: 'You are a helpful assistant. Respond with valid JSON.',
      });
    }
  }

  const response = await getOpenAIClient().chat.completions.create(requestParams);

  const content = response.choices[0].message.content;

  // If JSON was requested, try to parse it
  if (response_json_schema) {
    try {
      return JSON.parse(content);
    } catch {
      // Return raw content if JSON parsing fails
      return content;
    }
  }

  return content;
}

/**
 * Estimate embedding cost for text
 * @param {string} text - Text to estimate
 * @returns {Object} Cost estimate
 */
export function estimateEmbeddingCost(text) {
  // Rough estimate: ~4 chars per token
  const estimatedTokens = Math.ceil(text.length / 4);
  // text-embedding-3-small: $0.02 per 1M tokens
  const estimatedCost = (estimatedTokens * 0.02) / 1000000;

  return {
    tokens: estimatedTokens,
    cost: estimatedCost,
    model: EMBEDDING_CONFIG.model,
  };
}

export default {
  generateEmbedding,
  generateEmbeddings,
  invokeLLM,
  isOpenAIConfigured,
  estimateEmbeddingCost,
  EMBEDDING_CONFIG,
  LLM_CONFIG,
};
