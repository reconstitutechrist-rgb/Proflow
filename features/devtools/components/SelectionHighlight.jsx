/**
 * Overlay that highlights the currently hovered element during selection mode
 */
export function SelectionHighlight({ rect, isVisible }) {
  if (!isVisible || !rect) {
    return null;
  }

  return (
    <div
      data-bug-reporter="highlight"
      style={{
        position: 'fixed',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        border: '2px solid #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointerEvents: 'none',
        zIndex: 999998,
        boxSizing: 'border-box',
        transition: 'all 0.05s ease-out',
      }}
    >
      {/* Size indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: -24,
          left: 0,
          backgroundColor: '#3b82f6',
          color: 'white',
          fontSize: '11px',
          fontFamily: 'ui-monospace, monospace',
          padding: '2px 6px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        {Math.round(rect.width)} × {Math.round(rect.height)}
      </div>
    </div>
  );
}

export default SelectionHighlight;
