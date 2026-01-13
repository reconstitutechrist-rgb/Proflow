import React, { useState, useMemo } from 'react';
import {
  Plus,
  Upload,
  Edit,
  Trash2,
  RotateCcw,
  Star,
  StarOff,
  FolderInput,
  Download,
  Eye,
  X,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

/**
 * Action display configuration
 */
const ACTION_DISPLAY = {
  created: { verb: 'created', icon: Plus, color: 'text-green-500' },
  uploaded: { verb: 'uploaded', icon: Upload, color: 'text-blue-500' },
  edited: { verb: 'edited', icon: Edit, color: 'text-blue-500' },
  deleted: { verb: 'moved to trash', icon: Trash2, color: 'text-red-500' },
  restored: { verb: 'restored', icon: RotateCcw, color: 'text-green-500' },
  permanently_deleted: { verb: 'permanently deleted', icon: X, color: 'text-red-500' },
  starred: { verb: 'starred', icon: Star, color: 'text-yellow-500' },
  unstarred: { verb: 'unstarred', icon: StarOff, color: 'text-gray-500' },
  moved: { verb: 'moved', icon: FolderInput, color: 'text-purple-500' },
  downloaded: { verb: 'downloaded', icon: Download, color: 'text-blue-500' },
  viewed: { verb: 'viewed', icon: Eye, color: 'text-gray-500' },
};

/**
 * Get initials from name or email
 */
const getInitials = (name, email) => {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
};

/**
 * ActivityItem - Single activity entry
 */
function ActivityItem({ activity, isCurrentUser, darkMode }) {
  const actionConfig = ACTION_DISPLAY[activity.action] || {
    verb: activity.action,
    icon: Activity,
    color: 'text-gray-500',
  };

  const Icon = actionConfig.icon;
  const timeAgo = activity.created_at
    ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
    : '';

  const displayName = isCurrentUser
    ? 'You'
    : activity.user_name || activity.user_email?.split('@')[0] || 'Unknown';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
          isCurrentUser
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
            : darkMode
              ? 'bg-white/10 text-gray-300'
              : 'bg-gray-100 text-gray-600'
        )}
      >
        {getInitials(activity.user_name, activity.user_email)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('font-medium text-sm', darkMode ? 'text-white' : 'text-gray-900')}>
            {displayName}
          </span>
          <Icon className={cn('w-3.5 h-3.5', actionConfig.color)} />
          <span className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
            {actionConfig.verb}
          </span>
        </div>

        {/* Document title */}
        <p className={cn('text-sm truncate mt-0.5', darkMode ? 'text-gray-300' : 'text-gray-700')}>
          {activity.document_title || 'Unknown document'}
        </p>

        {/* Timestamp */}
        <p className={cn('text-xs mt-1', darkMode ? 'text-gray-500' : 'text-gray-400')}>
          {timeAgo}
        </p>
      </div>
    </div>
  );
}

/**
 * DocumentActivityPanel - Activity feed panel
 * @param {Object} props
 * @param {Array} props.activities - Activity entries
 * @param {string} props.currentUserEmail - Current user's email
 * @param {boolean} props.showOnlyMine - Filter to show only current user's activity
 * @param {Function} props.onToggleFilter - Callback to toggle filter
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @param {Function} props.onClose - Callback to close panel
 */
export default function DocumentActivityPanel({
  activities = [],
  currentUserEmail,
  showOnlyMine = false,
  onToggleFilter,
  loading = false,
  darkMode = false,
  onClose,
}) {
  // Filter activities if needed
  const filteredActivities = useMemo(() => {
    if (!showOnlyMine || !currentUserEmail) {
      return activities;
    }
    return activities.filter((activity) => activity.user_email === currentUserEmail);
  }, [activities, showOnlyMine, currentUserEmail]);

  return (
    <div
      className={cn(
        'w-80 flex-shrink-0 flex flex-col border-l h-full',
        darkMode ? 'bg-[#0A0A0B] border-white/10' : 'bg-white border-gray-200'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          darkMode ? 'border-white/10' : 'border-gray-200'
        )}
      >
        <h3 className={cn('font-medium', darkMode ? 'text-white' : 'text-gray-900')}>
          Recent Activity
        </h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filter toggle */}
      <div
        className={cn(
          'flex items-center gap-1 px-4 py-2 border-b',
          darkMode ? 'border-white/10' : 'border-gray-100'
        )}
      >
        <Button
          variant={!showOnlyMine ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToggleFilter && onToggleFilter(false)}
          className="h-7 text-xs"
        >
          All
        </Button>
        <Button
          variant={showOnlyMine ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToggleFilter && onToggleFilter(true)}
          className="h-7 text-xs"
        >
          Mine
        </Button>
      </div>

      {/* Activity list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div
              className={cn(
                'text-center py-8 text-sm',
                darkMode ? 'text-gray-500' : 'text-gray-400'
              )}
            >
              Loading activity...
            </div>
          ) : filteredActivities.length === 0 ? (
            <div
              className={cn(
                'text-center py-8 text-sm',
                darkMode ? 'text-gray-500' : 'text-gray-400'
              )}
            >
              <Activity
                className={cn('w-8 h-8 mx-auto mb-2', darkMode ? 'text-gray-600' : 'text-gray-300')}
              />
              <p>No activity yet</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isCurrentUser={activity.user_email === currentUserEmail}
                darkMode={darkMode}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
