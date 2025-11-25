import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const WorkspaceContext = createContext();

/**
 * Optimized WorkspaceProvider with performance enhancements:
 * - Memoized values to prevent unnecessary re-renders
 * - Optimistic updates for better UX
 * - Request deduplication
 * - Intelligent caching
 */
export function OptimizedWorkspaceProvider({ children }) {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Cache for preventing duplicate requests
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  // Memoized workspace ID for performance
  const currentWorkspaceId = useMemo(() => 
    currentWorkspace?.id || null, 
    [currentWorkspace?.id]
  );

  // Load workspaces with deduplication and caching
  const loadWorkspaces = useCallback(async (force = false) => {
    // Prevent duplicate simultaneous requests
    if (loadingRef.current && !force) {
      console.log('⏭️ Skipping duplicate workspace load request');
      return;
    }

    // Cache for 30 seconds unless forced
    const now = Date.now();
    if (!force && now - lastLoadTimeRef.current < 30000) {
      console.log('✓ Using cached workspace data');
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Load workspaces where user is a member
      const workspaces = await base44.entities.Workspace.filter({
        members: { $in: [user.email] }
      }, '-updated_date');

      setAvailableWorkspaces(workspaces);
      lastLoadTimeRef.current = now;

      // Determine active workspace (priority order)
      let activeWorkspace = null;

      // 1. Local storage
      const localStorageWorkspaceId = localStorage.getItem('active_workspace_id');
      if (localStorageWorkspaceId) {
        activeWorkspace = workspaces.find(w => w.id === localStorageWorkspaceId);
      }

      // 2. User entity preference
      if (!activeWorkspace && user.active_workspace_id) {
        activeWorkspace = workspaces.find(w => w.id === user.active_workspace_id);
      }

      // 3. Default personal workspace
      if (!activeWorkspace) {
        activeWorkspace = workspaces.find(w => w.is_default === true);
      }

      // 4. First available workspace
      if (!activeWorkspace && workspaces.length > 0) {
        activeWorkspace = workspaces[0];
      }

      // 5. Create default workspace if none exist
      if (!activeWorkspace) {
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
      
      // Sync to storage and user entity
      localStorage.setItem('active_workspace_id', activeWorkspace.id);
      if (user.active_workspace_id !== activeWorkspace.id) {
        await base44.auth.updateMe({ active_workspace_id: activeWorkspace.id });
      }

    } catch (err) {
      console.error('Error loading workspaces:', err);
      setError(err.message || 'Failed to load workspaces');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Optimistic workspace switch with rollback on error
  const switchWorkspace = useCallback(async (workspaceId) => {
    const workspace = availableWorkspaces.find(w => w.id === workspaceId);
    if (!workspace) {
      console.error('Workspace not found:', workspaceId);
      return;
    }

    // Optimistic update
    const previousWorkspace = currentWorkspace;
    setCurrentWorkspace(workspace);
    localStorage.setItem('active_workspace_id', workspaceId);

    try {
      // Background sync to user entity
      await base44.auth.updateMe({ active_workspace_id: workspaceId });
      
      // Reload page for fresh data
      window.location.reload();
    } catch (error) {
      console.error('Error updating workspace preference:', error);
      
      // Rollback on error
      setCurrentWorkspace(previousWorkspace);
      if (previousWorkspace) {
        localStorage.setItem('active_workspace_id', previousWorkspace.id);
      }
    }
  }, [availableWorkspaces, currentWorkspace]);

  // Refresh with force flag
  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces(true);
  }, [loadWorkspaces]);

  // Initial load
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    currentWorkspace,
    currentWorkspaceId,
    availableWorkspaces,
    loading,
    error,
    currentUser,
    switchWorkspace,
    refreshWorkspaces,
    retryLoad: loadWorkspaces
  }), [
    currentWorkspace,
    currentWorkspaceId,
    availableWorkspaces,
    loading,
    error,
    currentUser,
    switchWorkspace,
    refreshWorkspaces,
    loadWorkspaces
  ]);

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