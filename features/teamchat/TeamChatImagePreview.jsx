import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, Maximize2, Loader2 } from 'lucide-react';

/**
 * Format file size to human readable string
 */
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function TeamChatImagePreview({ src, fileName, fileSize }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showLightbox, setShowLightbox] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'image';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  if (loadError) {
    return (
      <div className="w-48 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <span className="text-sm text-gray-500">Failed to load image</span>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      <div className="relative group cursor-pointer" onClick={() => setShowLightbox(true)}>
        {/* Loading skeleton */}
        {isLoading && (
          <div className="w-48 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Image */}
        <img
          src={src}
          alt={fileName || 'Shared image'}
          className={`max-w-[300px] max-h-[200px] rounded-lg object-cover ${isLoading ? 'hidden' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
        />

        {/* Overlay with actions */}
        {!isLoading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(true);
              }}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* File info */}
        {(fileName || fileSize) && !isLoading && (
          <div className="text-[10px] text-gray-400 mt-1 truncate max-w-[300px]">
            {fileName}
            {fileSize && ` (${formatFileSize(fileSize)})`}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95 border-0">
          <div className="relative flex items-center justify-center min-h-[300px]">
            <img
              src={src}
              alt={fileName || 'Shared image'}
              className="max-w-full max-h-[85vh] object-contain"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
