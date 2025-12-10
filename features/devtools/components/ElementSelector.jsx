import { useMemo } from 'react';
import { useElementSelector } from '../hooks/useElementSelector';
import { SelectionHighlight } from './SelectionHighlight';
import { useBugReporter } from '../BugReporterProvider';

/**
 * Full-screen overlay for element selection mode
 * Shows highlight and instructions - mouse events are handled by useElementSelector hook
 */
export function ElementSelector({ isActive, onSelect, onCancel }) {
  const { selectedElements } = useBugReporter();
  const { hoveredRect, isSelecting } = useElementSelector({
    isActive,
    onSelect,
    onCancel,
  });

  // Get bounding rects for all selected elements
  const selectedRects = useMemo(() => {
    return selectedElements
      .map((el) => {
        if (el.node && document.contains(el.node)) {
          return el.node.getBoundingClientRect();
        }
        // Fallback to stored dimensions if node is no longer in DOM
        return el.dimensions?.x !== undefined
          ? {
              left: el.dimensions.x,
              top: el.dimensions.y,
              width: el.dimensions.width,
              height: el.dimensions.height,
            }
          : null;
      })
      .filter(Boolean);
  }, [selectedElements]);

  if (!isActive) {
    return null;
  }

  const hasSelections = selectedElements.length > 0;

  return (
    <>
      {/* Highlight overlay - pointer-events: none so it doesn't block clicks */}
      <SelectionHighlight
        rect={hoveredRect}
        isVisible={isSelecting}
        selectedRects={selectedRects}
      />

      {/* Instructions tooltip */}
      <div
        data-bug-reporter="instructions"
        style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}
      >
        <span>Click to select</span>
        <span
          style={{
            opacity: 0.7,
            fontSize: '12px',
            padding: '2px 8px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '4px',
          }}
        >
          Ctrl+Click to add
        </span>
        {hasSelections && (
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              backgroundColor: 'rgba(34, 197, 94, 0.3)',
              borderRadius: '4px',
              color: '#86efac',
            }}
          >
            {selectedElements.length} selected
          </span>
        )}
        <span
          style={{
            opacity: 0.7,
            fontSize: '12px',
            padding: '2px 8px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '4px',
          }}
        >
          ESC to finish
        </span>
      </div>
    </>
  );
}

export default ElementSelector;
