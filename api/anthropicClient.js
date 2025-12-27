/**
 * Anthropic Client for LLM calls
 *
 * This module provides wrapper functions for Anthropic's Claude API,
 * handling chat completions with Claude Sonnet 4.5 and Haiku 4.5.
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
// Note: dangerouslyAllowBrowser is needed for client-side usage
// In production, consider proxying through a backend for security
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

// LLM model configuration
export const LLM_CONFIG = {
  default: 'claude-sonnet-4-5-20250514', // Claude Sonnet 4.5 - best reasoning
  fast: 'claude-haiku-4-5-20250514', // Claude Haiku 4.5 - fast and cheap
};

/**
 * Check if Anthropic is configured
 * @returns {boolean} True if API key is set
 */
export function isAnthropicConfigured() {
  return !!import.meta.env.VITE_ANTHROPIC_API_KEY;
}

/**
 * Invoke LLM for chat completion
 * @param {Object} params - LLM parameters
 * @param {string} params.prompt - User prompt
 * @param {string} [params.system_prompt] - System prompt
 * @param {Object} [params.response_json_schema] - JSON schema for structured output
 * @param {string} [params.model] - Model to use (default: claude-sonnet-4-5-20250514)
 * @returns {Promise<string|Object>} LLM response
 */
export async function invokeLLM({ prompt, system_prompt, response_json_schema, model }) {
  if (!isAnthropicConfigured()) {
    throw new Error('Anthropic API key not configured. Set VITE_ANTHROPIC_API_KEY in .env');
  }

  const requestParams = {
    model: model || LLM_CONFIG.default,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  };

  // Add system prompt if provided
  if (system_prompt) {
    requestParams.system = system_prompt;
  }

  // If JSON schema is requested, add instruction to return JSON
  if (response_json_schema) {
    const jsonInstruction = 'You must respond with valid JSON only. No other text.';
    requestParams.system = requestParams.system
      ? `${requestParams.system}\n\n${jsonInstruction}`
      : jsonInstruction;
  }

  const response = await anthropic.messages.create(requestParams);

  // Safety check for response content
  if (!response.content || response.content.length === 0) {
    throw new Error('Empty response from Anthropic API');
  }

  const contentBlock = response.content[0];
  if (contentBlock.type !== 'text' || !contentBlock.text) {
    throw new Error('Unexpected response format from Anthropic API');
  }

  const content = contentBlock.text;

  // If JSON was requested, try to parse it
  if (response_json_schema) {
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonStr.trim());
    } catch {
      // Return raw content if JSON parsing fails
      return content;
    }
  }

  return content;
}

/**
 * Estimate LLM cost for a prompt
 * @param {string} text - Text to estimate
 * @returns {Object} Cost estimate
 */
export function estimateLLMCost(text) {
  // Rough estimate: ~4 chars per token
  const estimatedTokens = Math.ceil(text.length / 4);
  // Claude Sonnet 4.5: $3 per 1M input tokens
  const estimatedCost = (estimatedTokens * 3) / 1000000;

  return {
    tokens: estimatedTokens,
    cost: estimatedCost,
    model: LLM_CONFIG.default,
  };
}

export default {
  invokeLLM,
  isAnthropicConfigured,
  estimateLLMCost,
  LLM_CONFIG,
};
