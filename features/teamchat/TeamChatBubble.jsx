import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Users,
  GripVertical,
} from 'lucide-react';
import TeamChatWindow from './TeamChatWindow';
import { useTeamChat } from './useTeamChat';

const POSITION_STORAGE_KEY = 'team_chat_bubble_position';
const DEFAULT_POSITION = { x: null, y: null }; // null means use CSS default

/**
 * Load saved position from localStorage
 */
const loadPosition = () => {
  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading chat bubble position:', e);
  }
  return DEFAULT_POSITION;
};

/**
 * Save position to localStorage
 */
const savePosition = (position) => {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch (e) {
    console.error('Error saving chat bubble position:', e);
  }
};

export default function TeamChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(loadPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [unreadCount, setUnreadCount] = useState(0);

  const bubbleRef = useRef(null);
  const windowRef = useRef(null);

  const teamChat = useTeamChat();

  // Calculate unread count (simplified - could be enhanced)
  useEffect(() => {
    // For now, just show count of active chats
    const activeChats = teamChat.chats?.length || 0;
    setUnreadCount(activeChats > 0 ? activeChats : 0);
  }, [teamChat.chats]);

  /**
   * Handle mouse down for drag start
   */
  const handleMouseDown = useCallback((e) => {
    // Only start drag from the grip handle or header
    if (!e.target.closest('.drag-handle')) return;

    e.preventDefault();
    setIsDragging(true);

    const element = windowRef.current || bubbleRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  /**
   * Handle mouse move for dragging
   */
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Constrain to viewport
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

    setPosition({ x: constrainedX, y: constrainedY });
  }, [isDragging, dragOffset]);

  /**
   * Handle mouse up for drag end
   */
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position);
    }
  }, [isDragging, position]);

  // Add/remove global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Reset position on window resize if out of bounds
  useEffect(() => {
    const handleResize = () => {
      if (position.x !== null && position.y !== null) {
        const maxX = window.innerWidth - 100;
        const maxY = window.innerHeight - 100;
        if (position.x > maxX || position.y > maxY) {
          const newPos = {
            x: Math.min(position.x, maxX),
            y: Math.min(position.y, maxY),
          };
          setPosition(newPos);
          savePosition(newPos);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  /**
   * Get style for positioned element
   */
  const getPositionStyle = () => {
    if (position.x !== null && position.y !== null) {
      return {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto',
      };
    }
    // Default position: bottom-right
    return {
      position: 'fixed',
      right: '1.5rem',
      bottom: '1.5rem',
    };
  };

  /**
   * Reset position to default
   */
  const resetPosition = () => {
    setPosition(DEFAULT_POSITION);
    savePosition(DEFAULT_POSITION);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  // Floating bubble button (when closed)
  if (!isOpen) {
    return (
      <div
        ref={bubbleRef}
        style={getPositionStyle()}
        className="z-50"
      >
        <Button
          onClick={handleOpen}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 group relative"
          aria-label="Open Team Chat"
          title="Open Team Chat"
        >
          <div className="relative">
            <Users className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2">
                <Badge
                  variant="destructive"
                  className="h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </div>
            )}
          </div>
        </Button>
      </div>
    );
  }

  // Chat window (when open)
  return (
    <div
      ref={windowRef}
      style={getPositionStyle()}
      className={`z-50 ${isDragging ? 'cursor-grabbing' : ''}`}
    >
      <Card
        className={`
          shadow-2xl border-0 bg-white dark:bg-gray-900 flex flex-col
          w-[calc(100vw-3rem)] sm:w-[420px] max-w-[500px]
          ${isMinimized ? 'h-14' : 'h-[550px] max-h-[80vh]'}
          transition-all duration-200
        `}
        role="dialog"
        aria-label="Team Chat"
      >
        {/* Header with drag handle */}
        <div
          className="drag-handle flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg flex-shrink-0 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <GripVertical className="w-4 h-4 opacity-60 flex-shrink-0" />
            <div className="relative flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-300 rounded-full border border-white"></div>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">Team Chat</h3>
              <p className="text-xs opacity-80 truncate">
                {teamChat.currentChat?.name || 'Collaborate with your team'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {teamChat.typingUsers?.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-white/20 text-white border-0 animate-pulse"
              >
                typing...
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => setIsMinimized(!isMinimized)}
              aria-label={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleClose}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Window Content */}
        {!isMinimized && (
          <TeamChatWindow
            teamChat={teamChat}
            onResetPosition={resetPosition}
          />
        )}
      </Card>
    </div>
  );
}
