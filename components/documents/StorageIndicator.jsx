import React, { useMemo } from 'react';
import { HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "2.4 GB")
 */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/**
 * StorageIndicator - Shows storage usage with progress bar
 * @param {Object} props
 * @param {number} props.usedBytes - Bytes currently used
 * @param {number} props.totalBytes - Total available bytes
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 */
export default function StorageIndicator({
  usedBytes = 0,
  totalBytes = 10 * 1024 * 1024 * 1024, // Default 10 GB
  darkMode = false,
}) {
  const percentage = useMemo(() => {
    if (!totalBytes || totalBytes === 0) return 0;
    return Math.min(100, Math.round((usedBytes / totalBytes) * 100));
  }, [usedBytes, totalBytes]);

  const usedFormatted = formatBytes(usedBytes);
  const totalFormatted = formatBytes(totalBytes);

  // Determine color based on usage
  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return darkMode ? 'bg-indigo-500' : 'bg-indigo-600';
  };

  return (
    <div className={cn('px-4 py-3 border-t', darkMode ? 'border-white/10' : 'border-gray-200')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className={cn('w-4 h-4', darkMode ? 'text-gray-400' : 'text-gray-500')} />
          <span className={cn('text-xs font-medium', darkMode ? 'text-gray-400' : 'text-gray-600')}>
            Storage
          </span>
        </div>
        <span className={cn('text-xs', darkMode ? 'text-gray-500' : 'text-gray-400')}>
          {usedFormatted} / {totalFormatted}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className={cn(
          'w-full h-1.5 rounded-full overflow-hidden',
          darkMode ? 'bg-white/10' : 'bg-gray-200'
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', getProgressColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Percentage label */}
      <div className="mt-1 text-right">
        <span
          className={cn(
            'text-xs',
            percentage >= 90
              ? 'text-red-500'
              : percentage >= 75
                ? 'text-yellow-500'
                : darkMode
                  ? 'text-gray-500'
                  : 'text-gray-400'
          )}
        >
          {percentage}% used
        </span>
      </div>
    </div>
  );
}

// Export helper for use elsewhere
export { formatBytes };
