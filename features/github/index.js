// GitHub Feature Module Exports

// Hooks
export { useGitHubConnection } from './useGitHubConnection';
export { useGitHubRepos } from './useGitHubRepos';
export { useRepositoryMemory } from './useRepositoryMemory';

// Components
export { GitHubConnectionCard } from './GitHubConnectionCard';
export { RepositoryPicker } from './RepositoryPicker';
export { RepositoryList } from './RepositoryList';
export { RepositoryAnalysisStatus, RepositoryAnalysisProgress } from './RepositoryAnalysisStatus';

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
