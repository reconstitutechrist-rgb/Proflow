import React from 'react';
import './ProgressIndicator.css';

const ProgressIndicator = ({
  operation = 'Processing',
  current = 0,
  total = 0,
  percentage = 0,
  message = '',
  estimatedTime = null,
  canCancel = false,
  onCancel = null
}) => {
  const progressPercent = total > 0 ? (current / total) * 100 : percentage;

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <div className="progress-title">
          <span className="progress-spinner"></span>
          <span>{operation}</span>
        </div>
        {canCancel && onCancel && (
          <button className="progress-cancel" onClick={onCancel} aria-label="Cancel operation">
            Cancel
          </button>
        )}
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progressPercent}%` }}>
          <div className="progress-shimmer"></div>
        </div>
      </div>

      <div className="progress-details">
        <div className="progress-stats">
          {total > 0 ? (
            <span>
              {current} of {total} {total === 1 ? 'item' : 'items'}
            </span>
          ) : (
            <span>{Math.round(progressPercent)}%</span>
          )}
        </div>
        {estimatedTime && (
          <div className="progress-time">
            <span>~{estimatedTime} remaining</span>
          </div>
        )}
      </div>

      {message && (
        <div className="progress-message">
          {message}
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
