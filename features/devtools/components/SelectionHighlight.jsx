/**
 * Single highlight box component
 */
function HighlightBox({ rect, color = '#3b82f6', showSize = true, index = null }) {
  if (!rect) return null;

  const bgColor = color === '#22c55e' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)';

  return (
    <div
      data-bug-reporter="highlight"
      style={{
        position: 'fixed',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        border: `2px solid ${color}`,
        backgroundColor: bgColor,
        pointerEvents: 'none',
        zIndex: 999998,
        boxSizing: 'border-box',
        transition: 'all 0.05s ease-out',
      }}
    >
      {/* Index badge for selected elements */}
      {index !== null && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 20,
            height: 20,
            backgroundColor: color,
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {index + 1}
        </div>
      )}
      {/* Size indicator */}
      {showSize && (
        <div
          style={{
            position: 'absolute',
            bottom: -24,
            left: 0,
            backgroundColor: color,
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
      )}
    </div>
  );
}

/**
 * Overlay that highlights elements during selection mode
 * Supports both single hover highlight and multiple selected elements
 */
export function SelectionHighlight({ rect, isVisible, selectedRects = [] }) {
  return (
    <>
      {/* Hover highlight (blue) */}
      {isVisible && rect && <HighlightBox rect={rect} color="#3b82f6" showSize={true} />}

      {/* Selected elements highlights (green) */}
      {selectedRects.map((selectedRect, index) => (
        <HighlightBox
          key={index}
          rect={selectedRect}
          color="#22c55e"
          showSize={false}
          index={index}
        />
      ))}
    </>
  );
}

export default SelectionHighlight;
