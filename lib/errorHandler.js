import { toast } from 'sonner';

/**
 * Standard error types for consistent categorization
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  PERMISSION: 'permission',
  SERVER: 'server',
  UNKNOWN: 'unknown',
};

/**
 * User-friendly error messages by type
 */
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Connection error. Please check your internet and try again.',
  [ERROR_TYPES.AUTH]: 'Authentication failed. Please sign in again.',
  [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
  [ERROR_TYPES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_TYPES.PERMISSION]: "You don't have permission to perform this action.",
  [ERROR_TYPES.SERVER]: 'Something went wrong on our end. Please try again later.',
  [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Categorize an error based on its properties
 * @param {Error|Object} error - The error to categorize
 * @returns {string} The error type
 */
export function categorizeError(error) {
  if (!error) return ERROR_TYPES.UNKNOWN;

  // Network errors
  if (
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.name === 'NetworkError' ||
    error.code === 'NETWORK_ERROR'
  ) {
    return ERROR_TYPES.NETWORK;
  }

  // HTTP status based categorization
  const status = error.status || error.statusCode;
  if (status) {
    if (status === 401 || status === 403) return ERROR_TYPES.AUTH;
    if (status === 404) return ERROR_TYPES.NOT_FOUND;
    if (status === 422 || status === 400) return ERROR_TYPES.VALIDATION;
    if (status >= 500) return ERROR_TYPES.SERVER;
  }

  // Supabase-specific errors
  if (error.code) {
    if (error.code === 'PGRST116') return ERROR_TYPES.NOT_FOUND;
    if (error.code.startsWith('42')) return ERROR_TYPES.PERMISSION;
    if (error.code.startsWith('23')) return ERROR_TYPES.VALIDATION;
    if (error.code === 'JWT_EXPIRED' || error.code === 'invalid_token') {
      return ERROR_TYPES.AUTH;
    }
  }

  return ERROR_TYPES.UNKNOWN;
}

/**
 * Format error for logging
 * @param {Error|Object} error - The error to format
 * @returns {Object} Formatted error object
 */
export function formatError(error) {
  const type = categorizeError(error);

  return {
    type,
    message: error?.message || ERROR_MESSAGES[type],
    userMessage: ERROR_MESSAGES[type],
    code: error?.code,
    status: error?.status || error?.statusCode,
    details: error?.details || error?.data,
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle an error with toast notification
 * @param {Error|Object} error - The error to handle
 * @param {Object} options - Handling options
 * @param {string} options.context - Context/action that caused the error (e.g., "creating task")
 * @param {boolean} options.silent - If true, don't show toast notification
 * @param {Function} options.onRetry - Retry callback to show retry button
 * @param {string} options.fallbackMessage - Custom message to show instead of default
 * @returns {Object} The formatted error
 */
export function handleError(error, options = {}) {
  const { context, silent = false, onRetry, fallbackMessage } = options;

  const formattedError = formatError(error);

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error${context ? ` in ${context}` : ''}]:`, {
      ...formattedError,
      originalError: error,
    });
  }

  // Show toast unless silent
  if (!silent) {
    const message = fallbackMessage || formattedError.userMessage;
    const contextMessage = context ? `Failed ${context}. ` : '';

    const toastOptions = {};

    // Add retry action if provided
    if (onRetry) {
      toastOptions.action = {
        label: 'Retry',
        onClick: onRetry,
      };
    }

    // Use appropriate toast type
    if (formattedError.type === ERROR_TYPES.AUTH) {
      toast.error(`${contextMessage}${message}`, {
        ...toastOptions,
        action: {
          label: 'Sign In',
          onClick: () => (window.location.href = '/login'),
        },
      });
    } else {
      toast.error(`${contextMessage}${message}`, toastOptions);
    }
  }

  return formattedError;
}

/**
 * Create an async mutation handler with consistent error handling
 * Use this to wrap async operations for consistent behavior
 *
 * @param {Function} mutationFn - The async function to execute
 * @param {Object} options - Options for the mutation
 * @param {string} options.successMessage - Toast message on success
 * @param {string} options.context - Context for error messages
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 * @returns {Function} Wrapped mutation function
 *
 * @example
 * const createTask = createMutationHandler(
 *   async (data) => await db.entities.Task.create(data),
 *   {
 *     successMessage: 'Task created successfully',
 *     context: 'creating task',
 *     onSuccess: (result) => refreshTasks(),
 *   }
 * );
 *
 * // Usage
 * await createTask({ title: 'New task' });
 */
export function createMutationHandler(mutationFn, options = {}) {
  const { successMessage, context, onSuccess, onError } = options;

  return async (...args) => {
    try {
      const result = await mutationFn(...args);

      if (successMessage) {
        toast.success(successMessage);
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return { success: true, data: result };
    } catch (error) {
      const formattedError = handleError(error, {
        context,
        onRetry: () => createMutationHandler(mutationFn, options)(...args),
      });

      if (onError) {
        onError(error, formattedError);
      }

      return { success: false, error: formattedError };
    }
  };
}

/**
 * React Query error handler for use with useMutation/useQuery
 * @param {string} context - Context for error messages
 * @returns {Function} Error handler function
 *
 * @example
 * const { mutate } = useMutation({
 *   mutationFn: createTask,
 *   onError: queryErrorHandler('creating task'),
 * });
 */
export function queryErrorHandler(context) {
  return (error) => {
    handleError(error, { context });
  };
}

/**
 * Wrap a promise with error handling
 * Returns [error, result] tuple like Go-style error handling
 *
 * @param {Promise} promise - The promise to wrap
 * @param {Object} options - Error handling options
 * @returns {Promise<[Error|null, any]>} Tuple of [error, result]
 *
 * @example
 * const [error, tasks] = await safeAsync(
 *   db.entities.Task.filter({ workspace_id }),
 *   { context: 'loading tasks' }
 * );
 *
 * if (error) {
 *   // Error already handled with toast
 *   return;
 * }
 * // Use tasks
 */
export async function safeAsync(promise, options = {}) {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    const formattedError = handleError(error, options);
    return [formattedError, null];
  }
}

/**
 * Create a debounced error handler to avoid toast spam
 * Useful for operations that might fail multiple times quickly
 *
 * @param {number} delay - Debounce delay in ms (default: 1000)
 * @returns {Function} Debounced handleError function
 */
export function createDebouncedErrorHandler(delay = 1000) {
  let lastErrorTime = 0;
  let lastErrorType = null;

  return (error, options = {}) => {
    const now = Date.now();
    const errorType = categorizeError(error);

    // If same error type occurred recently, suppress toast
    if (errorType === lastErrorType && now - lastErrorTime < delay) {
      return handleError(error, { ...options, silent: true });
    }

    lastErrorTime = now;
    lastErrorType = errorType;
    return handleError(error, options);
  };
}

export default {
  ERROR_TYPES,
  categorizeError,
  formatError,
  handleError,
  createMutationHandler,
  queryErrorHandler,
  safeAsync,
  createDebouncedErrorHandler,
};
