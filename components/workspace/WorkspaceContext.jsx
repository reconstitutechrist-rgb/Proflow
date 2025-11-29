import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { db } from "@/api/db";
import { toast } from "sonner";

const WorkspaceContext = createContext();

// Simple user management without external auth
const getCurrentUser = () => {
  const stored = localStorage.getItem("proflow_current_user");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Validate the stored user has required fields
      if (parsed && parsed.email && parsed.id) {
        return parsed;
      }
    } catch (e) {
      console.warn("Invalid user data in localStorage, resetting...");
    }
  }
  // Create a default user with a unique ID
  const defaultUser = {
    id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
    email: "user@proflow.local",
    full_name: "Proflow User",
    active_workspace_id: null,
  };
  localStorage.setItem("proflow_current_user", JSON.stringify(defaultUser));
  return defaultUser;
};

const updateCurrentUser = (updates) => {
  const user = getCurrentUser();
  const updated = { ...user, ...updates };
  localStorage.setItem("proflow_current_user", JSON.stringify(updated));
  return updated;
};

// Helper to check if user has access to a workspace
const userHasWorkspaceAccess = (workspace, userEmail) => {
  if (!workspace || !userEmail) return false;
  // Owner always has access
  if (workspace.owner_email === userEmail) return true;
  // Check members array
  if (workspace.members && Array.isArray(workspace.members)) {
    return workspace.members.some(
      (member) => member.toLowerCase() === userEmail.toLowerCase()
    );
  }
  return false;
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

      // Load all workspaces from database
      const allWorkspaces = await db.entities.Workspace.list();

      // Filter workspaces user has access to (owner or member)
      const accessibleWorkspaces = allWorkspaces.filter((workspace) =>
        userHasWorkspaceAccess(workspace, user.email)
      );

      setAvailableWorkspaces(accessibleWorkspaces);

      // Determine active workspace
      let activeWorkspace = null;

      // Priority 1: Check local storage (but verify access)
      const localStorageWorkspaceId = localStorage.getItem(
        "active_workspace_id"
      );
      if (localStorageWorkspaceId) {
        activeWorkspace = accessibleWorkspaces.find(
          (w) => w.id === localStorageWorkspaceId
        );
      }

      // Priority 2: Check user preference (but verify access)
      if (!activeWorkspace && user.active_workspace_id) {
        activeWorkspace = accessibleWorkspaces.find(
          (w) => w.id === user.active_workspace_id
        );
      }

      // Priority 3: Use default personal workspace
      if (!activeWorkspace) {
        activeWorkspace = accessibleWorkspaces.find(
          (w) => w.is_default === true && w.owner_email === user.email
        );
      }

      // Priority 4: Use first accessible workspace
      if (!activeWorkspace && accessibleWorkspaces.length > 0) {
        activeWorkspace = accessibleWorkspaces[0];
      }

      // Priority 5: Create a default personal workspace if none exist
      if (!activeWorkspace) {
        const newWorkspace = await db.entities.Workspace.create({
          name: `${user.full_name}'s Workspace`,
          description: "My personal workspace",
          owner_email: user.email,
          members: [user.email],
          type: "personal",
          is_default: true,
          settings: {
            color: "#3B82F6",
            icon: "👤",
          },
        });

        // Add creator to workspace_members table
        try {
          await db.entities.WorkspaceMember.create({
            workspace_id: newWorkspace.id,
            user_id: user.id,
            role: 'owner',
          });
        } catch (memberError) {
          console.warn('Could not add workspace member record:', memberError);
        }

        activeWorkspace = newWorkspace;
        setAvailableWorkspaces([newWorkspace]);
      }

      setCurrentWorkspace(activeWorkspace);

      // Sync to local storage
      localStorage.setItem("active_workspace_id", activeWorkspace.id);
      if (user.active_workspace_id !== activeWorkspace.id) {
        updateCurrentUser({ active_workspace_id: activeWorkspace.id });
      }
    } catch (err) {
      console.error("Error loading workspaces:", err);
      setError(
        err.message || "Failed to load workspaces. Please refresh the page."
      );
      toast.error("Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch workspace
  const switchWorkspace = useCallback(
    async (workspaceId) => {
      const workspace = availableWorkspaces.find((w) => w.id === workspaceId);
      if (!workspace) {
        console.error("Workspace not found:", workspaceId);
        return;
      }

      // Don't switch if already on this workspace
      if (currentWorkspace?.id === workspaceId) {
        return;
      }

      try {
        // Update local storage first
        localStorage.setItem("active_workspace_id", workspaceId);

        // Update user preference
        updateCurrentUser({ active_workspace_id: workspaceId });

        // Update current workspace state
        setCurrentWorkspace(workspace);

        // Notify user of workspace switch
        toast.success(`Switched to ${workspace.name}`);
      } catch (err) {
        console.error("Error switching workspace:", err);
        toast.error("Failed to switch workspace");
      }
    },
    [availableWorkspaces, currentWorkspace]
  );

  // Refresh workspaces list
  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  // Add a member to current workspace
  const addMember = useCallback(
    async (email) => {
      if (!currentWorkspace) {
        throw new Error("No workspace selected");
      }

      const normalizedEmail = email.trim().toLowerCase();
      const currentMembers = currentWorkspace.members || [];

      if (currentMembers.some((m) => m.toLowerCase() === normalizedEmail)) {
        throw new Error("User is already a member");
      }

      const updatedMembers = [...currentMembers, normalizedEmail];

      await db.entities.Workspace.update(currentWorkspace.id, {
        members: updatedMembers,
      });

      // Update local state
      setCurrentWorkspace({
        ...currentWorkspace,
        members: updatedMembers,
      });

      // Refresh to sync all workspaces
      await loadWorkspaces();
    },
    [currentWorkspace, loadWorkspaces]
  );

  // Remove a member from current workspace
  const removeMember = useCallback(
    async (email) => {
      if (!currentWorkspace) {
        throw new Error("No workspace selected");
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Cannot remove owner
      if (normalizedEmail === currentWorkspace.owner_email?.toLowerCase()) {
        throw new Error("Cannot remove workspace owner");
      }

      const currentMembers = currentWorkspace.members || [];
      const updatedMembers = currentMembers.filter(
        (m) => m.toLowerCase() !== normalizedEmail
      );

      await db.entities.Workspace.update(currentWorkspace.id, {
        members: updatedMembers,
      });

      // Update local state
      setCurrentWorkspace({
        ...currentWorkspace,
        members: updatedMembers,
      });

      // Refresh to sync all workspaces
      await loadWorkspaces();
    },
    [currentWorkspace, loadWorkspaces]
  );

  // Check if current user is owner of current workspace
  const isWorkspaceOwner = useCallback(() => {
    if (!currentWorkspace || !currentUser) return false;
    return (
      currentWorkspace.owner_email?.toLowerCase() ===
      currentUser.email?.toLowerCase()
    );
  }, [currentWorkspace, currentUser]);

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
    retryLoad: loadWorkspaces,
    addMember,
    removeMember,
    isWorkspaceOwner,
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
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
