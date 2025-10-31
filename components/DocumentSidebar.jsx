import React, { useState } from 'react';
import './DocumentSidebar.css';

const DocumentSidebar = ({ documents, onRemove, onExclude, onInclude, isCollapsed, onToggle }) => {
  const [selectedDocs, setSelectedDocs] = useState(new Set());

  const handleSelectDoc = (docId) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map((_, idx) => idx)));
    }
  };

  const handleBulkExclude = () => {
    selectedDocs.forEach(idx => onExclude(idx));
    setSelectedDocs(new Set());
  };

  const handleBulkInclude = () => {
    selectedDocs.forEach(idx => onInclude(idx));
    setSelectedDocs(new Set());
  };

  const handleBulkRemove = () => {
    // Convert to array and sort in reverse order to remove from end to start
    const indices = Array.from(selectedDocs).sort((a, b) => b - a);
    indices.forEach(idx => onRemove(idx));
    setSelectedDocs(new Set());
  };

  const getDocumentStats = (doc) => {
    if (!doc.text) return { pages: 0, words: 0, chars: 0 };

    const words = doc.text.split(/\s+/).filter(w => w.length > 0).length;
    const chars = doc.text.length;
    // Estimate pages (assuming ~500 words per page)
    const pages = Math.ceil(words / 500);

    return { pages, words, chars };
  };

  if (isCollapsed) {
    return (
      <div className="document-sidebar collapsed">
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Expand sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 10l5 5 5-5H7z"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="document-sidebar">
      <div className="sidebar-header">
        <h3>Documents ({documents.length})</h3>
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Collapse sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 10l5-5 5 5H7z"/>
          </svg>
        </button>
      </div>

      {documents.length > 0 && (
        <div className="bulk-actions">
          <button
            className="bulk-action-btn"
            onClick={handleSelectAll}
            title={selectedDocs.size === documents.length ? "Deselect all" : "Select all"}
          >
            {selectedDocs.size === documents.length ? '☐' : '☑'} Select All
          </button>
          {selectedDocs.size > 0 && (
            <>
              <button className="bulk-action-btn" onClick={handleBulkExclude} title="Exclude selected">
                ⊖ Exclude
              </button>
              <button className="bulk-action-btn" onClick={handleBulkInclude} title="Include selected">
                ⊕ Include
              </button>
              <button className="bulk-action-btn danger" onClick={handleBulkRemove} title="Remove selected">
                🗑 Remove
              </button>
            </>
          )}
        </div>
      )}

      <div className="document-list">
        {documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>No documents uploaded yet</p>
            <small>Upload PDFs to get started</small>
          </div>
        ) : (
          documents.map((doc, idx) => {
            const stats = getDocumentStats(doc);
            const isSelected = selectedDocs.has(idx);

            return (
              <div
                key={idx}
                className={`document-card ${doc.excluded ? 'excluded' : ''} ${isSelected ? 'selected' : ''}`}
              >
                <div className="doc-card-header">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectDoc(idx)}
                    className="doc-checkbox"
                    aria-label={`Select ${doc.name}`}
                  />
                  <div className="doc-icon">📄</div>
                  <div className="doc-info">
                    <div className="doc-name" title={doc.name}>{doc.name}</div>
                    <div className="doc-stats">
                      {stats.pages > 0 && <span>{stats.pages} pages</span>}
                      {stats.words > 0 && <span>{stats.words.toLocaleString()} words</span>}
                    </div>
                  </div>
                </div>

                {doc.processing && (
                  <div className="doc-status processing">
                    <div className="status-spinner"></div>
                    <span>Processing...</span>
                  </div>
                )}

                {doc.embedded && !doc.processing && (
                  <div className="doc-status embedded">
                    <span className="status-icon">✓</span>
                    <span>Ready</span>
                  </div>
                )}

                {doc.excluded && (
                  <div className="doc-status excluded-badge">
                    <span>Excluded from context</span>
                  </div>
                )}

                <div className="doc-actions">
                  {!doc.excluded ? (
                    <button
                      className="doc-action-btn"
                      onClick={() => onExclude(idx)}
                      title="Exclude from context"
                    >
                      ⊖ Exclude
                    </button>
                  ) : (
                    <button
                      className="doc-action-btn"
                      onClick={() => onInclude(idx)}
                      title="Include in context"
                    >
                      ⊕ Include
                    </button>
                  )}
                  <button
                    className="doc-action-btn danger"
                    onClick={() => onRemove(idx)}
                    title="Remove document"
                  >
                    🗑
                  </button>
                </div>

                {doc.relevanceScore !== undefined && (
                  <div className="doc-relevance">
                    <div className="relevance-label">Relevance</div>
                    <div className="relevance-bar">
                      <div
                        className="relevance-fill"
                        style={{ width: `${doc.relevanceScore * 100}%` }}
                      ></div>
                    </div>
                    <div className="relevance-score">{(doc.relevanceScore * 100).toFixed(0)}%</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DocumentSidebar;
