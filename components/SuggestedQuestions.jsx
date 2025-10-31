import React, { useEffect, useState } from 'react';
import './SuggestedQuestions.css';

const SuggestedQuestions = ({ documents, lastMessage, onSelectQuestion }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateSuggestions();
  }, [documents, lastMessage]);

  const generateSuggestions = () => {
    // Generate smart suggestions based on documents and conversation context
    const baseSuggestions = [];

    if (documents && documents.length > 0) {
      // Document-based suggestions
      if (documents.length === 1) {
        baseSuggestions.push(
          'What are the main points in this document?',
          'Summarize this document in bullet points',
          'What are the key takeaways?'
        );
      } else {
        baseSuggestions.push(
          'Compare the main themes across these documents',
          'What are the common findings?',
          'Summarize each document briefly'
        );
      }

      // Context-specific suggestions based on document names
      const hasResearch = documents.some(doc =>
        doc.name.toLowerCase().includes('research') ||
        doc.name.toLowerCase().includes('study') ||
        doc.name.toLowerCase().includes('paper')
      );

      const hasContract = documents.some(doc =>
        doc.name.toLowerCase().includes('contract') ||
        doc.name.toLowerCase().includes('agreement')
      );

      const hasFinancial = documents.some(doc =>
        doc.name.toLowerCase().includes('financial') ||
        doc.name.toLowerCase().includes('report') ||
        doc.name.toLowerCase().includes('statement')
      );

      if (hasResearch) {
        baseSuggestions.push(
          'What methodology was used?',
          'What were the research findings?',
          'What are the limitations of this study?'
        );
      }

      if (hasContract) {
        baseSuggestions.push(
          'What are the key terms and conditions?',
          'What are the payment terms?',
          'What are the termination clauses?'
        );
      }

      if (hasFinancial) {
        baseSuggestions.push(
          'What are the key financial metrics?',
          'What trends can you identify?',
          'What are the risk factors?'
        );
      }
    }

    // Conversation-based follow-up suggestions
    if (lastMessage && lastMessage.role === 'assistant') {
      baseSuggestions.push(
        'Can you elaborate on that?',
        'What else should I know?',
        'Can you give me specific examples?'
      );
    }

    // Limit to 6 suggestions and randomize slightly
    const selectedSuggestions = baseSuggestions
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    setSuggestions(selectedSuggestions);
  };

  const handleQuestionClick = (question) => {
    onSelectQuestion(question);
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="suggested-questions">
      <div className="suggestions-header">
        <span className="suggestions-icon">💡</span>
        <span className="suggestions-title">Suggested questions:</span>
      </div>
      <div className="suggestions-grid">
        {suggestions.map((question, idx) => (
          <button
            key={idx}
            className="suggestion-chip"
            onClick={() => handleQuestionClick(question)}
            title={question}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
