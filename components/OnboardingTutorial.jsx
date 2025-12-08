import React, { useState, useEffect } from 'react';
import './OnboardingTutorial.css';

const OnboardingTutorial = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Ask AI!',
      content:
        "Let's take a quick tour of the features that will help you get the most out of your document analysis.",
      target: null,
      position: 'center',
    },
    {
      title: 'Upload Documents',
      content:
        'Start by uploading your PDF documents here. You can drag and drop or click to browse.',
      target: 'upload-zone',
      position: 'bottom',
    },
    {
      title: 'RAG Toggle',
      content:
        'Enable Retrieval-Augmented Generation (RAG) to search through your documents for relevant context before answering questions.',
      target: 'rag-toggle',
      position: 'left',
    },
    {
      title: 'Context Controls',
      content:
        'Adjust the number of context chunks and token limits to control how much information is used to answer your questions.',
      target: 'context-controls',
      position: 'left',
    },
    {
      title: 'Ask Questions',
      content:
        'Type your questions about the documents. The AI will analyze them and provide detailed answers.',
      target: 'message-input',
      position: 'top',
    },
    {
      title: 'Save Sessions',
      content:
        'Your conversations are automatically saved. You can load previous sessions anytime from the session list.',
      target: 'session-list',
      position: 'right',
    },
    {
      title: "You're All Set!",
      content: "You're ready to start analyzing your documents. Happy exploring!",
      target: null,
      position: 'center',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="tutorial-overlay">
      <div className={`tutorial-spotlight ${step.target ? 'has-target' : ''}`}>
        {step.target && <div className="spotlight-highlight" data-target={step.target}></div>}
        <div className={`tutorial-card tutorial-${step.position}`}>
          <div className="tutorial-header">
            <h3>{step.title}</h3>
            <button className="tutorial-close" onClick={handleSkip} aria-label="Close tutorial">
              ×
            </button>
          </div>
          <div className="tutorial-body">
            <p>{step.content}</p>
          </div>
          <div className="tutorial-footer">
            <div className="tutorial-progress">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className={`progress-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                ></span>
              ))}
            </div>
            <div className="tutorial-actions">
              {currentStep > 0 && (
                <button className="tutorial-btn tutorial-btn-secondary" onClick={handlePrev}>
                  Previous
                </button>
              )}
              <button className="tutorial-btn tutorial-btn-primary" onClick={handleNext}>
                {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;
