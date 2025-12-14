import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * Connection states
 */
export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
};

/**
 * Hook to monitor connection status to Supabase
 * Tracks both network connectivity and Supabase realtime connection
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState(CONNECTION_STATUS.CONNECTED);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastConnected, setLastConnected] = useState(Date.now());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Use ref to track online state for callbacks without causing re-renders
  const isOnlineRef = useRef(isOnline);
  const reconnectAttemptsRef = useRef(reconnectAttempts);

  // Keep refs in sync
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    reconnectAttemptsRef.current = reconnectAttempts;
  }, [reconnectAttempts]);

  // Check Supabase connection with a simple query
  const checkSupabaseConnection = useCallback(async () => {
    try {
      // Simple query to check if connection is alive
      const { error } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();

      if (error && error.code === 'PGRST116') {
        // This is actually fine - just means no rows returned
        setStatus(CONNECTION_STATUS.CONNECTED);
        setLastConnected(Date.now());
        setReconnectAttempts(0);
        return true;
      }

      if (error) {
        throw error;
      }

      setStatus(CONNECTION_STATUS.CONNECTED);
      setLastConnected(Date.now());
      setReconnectAttempts(0);
      return true;
    } catch (error) {
      console.warn('Connection check failed:', error);
      setReconnectAttempts((prev) => prev + 1);

      // Retry with exponential backoff
      if (isOnlineRef.current) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        setTimeout(checkSupabaseConnection, delay);
        setStatus(CONNECTION_STATUS.RECONNECTING);
      }

      return false;
    }
  }, []);

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus(CONNECTION_STATUS.RECONNECTING);
      // Check if Supabase connection is alive
      checkSupabaseConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus(CONNECTION_STATUS.DISCONNECTED);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkSupabaseConnection]);

  // Periodic connection check
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnlineRef.current && status === CONNECTION_STATUS.CONNECTED) {
        // Silent check every 30 seconds when connected
        checkSupabaseConnection();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [status, checkSupabaseConnection]);

  // Initial connection check
  useEffect(() => {
    checkSupabaseConnection();
  }, [checkSupabaseConnection]);

  // Monitor Supabase realtime connection if available
  useEffect(() => {
    // Create a presence channel to monitor realtime connection
    const channel = supabase.channel('connection-status');

    channel
      .on('presence', { event: 'sync' }, () => {
        setStatus(CONNECTION_STATUS.CONNECTED);
        setLastConnected(Date.now());
      })
      .subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          setStatus(CONNECTION_STATUS.CONNECTED);
          setLastConnected(Date.now());
        } else if (channelStatus === 'CHANNEL_ERROR') {
          if (isOnlineRef.current) {
            setStatus(CONNECTION_STATUS.RECONNECTING);
          }
        } else if (channelStatus === 'TIMED_OUT') {
          setStatus(CONNECTION_STATUS.DISCONNECTED);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    status,
    isOnline,
    isConnected: status === CONNECTION_STATUS.CONNECTED,
    isReconnecting: status === CONNECTION_STATUS.RECONNECTING,
    isDisconnected: status === CONNECTION_STATUS.DISCONNECTED,
    lastConnected,
    reconnectAttempts,
    checkConnection: checkSupabaseConnection,
  };
}
