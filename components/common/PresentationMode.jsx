import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  FileText,
  Clock,
  User,
  Presentation,
  Eye,
  Download,
} from 'lucide-react';

export default function PresentationMode({
  documents,
  initialDocumentIndex = 0,
  onClose,
  companyBranding = null,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialDocumentIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const currentDocument = documents[currentIndex];

  const nextDocument = useCallback(() => {
    if (currentIndex < documents.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowControls(true);
    }
  }, [currentIndex, documents.length]);

  const previousDocument = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowControls(true);
    }
  }, [currentIndex]);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      exitFullscreen();
    }
  }, [exitFullscreen]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
          previousDocument();
          break;
        case 'ArrowRight':
          nextDocument();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case ' ':
          e.preventDefault();
          nextDocument();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, nextDocument, previousDocument, toggleFullscreen, exitFullscreen, onClose]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  if (!currentDocument) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-white text-center">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <p>No document to display</p>
          <Button variant="outline" onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col"
      onMouseMove={handleMouseMove}
    >
      {/* Header with Company Branding */}
      {companyBranding && (
        <div
          className="flex-shrink-0 p-4 text-white border-b border-gray-700"
          style={{ backgroundColor: companyBranding.color_scheme || '#1f2937' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {companyBranding.logo_url && (
                <img src={companyBranding.logo_url} alt="Company Logo" className="h-8 w-auto" />
              )}
              <div>
                <h1 className="text-xl font-bold">{companyBranding.company_name}</h1>
                {companyBranding.header_text && (
                  <p className="text-sm opacity-80">{companyBranding.header_text}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              Document {currentIndex + 1} of {documents.length}
            </Badge>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Document Display */}
        <Card className="w-full max-w-6xl max-h-full overflow-auto bg-white shadow-2xl">
          <CardContent className="p-0">
            {/* Document Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentDocument.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {currentDocument.created_by}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(currentDocument.created_date).toLocaleDateString()}
                    </div>
                    <Badge variant="outline">{currentDocument.document_type}</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="flex items-center gap-2">
                  <a
                    href={currentDocument.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={currentDocument.file_name}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </Button>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-8">
              {/* Document Description */}
              {currentDocument.description && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">Description</h3>
                  <p className="text-blue-800">{currentDocument.description}</p>
                </div>
              )}

              {/* AI Analysis Summary */}
              {currentDocument.ai_analysis?.summary && (
                <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    AI Summary
                  </h3>
                  <p className="text-purple-800">{currentDocument.ai_analysis.summary}</p>
                </div>
              )}

              {/* Key Points */}
              {currentDocument.ai_analysis?.key_points?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Key Points</h3>
                  <div className="space-y-2">
                    {currentDocument.ai_analysis.key_points.map((point, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-gray-800">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Preview Placeholder */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">
                  Document content preview not available in presentation mode
                </p>
                <p className="text-sm text-gray-500">
                  File: {currentDocument.file_name}(
                  {((currentDocument.file_size || 0) / 1024 / 1024).toFixed(2)} MB)
                </p>
                <Button variant="outline" className="mt-4" asChild>
                  <a href={currentDocument.file_url} target="_blank" rel="noopener noreferrer">
                    Open Original Document
                  </a>
                </Button>
              </div>

              {/* Document Tags */}
              {currentDocument.tags?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentDocument.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Controls (Hidden by default) */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Left Arrow */}
          {currentIndex > 0 && (
            <Button
              variant="secondary"
              size="lg"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-auto bg-black/50 hover:bg-black/70 text-white border-0"
              onClick={previousDocument}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}

          {/* Right Arrow */}
          {currentIndex < documents.length - 1 && (
            <Button
              variant="secondary"
              size="lg"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-auto bg-black/50 hover:bg-black/70 text-white border-0"
              onClick={nextDocument}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Footer with Company Branding */}
      {companyBranding?.footer_text && (
        <div
          className="flex-shrink-0 p-4 text-center text-white border-t border-gray-700"
          style={{ backgroundColor: companyBranding.color_scheme || '#1f2937' }}
        >
          <p className="text-sm opacity-80">{companyBranding.footer_text}</p>
        </div>
      )}

      {/* Control Bar */}
      <div
        className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 bg-black/70 text-white rounded-lg p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-1 px-3">
            <Presentation className="w-4 h-4" />
            <span className="text-sm">
              {currentIndex + 1} / {documents.length}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div
        className={`absolute top-4 right-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Card className="bg-black/70 text-white border-gray-600">
          <CardContent className="p-3">
            <div className="text-xs space-y-1">
              <div>← → Navigate</div>
              <div>Space Next</div>
              <div>F Fullscreen</div>
              <div>Esc Exit</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
