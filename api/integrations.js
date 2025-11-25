import { base44 } from './base44Client';

// Export integration functions from the base44 client
// These provide access to external services and APIs
export const InvokeLLM = base44.integrations.InvokeLLM;
export const UploadFile = base44.integrations.UploadFile;

// Re-export base44 for convenience in some import patterns
export { base44 };

export default {
  InvokeLLM,
  UploadFile,
  base44,
};
