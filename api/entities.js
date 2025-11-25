import { base44 } from './base44Client';

// Export entity accessors from the base44 client
// These provide CRUD operations for each entity type
export const Task = base44.entities.Task;
export const Document = base44.entities.Document;
export const Assignment = base44.entities.Assignment;
export const Message = base44.entities.Message;
export const User = base44.entities.User;
export const Project = base44.entities.Project;
export const WorkflowPattern = base44.entities.WorkflowPattern;
export const DocumentComment = base44.entities.DocumentComment;
export const ConversationThread = base44.entities.ConversationThread;
export const Workspace = base44.entities.Workspace;

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
};
