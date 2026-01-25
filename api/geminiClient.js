/**
 * Gemini Client for LLM calls
 *
 * This module provides wrapper functions for Google's Gemini API,
 * handling chat completions with Gemini 3 Pro (Rapid Architect).
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Lazy-initialized Gemini client
let genAI = null;

/**
 * Get or create the Gemini client instance
 * @returns {GoogleGenerativeAI} Gemini client
 * @throws {Error} If API key is not configured
 */
function getGeminiClient() {
  if (!genAI) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Gemini model configuration
export const GEMINI_CONFIG = {
  default: 'gemini-3.0-pro-001', // Gemini 3 Pro (2026)
  architect: 'gemini-3.0-pro-001', // Rapid Architect for code analysis
};

// Safety settings for coding tasks - less restrictive
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

/**
 * Check if Gemini is configured
 * @returns {boolean} True if API key is set
 */
export function isGeminiConfigured() {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}

/**
 * Invoke Gemini for chat completion
 * @param {Object} params - LLM parameters
 * @param {string} params.model - Model to use (default: gemini-2.0-flash-exp)
 * @param {string} params.systemPrompt - System prompt
 * @param {Array} params.messages - Array of {role, content} messages
 * @param {number} [params.temperature=0.8] - Temperature for generation
 * @param {number} [params.maxTokens=8192] - Maximum tokens to generate
 * @param {boolean} [params.json=false] - Whether to return JSON
 * @returns {Promise<string>} LLM response
 */
export async function invokeGemini({
  model,
  systemPrompt,
  messages = [],
  temperature = 0.8,
  maxTokens = 8192,
  json = false,
}) {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env');
  }

  const client = getGeminiClient();

  const generationConfig = {
    temperature,
    maxOutputTokens: maxTokens,
    topP: 0.95,
    topK: 40,
  };

  // Add JSON response format if requested
  if (json) {
    generationConfig.responseMimeType = 'application/json';
  }

  const generativeModel = client.getGenerativeModel({
    model: model || GEMINI_CONFIG.default,
    systemInstruction: systemPrompt,
    safetySettings: SAFETY_SETTINGS,
    generationConfig,
  });

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  // Get the last message as the current prompt
  const lastMessage = messages[messages.length - 1];
  const prompt = lastMessage?.content || '';

  // Start chat with history
  const chat = generativeModel.startChat({
    history,
  });

  // Send message and get response
  const result = await chat.sendMessage(prompt);
  const response = result.response;

  // Safety check for response content
  if (!response) {
    throw new Error('Empty response from Gemini API');
  }

  const text = response.text();
  if (!text) {
    throw new Error('Empty text response from Gemini API');
  }

  return text;
}

/**
 * Invoke Gemini with streaming for real-time responses
 * @param {Object} params - Same as invokeGemini
 * @param {Function} onChunk - Callback for each chunk of text
 * @returns {Promise<string>} Complete response
 */
export async function invokeGeminiStream({ model, systemPrompt, messages = [], temperature = 0.8, maxTokens = 8192, onChunk }) {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env');
  }

  const client = getGeminiClient();

  const generativeModel = client.getGenerativeModel({
    model: model || GEMINI_CONFIG.default,
    systemInstruction: systemPrompt,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP: 0.95,
      topK: 40,
    },
  });

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  const prompt = lastMessage?.content || '';

  const chat = generativeModel.startChat({ history });

  // Stream the response
  const result = await chat.sendMessageStream(prompt);

  let fullText = '';
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;
    if (onChunk) {
      onChunk(chunkText);
    }
  }

  return fullText;
}

/**
 * Get embeddings for a text string
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>>} Vector embedding
 */
export async function getEmbeddings(text) {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key not configured');
  }

  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Estimate token count for a prompt (rough estimate)
 * @param {string} text - Text to estimate
 * @returns {Object} Token estimate
 */
export function estimateGeminiTokens(text) {
  // Rough estimate: ~4 chars per token
  const estimatedTokens = Math.ceil(text.length / 4);

  return {
    tokens: estimatedTokens,
    model: GEMINI_CONFIG.default,
  };
}

export default {
  invokeGemini,
  invokeGeminiStream,
  isGeminiConfigured,
  getEmbeddings,
  estimateGeminiTokens,
  GEMINI_CONFIG,
};
