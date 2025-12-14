import { useState, useRef, useCallback } from 'react';

/**
 * Hook for detecting swipe gestures on touch devices
 * @param {Object} options - Configuration options
 * @param {Function} options.onSwipeLeft - Callback for left swipe
 * @param {Function} options.onSwipeRight - Callback for right swipe
 * @param {Function} options.onSwipeUp - Callback for up swipe
 * @param {Function} options.onSwipeDown - Callback for down swipe
 * @param {number} options.threshold - Minimum distance in pixels to trigger swipe (default: 50)
 * @param {number} options.velocity - Minimum velocity required (default: 0.3)
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocity = 0.3,
} = {}) {
  const [swiping, setSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });

  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const touchEnd = useRef({ x: 0, y: 0, time: 0 });

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchEnd.current = { ...touchStart.current };
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (!swiping) return;

      const touch = e.touches[0];
      touchEnd.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      const deltaX = touchEnd.current.x - touchStart.current.x;
      const deltaY = touchEnd.current.y - touchStart.current.y;

      setSwipeOffset({ x: deltaX, y: deltaY });
    },
    [swiping]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swiping) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Calculate velocity
    const velocityX = absX / deltaTime;
    const velocityY = absY / deltaTime;

    // Determine if it's a horizontal or vertical swipe
    const isHorizontal = absX > absY;

    if (isHorizontal) {
      if (absX >= threshold && velocityX >= velocity) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    } else {
      if (absY >= threshold && velocityY >= velocity) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    setSwiping(false);
    setSwipeOffset({ x: 0, y: 0 });
  }, [swiping, threshold, velocity, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  const swipeHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
  };

  return {
    swipeHandlers,
    swiping,
    swipeOffset,
  };
}
