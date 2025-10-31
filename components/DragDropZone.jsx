import React, { useState, useRef } from 'react';
import './DragDropZone.css';

const DragDropZone = ({ onFilesSelected, accept = '.pdf', multiple = true, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFiles = (files) => {
    const fileArray = Array.from(files);
    const acceptedExtensions = accept.split(',').map(ext => ext.trim());

    const invalidFiles = fileArray.filter(file => {
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      return !acceptedExtensions.includes(extension);
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid file type. Only ${accept} files are allowed.`);
      setTimeout(() => setError(null), 3000);
      return [];
    }

    if (!multiple && fileArray.length > 1) {
      setError('Only one file can be uploaded at a time.');
      setTimeout(() => setError(null), 3000);
      return [fileArray[0]];
    }

    return fileArray;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  return (
    <div
      className={`drag-drop-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload files"
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      <div className="drop-zone-content">
        {isDragging ? (
          <>
            <div className="drop-icon dropping">📥</div>
            <div className="drop-text">Drop files here...</div>
          </>
        ) : (
          <>
            <div className="drop-icon">📄</div>
            <div className="drop-text">
              <strong>Drag & drop files here</strong> or click to browse
            </div>
            <div className="drop-hint">
              Accepts {accept} files {multiple && '(multiple files supported)'}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="drop-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default DragDropZone;
