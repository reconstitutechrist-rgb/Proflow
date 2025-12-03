import React from 'react';
import { Button } from '@/components/ui/button';
import {
  MousePointer2,
  Camera,
  FileText,
  Loader2
} from 'lucide-react';

/**
 * Mode selection toolbar for the bug reporter
 */
export function ToolBar({
  currentMode,
  hasSelectedElement,
  hasScreenshot,
  isCapturing,
  onSelectElement,
  onCaptureScreenshot,
  onGeneratePrompt
}) {
  return (
    <div className="flex flex-col gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        Actions
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={currentMode === 'select' ? 'default' : 'outline'}
          size="sm"
          onClick={onSelectElement}
          className="flex-1 min-w-[120px]"
        >
          <MousePointer2 className="w-4 h-4 mr-2" />
          {hasSelectedElement ? 'Reselect' : 'Select'} Element
        </Button>

        <Button
          variant={hasScreenshot ? 'secondary' : 'outline'}
          size="sm"
          onClick={onCaptureScreenshot}
          disabled={isCapturing}
          className="flex-1 min-w-[120px]"
        >
          {isCapturing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Camera className="w-4 h-4 mr-2" />
          )}
          {hasScreenshot ? 'Retake' : 'Capture'} Screenshot
        </Button>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${hasSelectedElement ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          Element {hasSelectedElement ? 'selected' : 'not selected'}
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${hasScreenshot ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          Screenshot {hasScreenshot ? 'captured' : 'not captured'}
        </div>
      </div>
    </div>
  );
}

export default ToolBar;
