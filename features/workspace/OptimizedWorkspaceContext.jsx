import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { db } from '@/api/db';

const WorkspaceContext = createContext();

// Get current user from localStorage (set by AuthProvider on login)
const getCurrentUser = () => {
  const stored = localStorage.getItem('proflow_current_user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      // Skip fake/development users
      if (user.email && !user.email.includes('@proflow.local')) {
        return user;
      }
    } catch (e) {
      console.error('Error parsing stored user:', e);
    }
  }
  // Return null if no valid user - AuthProvider should handle authentication
  return null;
};

const updateCurrentUser = (updates) => {
  const user = getCurrentUser();
  const updated = { ...user, ...updates };
  localStorage.setItem('proflow_current_user', JSON.stringify(updated));
  return updated;
};

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
  const currentWorkspaceId = useMemo(() => currentWorkspace?.id || null, [currentWorkspace?.id]);

  // Load workspaces with deduplication and caching
  const loadWorkspaces = useCallback(async (force = false) => {
    // Prevent duplicate simultaneous requests
    if (loadingRef.current && !force) {
      console.log('Skipping duplicate workspace load request');
      return;
    }

    // Cache for 30 seconds unless forced
    const now = Date.now();
    if (!force && now - lastLoadTimeRef.current < 30000) {
      console.log('Using cached workspace data');
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const user = getCurrentUser();
      setCurrentUser(user);

      // If no user is logged in, skip workspace loading
      if (!user || !user.email) {
        console.log('No authenticated user, skipping workspace load');
        setAvailableWorkspaces([]);
        setCurrentWorkspace(null);
        return;
      }

      // Load workspaces
      const workspaces = await db.entities.Workspace.list();

      setAvailableWorkspaces(workspaces);
      lastLoadTimeRef.current = now;

      // Determine active workspace (priority order)
      let activeWorkspace = null;

      // 1. Local storage
      const localStorageWorkspaceId = localStorage.getItem('active_workspace_id');
      if (localStorageWorkspaceId) {
        activeWorkspace = workspaces.find((w) => w.id === localStorageWorkspaceId);
      }

      // 2. User preference
      if (!activeWorkspace && user.active_workspace_id) {
        activeWorkspace = workspaces.find((w) => w.id === user.active_workspace_id);
      }

      // 3. Default personal workspace
      if (!activeWorkspace) {
        activeWorkspace = workspaces.find((w) => w.is_default === true);
      }

      // 4. First available workspace
      if (!activeWorkspace && workspaces.length > 0) {
        activeWorkspace = workspaces[0];
      }

      // 5. Create default workspace if none exist
      if (!activeWorkspace) {
        const newWorkspace = await db.entities.Workspace.create({
          name: `${user.full_name}'s Workspace`,
          description: 'My personal workspace',
          owner_email: user.email?.toLowerCase(),
          members: [user.email?.toLowerCase()],
          type: 'personal',
          is_default: true,
          settings: {
            color: '#3B82F6',
            icon: '👤',
          },
        });
        activeWorkspace = newWorkspace;
        setAvailableWorkspaces([newWorkspace]);

        // Add user to workspace_members for RLS to work
        try {
          await db.entities.WorkspaceMember.create({
            workspace_id: newWorkspace.id,
            user_email: user.email?.toLowerCase(),
            role: 'owner',
          });
          console.log('Added user to workspace_members as owner');
        } catch (memberError) {
          console.warn('Could not add workspace member record:', memberError);
        }
      }

      // Ensure current user is in workspace_members for the active workspace (for RLS)
      if (activeWorkspace && user.email) {
        try {
          const existingMembers = await db.entities.WorkspaceMember.list();
          const userMembership = existingMembers.find(
            (m) =>
              m.workspace_id === activeWorkspace.id &&
              m.user_email?.toLowerCase() === user.email?.toLowerCase()
          );

          if (!userMembership) {
            // User not in workspace_members, add them
            const isOwner =
              activeWorkspace.owner_email?.toLowerCase() === user.email?.toLowerCase();
            await db.entities.WorkspaceMember.create({
              workspace_id: activeWorkspace.id,
              user_email: user.email?.toLowerCase(),
              role: isOwner ? 'owner' : 'member',
            });
            console.log('Synced user to workspace_members for RLS');
          }
        } catch (syncError) {
          console.warn('Could not sync user to workspace_members:', syncError);
        }
      }

      setCurrentWorkspace(activeWorkspace);

      // Sync to storage
      localStorage.setItem('active_workspace_id', activeWorkspace.id);
      if (user.active_workspace_id !== activeWorkspace.id) {
        updateCurrentUser({ active_workspace_id: activeWorkspace.id });
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
  const switchWorkspace = useCallback(
    async (workspaceId) => {
      const workspace = availableWorkspaces.find((w) => w.id === workspaceId);
      if (!workspace) {
        console.error('Workspace not found:', workspaceId);
        return;
      }

      // Optimistic update
      const previousWorkspace = currentWorkspace;
      setCurrentWorkspace(workspace);
      localStorage.setItem('active_workspace_id', workspaceId);

      try {
        // Update user preference
        updateCurrentUser({ active_workspace_id: workspaceId });

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
    },
    [availableWorkspaces, currentWorkspace]
  );

  // Refresh with force flag
  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces(true);
  }, [loadWorkspaces]);

  // Initial load
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      currentWorkspace,
      currentWorkspaceId,
      availableWorkspaces,
      loading,
      error,
      currentUser,
      switchWorkspace,
      refreshWorkspaces,
      retryLoad: loadWorkspaces,
    }),
    [
      currentWorkspace,
      currentWorkspaceId,
      availableWorkspaces,
      loading,
      error,
      currentUser,
      switchWorkspace,
      refreshWorkspaces,
      loadWorkspaces,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

OptimizedWorkspaceProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
