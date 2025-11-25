// Local storage-based data client (replaces base44)
// This provides a simple API for CRUD operations using localStorage

const STORAGE_PREFIX = 'proflow_';

// Helper to get storage key for an entity
const getStorageKey = (entityName) => `${STORAGE_PREFIX}${entityName.toLowerCase()}`;

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create an entity manager for a specific entity type
const createEntityManager = (entityName) => {
  const storageKey = getStorageKey(entityName);

  const getAll = () => {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading ${entityName}:`, e);
      return [];
    }
  };

  const saveAll = (items) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error(`Error saving ${entityName}:`, e);
    }
  };

  return {
    // List all items with optional filtering
    list: async (filters = {}) => {
      let items = getAll();

      // Apply filters if provided
      if (filters && Object.keys(filters).length > 0) {
        items = items.filter(item => {
          return Object.entries(filters).every(([key, value]) => {
            if (value === undefined || value === null) return true;
            return item[key] === value;
          });
        });
      }

      return items;
    },

    // Filter items - supports both object filters and function filters
    filter: async (filterArg) => {
      const items = getAll();

      if (typeof filterArg === 'function') {
        return items.filter(filterArg);
      }

      // Object-based filtering
      if (filterArg && typeof filterArg === 'object') {
        return items.filter(item => {
          return Object.entries(filterArg).every(([key, value]) => {
            if (value === undefined || value === null) return true;
            return item[key] === value;
          });
        });
      }

      return items;
    },

    // Get a single item by ID
    get: async (id) => {
      const items = getAll();
      return items.find(item => item.id === id) || null;
    },

    // Create a new item
    create: async (data) => {
      const items = getAll();
      const newItem = {
        ...data,
        id: data.id || generateId(),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      items.push(newItem);
      saveAll(items);
      return newItem;
    },

    // Bulk create multiple items
    bulkCreate: async (dataArray) => {
      const items = getAll();
      const newItems = dataArray.map(data => ({
        ...data,
        id: data.id || generateId(),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      }));
      items.push(...newItems);
      saveAll(items);
      return newItems;
    },

    // Update an existing item
    update: async (id, data) => {
      const items = getAll();
      const index = items.findIndex(item => item.id === id);
      if (index === -1) {
        throw new Error(`${entityName} with id ${id} not found`);
      }
      items[index] = {
        ...items[index],
        ...data,
        updated_date: new Date().toISOString(),
      };
      saveAll(items);
      return items[index];
    },

    // Delete an item
    delete: async (id) => {
      const items = getAll();
      const filtered = items.filter(item => item.id !== id);
      saveAll(filtered);
      return { success: true };
    },

    // Count items with optional filtering
    count: async (filters = {}) => {
      const items = await createEntityManager(entityName).filter(filters);
      return items.length;
    },
  };
};

// Auth management (localStorage-based)
const auth = {
  me: async () => {
    const stored = localStorage.getItem('proflow_current_user');
    if (stored) {
      return JSON.parse(stored);
    }
    // Create a default user
    const defaultUser = {
      id: 'default-user',
      email: 'user@proflow.local',
      full_name: 'Proflow User',
      active_workspace_id: null,
      created_date: new Date().toISOString(),
    };
    localStorage.setItem('proflow_current_user', JSON.stringify(defaultUser));
    return defaultUser;
  },

  updateMe: async (updates) => {
    const stored = localStorage.getItem('proflow_current_user');
    const user = stored ? JSON.parse(stored) : {};
    const updated = { ...user, ...updates, updated_date: new Date().toISOString() };
    localStorage.setItem('proflow_current_user', JSON.stringify(updated));
    return updated;
  },

  // Check if user is logged in (always true for local storage)
  isLoggedIn: () => true,

  // Logout (clears user data)
  logout: async () => {
    localStorage.removeItem('proflow_current_user');
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
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const fileData = {
            id: `file-${generateId()}`,
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result,
            uploaded_date: new Date().toISOString(),
          };
          const files = JSON.parse(localStorage.getItem('proflow_files') || '[]');
          files.push(fileData);
          localStorage.setItem('proflow_files', JSON.stringify(files));
          resolve({
            success: true,
            file_url: `local://${fileData.id}`,
            file_id: fileData.id,
            file_name: fileData.name,
          });
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
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
