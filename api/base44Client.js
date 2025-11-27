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

    // Filter items - supports both object filters and function filters
    filter: async (filterArg) => {
      if (typeof filterArg === 'function') {
        // For function filters, we need to get all items first
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) {
          console.error(`Error filtering ${entityName}:`, error);
          return [];
        }
        return (data || []).filter(filterArg);
      }

      // Object-based filtering uses the list method
      return createEntityManager(entityName).list(filterArg);
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
        console.error(`Error creating ${entityName}:`, error);
        throw error;
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
      console.error('Error getting user:', error);
      // Return a default user for development
      return {
        id: 'default-user',
        email: 'user@proflow.local',
        full_name: 'Proflow User',
        active_workspace_id: null,
        created_date: new Date().toISOString(),
      };
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

// Main client object with entities, integrations, and auth
export const dataClient = {
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
};

// Export for backward compatibility with existing imports
export const base44 = dataClient;
export default dataClient;
