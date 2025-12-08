import React from 'react';
import './KeyboardShortcuts.css';

const KeyboardShortcuts = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['↑', '↓'], description: 'Navigate messages' },
        { keys: ['Ctrl', 'Enter'], description: 'Send message' },
        { keys: ['Esc'], description: 'Close dialogs' },
        { keys: ['?'], description: 'Show shortcuts' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { keys: ['Ctrl', 'U'], description: 'Upload documents' },
        { keys: ['Ctrl', 'N'], description: 'New session' },
        { keys: ['Ctrl', 'S'], description: 'Save session' },
        { keys: ['Ctrl', 'K'], description: 'Focus search' },
      ],
    },
    {
      category: 'Editing',
      items: [
        { keys: ['Ctrl', 'C'], description: 'Copy message' },
        { keys: ['Ctrl', 'E'], description: 'Edit message' },
        { keys: ['Ctrl', 'R'], description: 'Regenerate response' },
        { keys: ['Ctrl', 'D'], description: 'Delete message' },
      ],
    },
  ];

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="shortcuts-content">
          {shortcuts.map((section, idx) => (
            <div key={idx} className="shortcuts-section">
              <h3 className="section-title">{section.category}</h3>
              <div className="shortcuts-list">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="shortcut-item">
                    <div className="shortcut-keys">
                      {item.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          <kbd className="key">{key}</kbd>
                          {keyIdx < item.keys.length - 1 && (
                            <span className="key-separator">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="shortcut-description">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <p>
            Press <kbd className="key">?</kbd> anytime to show this panel
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
