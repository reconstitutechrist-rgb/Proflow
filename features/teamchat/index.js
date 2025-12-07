// Team Chat Feature - Barrel Export

export { default as TeamChatBubble } from './TeamChatBubble';
export { default as TeamChatWindow } from './TeamChatWindow';
export { default as TeamChatMessage } from './TeamChatMessage';
export { default as TeamChatImageUpload } from './TeamChatImageUpload';
export { default as TeamChatImagePreview } from './TeamChatImagePreview';
export { default as ProjectSelector } from './ProjectSelector';
export { default as ArchiveConfirmationDialog } from './ArchiveConfirmationDialog';
export { default as TaskExtractionPanel } from './TaskExtractionPanel';

export { useTeamChat } from './useTeamChat';
export { useTeamChatAI } from './useTeamChatAI';
export { detectClosurePhrase, getClosurePhrases, addClosurePhrase } from './closurePhraseDetector';
