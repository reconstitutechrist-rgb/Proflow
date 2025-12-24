import { useState, useEffect, useCallback } from 'react';
import { github, checkGitHubConnection, connectGitHub } from '@/api/github';

/**
 * Hook for managing GitHub connection state
 * Provides connection status, user info, and connect/disconnect functions
 */
export function useGitHubConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [githubUser, setGitHubUser] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { connected, hasToken } = await checkGitHubConnection();

      if (connected && hasToken) {
        setIsConnected(true);
        // Fetch GitHub user info
        try {
          const user = await github.getCurrentUser();
          setGitHubUser(user);
        } catch (err) {
          // Token may be expired or invalid
          console.warn('Failed to fetch GitHub user:', err);
          setIsConnected(false);
          setGitHubUser(null);
          setError('GitHub token expired. Please reconnect.');
        }
      } else {
        setIsConnected(false);
        setGitHubUser(null);
      }
    } catch (err) {
      console.error('Error checking GitHub connection:', err);
      setError(err.message);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = useCallback(async (redirectTo) => {
    try {
      setIsConnecting(true);
      setError(null);
      const { error: connectError } = await connectGitHub(redirectTo);
      if (connectError) {
        setError(connectError.message);
        return { success: false, error: connectError };
      }
      // OAuth redirect will happen, no need to update state
      return { success: true };
    } catch (err) {
      console.error('Failed to connect GitHub:', err);
      setError(err.message);
      return { success: false, error: err };
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    // Note: Supabase doesn't support unlinking identities via client
    // We can only mark the connection as inactive in our database
    // For now, we just clear local state
    setIsConnected(false);
    setGitHubUser(null);
    setError(
      'To fully disconnect GitHub, please remove the app authorization from GitHub settings.'
    );
    return { success: true, message: 'Local connection cleared' };
  }, []);

  return {
    isConnected,
    isLoading,
    isConnecting,
    githubUser,
    error,
    connect,
    disconnect,
    refresh: checkConnection,
  };
}

export default useGitHubConnection;
