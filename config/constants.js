// Entity types used across the application
export const ENTITY_TYPES = {
  TASK: 'task',
  DOCUMENT: 'document',
  ASSIGNMENT: 'assignment',
  PROJECT: 'project',
  WORKSPACE: 'workspace',
  USER: 'user',
  MESSAGE: 'message',
  COMMENT: 'comment',
};

// Task status values
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
  BLOCKED: 'blocked',
};

// Task priority levels
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Document types
export const DOCUMENT_TYPES = {
  GENERAL: 'general',
  BRIEF: 'brief',
  RESEARCH: 'research',
  REPORT: 'report',
  NOTES: 'notes',
  TEMPLATE: 'template',
};

// Assignment status values
export const ASSIGNMENT_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  UNDER_REVIEW: 'under_review',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
};

// Project health status
export const PROJECT_HEALTH = {
  HEALTHY: 'healthy',
  AT_RISK: 'at_risk',
  CRITICAL: 'critical',
};

// User roles
export const USER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
};

// Workspace member roles
export const WORKSPACE_ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
};

// Message types for chat
export const MESSAGE_TYPES = {
  TEXT: 'text',
  SYSTEM: 'system',
  FILE: 'file',
  TASK_UPDATE: 'task_update',
};

// AI model options
export const AI_MODELS = {
  GPT4: 'gpt-4',
  GPT35: 'gpt-3.5-turbo',
  CLAUDE: 'claude-3-opus',
};

// File size limits (in bytes)
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_DOCUMENT_SIZE: 25 * 1024 * 1024, // 25 MB
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',
  DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a',
  ISO: 'yyyy-MM-dd',
  TIME_ONLY: 'h:mm a',
};

// Auto-save interval (in milliseconds)
export const AUTOSAVE_INTERVAL = 30000; // 30 seconds

// Debounce delays (in milliseconds)
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  INPUT: 150,
  RESIZE: 100,
};

// Toast notification durations (in milliseconds)
export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 4000,
  LONG: 6000,
};

// Memory limits for AskAI (doubled for better context retention)
export const MEMORY_LIMITS = {
  MAX_DOCUMENTS: 100,
  MAX_MESSAGES: 400,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  WARNING_DOCUMENTS: 60,
  WARNING_MESSAGES: 300,
};

// Route paths
export const ROUTES = {
  DASHBOARD: '/Dashboard',
  TASKS: '/Tasks',
  DOCUMENTS: '/Documents',
  DOCUMENTS_HUB: '/DocumentsHub',
  ASSIGNMENTS: '/Assignments',
  PROJECTS: '/Projects',
  CHAT: '/Chat',
  AI_HUB: '/AIHub',
  DEBATE: '/Debate',
  GITHUB: '/GitHub',
  GENERATE: '/Generate',
  ASK_AI: '/AskAI',
  USERS: '/Users',
  WORKSPACES: '/Workspaces',
  PREFERENCES: '/Preferences',
  DOCUMENTATION: '/Documentation',
};

// Keyboard shortcuts (implemented in Layout.jsx)
export const KEYBOARD_SHORTCUTS = {
  SEARCH: 'ctrl+k',
  ESCAPE: 'escape',
};

// Document outdating configuration
export const DOCUMENT_OUTDATING = {
  OUTDATED_FOLDER: '/Outdated',
  MIN_CONTENT_SIMILARITY: 0.3,
  MIN_TITLE_SIMILARITY: 0.5,
  MIN_OVERALL_SCORE: 0.35,
  MAX_SUGGESTIONS: 10,
};

// Similarity weights for document matching
export const SIMILARITY_WEIGHTS = {
  CONTENT_MATCH: 0.5,
  TITLE_MATCH: 0.25,
  PROJECT_MATCH: 0.15,
  ASSIGNMENT_MATCH: 0.1,
};
