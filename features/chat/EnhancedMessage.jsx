import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Reply,
  Edit,
  Trash2,
  Pin,
  Bookmark,
  MoreVertical,
  File,
  Paperclip,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import MessageReactions from '@/features/chat/MessageReactions';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

// Detect touch device
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// PERFORMANCE: Memoize to prevent re-renders when parent message list updates
const EnhancedMessage = React.memo(function EnhancedMessage({
  message,
  previousMessage,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onBookmark,
  onAddReaction,
  onRemoveReaction,
  viewMode = 'comfortable',
}) {
  const [showActions, setShowActions] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  // Check if this message should be grouped with the previous one
  const shouldGroup =
    previousMessage &&
    previousMessage.author_email === message.author_email &&
    previousMessage.message_type === message.message_type &&
    !previousMessage.is_pinned &&
    !message.is_pinned &&
    new Date(message.created_date) - new Date(previousMessage.created_date) < 5 * 60 * 1000; // Within 5 minutes

  const isOwnMessage = currentUser && message.author_email === currentUser.email;
  const isBookmarked = message.is_bookmarked_by?.includes(currentUser?.email);

  // Find the message being replied to
  const replyToMessage = message.reply_to_message;

  return (
    <div
      className={`group relative ${viewMode === 'compact' ? 'py-1' : 'py-2'} ${
        shouldGroup ? '' : 'mt-4'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-3">
        {/* Avatar - Only show if not grouped */}
        {!shouldGroup && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              {message.author_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Spacer for grouped messages */}
        {shouldGroup && <div className="w-8 flex-shrink-0" />}

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header - Only show if not grouped */}
          {!shouldGroup && (
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                {message.author_name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(message.created_date), 'h:mm a')}
              </span>
              {message.is_edited && (
                <Badge variant="outline" className="text-xs">
                  edited
                </Badge>
              )}
              {message.is_pinned && <Pin className="w-3 h-3 text-yellow-600" />}
              {isBookmarked && <Bookmark className="w-3 h-3 text-blue-600 fill-current" />}
            </div>
          )}

          {/* Reply Context */}
          {message.reply_to && replyToMessage && (
            <div className="mb-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600 py-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Reply className="w-3 h-3" />
                <span className="font-medium">{replyToMessage.author_name}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                {replyToMessage.content}
              </p>
            </div>
          )}

          {/* Message Content */}
          <div className="relative">
            {message.message_type === 'text' ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    code: ({ inline, className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline ? (
                        <pre className="bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto my-2">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm">
                          {children}
                        </code>
                      );
                    },
                    p: ({ children }) => <p className="my-1">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : message.message_type === 'file' ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <File className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                    {message.file_name}
                  </p>
                  <a
                    href={message.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Download
                  </a>
                </div>
              </div>
            ) : message.message_type === 'voice' ? (
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <Clock className="w-5 h-5 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Voice Message</p>
                  <p className="text-xs text-gray-500">{message.voice_duration}s</p>
                </div>
              </div>
            ) : null}

            {/* Mentioned Users */}
            {message.mentioned_users && message.mentioned_users.length > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {message.mentioned_users.map((email, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    @{email.split('@')[0]}
                  </Badge>
                ))}
              </div>
            )}

            {/* Quick Actions - Show on Hover (desktop) or Always via Menu (mobile) */}
            {isTouch ? (
              // Mobile: Always show a menu button
              <div className="absolute -top-3 right-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
                      aria-label="Message actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onReply?.(message)}>
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </DropdownMenuItem>
                    {isOwnMessage && (
                      <DropdownMenuItem onClick={() => onEdit?.(message)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onBookmark?.(message.id)}>
                      <Bookmark
                        className={`w-4 h-4 mr-2 ${isBookmarked ? 'fill-current text-blue-600' : ''}`}
                      />
                      {isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPin?.(message.id)}>
                      <Pin
                        className={`w-4 h-4 mr-2 ${message.is_pinned ? 'text-yellow-600' : ''}`}
                      />
                      {message.is_pinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    {isOwnMessage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete?.(message.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              // Desktop: Show on hover
              showActions && (
                <div className="absolute -top-3 right-0 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onReply?.(message)}
                    aria-label="Reply to message"
                  >
                    <Reply className="w-3 h-3" />
                  </Button>
                  {isOwnMessage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => onEdit?.(message)}
                      aria-label="Edit message"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onBookmark?.(message.id)}
                    aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark message'}
                  >
                    <Bookmark
                      className={`w-3 h-3 ${isBookmarked ? 'fill-current text-blue-600' : ''}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onPin?.(message.id)}
                    aria-label={message.is_pinned ? 'Unpin message' : 'Pin message'}
                  >
                    <Pin className={`w-3 h-3 ${message.is_pinned ? 'text-yellow-600' : ''}`} />
                  </Button>
                  {isOwnMessage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          aria-label="More actions"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onDelete?.(message.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Message
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            )}
          </div>

          {/* Message Reactions */}
          <MessageReactions
            message={message}
            currentUser={currentUser}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
          />
        </div>
      </div>
    </div>
  );
});

export default EnhancedMessage;
