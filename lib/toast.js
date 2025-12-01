import { toast as sonnerToast } from 'sonner';
import { TOAST_DURATION } from '@/config/constants';

/**
 * Standardized toast notification wrapper
 * Provides consistent styling and behavior across the app
 */
export const toast = {
  /**
   * Show a success toast
   * @param {string} message - Message to display
   * @param {Object} options - Additional sonner options
   */
  success(message, options = {}) {
    return sonnerToast.success(message, {
      duration: TOAST_DURATION.MEDIUM,
      ...options,
    });
  },

  /**
   * Show an error toast
   * @param {string} message - Message to display (defaults to generic error)
   * @param {Object} options - Additional sonner options
   */
  error(message = 'Something went wrong', options = {}) {
    return sonnerToast.error(message, {
      duration: TOAST_DURATION.LONG,
      ...options,
    });
  },

  /**
   * Show a warning toast
   * @param {string} message - Message to display
   * @param {Object} options - Additional sonner options
   */
  warning(message, options = {}) {
    return sonnerToast.warning(message, {
      duration: TOAST_DURATION.MEDIUM,
      ...options,
    });
  },

  /**
   * Show an info toast
   * @param {string} message - Message to display
   * @param {Object} options - Additional sonner options
   */
  info(message, options = {}) {
    return sonnerToast.info(message, {
      duration: TOAST_DURATION.MEDIUM,
      ...options,
    });
  },

  /**
   * Show a loading toast that can be updated
   * @param {string} message - Message to display
   * @param {Object} options - Additional sonner options
   * @returns {string|number} Toast ID for updating
   */
  loading(message, options = {}) {
    return sonnerToast.loading(message, {
      ...options,
    });
  },

  /**
   * Show a promise toast that auto-updates based on promise state
   * @param {Promise} promise - The promise to track
   * @param {Object} messages - Messages for each state { loading, success, error }
   * @param {Object} options - Additional sonner options
   */
  promise(promise, messages, options = {}) {
    return sonnerToast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: (err) => messages.error || err?.message || 'Something went wrong',
      ...options,
    });
  },

  /**
   * Dismiss a specific toast or all toasts
   * @param {string|number} toastId - Optional toast ID to dismiss
   */
  dismiss(toastId) {
    return sonnerToast.dismiss(toastId);
  },

  /**
   * Show a toast with a custom action button
   * @param {string} message - Message to display
   * @param {Object} action - Action config { label, onClick }
   * @param {Object} options - Additional sonner options
   */
  action(message, action, options = {}) {
    return sonnerToast(message, {
      duration: TOAST_DURATION.LONG,
      action: {
        label: action.label,
        onClick: action.onClick,
      },
      ...options,
    });
  },
};

/**
 * Helper for common async operation patterns
 */
export const toastAsync = {
  /**
   * Wrap an async operation with loading/success/error toasts
   * @param {Function} asyncFn - Async function to execute
   * @param {Object} messages - Toast messages { loading, success, error }
   * @returns {Promise} The async function result
   */
  async wrap(asyncFn, messages = {}) {
    const toastId = toast.loading(messages.loading || 'Processing...');

    try {
      const result = await asyncFn();
      toast.dismiss(toastId);
      toast.success(messages.success || 'Done!');
      return result;
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(messages.error || error?.message || 'Operation failed');
      throw error;
    }
  },

  /**
   * Show save operation toasts
   * @param {Function} saveFn - Save function to execute
   * @returns {Promise} The save result
   */
  async save(saveFn) {
    return this.wrap(saveFn, {
      loading: 'Saving...',
      success: 'Saved successfully!',
      error: 'Failed to save',
    });
  },

  /**
   * Show delete operation toasts
   * @param {Function} deleteFn - Delete function to execute
   * @returns {Promise} The delete result
   */
  async delete(deleteFn) {
    return this.wrap(deleteFn, {
      loading: 'Deleting...',
      success: 'Deleted successfully!',
      error: 'Failed to delete',
    });
  },

  /**
   * Show create operation toasts
   * @param {Function} createFn - Create function to execute
   * @param {string} itemName - Name of the item being created
   * @returns {Promise} The create result
   */
  async create(createFn, itemName = 'Item') {
    return this.wrap(createFn, {
      loading: `Creating ${itemName}...`,
      success: `${itemName} created successfully!`,
      error: `Failed to create ${itemName}`,
    });
  },
};

export default toast;
