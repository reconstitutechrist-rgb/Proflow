import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

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
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);

          // Sync user info to localStorage for WorkspaceContext
          syncUserToLocalStorage(currentSession.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);

      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        syncUserToLocalStorage(newSession.user);
      } else if (event === 'SIGNED_OUT') {
        // Clear workspace preference on sign out - Supabase handles session cleanup
        localStorage.removeItem('active_workspace_id');
      }

      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sync user preference to localStorage (minimal data - no sensitive info)
  // SECURITY: Only store workspace preference, not email/id (use Supabase session for auth data)
  const syncUserToLocalStorage = (supabaseUser) => {
    if (!supabaseUser) return;

    // Only store workspace preference - user identity comes from Supabase session
    const activeWorkspaceId = supabaseUser.user_metadata?.active_workspace_id || null;
    if (activeWorkspaceId) {
      localStorage.setItem('active_workspace_id', activeWorkspaceId);
    }
  };

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);
      // Only remove workspace preference - Supabase handles session cleanup
      localStorage.removeItem('active_workspace_id');
    } catch (error) {
      console.error('Error signing out:', error);
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
      console.error('Error updating profile:', error);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
