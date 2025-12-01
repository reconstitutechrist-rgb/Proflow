import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that debounces a value
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {any} The debounced value
 */
export function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that provides a debounced callback
 * Uses useRef to avoid memory leaks and useCallback for stable reference
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} The debounced callback
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  return debouncedCallback;
}

/**
 * Hook that provides immediate execution on first call, then debounced
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} The debounced callback with leading edge
 */
export function useLeadingDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);
  const hasCalledRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback((...args) => {
    if (!hasCalledRef.current) {
      // First call - execute immediately
      callbackRef.current(...args);
      hasCalledRef.current = true;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      hasCalledRef.current = false;
    }, delay);
  }, [delay]);

  return debouncedCallback;
}

export default useDebouncedValue;
