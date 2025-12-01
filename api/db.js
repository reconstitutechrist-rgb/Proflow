// Supabase-based data client
import { supabase } from './supabaseClient';

// Helper to generate UUIDs
const generateId = () => {
  // Generate a UUID v4
  return crypto.randomUUID();
};

// Map entity names to table names (handles pluralization)
const entityToTableName = (entityName) => {
  const tableMap = {
    'Workspace': 'workspaces',
    'Project': 'projects',
    'Task': 'tasks',
    'Document': 'documents',
    'User': 'users',
    'Assignment': 'assignments',
    'WorkspaceMember': 'workspace_members',
    'DocumentVersion': 'document_versions',
    'Comment': 'comments',
    'DocumentComment': 'document_comments',
    'Tag': 'tags',
    'Message': 'messages',
    'WorkflowPattern': 'workflow_patterns',
    'ConversationThread': 'conversation_threads',
    'ChatSession': 'chat_sessions',
    'Note': 'notes',
    'Folder': 'folders',
    'AIResearchChat': 'ai_research_chats',
  };

  return tableMap[entityName] || entityName.toLowerCase();
};

// Create an entity manager for a specific entity type
const createEntityManager = (entityName) => {
  const tableName = entityToTableName(entityName);

  return {
    // List all items with optional filtering
    list: async (filters = {}) => {
      let query = supabase.from(tableName).select('*');

      // Apply filters if provided
      if (filters && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error listing ${entityName}:`, error);
        return [];
      }

      return data || [];
    },

    // Filter items - only supports object filters for security (workspace isolation)
    // Function filters are disabled to prevent loading all data without workspace filtering
    filter: async (filterArg, sortOrder, limit) => {
      if (typeof filterArg === 'function') {
        // SECURITY: Function filters load ALL records without workspace filtering
        // This is a data leakage vulnerability. Use object filters instead.
        console.error(
          `SECURITY WARNING: Function filters are disabled for ${entityName}. ` +
          `Use object filters with workspace_id to ensure data isolation.`
        );
        throw new Error(
          'Function filters are not supported. Use object filters with workspace_id.'
        );
      }

      // Object-based filtering uses the list method with workspace_id enforcement
      return createEntityManager(entityName).list(filterArg, sortOrder, limit);
    },

    // Get a single item by ID
    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error getting ${entityName}:`, error);
        return null;
      }

      return data;
    },

    // Create a new item
    create: async (data) => {
      // Let Supabase auto-generate the ID unless explicitly provided
      const newItem = {
        ...data,
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      // Only add ID if explicitly provided in the data
      if (data.id) {
        newItem.id = data.id;
      }

      const { data: created, error } = await supabase
        .from(tableName)
        .insert([newItem])
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${entityName}:`, error.message, error.details, error.hint, error.code);
        throw new Error(`${error.message}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (Hint: ${error.hint})` : ''}`);
      }

      return created;
    },

    // Bulk create multiple items
    bulkCreate: async (dataArray) => {
      const newItems = dataArray.map(data => ({
        ...data,
        id: data.id || generateId(),
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString(),
      }));

      const { data: created, error } = await supabase
        .from(tableName)
        .insert(newItems)
        .select();

      if (error) {
        console.error(`Error bulk creating ${entityName}:`, error);
        throw error;
      }

      return created || [];
    },

    // Update an existing item
    update: async (id, data) => {
      const updateData = {
        ...data,
        updated_date: new Date().toISOString(),
      };

      const { data: updated, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${entityName}:`, error);
        throw new Error(`${entityName} with id ${id} not found`);
      }

      return updated;
    },

    // Delete an item
    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting ${entityName}:`, error);
        throw error;
      }

      return { success: true };
    },

    // Count items with optional filtering
    count: async (filters = {}) => {
      let query = supabase.from(tableName).select('*', { count: 'exact', head: true });

      // Apply filters if provided
      if (filters && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        console.error(`Error counting ${entityName}:`, error);
        return 0;
      }

      return count || 0;
    },
  };
};

// Auth management using Supabase Auth
const auth = {
  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // SECURITY: Do not return fake user in production
      // Components should handle null user appropriately
      if (import.meta.env.DEV) {
        console.warn('Auth Warning: No authenticated user. Using development fallback.');
        return {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'dev@proflow.local',
          full_name: 'Development User',
          active_workspace_id: null,
          created_date: new Date().toISOString(),
          _isDevelopmentFallback: true, // Flag to identify fake user
        };
      }
      // In production, return null to indicate no authenticated user
      console.error('Error getting user:', error);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      active_workspace_id: user.user_metadata?.active_workspace_id || null,
      created_date: user.created_at,
    };
  },

  updateMe: async (updates) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || data.user.email,
      active_workspace_id: data.user.user_metadata?.active_workspace_id || null,
      updated_date: new Date().toISOString(),
    };
  },

  // Check if user is logged in
  isLoggedIn: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  // Logout
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    return { success: true };
  },
};

// Agent conversation management (stub implementation)
// This provides a local conversation system for the AI assistant
const agentConversations = new Map();
const agentSubscribers = new Map();

const agents = {
  // Create a new conversation with an AI agent
  createConversation: async ({ agent_name, metadata = {} }) => {
    const conversationId = crypto.randomUUID();
    const conversation = {
      id: conversationId,
      agent_name,
      metadata,
      messages: [],
      status: 'active',
      created_at: new Date().toISOString(),
    };
    agentConversations.set(conversationId, conversation);
    return conversation;
  },

  // Subscribe to conversation updates
  subscribeToConversation: (conversationId, callback) => {
    if (!agentSubscribers.has(conversationId)) {
      agentSubscribers.set(conversationId, new Set());
    }
    agentSubscribers.get(conversationId).add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = agentSubscribers.get(conversationId);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  },

  // Add a message to the conversation
  addMessage: async (conversation, { role, content }) => {
    const conversationData = agentConversations.get(conversation.id);
    if (!conversationData) {
      throw new Error('Conversation not found');
    }

    const message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    conversationData.messages.push(message);

    // If it's a user message, generate an AI response
    if (role === 'user') {
      conversationData.status = 'processing';
      notifySubscribers(conversation.id, conversationData);

      // Generate AI response (now async to support note creation)
      setTimeout(async () => {
        try {
          const responseContent = await generateAIResponse(content, conversationData);
          const aiResponse = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date().toISOString(),
          };
          conversationData.messages.push(aiResponse);
          conversationData.status = 'active';
          notifySubscribers(conversation.id, conversationData);
        } catch (error) {
          console.error('Error generating AI response:', error);
          const errorResponse = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
            timestamp: new Date().toISOString(),
          };
          conversationData.messages.push(errorResponse);
          conversationData.status = 'active';
          notifySubscribers(conversation.id, conversationData);
        }
      }, 500);
    }

    return message;
  },

  // Get conversation by ID
  getConversation: async (conversationId) => {
    return agentConversations.get(conversationId) || null;
  },
};

// Helper to notify all subscribers of a conversation
const notifySubscribers = (conversationId, data) => {
  const subscribers = agentSubscribers.get(conversationId);
  if (subscribers) {
    subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error('Error in conversation subscriber:', err);
      }
    });
  }
};

// Parse context from AI message to extract workspace info
const parseContextFromMessage = (message) => {
  const context = {};

  // Extract workspace_id from the context if present
  const workspaceMatch = message.match(/workspace_id:\s*([a-f0-9-]+)/i);
  if (workspaceMatch) {
    context.workspace_id = workspaceMatch[1];
  }

  // Extract user info
  const userEmailMatch = message.match(/User Email:\s*([^\n]+)/i);
  if (userEmailMatch) {
    context.user_email = userEmailMatch[1].trim();
  }

  const userIdMatch = message.match(/User ID:\s*([^\n]+)/i);
  if (userIdMatch) {
    context.user_id = userIdMatch[1].trim();
  }

  return context;
};

// Extract note details from user message
const extractNoteDetails = (message) => {
  const lines = message.split('\n');
  let title = '';
  let content = '';
  let tags = [];
  let color = '#FBBF24'; // Default yellow

  // Look for structured input
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('title:')) {
      title = line.substring(6).trim();
    } else if (lowerLine.startsWith('content:')) {
      content = line.substring(8).trim();
    } else if (lowerLine.startsWith('tags:')) {
      tags = line.substring(5).split(',').map(t => t.trim()).filter(t => t);
    } else if (lowerLine.startsWith('color:')) {
      const colorInput = line.substring(6).trim().toLowerCase();
      const colorMap = {
        'yellow': '#FBBF24',
        'blue': '#60A5FA',
        'green': '#34D399',
        'red': '#F87171',
        'purple': '#A78BFA',
        'orange': '#FB923C',
        'pink': '#EC4899'
      };
      color = colorMap[colorInput] || color;
    }
  }

  // If no structured format, try to extract from natural language
  if (!title && !content) {
    // Look for patterns like "create a note called X" or "note titled X"
    const titleMatch = message.match(/(?:note\s+(?:called|titled|named)|title[d]?\s*[:\s])\s*["']?([^"'\n]+)["']?/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Look for content patterns
    const contentMatch = message.match(/(?:content|body|text|saying|with)[:\s]+["']?([^"'\n]+)["']?/i);
    if (contentMatch) {
      content = contentMatch[1].trim();
    }

    // If still no title, use first significant text
    if (!title) {
      const userInput = message.match(/User Input:\s*(.+)/i);
      if (userInput) {
        const input = userInput[1].trim();
        // Extract potential title from "create note X" pattern
        const simpleMatch = input.match(/create\s+(?:a\s+)?note\s+(?:called\s+|titled\s+|named\s+)?["']?(.+?)["']?(?:\s+with|\s+content|$)/i);
        if (simpleMatch) {
          title = simpleMatch[1].trim();
        }
      }
    }
  }

  return { title, content, tags, color };
};

// Generate a simple AI response (placeholder - can be enhanced with actual LLM integration)
const generateAIResponse = async (userMessage, conversation) => {
  const lowercaseMsg = userMessage.toLowerCase();
  const context = parseContextFromMessage(userMessage);

  // Handle note creation
  if (lowercaseMsg.includes('create') && lowercaseMsg.includes('note')) {
    const noteDetails = extractNoteDetails(userMessage);

    // If we have a title, try to create the note
    if (noteDetails.title && context.workspace_id) {
      try {
        const noteData = {
          workspace_id: context.workspace_id,
          title: noteDetails.title,
          content: noteDetails.content || `<p>${noteDetails.title}</p>`,
          tags: noteDetails.tags,
          color: noteDetails.color,
          is_pinned: false,
          created_by: context.user_email || 'AI Assistant',
        };

        const createdNote = await createEntityManager('Note').create(noteData);

        return `✅ **Note created successfully!**

**Title:** ${createdNote.title}
${createdNote.content ? `**Content:** ${createdNote.content.replace(/<[^>]*>/g, '')}` : ''}
${noteDetails.tags.length > 0 ? `**Tags:** ${noteDetails.tags.join(', ')}` : ''}

Your note has been saved and you can find it in the Notes section on your Dashboard.

Would you like to:
- Create another note?
- Pin this note to the top?
- Add more details to this note?`;
      } catch (error) {
        console.error('Error creating note:', error);
        return `❌ I encountered an error while creating the note: ${error.message}

Please try again or create the note manually from the Dashboard.`;
      }
    }

    // If no workspace context, ask for it
    if (!context.workspace_id) {
      return `I'd be happy to create a note for you! However, I need you to be in a workspace first.

Please make sure you have a workspace selected, then try again.`;
    }

    // If no title, ask for details
    return `I'd be happy to create a note for you! Please provide the following details:

**Required:**
- **Title:** What should the note be called?

**Optional:**
- **Content:** The body of the note
- **Tags:** Comma-separated tags (e.g., "meeting, important, follow-up")
- **Color:** yellow, blue, green, red, purple, orange, or pink

You can format your request like this:
\`\`\`
Title: My Meeting Notes
Content: Discussed Q4 planning and budget allocation
Tags: meeting, planning
Color: blue
\`\`\`

Or simply say: "Create a note called My Meeting Notes"`;
  }

  // Basic intent detection and responses
  if (lowercaseMsg.includes('create') && lowercaseMsg.includes('task')) {
    return `I understand you'd like to create a task. To help you with that, I'll need a few details:

1. **Task title**: What should the task be called?
2. **Description**: Any additional details?
3. **Priority**: High, Medium, or Low?
4. **Due date**: When should it be completed?

Please provide these details and I'll create the task for you!`;
  }

  if (lowercaseMsg.includes('help') || lowercaseMsg.includes('what can you do')) {
    return `I'm here to help you with ProjectFlow! Here's what I can assist with:

**Notes:**
- Create new notes with custom colors and tags
- Quick capture of ideas and meeting notes

**Tasks & Projects:**
- View your tasks and their status
- Help organize your work
- Provide task management tips

**Documents:**
- Navigate document features
- Explain document workflows

**General:**
- Answer questions about ProjectFlow features
- Provide guidance on best practices
- Help troubleshoot issues

What would you like help with?`;
  }

  if (lowercaseMsg.includes('status') || lowercaseMsg.includes('overview')) {
    return `I can help you get an overview of your work. You can:

- Check the **Dashboard** for a quick summary
- View **Tasks** to see your task board
- Review **Projects** for project-level status
- Check your **Notes** for quick reminders

Would you like me to explain any of these features in more detail?`;
  }

  // Default response
  return `Thanks for your message! I'm your ProjectFlow AI Assistant.

You mentioned: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"

How can I assist you further? Try asking me to:
- **Create a note** - e.g., "Create a note called Meeting Summary"
- **Create or manage tasks**
- **Get an overview** of your workspace
- **Help** with ProjectFlow features`;
};

// Integration stubs
const integrations = {
  Core: {
    InvokeLLM: async (params) => {
      const { prompt, system_prompt, response_json_schema } = params;
      console.log('InvokeLLM called with:', { prompt, system_prompt });
      return {
        success: true,
        message: 'LLM integration not configured.',
        response: response_json_schema ? {} : 'LLM response placeholder',
      };
    },
    UploadFile: async (file) => {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading file:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      return {
        success: true,
        file_url: publicUrl,
        file_id: data.path,
        file_name: file.name,
      };
    },
  },
};

// Functions registry for invoking custom functions
const functionsRegistry = {
  anthropicResearch: async (params) => {
    const { question, assignment, documents, useWebSearch } = params;

    console.log('anthropicResearch invoked with:', { question, assignment: assignment?.name, useWebSearch });

    // Stub implementation - returns structured research response
    // Replace with actual Anthropic API integration
    return {
      data: {
        success: true,
        data: {
          response: `Thank you for your question: "${question}"\n\nThis is a placeholder response. To enable AI-powered research, please configure your Anthropic API integration.\n\nIn the meantime, here are some general suggestions based on your query.`,
          research_type: 'general',
          confidence_score: 75,
          recommended_actions: [
            {
              action: 'Configure API Integration',
              description: 'Set up your Anthropic API key to enable AI-powered research',
              priority: 'high'
            }
          ],
          suggested_documents: [],
          web_sources_used: useWebSearch || false
        },
        model_used: 'claude-sonnet-4-20250514'
      }
    };
  },

  ragHelper: async (params) => {
    const { query, documents, context } = params;
    console.log('ragHelper invoked with:', { query, documentsCount: documents?.length });

    return {
      data: {
        success: true,
        response: 'RAG helper placeholder response',
        sources: []
      }
    };
  },

  exportSessionToPdf: async (params) => {
    const { session, messages, title } = params;
    console.log('exportSessionToPdf invoked with:', { session, messagesCount: messages?.length, title });

    return {
      data: {
        success: true,
        message: 'PDF export not configured',
        pdfUrl: null
      }
    };
  }
};

// Functions invoker - provides a unified way to call registered functions
const functions = {
  invoke: async (functionName, params) => {
    if (functionsRegistry[functionName]) {
      try {
        return await functionsRegistry[functionName](params);
      } catch (error) {
        console.error(`Error invoking function ${functionName}:`, error);
        return {
          data: {
            success: false,
            error: error.message
          }
        };
      }
    }

    console.error(`Function ${functionName} not found in registry`);
    return {
      data: {
        success: false,
        error: `Function ${functionName} not found`
      }
    };
  }
};

// Main client object with entities, integrations, auth, agents, and functions
export const db = {
  entities: new Proxy({}, {
    get: (target, entityName) => {
      if (!target[entityName]) {
        target[entityName] = createEntityManager(entityName);
      }
      return target[entityName];
    }
  }),
  integrations,
  auth,
  agents,
  functions,
};

export default db;
