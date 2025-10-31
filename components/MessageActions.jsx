import React, { useState, useRef, useEffect } from 'react';
import './MessageActions.css';

const MessageActions = ({ message, onEdit, onCopy, onRegenerate, onDelete, position = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      onCopy && onCopy();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEdit = () => {
    setIsOpen(false);
    onEdit && onEdit();
  };

  const handleRegenerate = () => {
    setIsOpen(false);
    onRegenerate && onRegenerate();
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete && onDelete();
  };

  return (
    <div className={`message-actions ${position}`} ref={menuRef}>
      <button
        className="actions-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Message actions"
        aria-expanded={isOpen}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5"/>
          <circle cx="8" cy="8" r="1.5"/>
          <circle cx="8" cy="13" r="1.5"/>
        </svg>
      </button>

      {isOpen && (
        <div className="actions-menu">
          {onEdit && message.role === 'user' && (
            <button className="action-item" onClick={handleEdit}>
              <span className="action-icon">✏️</span>
              <span>Edit</span>
            </button>
          )}

          <button className="action-item" onClick={handleCopy}>
            <span className="action-icon">{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {onRegenerate && message.role === 'assistant' && (
            <button className="action-item" onClick={handleRegenerate}>
              <span className="action-icon">🔄</span>
              <span>Regenerate</span>
            </button>
          )}

          {onDelete && (
            <button className="action-item danger" onClick={handleDelete}>
              <span className="action-icon">🗑️</span>
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
