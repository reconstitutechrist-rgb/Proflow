import React from 'react';
import './SessionTemplates.css';

const SessionTemplates = ({ onSelectTemplate, onClose }) => {
  const templates = [
    {
      id: 'research',
      name: 'Research Assistant',
      description: 'Analyze research papers, extract key findings, and synthesize information',
      icon: '🔬',
      settings: {
        ragEnabled: true,
        numContexts: 5,
        contextCharsLimit: 3000,
        temperature: 0.3
      },
      sampleQuestions: [
        'What are the main findings in these papers?',
        'Compare the methodologies used across these studies',
        'Summarize the key conclusions'
      ]
    },
    {
      id: 'legal',
      name: 'Legal Review',
      description: 'Review contracts, identify key clauses, and flag potential issues',
      icon: '⚖️',
      settings: {
        ragEnabled: true,
        numContexts: 8,
        contextCharsLimit: 5000,
        temperature: 0.2
      },
      sampleQuestions: [
        'What are the key terms in this contract?',
        'Are there any unusual clauses or red flags?',
        'Summarize the obligations of each party'
      ]
    },
    {
      id: 'study',
      name: 'Study Helper',
      description: 'Extract key concepts, create summaries, and answer study questions',
      icon: '📚',
      settings: {
        ragEnabled: true,
        numContexts: 4,
        contextCharsLimit: 2500,
        temperature: 0.4
      },
      sampleQuestions: [
        'What are the main concepts in this chapter?',
        'Create a summary of key points',
        'Explain this concept in simpler terms'
      ]
    },
    {
      id: 'technical',
      name: 'Technical Documentation',
      description: 'Analyze technical docs, APIs, and code documentation',
      icon: '💻',
      settings: {
        ragEnabled: true,
        numContexts: 6,
        contextCharsLimit: 4000,
        temperature: 0.3
      },
      sampleQuestions: [
        'How does this API work?',
        'What are the main features of this system?',
        'Explain the architecture described in these docs'
      ]
    },
    {
      id: 'financial',
      name: 'Financial Analysis',
      description: 'Review financial reports, extract metrics, and identify trends',
      icon: '💰',
      settings: {
        ragEnabled: true,
        numContexts: 7,
        contextCharsLimit: 4500,
        temperature: 0.2
      },
      sampleQuestions: [
        'What are the key financial metrics?',
        'Identify trends in revenue and expenses',
        'Summarize the financial health of the company'
      ]
    },
    {
      id: 'general',
      name: 'General Q&A',
      description: 'General purpose document analysis and question answering',
      icon: '💬',
      settings: {
        ragEnabled: true,
        numContexts: 5,
        contextCharsLimit: 3000,
        temperature: 0.5
      },
      sampleQuestions: [
        'What is this document about?',
        'Summarize the main points',
        'Find information about [topic]'
      ]
    }
  ];

  const handleSelect = (template) => {
    onSelectTemplate(template);
    onClose && onClose();
  };

  return (
    <div className="session-templates-overlay" onClick={onClose}>
      <div className="session-templates-modal" onClick={(e) => e.stopPropagation()}>
        <div className="templates-header">
          <h2>Choose a Template</h2>
          <button className="templates-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="templates-grid">
          {templates.map((template) => (
            <div
              key={template.id}
              className="template-card"
              onClick={() => handleSelect(template)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelect(template);
                }
              }}
            >
              <div className="template-icon">{template.icon}</div>
              <h3 className="template-name">{template.name}</h3>
              <p className="template-description">{template.description}</p>

              <div className="template-settings">
                <div className="setting-badge">
                  RAG: {template.settings.ragEnabled ? 'On' : 'Off'}
                </div>
                <div className="setting-badge">
                  Contexts: {template.settings.numContexts}
                </div>
              </div>

              <div className="template-samples">
                <div className="samples-label">Example questions:</div>
                {template.sampleQuestions.slice(0, 2).map((q, idx) => (
                  <div key={idx} className="sample-question">• {q}</div>
                ))}
              </div>

              <button className="template-select-btn">
                Use Template
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SessionTemplates;
