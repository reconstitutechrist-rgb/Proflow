import { dataClient } from './base44Client';

// Export entity accessors from the data client
// These provide CRUD operations for each entity type
export const Task = dataClient.entities.Task;
export const Document = dataClient.entities.Document;
export const Assignment = dataClient.entities.Assignment;
export const Message = dataClient.entities.Message;
export const User = dataClient.entities.User;
export const Project = dataClient.entities.Project;
export const WorkflowPattern = dataClient.entities.WorkflowPattern;
export const DocumentComment = dataClient.entities.DocumentComment;
export const ConversationThread = dataClient.entities.ConversationThread;
export const Workspace = dataClient.entities.Workspace;
export const ChatSession = dataClient.entities.ChatSession;
export const Note = dataClient.entities.Note;
export const Folder = dataClient.entities.Folder;
export const AIResearchChat = dataClient.entities.AIResearchChat;

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
};
