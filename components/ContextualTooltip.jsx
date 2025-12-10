import { useState, useRef, useEffect } from 'react';
import './ContextualTooltip.css';

const ContextualTooltip = ({ children, content, position = 'top', delay = 300 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef(null);
  const triggerRef = useRef(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        let top = 0;
        let left = 0;

        switch (position) {
          case 'top':
            top = rect.top + scrollTop - 10;
            left = rect.left + scrollLeft + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + scrollTop + 10;
            left = rect.left + scrollLeft + rect.width / 2;
            break;
          case 'left':
            top = rect.top + scrollTop + rect.height / 2;
            left = rect.left + scrollLeft - 10;
            break;
          case 'right':
            top = rect.top + scrollTop + rect.height / 2;
            left = rect.right + scrollLeft + 10;
            break;
          default:
            top = rect.top + scrollTop - 10;
            left = rect.left + scrollLeft + rect.width / 2;
        }

        setCoords({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </span>
      {isVisible && (
        <div
          className={`contextual-tooltip tooltip-${position}`}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </>
  );
};

export default ContextualTooltip;
