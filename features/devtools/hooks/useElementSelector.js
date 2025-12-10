import { useState, useCallback, useEffect } from 'react';
import { generateSelector, getElementDimensions } from '../utils/cssSelector';
import { getComponentInfo } from '../utils/reactComponentDetector';

/**
 * Hook for element selection functionality
 * Handles hover highlighting and click-to-select behavior
 */
export function useElementSelector({
  isActive,
  onSelect,
  onCancel,
  panelSelector = '[data-bug-reporter-panel]',
}) {
  const [hoveredElement, setHoveredElement] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);

  // Check if an element is part of the bug reporter UI
  const isPartOfBugReporter = useCallback(
    (element) => {
      if (!element) return false;

      // Check if element or any parent has the bug reporter panel attribute
      let current = element;
      while (current && current !== document.body) {
        if (current.hasAttribute && current.hasAttribute('data-bug-reporter')) {
          return true;
        }
        if (current.matches && current.matches(panelSelector)) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    },
    [panelSelector]
  );

  // Handle mouse move for hover highlighting
  const handleMouseMove = useCallback(
    (event) => {
      if (!isActive) return;

      const element = document.elementFromPoint(event.clientX, event.clientY);

      // Skip if hovering over bug reporter UI
      if (isPartOfBugReporter(element)) {
        setHoveredElement(null);
        setHoveredRect(null);
        return;
      }

      if (element) {
        setHoveredElement(element);
        setHoveredRect(element.getBoundingClientRect());
      }
    },
    [isActive, isPartOfBugReporter]
  );

  // Handle click for selection
  const handleClick = useCallback(
    (event) => {
      if (!isActive) return;

      const element = document.elementFromPoint(event.clientX, event.clientY);

      // Skip if clicking on bug reporter UI
      if (isPartOfBugReporter(element)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (element) {
        // Gather element information
        const selector = generateSelector(element);
        const dimensions = getElementDimensions(element);
        const componentInfo = getComponentInfo(element);

        const elementInfo = {
          node: element,
          selector,
          componentPath: componentInfo?.filePath || null,
          componentName: componentInfo?.componentName || null,
          componentHierarchy: componentInfo?.componentHierarchy || [],
          dimensions,
        };

        // Check for multi-select (Ctrl+Click or Cmd+Click on Mac)
        const isMultiSelect = event.ctrlKey || event.metaKey;
        onSelect(elementInfo, isMultiSelect);
      }

      // Clear hover state
      setHoveredElement(null);
      setHoveredRect(null);
    },
    [isActive, isPartOfBugReporter, onSelect]
  );

  // Handle escape key to cancel selection
  const handleKeyDown = useCallback(
    (event) => {
      if (!isActive) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setHoveredElement(null);
        setHoveredRect(null);
        onCancel?.();
      }
    },
    [isActive, onCancel]
  );

  // Set up event listeners when active
  useEffect(() => {
    if (isActive) {
      document.addEventListener('mousemove', handleMouseMove, { capture: true });
      document.addEventListener('click', handleClick, { capture: true });
      document.addEventListener('keydown', handleKeyDown);

      // Add cursor style
      document.body.style.cursor = 'crosshair';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove, { capture: true });
        document.removeEventListener('click', handleClick, { capture: true });
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.cursor = '';
        setHoveredElement(null);
        setHoveredRect(null);
      };
    }
  }, [isActive, handleMouseMove, handleClick, handleKeyDown]);

  return {
    hoveredElement,
    hoveredRect,
    isSelecting: isActive,
  };
}

export default useElementSelector;
