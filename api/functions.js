import { base44 } from './base44Client';

// Export custom functions from the base44 client
// These are app-specific functions that may use LLM or other integrations
export const anthropicResearch = base44.functions?.anthropicResearch || (async (params) => {
  // Fallback implementation if function is not available
  console.warn('anthropicResearch function not available, using fallback');
  return { result: null, error: 'Function not configured' };
});

export const ragHelper = base44.functions?.ragHelper || (async (params) => {
  // Fallback implementation if function is not available
  console.warn('ragHelper function not available, using fallback');
  return { result: null, error: 'Function not configured' };
});

export default {
  anthropicResearch,
  ragHelper,
};
