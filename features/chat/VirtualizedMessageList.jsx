import React, { useRef, useEffect, useState, useCallback } from "react";
import EnhancedMessage from "@/features/chat/EnhancedMessage";

export default function VirtualizedMessageList({
  messages = [],
  currentUser,
  replyToMessageData = {},
  viewMode,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onBookmark,
  onAddReaction,
  onRemoveReaction
}) {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [containerHeight, setContainerHeight] = useState(0);
  const observerRef = useRef(null);
  const sentinelTopRef = useRef(null);
  const sentinelBottomRef = useRef(null);

  // Estimated height per message (can be adjusted based on your actual message heights)
  const ESTIMATED_MESSAGE_HEIGHT = viewMode === 'compact' ? 60 : 120;
  const BUFFER_SIZE = 10; // Number of messages to render beyond visible area

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Intersection Observer for infinite scroll simulation
  useEffect(() => {
    if (!sentinelTopRef.current || !sentinelBottomRef.current) return;

    const options = {
      root: containerRef.current,
      rootMargin: '200px',
      threshold: 0
    };

    const handleIntersection = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          
          if (target === sentinelTopRef.current) {
            // Scrolling up - load earlier messages
            setVisibleRange(prev => ({
              start: Math.max(0, prev.start - 20),
              end: prev.end
            }));
          } else if (target === sentinelBottomRef.current) {
            // Scrolling down - load later messages
            setVisibleRange(prev => ({
              start: prev.start,
              end: Math.min(messages.length, prev.end + 20)
            }));
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, options);
    
    if (sentinelTopRef.current) observer.observe(sentinelTopRef.current);
    if (sentinelBottomRef.current) observer.observe(sentinelBottomRef.current);

    return () => observer.disconnect();
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottomRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll && scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, shouldAutoScroll]);

  // Calculate visible messages
  const visibleMessages = messages.slice(
    Math.max(0, visibleRange.start - BUFFER_SIZE),
    Math.min(messages.length, visibleRange.end + BUFFER_SIZE)
  );

  const topSpacerHeight = Math.max(0, (visibleRange.start - BUFFER_SIZE)) * ESTIMATED_MESSAGE_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (messages.length - (visibleRange.end + BUFFER_SIZE))) * ESTIMATED_MESSAGE_HEIGHT;

  // Get reply-to message for a message
  const getReplyToMessage = useCallback((message) => {
    if (!message.reply_to) return null;
    return replyToMessageData[message.reply_to] || null;
  }, [replyToMessageData]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      {/* Top sentinel for infinite scroll */}
      <div ref={sentinelTopRef} style={{ height: '1px' }} />
      
      {/* Top spacer */}
      {topSpacerHeight > 0 && (
        <div style={{ height: `${topSpacerHeight}px` }} />
      )}

      {/* Visible messages */}
      <div className="space-y-1">
        {visibleMessages.map((message, index) => {
          const actualIndex = Math.max(0, visibleRange.start - BUFFER_SIZE) + index;
          const previousMessage = actualIndex > 0 ? messages[actualIndex - 1] : null;
          const replyToMessage = getReplyToMessage(message);

          return (
            <div key={message.id} id={`message-${message.id}`}>
              <EnhancedMessage
                message={{ ...message, reply_to_message: replyToMessage }}
                previousMessage={previousMessage}
                currentUser={currentUser}
                viewMode={viewMode}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onPin={onPin}
                onBookmark={onBookmark}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom spacer */}
      {bottomSpacerHeight > 0 && (
        <div style={{ height: `${bottomSpacerHeight}px` }} />
      )}

      {/* Bottom sentinel for infinite scroll */}
      <div ref={sentinelBottomRef} style={{ height: '1px' }} />
      
      {/* Scroll to bottom anchor */}
      <div ref={scrollToBottomRef} />
    </div>
  );
}