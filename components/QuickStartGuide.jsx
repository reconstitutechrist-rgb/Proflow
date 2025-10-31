import React, { useState } from 'react';
import './QuickStartGuide.css';

const QuickStartGuide = ({ onClose, onStartTutorial }) => {
  const [currentCard, setCurrentCard] = useState(0);

  const cards = [
    {
      icon: '📄',
      title: 'Upload Documents',
      description: 'Start by uploading your PDF documents. You can drag and drop multiple files or click to browse.',
      action: 'Upload'
    },
    {
      icon: '🔍',
      title: 'Enable RAG',
      description: 'Turn on Retrieval-Augmented Generation to search through your documents for relevant context.',
      action: 'Enable'
    },
    {
      icon: '💬',
      title: 'Ask Questions',
      description: 'Type your questions about the documents. The AI will analyze them and provide detailed answers.',
      action: 'Ask'
    },
    {
      icon: '💾',
      title: 'Save Session',
      description: 'Your conversations are automatically saved. Access them anytime from the session list.',
      action: 'Done'
    }
  ];

  const handleNext = () => {
    if (currentCard < cards.length - 1) {
      setCurrentCard(currentCard + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const card = cards[currentCard];

  return (
    <div className="quick-start-overlay">
      <div className="quick-start-card">
        <button className="quick-start-close" onClick={handleSkip} aria-label="Close guide">
          ×
        </button>

        <div className="quick-start-content">
          <div className="quick-start-icon">{card.icon}</div>
          <div className="quick-start-step">Step {currentCard + 1} of {cards.length}</div>
          <h2 className="quick-start-title">{card.title}</h2>
          <p className="quick-start-description">{card.description}</p>
        </div>

        <div className="quick-start-progress">
          {cards.map((_, idx) => (
            <div
              key={idx}
              className={`progress-dot ${idx === currentCard ? 'active' : ''} ${idx < currentCard ? 'completed' : ''}`}
              onClick={() => setCurrentCard(idx)}
            ></div>
          ))}
        </div>

        <div className="quick-start-actions">
          {currentCard > 0 && (
            <button className="quick-start-btn secondary" onClick={handlePrev}>
              Previous
            </button>
          )}
          <div style={{ flex: 1 }}></div>
          {currentCard === 0 && (
            <button className="quick-start-btn secondary" onClick={onStartTutorial}>
              Take Tour
            </button>
          )}
          <button className="quick-start-btn primary" onClick={handleNext}>
            {currentCard < cards.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickStartGuide;
