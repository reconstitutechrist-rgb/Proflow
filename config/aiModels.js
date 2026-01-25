/**
 * AI Models Configuration
 *
 * Centralized registry of AI models used across the application.
 * Updated January 2026 with latest model IDs.
 */

/**
 * Model provider types
 */
export const AI_PROVIDERS = {
  GOOGLE: 'google',
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
};

/**
 * AI Models registry with current 2026 model IDs
 */
export const AI_MODELS = {
  // Gemini Models (Google)
  ARCHITECT: {
    id: 'gemini-3.0-pro-001',
    name: 'Gemini 3 Pro',
    provider: AI_PROVIDERS.GOOGLE,
    role: 'Rapid Architect',
    description: 'Fast, structured planning and code generation',
    contextWindow: 2000000, // 2M+ tokens
    strengths: ['Speed', 'Code structure', 'File organization', 'Library selection'],
  },

  // Claude Models (Anthropic)
  DEEP_THINKER: {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: AI_PROVIDERS.ANTHROPIC,
    role: 'Deep Thinker',
    description: 'Deep analysis, edge cases, security review',
    contextWindow: 200000, // 200K tokens
    strengths: ['Edge cases', 'Security analysis', 'Logical correctness', 'Deep critique'],
  },

  QA_REVIEWER: {
    id: 'claude-sonnet-4-5-20250514',
    name: 'Claude Sonnet 4.5',
    provider: AI_PROVIDERS.ANTHROPIC,
    role: 'QA Reviewer',
    description: 'Fast completeness analysis and quality assurance',
    contextWindow: 200000,
    strengths: ['Fast review', 'Standards compliance', 'Completeness checks'],
  },

  // Fast model for quick operations
  FAST: {
    id: 'claude-haiku-4-5-20250514',
    name: 'Claude Haiku 4.5',
    provider: AI_PROVIDERS.ANTHROPIC,
    role: 'Fast Assistant',
    description: 'Quick responses for simple tasks',
    contextWindow: 200000,
    strengths: ['Speed', 'Cost efficiency', 'Simple tasks'],
  },
};

/**
 * Get model by ID
 * @param {string} modelId - Model ID string
 * @returns {Object|null} Model config or null
 */
export function getModelById(modelId) {
  return Object.values(AI_MODELS).find((model) => model.id === modelId) || null;
}

/**
 * Get models by provider
 * @param {string} provider - Provider name (google, anthropic, openai)
 * @returns {Array} Array of models from that provider
 */
export function getModelsByProvider(provider) {
  return Object.values(AI_MODELS).filter((model) => model.provider === provider);
}

/**
 * Check if a model is available (API key configured)
 * @param {Object} model - Model config object
 * @returns {boolean} True if the model's API key is configured
 */
export function isModelAvailable(model) {
  switch (model.provider) {
    case AI_PROVIDERS.GOOGLE:
      return !!import.meta.env.VITE_GEMINI_API_KEY;
    case AI_PROVIDERS.ANTHROPIC:
      return !!import.meta.env.VITE_ANTHROPIC_API_KEY;
    case AI_PROVIDERS.OPENAI:
      return !!import.meta.env.VITE_OPENAI_API_KEY;
    default:
      return false;
  }
}

/**
 * Dual AI Collaboration roles
 */
export const COLLABORATION_ROLES = {
  ARCHITECT: 'ARCHITECT',
  DEEP_THINKER: 'DEEP_THINKER',
  QA_REVIEWER: 'QA_REVIEWER',
};

/**
 * Get the model for a specific collaboration role
 * @param {string} role - Collaboration role
 * @returns {Object} Model config
 */
export function getModelForRole(role) {
  switch (role) {
    case COLLABORATION_ROLES.ARCHITECT:
      return AI_MODELS.ARCHITECT;
    case COLLABORATION_ROLES.DEEP_THINKER:
      return AI_MODELS.DEEP_THINKER;
    case COLLABORATION_ROLES.QA_REVIEWER:
      return AI_MODELS.QA_REVIEWER;
    default:
      return AI_MODELS.FAST;
  }
}

export default AI_MODELS;
