import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load user and workspaces with retry logic
  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));

      // Load all workspaces where user is a member - FIXED: Use proper array filter
      const workspaces = await base44.entities.Workspace.filter({
        members: { $in: [user.email] }
      }, '-updated_date');

      setAvailableWorkspaces(workspaces);

      // Determine active workspace
      let activeWorkspace = null;

      // Priority 1: Check local storage
      const localStorageWorkspaceId = localStorage.getItem('active_workspace_id');
      if (localStorageWorkspaceId) {
        activeWorkspace = workspaces.find(w => w.id === localStorageWorkspaceId);
      }

      // Priority 2: Check user entity preference
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
        // Check one more time to avoid race condition
        const existingDefault = await base44.entities.Workspace.filter({
          owner_email: user.email,
          is_default: true
        }, '-created_date', 1);
        
        if (existingDefault.length > 0) {
          activeWorkspace = existingDefault[0];
        } else {
          const newWorkspace = await base44.entities.Workspace.create({
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
        }
        setAvailableWorkspaces([activeWorkspace]);
      }

      setCurrentWorkspace(activeWorkspace);
      
      // Sync to both local storage and user entity
      localStorage.setItem('active_workspace_id', activeWorkspace.id);
      if (user.active_workspace_id !== activeWorkspace.id) {
        await base44.auth.updateMe({ active_workspace_id: activeWorkspace.id });
      }

      // Reset retry count on success
      setRetryCount(0);

    } catch (err) {
      console.error('Error loading workspaces:', err);
      
      if (err.message && err.message.includes('Rate limit')) {
        if (retryCount < 3) {
          // Retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          toast.error(`Loading workspaces... Retrying in ${delay/1000}s`, {
            duration: delay
          });
          
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            loadWorkspaces();
          }, delay);
        } else {
          setError('Rate limit exceeded. Please refresh the page in a moment.');
          toast.error('Rate limit exceeded. Please refresh the page.');
        }
      } else {
        setError(err.message || 'Failed to load workspaces. Please refresh the page.');
        toast.error('Failed to load workspaces');
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

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
    
    // Update user entity preference
    try {
      await base44.auth.updateMe({ active_workspace_id: workspaceId });
    } catch (error) {
      console.error('Error updating user workspace preference:', error);
    }

    // Reload page to refresh all data with new workspace context
    window.location.reload();
  }, [availableWorkspaces]);

  // Refresh workspaces list
  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    loadWorkspaces();
  }, []); // Only run once on mount

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