/**
 * Centralized storage service for managing localStorage operations
 * Provides type-safe accessors, error handling, and consistent patterns
 */

// Storage keys - centralized for consistency
export const STORAGE_KEYS = {
  // User and authentication
  CURRENT_USER: 'proflow_current_user',
  AUTH_TOKEN: 'proflow_auth_token',

  // Workspace
  ACTIVE_WORKSPACE_ID: 'active_workspace_id',
  WORKSPACE_PREFERENCES: 'proflow_workspace_prefs',

  // Files and documents
  FILES: 'proflow_files',
  DOCUMENT_DRAFTS: 'proflow_document_drafts',

  // UI preferences
  SIDEBAR_STATE: 'proflow_sidebar_state',
  THEME: 'proflow_theme',
  VIEW_PREFERENCES: 'proflow_view_prefs',

  // AskAI
  ASK_AI_DRAFT: 'askAI_draft_v1',
  ASK_AI_SESSIONS: 'askAI_sessions',
  ASK_AI_HISTORY: 'askAI_history',

  // Chat
  CHAT_DRAFTS: 'proflow_chat_drafts',

  // Tutorial and onboarding
  TUTORIAL_COMPLETED: 'proflow_tutorial_completed',
  ONBOARDING_STEP: 'proflow_onboarding_step',

  // Feature flags
  FEATURE_FLAGS: 'proflow_feature_flags',
};

/**
 * Base storage operations with error handling
 */
const storage = {
  /**
   * Get an item from localStorage, parsing JSON automatically
   * @param {string} key - Storage key
   * @returns {any} Parsed value or null if not found/error
   */
  get(key) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  },

  /**
   * Set an item in localStorage, stringifying objects automatically
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  },

  /**
   * Remove an item from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  },

  /**
   * Check if a key exists in localStorage
   * @param {string} key - Storage key
   * @returns {boolean}
   */
  has(key) {
    return localStorage.getItem(key) !== null;
  },

  /**
   * Clear all proflow-related items from localStorage
   */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.remove(key);
    });
  },
};

/**
 * User storage operations
 */
export const userStorage = {
  getUser() {
    return storage.get(STORAGE_KEYS.CURRENT_USER);
  },

  setUser(user) {
    return storage.set(STORAGE_KEYS.CURRENT_USER, user);
  },

  updateUser(updates) {
    const current = this.getUser() || {};
    return this.setUser({ ...current, ...updates });
  },

  clearUser() {
    storage.remove(STORAGE_KEYS.CURRENT_USER);
    storage.remove(STORAGE_KEYS.AUTH_TOKEN);
  },

  getAuthToken() {
    return storage.get(STORAGE_KEYS.AUTH_TOKEN);
  },

  setAuthToken(token) {
    return storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
  },
};

/**
 * Workspace storage operations
 */
export const workspaceStorage = {
  getActiveWorkspaceId() {
    return storage.get(STORAGE_KEYS.ACTIVE_WORKSPACE_ID);
  },

  setActiveWorkspaceId(id) {
    return storage.set(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, id);
  },

  getPreferences() {
    return storage.get(STORAGE_KEYS.WORKSPACE_PREFERENCES) || {};
  },

  setPreferences(prefs) {
    return storage.set(STORAGE_KEYS.WORKSPACE_PREFERENCES, prefs);
  },

  updatePreferences(updates) {
    const current = this.getPreferences();
    return this.setPreferences({ ...current, ...updates });
  },
};

/**
 * File storage operations
 */
export const fileStorage = {
  getFiles() {
    return storage.get(STORAGE_KEYS.FILES) || [];
  },

  setFiles(files) {
    return storage.set(STORAGE_KEYS.FILES, files);
  },

  addFile(file) {
    const files = this.getFiles();
    files.push(file);
    return this.setFiles(files);
  },

  removeFile(fileId) {
    const files = this.getFiles().filter(f => f.id !== fileId);
    return this.setFiles(files);
  },

  clearFiles() {
    storage.remove(STORAGE_KEYS.FILES);
  },
};

/**
 * Document draft storage operations
 */
export const draftStorage = {
  getDraft(documentId) {
    const drafts = storage.get(STORAGE_KEYS.DOCUMENT_DRAFTS) || {};
    return drafts[documentId] || null;
  },

  saveDraft(documentId, content) {
    const drafts = storage.get(STORAGE_KEYS.DOCUMENT_DRAFTS) || {};
    drafts[documentId] = {
      content,
      savedAt: new Date().toISOString(),
    };
    return storage.set(STORAGE_KEYS.DOCUMENT_DRAFTS, drafts);
  },

  removeDraft(documentId) {
    const drafts = storage.get(STORAGE_KEYS.DOCUMENT_DRAFTS) || {};
    delete drafts[documentId];
    return storage.set(STORAGE_KEYS.DOCUMENT_DRAFTS, drafts);
  },

  getAllDrafts() {
    return storage.get(STORAGE_KEYS.DOCUMENT_DRAFTS) || {};
  },

  clearAllDrafts() {
    storage.remove(STORAGE_KEYS.DOCUMENT_DRAFTS);
  },
};

/**
 * UI preference storage operations
 */
export const uiStorage = {
  getSidebarState() {
    return storage.get(STORAGE_KEYS.SIDEBAR_STATE) ?? true; // Default to open
  },

  setSidebarState(isOpen) {
    return storage.set(STORAGE_KEYS.SIDEBAR_STATE, isOpen);
  },

  getTheme() {
    return storage.get(STORAGE_KEYS.THEME) || 'system';
  },

  setTheme(theme) {
    return storage.set(STORAGE_KEYS.THEME, theme);
  },

  getViewPreferences() {
    return storage.get(STORAGE_KEYS.VIEW_PREFERENCES) || {};
  },

  setViewPreference(key, value) {
    const prefs = this.getViewPreferences();
    prefs[key] = value;
    return storage.set(STORAGE_KEYS.VIEW_PREFERENCES, prefs);
  },
};

/**
 * AskAI storage operations
 */
export const askAiStorage = {
  getDraft() {
    return storage.get(STORAGE_KEYS.ASK_AI_DRAFT);
  },

  saveDraft(draft) {
    return storage.set(STORAGE_KEYS.ASK_AI_DRAFT, {
      ...draft,
      savedAt: new Date().toISOString(),
    });
  },

  clearDraft() {
    storage.remove(STORAGE_KEYS.ASK_AI_DRAFT);
  },

  getSessions() {
    return storage.get(STORAGE_KEYS.ASK_AI_SESSIONS) || [];
  },

  saveSession(session) {
    const sessions = this.getSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
    }
    // Keep only last 50 sessions
    return storage.set(STORAGE_KEYS.ASK_AI_SESSIONS, sessions.slice(0, 50));
  },

  removeSession(sessionId) {
    const sessions = this.getSessions().filter(s => s.id !== sessionId);
    return storage.set(STORAGE_KEYS.ASK_AI_SESSIONS, sessions);
  },
};

/**
 * Tutorial/onboarding storage operations
 */
export const tutorialStorage = {
  isCompleted() {
    return storage.get(STORAGE_KEYS.TUTORIAL_COMPLETED) === true;
  },

  markCompleted() {
    return storage.set(STORAGE_KEYS.TUTORIAL_COMPLETED, true);
  },

  getCurrentStep() {
    return storage.get(STORAGE_KEYS.ONBOARDING_STEP) || 0;
  },

  setCurrentStep(step) {
    return storage.set(STORAGE_KEYS.ONBOARDING_STEP, step);
  },

  reset() {
    storage.remove(STORAGE_KEYS.TUTORIAL_COMPLETED);
    storage.remove(STORAGE_KEYS.ONBOARDING_STEP);
  },
};

/**
 * Feature flag storage operations
 */
export const featureFlagStorage = {
  getFlags() {
    return storage.get(STORAGE_KEYS.FEATURE_FLAGS) || {};
  },

  getFlag(flag) {
    const flags = this.getFlags();
    return flags[flag] ?? false;
  },

  setFlag(flag, value) {
    const flags = this.getFlags();
    flags[flag] = value;
    return storage.set(STORAGE_KEYS.FEATURE_FLAGS, flags);
  },
};

// Export the base storage for custom operations
export default storage;
