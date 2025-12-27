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

// Debate System
export {
  useDebateSession,
  DebateChatInterface,
  DebateMessage,
  DebateControls,
  ConsensusIndicator,
  AI_MODELS,
} from './debate';
