import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useConnectionStatus, CONNECTION_STATUS } from '@/hooks/useConnectionStatus';
import { Button } from '@/components/ui/button';

/**
 * ConnectionStatus - Global connection status indicator
 * Shows a banner when connection is lost or reconnecting
 */
export default function ConnectionStatus() {
  const { status, isOnline, checkConnection, reconnectAttempts } = useConnectionStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  // Show banner when disconnected or reconnecting
  useEffect(() => {
    if (status === CONNECTION_STATUS.DISCONNECTED || status === CONNECTION_STATUS.RECONNECTING) {
      setShowBanner(true);
      setWasDisconnected(true);
    } else if (status === CONNECTION_STATUS.CONNECTED && wasDisconnected) {
      // Briefly show success message before hiding
      setShowSuccess(true);
      setTimeout(() => {
        setShowBanner(false);
        setShowSuccess(false);
        setWasDisconnected(false);
      }, 2000);
    }
  }, [status, wasDisconnected]);

  const getStatusConfig = () => {
    if (showSuccess) {
      return {
        icon: CheckCircle,
        message: 'Connected',
        bgColor: 'bg-green-500',
        iconColor: 'text-white',
        showRetry: false,
      };
    }

    if (!isOnline) {
      return {
        icon: WifiOff,
        message: "You're offline. Check your internet connection.",
        bgColor: 'bg-gray-800',
        iconColor: 'text-gray-300',
        showRetry: false,
      };
    }

    if (status === CONNECTION_STATUS.RECONNECTING) {
      return {
        icon: RefreshCw,
        message: reconnectAttempts > 2 ? 'Having trouble reconnecting...' : 'Reconnecting...',
        bgColor: 'bg-amber-500',
        iconColor: 'text-white animate-spin',
        showRetry: reconnectAttempts > 2,
      };
    }

    if (status === CONNECTION_STATUS.DISCONNECTED) {
      return {
        icon: WifiOff,
        message: 'Connection lost. Trying to reconnect...',
        bgColor: 'bg-red-500',
        iconColor: 'text-white',
        showRetry: true,
      };
    }

    return null;
  };

  const config = getStatusConfig();

  if (!showBanner || !config) return null;

  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed top-0 left-0 right-0 z-100 ${config.bgColor} shadow-lg`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-white text-sm">
            <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
            <span className="font-medium">{config.message}</span>
            {config.showRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => checkConnection()}
                className="text-white hover:bg-white/20 h-7 px-3"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * ConnectionDot - Small indicator for connection status
 * Can be used inline in headers or footers
 */
export function ConnectionDot({ className = '' }) {
  const { status, isOnline } = useConnectionStatus();

  const getColor = () => {
    if (!isOnline) return 'bg-gray-400';
    if (status === CONNECTION_STATUS.CONNECTED) return 'bg-green-500';
    if (status === CONNECTION_STATUS.RECONNECTING) return 'bg-amber-500 animate-pulse';
    return 'bg-red-500';
  };

  const getTitle = () => {
    if (!isOnline) return 'Offline';
    if (status === CONNECTION_STATUS.CONNECTED) return 'Connected';
    if (status === CONNECTION_STATUS.RECONNECTING) return 'Reconnecting...';
    return 'Disconnected';
  };

  return (
    <div
      className={`w-2 h-2 rounded-full ${getColor()} ${className}`}
      title={getTitle()}
      aria-label={getTitle()}
    />
  );
}
