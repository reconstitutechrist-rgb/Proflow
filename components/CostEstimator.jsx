import React, { useState, useEffect } from 'react';
import './CostEstimator.css';

const CostEstimator = ({ documents, estimatedTokens, onConfirm, onCancel, operation = 'embedding' }) => {
  const [costBreakdown, setCostBreakdown] = useState(null);

  // Cost per 1K tokens (example rates - adjust based on actual API pricing)
  const COST_PER_1K_TOKENS = {
    embedding: 0.0001, // $0.0001 per 1K tokens
    completion: 0.002, // $0.002 per 1K tokens for output
    input: 0.0005 // $0.0005 per 1K tokens for input
  };

  useEffect(() => {
    calculateCosts();
  }, [documents, estimatedTokens]);

  const calculateCosts = () => {
    if (operation === 'embedding' && documents) {
      const breakdown = documents.map((doc, idx) => {
        const wordCount = doc.text ? doc.text.split(/\s+/).length : 0;
        const estimatedTokenCount = Math.ceil(wordCount * 1.3); // Rough estimate: 1 word ≈ 1.3 tokens
        const cost = (estimatedTokenCount / 1000) * COST_PER_1K_TOKENS.embedding;

        return {
          name: doc.name,
          tokens: estimatedTokenCount,
          cost: cost
        };
      });

      const total = breakdown.reduce((sum, item) => sum + item.cost, 0);
      const totalTokens = breakdown.reduce((sum, item) => sum + item.tokens, 0);

      setCostBreakdown({
        items: breakdown,
        total,
        totalTokens,
        operation: 'Generate Embeddings'
      });
    } else if (operation === 'completion' && estimatedTokens) {
      const inputCost = (estimatedTokens.input / 1000) * COST_PER_1K_TOKENS.input;
      const outputCost = (estimatedTokens.output / 1000) * COST_PER_1K_TOKENS.completion;
      const total = inputCost + outputCost;

      setCostBreakdown({
        items: [
          {
            name: 'Input tokens',
            tokens: estimatedTokens.input,
            cost: inputCost
          },
          {
            name: 'Estimated output tokens',
            tokens: estimatedTokens.output,
            cost: outputCost
          }
        ],
        total,
        totalTokens: estimatedTokens.input + estimatedTokens.output,
        operation: 'Generate Response'
      });
    }
  };

  if (!costBreakdown) {
    return null;
  }

  return (
    <div className="cost-estimator-overlay">
      <div className="cost-estimator-modal">
        <div className="cost-header">
          <h3>Cost Estimate</h3>
          <button className="cost-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <div className="cost-body">
          <div className="cost-operation">
            <strong>Operation:</strong> {costBreakdown.operation}
          </div>

          <div className="cost-breakdown">
            <h4>Breakdown</h4>
            <div className="breakdown-list">
              {costBreakdown.items.map((item, idx) => (
                <div key={idx} className="breakdown-item">
                  <div className="breakdown-name">{item.name}</div>
                  <div className="breakdown-details">
                    <span className="token-count">
                      {item.tokens.toLocaleString()} tokens
                    </span>
                    <span className="cost-amount">
                      ${item.cost.toFixed(6)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cost-total">
            <div className="total-row">
              <span className="total-label">Total Tokens:</span>
              <span className="total-value">{costBreakdown.totalTokens.toLocaleString()}</span>
            </div>
            <div className="total-row main-total">
              <span className="total-label">Estimated Cost:</span>
              <span className="total-value">${costBreakdown.total.toFixed(6)}</span>
            </div>
          </div>

          {costBreakdown.total > 0.01 && (
            <div className="cost-warning">
              <span className="warning-icon">⚠️</span>
              <span>This operation will incur costs. Please review before proceeding.</span>
            </div>
          )}

          {costBreakdown.total < 0.001 && (
            <div className="cost-info">
              <span className="info-icon">ℹ️</span>
              <span>This is a very low-cost operation.</span>
            </div>
          )}
        </div>

        <div className="cost-footer">
          <button className="cost-btn cost-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="cost-btn cost-btn-confirm" onClick={onConfirm}>
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostEstimator;
