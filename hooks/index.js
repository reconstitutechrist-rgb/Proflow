// Re-export all hooks for cleaner imports
export { useDebouncedValue } from './useDebouncedValue';
export { useMobile, useIsMobile } from './use-mobile';
export { useAskAI, MEMORY_LIMITS } from './useAskAI';
export { useChat } from './useChat';
export { useDocumentOutdating, OUTDATED_FOLDER } from './useDocumentOutdating';

// Focused AskAI hooks for modular usage
export { useAskAIDraft } from './useAskAIDraft';
export { useAskAIExport } from './useAskAIExport';
export { useAskAISessions } from './useAskAISessions';

// Touch/gesture hooks for mobile
export { useSwipeGesture } from './useSwipeGesture';

// Connection status
export { useConnectionStatus, CONNECTION_STATUS } from './useConnectionStatus';
