import React from 'react';
import { useElementSelector } from '../hooks/useElementSelector';
import { SelectionHighlight } from './SelectionHighlight';

/**
 * Full-screen overlay for element selection mode
 * Captures mouse events and highlights hovered elements
 */
export function ElementSelector({ isActive, onSelect, onCancel }) {
  const { hoveredRect, isSelecting } = useElementSelector({
    isActive,
    onSelect
  });

  if (!isActive) {
    return null;
  }

  return (
    <>
      {/* Invisible overlay to capture events */}
      <div
        data-bug-reporter="selector-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999997,
          cursor: 'crosshair'
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onCancel?.();
          }
        }}
      />

      {/* Highlight overlay */}
      <SelectionHighlight rect={hoveredRect} isVisible={isSelecting} />

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
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        <span>Click an element to select it</span>
        <span style={{
          opacity: 0.7,
          fontSize: '12px',
          padding: '2px 8px',
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: '4px'
        }}>
          ESC to cancel
        </span>
      </div>
    </>
  );
}

export default ElementSelector;
