import { db } from './db';

// Export entity accessors from the data client
// These provide CRUD operations for each entity type
export const Task = db.entities.Task;
export const Document = db.entities.Document;
export const Assignment = db.entities.Assignment;
export const Message = db.entities.Message;
export const User = db.entities.User;
export const Project = db.entities.Project;
export const WorkflowPattern = db.entities.WorkflowPattern;
export const DocumentComment = db.entities.DocumentComment;
export const ConversationThread = db.entities.ConversationThread;
export const Workspace = db.entities.Workspace;
export const ChatSession = db.entities.ChatSession;
export const Note = db.entities.Note;
export const Folder = db.entities.Folder;
export const AIResearchChat = db.entities.AIResearchChat;
export const ProjectMemory = db.entities.ProjectMemory;

// GitHub Integration entities
export const GitHubConnection = db.entities.GitHubConnection;
export const WorkspaceRepository = db.entities.WorkspaceRepository;
export const GitHubDebateSession = db.entities.GitHubDebateSession;
export const GitHubDebateMessage = db.entities.GitHubDebateMessage;
export const RepositoryMemory = db.entities.RepositoryMemory;

export default {
  Task,
  Document,
  Assignment,
  Message,
  User,
  Project,
  WorkflowPattern,
  DocumentComment,
  ConversationThread,
  Workspace,
  ChatSession,
  Note,
  Folder,
  AIResearchChat,
  ProjectMemory,
  // GitHub Integration
  GitHubConnection,
  WorkspaceRepository,
  GitHubDebateSession,
  GitHubDebateMessage,
  RepositoryMemory,
};
