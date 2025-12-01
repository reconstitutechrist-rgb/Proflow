import React from 'react';
import { Button } from '@/components/ui/button';
import {
  FileText,
  FolderOpen,
  CheckSquare,
  Users,
  MessageSquare,
  Search,
  Plus,
  Inbox,
  FileSearch,
  Calendar,
} from 'lucide-react';

// Pre-defined empty state configurations
const EMPTY_STATE_PRESETS = {
  documents: {
    icon: FileText,
    title: 'No documents yet',
    description: 'Create your first document to get started with your project.',
    actionLabel: 'Create Document',
  },
  tasks: {
    icon: CheckSquare,
    title: 'No tasks found',
    description: 'Create tasks to track your work and collaborate with your team.',
    actionLabel: 'Add Task',
  },
  projects: {
    icon: FolderOpen,
    title: 'No projects yet',
    description: 'Create a project to organize your assignments, tasks, and documents.',
    actionLabel: 'Create Project',
  },
  assignments: {
    icon: Calendar,
    title: 'No assignments',
    description: 'Assignments help you organize and track your work with deadlines.',
    actionLabel: 'Create Assignment',
  },
  messages: {
    icon: MessageSquare,
    title: 'No messages',
    description: 'Start a conversation to collaborate with your team.',
    actionLabel: 'Start Chat',
  },
  users: {
    icon: Users,
    title: 'No team members',
    description: 'Invite team members to collaborate on your workspace.',
    actionLabel: 'Invite Members',
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters.',
    actionLabel: null,
  },
  inbox: {
    icon: Inbox,
    title: 'All caught up!',
    description: 'You have no new notifications or items to review.',
    actionLabel: null,
  },
  files: {
    icon: FileSearch,
    title: 'No files uploaded',
    description: 'Upload files to attach them to your documents and tasks.',
    actionLabel: 'Upload File',
  },
};

/**
 * Unified empty state component
 * @param {Object} props
 * @param {string} [props.preset] - Use a predefined empty state configuration
 * @param {React.ComponentType} [props.icon] - Custom icon component
 * @param {string} [props.title] - Custom title
 * @param {string} [props.description] - Custom description
 * @param {string} [props.actionLabel] - Custom action button label
 * @param {Function} [props.onAction] - Action button click handler
 * @param {React.ReactNode} [props.action] - Custom action element (overrides actionLabel)
 * @param {string} [props.className] - Additional CSS classes
 */
export function EmptyState({
  preset,
  icon: CustomIcon,
  title: customTitle,
  description: customDescription,
  actionLabel: customActionLabel,
  onAction,
  action,
  className = '',
}) {
  // Get preset config if specified
  const presetConfig = preset ? EMPTY_STATE_PRESETS[preset] : {};

  // Merge custom props with preset (custom takes precedence)
  const Icon = CustomIcon || presetConfig.icon || Inbox;
  const title = customTitle || presetConfig.title || 'Nothing here yet';
  const description = customDescription || presetConfig.description || 'Get started by creating something new.';
  const actionLabel = customActionLabel !== undefined ? customActionLabel : presetConfig.actionLabel;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>

      {action ? (
        action
      ) : actionLabel && onAction ? (
        <Button onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Search-specific empty state with suggestions
 */
export function SearchEmptyState({ query, suggestions = [], onSuggestionClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        No results for &ldquo;{query}&rdquo;
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Try checking your spelling or using different keywords.
      </p>

      {suggestions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Try searching for:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Error state component
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.',
  onRetry,
  retryLabel = 'Try Again',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <svg
          className="h-8 w-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>

      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
