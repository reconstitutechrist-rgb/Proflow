import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);

          // Sync user info to localStorage for WorkspaceContext
          syncUserToLocalStorage(currentSession.user);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event);

        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          syncUserToLocalStorage(newSession.user);
        } else if (event === "SIGNED_OUT") {
          // Clear localStorage on sign out
          localStorage.removeItem("proflow_current_user");
          localStorage.removeItem("active_workspace_id");
        }

        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sync Supabase user to localStorage format expected by WorkspaceContext
  const syncUserToLocalStorage = (supabaseUser) => {
    if (!supabaseUser) return;

    const userInfo = {
      id: supabaseUser.id,
      email: supabaseUser.email,
      full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User",
      active_workspace_id: supabaseUser.user_metadata?.active_workspace_id || null,
    };

    localStorage.setItem("proflow_current_user", JSON.stringify(userInfo));
  };

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);
      localStorage.removeItem("proflow_current_user");
      localStorage.removeItem("active_workspace_id");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        syncUserToLocalStorage(data.user);
      }

      return data;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }, []);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!session;

  const value = {
    user,
    session,
    loading,
    initialized,
    isAuthenticated,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
