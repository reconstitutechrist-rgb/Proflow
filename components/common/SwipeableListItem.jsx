import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Check, Clock } from 'lucide-react';

/**
 * SwipeableListItem - Touch-optimized list item with swipe actions
 * Swipe right: Primary action (default: complete)
 * Swipe left: Secondary action (default: snooze/delete)
 */
export default function SwipeableListItem({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'Complete',
  rightIcon: RightIcon = Check,
  rightColor = 'bg-green-500',
  leftLabel = 'Snooze',
  leftIcon: LeftIcon = Clock,
  leftColor = 'bg-amber-500',
  threshold = 80,
  disabled = false,
  className = '',
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const containerRef = useRef(null);

  // Transform for the background reveal effect
  const rightBgOpacity = useTransform(x, [0, threshold], [0, 1]);
  const leftBgOpacity = useTransform(x, [-threshold, 0], [1, 0]);

  const handleDragEnd = useCallback(
    async (event, info) => {
      if (disabled) return;

      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // If dragged past threshold or with high velocity
      if (offset > threshold || (offset > threshold / 2 && velocity > 500)) {
        // Swipe right - primary action
        await controls.start({ x: 200, transition: { duration: 0.2 } });
        if (onSwipeRight) onSwipeRight();
        controls.start({ x: 0, transition: { duration: 0.2 } });
      } else if (offset < -threshold || (offset < -threshold / 2 && velocity < -500)) {
        // Swipe left - secondary action
        await controls.start({ x: -200, transition: { duration: 0.2 } });
        if (onSwipeLeft) onSwipeLeft();
        controls.start({ x: 0, transition: { duration: 0.2 } });
      } else {
        // Snap back
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
      }

      setIsRevealed(false);
    },
    [controls, disabled, onSwipeLeft, onSwipeRight, threshold]
  );

  const handleDrag = useCallback((event, info) => {
    if (Math.abs(info.offset.x) > 20) {
      setIsRevealed(true);
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden touch-pan-y ${className}`}>
      {/* Right action background (swipe right reveals complete) */}
      <motion.div
        className={`absolute inset-y-0 left-0 ${rightColor} flex items-center pl-6`}
        style={{ opacity: rightBgOpacity, width: '50%' }}
      >
        <RightIcon className="w-6 h-6 text-white" />
        <span className="ml-2 text-white font-medium text-sm">{rightLabel}</span>
      </motion.div>

      {/* Left action background (swipe left reveals snooze/delete) */}
      <motion.div
        className={`absolute inset-y-0 right-0 ${leftColor} flex items-center justify-end pr-6`}
        style={{ opacity: leftBgOpacity, width: '50%' }}
      >
        <span className="mr-2 text-white font-medium text-sm">{leftLabel}</span>
        <LeftIcon className="w-6 h-6 text-white" />
      </motion.div>

      {/* Main content */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * TouchTarget - Wrapper to ensure minimum touch target size (44x44px)
 * Based on Apple's Human Interface Guidelines
 */
export function TouchTarget({ children, className = '', minSize = 44, ...props }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ minWidth: minSize, minHeight: minSize }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * PullToRefresh - Touch-optimized pull-to-refresh indicator
 */
export function PullToRefresh({
  children,
  onRefresh,
  loading = false,
  threshold = 80,
  className = '',
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (containerRef.current?.scrollTop === 0 && startY.current > 0) {
        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startY.current);
        // Apply resistance
        const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(resistedDistance);
      }
    },
    [threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, onRefresh, isRefreshing]);

  const isTriggered = pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || loading || isRefreshing) && (
        <div
          className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-all"
          style={{ height: Math.max(pullDistance, loading || isRefreshing ? 60 : 0) }}
        >
          {loading || isRefreshing ? (
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <div
              className={`transition-transform ${isTriggered ? 'rotate-180' : ''}`}
              style={{ transform: `rotate(${Math.min(pullDistance / threshold, 1) * 180}deg)` }}
            >
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          )}
          <span className="ml-2 text-sm text-gray-500">
            {loading || isRefreshing
              ? 'Refreshing...'
              : isTriggered
                ? 'Release to refresh'
                : 'Pull to refresh'}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}
