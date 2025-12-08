import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import TeamChatImagePreview from './TeamChatImagePreview';

/**
 * Get initials from a name or email
 */
const getInitials = (name, email) => {
  if (name) {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
};

/**
 * Get a consistent color based on email
 */
const getAvatarColor = (email) => {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < (email?.length || 0); i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function TeamChatMessage({ message, currentUser, onDelete }) {
  const [showActions, setShowActions] = useState(false);

  const isOwnMessage = message.author_email === currentUser?.email;
  const isImage = message.message_type === 'image';
  const isSystem = message.message_type === 'system' || message.message_type === 'ai_summary';

  // Format timestamp
  const timestamp = message.created_date
    ? formatDistanceToNow(new Date(message.created_date), { addSuffix: true })
    : '';

  const fullTimestamp = message.created_date ? format(new Date(message.created_date), 'PPpp') : '';

  // System messages (centered, different style)
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-3 py-1.5 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 group ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isOwnMessage && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className={`text-white text-xs ${getAvatarColor(message.author_email)}`}>
            {getInitials(message.author_name, message.author_email)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Author name (for others' messages) */}
        {!isOwnMessage && (
          <div className="text-xs text-gray-500 mb-1 ml-1">
            {message.author_name || message.author_email}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`
            relative rounded-2xl px-3 py-2
            ${
              isOwnMessage
                ? 'bg-emerald-500 text-white rounded-br-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
            }
          `}
        >
          {/* Image message */}
          {isImage && message.file_url ? (
            <TeamChatImagePreview
              src={message.file_url}
              fileName={message.file_name}
              fileSize={message.file_size}
            />
          ) : (
            /* Text message */
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Actions dropdown (only for own messages) */}
          {isOwnMessage && showActions && (
            <div className="absolute -left-8 top-1/2 -translate-y-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[10px] text-gray-400 mt-1 ${isOwnMessage ? 'text-right mr-1' : 'ml-1'}`}
          title={fullTimestamp}
        >
          {timestamp}
        </div>
      </div>
    </div>
  );
}
