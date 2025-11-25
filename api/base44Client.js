import { createClient } from '@base44/sdk';

// Initialize the base44 client
// The client provides access to entities, integrations, and other features
export const base44 = createClient({
  // Configuration will be loaded from environment or defaults
  appId: import.meta.env.VITE_BASE44_APP_ID,
  apiKey: import.meta.env.VITE_BASE44_API_KEY,
});

export default base44;
