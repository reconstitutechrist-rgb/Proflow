// GitHub Feature Module Exports

// Hooks
export { useGitHubConnection } from './useGitHubConnection';
export { useGitHubRepos } from './useGitHubRepos';
export { useRepositoryMemory } from './useRepositoryMemory';
export { useDualAICollaboration, COLLABORATION_STATUS } from './useDualAICollaboration';

// Components
export { GitHubConnectionCard } from './GitHubConnectionCard';
export { RepositoryPicker } from './RepositoryPicker';
export { RepositoryList } from './RepositoryList';
export { RepositoryAnalysisStatus, RepositoryAnalysisProgress } from './RepositoryAnalysisStatus';
export { default as DualAIChatInterface } from './DualAIChatInterface';
export { default as ArtifactViewer } from './ArtifactViewer';
export { default as CompletenessAnalysis } from './CompletenessAnalysis';
export { default as PromptTemplates, PROMPT_TEMPLATES, getTemplateById } from './PromptTemplates';

// Debate System - Re-export from the new generalized debate module for backwards compatibility
export {
  useDebateSession,
  DebateChatInterface,
  DebateMessage,
  DebateControls,
  ConsensusIndicator,
  ContextSelector,
  AI_MODELS,
} from '@/features/debate';
