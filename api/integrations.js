import { db } from './db';
import {
  invokeLLM as anthropicInvokeLLM,
  isAnthropicConfigured,
  LLM_CONFIG,
} from './anthropicClient';

/**
 * LLM Integration - Invokes Claude LLM for chat completions
 *
 * When VITE_ANTHROPIC_API_KEY is configured, uses Anthropic's Claude models.
 * Falls back to stub responses when not configured.
 *
 * @param {Object} params - LLM parameters
 * @param {string} params.prompt - User prompt
 * @param {string} [params.system_prompt] - System prompt
 * @param {Object} [params.response_json_schema] - JSON schema for structured output
 * @param {string} [params.model] - Model to use (default: claude-sonnet-4-5-20250514)
 * @returns {Promise<string|Object>} LLM response
 */
export const InvokeLLM = async (params) => {
  const {
    prompt,
    system_prompt,
    response_json_schema,
    model,
    add_context_from_internet: _add_context_from_internet,
  } = params;

  // Check if Anthropic is configured
  if (isAnthropicConfigured()) {
    try {
      const response = await anthropicInvokeLLM({
        prompt,
        system_prompt,
        response_json_schema,
        model: model || LLM_CONFIG.default,
      });

      // If JSON schema was requested, the response is already parsed
      if (response_json_schema && typeof response === 'object') {
        return response;
      }

      return response;
    } catch (error) {
      console.error('Anthropic LLM error:', error);
      // Fall through to stub response on error
    }
  }

  // Stub fallback when Anthropic is not configured or errors occur
  console.warn('LLM not configured. Set VITE_ANTHROPIC_API_KEY in .env');
  return {
    success: false,
    message: 'LLM integration not configured. Please set VITE_ANTHROPIC_API_KEY in .env file.',
    response: response_json_schema ? {} : 'LLM response placeholder',
  };
};

// File Upload Integration - stores files in localStorage as base64
// Accepts either a File object directly or an object with { file: File }
export const UploadFile = async (fileOrParams) => {
  // Handle both direct File objects and { file: File } parameter format
  const file = fileOrParams instanceof File ? fileOrParams : fileOrParams?.file;

  if (!file) {
    throw new Error('No file provided to UploadFile');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const fileData = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result,
        uploaded_date: new Date().toISOString(),
      };

      // Store file metadata
      const files = JSON.parse(localStorage.getItem('proflow_files') || '[]');
      files.push(fileData);
      localStorage.setItem('proflow_files', JSON.stringify(files));

      resolve({
        success: true,
        file_url: `local://${fileData.id}`,
        file_id: fileData.id,
        file_name: fileData.name,
      });
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

// Get uploaded file by ID
export const GetFile = async (fileId) => {
  const files = JSON.parse(localStorage.getItem('proflow_files') || '[]');
  return files.find((f) => f.id === fileId) || null;
};

/**
 * Extract structured data from an uploaded file.
 *
 * @description This is a stub implementation. To enable file extraction,
 * integrate with a document processing service (e.g., AWS Textract, Google Document AI,
 * or a custom LLM-based extraction pipeline).
 *
 * @param {Object} params - Extraction parameters
 * @param {string} params.file_url - URL or identifier of the uploaded file
 * @param {Object} [params.json_schema] - Optional JSON schema defining the expected output structure
 *
 * @returns {Promise<Object>} Extraction result
 * @returns {boolean} returns.success - Whether the extraction was successful
 * @returns {string} returns.message - Status message
 * @returns {Object|null} returns.data - Extracted data (null if no schema provided)
 *
 * @example
 * const result = await ExtractDataFromUploadedFile({
 *   file_url: 'local://file-123',
 *   json_schema: { type: 'object', properties: { name: { type: 'string' } } }
 * });
 */
export const ExtractDataFromUploadedFile = async (params) => {
  const { file_url: _file_url, json_schema } = params;

  // This is a stub implementation

  return {
    success: true,
    message:
      'File extraction not configured. Please set up your preferred file extraction provider.',
    data: json_schema ? {} : null,
  };
};

// Re-export db for convenience
export { db };

export default {
  InvokeLLM,
  UploadFile,
  GetFile,
  ExtractDataFromUploadedFile,
  db,
};
