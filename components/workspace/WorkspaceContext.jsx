import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dataClient } from '@/api/base44Client';
import { toast } from 'sonner';

const WorkspaceContext = createContext();

// Simple user management without external auth
const getCurrentUser = () => {
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
  };
  localStorage.setItem('proflow_current_user', JSON.stringify(defaultUser));
  return defaultUser;
};

const updateCurrentUser = (updates) => {
  const user = getCurrentUser();
  const updated = { ...user, ...updates };
  localStorage.setItem('proflow_current_user', JSON.stringify(updated));
  return updated;
};

export function WorkspaceProvider({ children }) {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Load user and workspaces
  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const user = getCurrentUser();
      setCurrentUser(user);

      // Load all workspaces
      const workspaces = await dataClient.entities.Workspace.list();

      setAvailableWorkspaces(workspaces);

      // Determine active workspace
      let activeWorkspace = null;

      // Priority 1: Check local storage
      const localStorageWorkspaceId = localStorage.getItem('active_workspace_id');
      if (localStorageWorkspaceId) {
        activeWorkspace = workspaces.find(w => w.id === localStorageWorkspaceId);
      }

      // Priority 2: Check user preference
      if (!activeWorkspace && user.active_workspace_id) {
        activeWorkspace = workspaces.find(w => w.id === user.active_workspace_id);
      }

      // Priority 3: Use default personal workspace
      if (!activeWorkspace) {
        activeWorkspace = workspaces.find(w => w.is_default === true);
      }

      // Priority 4: Use first available workspace
      if (!activeWorkspace && workspaces.length > 0) {
        activeWorkspace = workspaces[0];
      }

      // Priority 5: Create a default personal workspace if none exist
      if (!activeWorkspace) {
        const newWorkspace = await dataClient.entities.Workspace.create({
          name: `${user.full_name}'s Workspace`,
          description: 'My personal workspace',
          owner_email: user.email,
          members: [user.email],
          type: 'personal',
          is_default: true,
          settings: {
            color: '#3B82F6',
            icon: '👤'
          }
        });
        activeWorkspace = newWorkspace;
        setAvailableWorkspaces([newWorkspace]);
      }

      setCurrentWorkspace(activeWorkspace);

      // Sync to local storage
      localStorage.setItem('active_workspace_id', activeWorkspace.id);
      if (user.active_workspace_id !== activeWorkspace.id) {
        updateCurrentUser({ active_workspace_id: activeWorkspace.id });
      }

    } catch (err) {
      console.error('Error loading workspaces:', err);
      setError(err.message || 'Failed to load workspaces. Please refresh the page.');
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch workspace
  const switchWorkspace = useCallback(async (workspaceId) => {
    const workspace = availableWorkspaces.find(w => w.id === workspaceId);
    if (!workspace) {
      console.error('Workspace not found:', workspaceId);
      return;
    }

    setCurrentWorkspace(workspace);

    // Update local storage
    localStorage.setItem('active_workspace_id', workspaceId);

    // Update user preference
    updateCurrentUser({ active_workspace_id: workspaceId });

    // Reload page to refresh all data with new workspace context
    window.location.reload();
  }, [availableWorkspaces]);

  // Refresh workspaces list
  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const value = {
    currentWorkspace,
    currentWorkspaceId: currentWorkspace?.id || null,
    availableWorkspaces,
    loading,
    error,
    currentUser,
    switchWorkspace,
    refreshWorkspaces,
    retryLoad: loadWorkspaces
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
