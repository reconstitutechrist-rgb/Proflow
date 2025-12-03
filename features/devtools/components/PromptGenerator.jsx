import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatBugReportPrompt } from '../utils/promptFormatter';

/**
 * Component for generating and copying the Claude-ready prompt
 */
export function PromptGenerator({
  route,
  selectedElement,
  screenshot,
  issueDescription,
  requestedChange,
  viewportSize,
  onDescriptionChange,
  onRequestedChangeChange,
  onReset
}) {
  const [copied, setCopied] = React.useState(false);

  // Generate the formatted prompt
  const generatedPrompt = useMemo(() => {
    return formatBugReportPrompt({
      description: issueDescription,
      route,
      componentPath: selectedElement.componentPath,
      componentName: selectedElement.componentName,
      selector: selectedElement.selector,
      dimensions: selectedElement.dimensions,
      viewportSize,
      requestedChange,
      hasAnnotatedScreenshot: !!screenshot.dataUrl,
      annotationCount: screenshot.annotations?.length || 0
    });
  }, [
    issueDescription,
    route,
    selectedElement,
    viewportSize,
    requestedChange,
    screenshot
  ]);

  // Copy prompt to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      toast.success('Prompt copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Check if we have enough info to generate a useful prompt
  const hasContent = issueDescription || selectedElement.selector || screenshot.dataUrl;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Issue Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Problem Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the issue you want to fix..."
              value={issueDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Requested Change */}
          <div className="space-y-2">
            <Label htmlFor="requestedChange" className="text-sm font-medium">
              Requested Change
            </Label>
            <Textarea
              id="requestedChange"
              placeholder="What change do you want? (e.g., 'Make the button larger', 'Change the color to blue')"
              value={requestedChange}
              onChange={(e) => onRequestedChangeChange(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Context Summary */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Captured Context
            </h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>
                <span className="font-medium">Page:</span> {route}
              </p>
              {selectedElement.selector && (
                <p>
                  <span className="font-medium">Element:</span>{' '}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-[11px]">
                    {selectedElement.selector.length > 40
                      ? selectedElement.selector.substring(0, 40) + '...'
                      : selectedElement.selector}
                  </code>
                </p>
              )}
              {selectedElement.componentName && (
                <p>
                  <span className="font-medium">Component:</span>{' '}
                  {selectedElement.componentName}
                </p>
              )}
              {selectedElement.componentPath && (
                <p>
                  <span className="font-medium">File:</span>{' '}
                  {selectedElement.componentPath}
                </p>
              )}
              <p>
                <span className="font-medium">Viewport:</span>{' '}
                {viewportSize.width}x{viewportSize.height}
              </p>
              {screenshot.dataUrl && (
                <p>
                  <span className="font-medium">Screenshot:</span>{' '}
                  {screenshot.annotations?.length || 0} annotations
                </p>
              )}
            </div>
          </div>

          {/* Generated Prompt Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Generated Prompt</Label>
            <div className="relative">
              <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300 max-h-[200px] overflow-y-auto">
                {generatedPrompt}
              </pre>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Action buttons */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <Button
          onClick={handleCopy}
          className="w-full"
          disabled={!hasContent}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Prompt
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onReset}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          New Issue
        </Button>
      </div>
    </div>
  );
}

export default PromptGenerator;
