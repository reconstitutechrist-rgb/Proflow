import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bug, MousePointer2, Camera, FileText, X, Maximize2, Minimize2 } from 'lucide-react';
import { useBugReporter } from '../BugReporterProvider';
import { useScreenshotCapture } from '../hooks/useScreenshotCapture';
import { ToolBar } from './ToolBar';
import { ScreenshotAnnotator } from './ScreenshotAnnotator';
import { PromptGenerator } from './PromptGenerator';
import { toast } from 'sonner';

/**
 * Main side panel for the bug reporter
 */
export function DevToolsPanel() {
  const {
    isPanelOpen,
    setIsPanelOpen,
    currentMode,
    selectedElement,
    screenshot,
    issueDescription,
    requestedChange,
    viewportSize,
    currentRoute,
    startSelectMode,
    startAnnotateMode,
    exitMode,
    updateScreenshot,
    setIssueDescription,
    setRequestedChange,
    resetAll,
    clearAnnotations,
    addAnnotation,
  } = useBugReporter();

  const [activeTab, setActiveTab] = useState('capture');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { captureScreenshot, isCapturing } = useScreenshotCapture({
    onCapture: (dataUrl) => {
      updateScreenshot(dataUrl);
      toast.success('Screenshot captured!');
      setActiveTab('annotate');
    },
  });

  const handleSelectElement = () => {
    if (currentMode === 'select') {
      exitMode();
    } else {
      startSelectMode();
      setIsPanelOpen(false); // Close panel during selection
    }
  };

  const handleCaptureScreenshot = async () => {
    try {
      // Close the panel first so the Sheet overlay doesn't appear in screenshot
      setIsPanelOpen(false);

      // Wait for the panel to close
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Capture the screenshot
      await captureScreenshot();

      // Reopen the panel
      setIsPanelOpen(true);
    } catch (error) {
      // Reopen panel on error too
      setIsPanelOpen(true);
      toast.error('Failed to capture screenshot');
    }
  };

  const handleAnnotationsChange = (newAnnotations) => {
    // Clear existing and add new
    clearAnnotations();
    newAnnotations.forEach((ann) => addAnnotation(ann));
  };

  const handleCloseAnnotator = () => {
    setActiveTab('generate');
  };

  const handleReset = () => {
    resetAll();
    setActiveTab('capture');
    toast.success('Issue cleared - ready for next one');
  };

  return (
    <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
      <SheetContent
        side="right"
        className={`p-0 flex flex-col ${isFullscreen ? 'w-full sm:w-full' : 'w-full sm:w-[450px]'}`}
        data-bug-reporter-panel
      >
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                <Bug className="w-5 h-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-left">Visual Bug Reporter</SheetTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Development Tool</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-3 mx-4 mt-2">
            <TabsTrigger value="capture" className="text-xs">
              <MousePointer2 className="w-3 h-3 mr-1" />
              Capture
            </TabsTrigger>
            <TabsTrigger value="annotate" className="text-xs" disabled={!screenshot.dataUrl}>
              <Camera className="w-3 h-3 mr-1" />
              Annotate
            </TabsTrigger>
            <TabsTrigger value="generate" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="capture"
            className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden"
          >
            <ToolBar
              currentMode={currentMode}
              hasSelectedElement={!!selectedElement.selector}
              hasScreenshot={!!screenshot.dataUrl}
              isCapturing={isCapturing}
              onSelectElement={handleSelectElement}
              onCaptureScreenshot={handleCaptureScreenshot}
            />

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Selected Element Info */}
                {selectedElement.selector && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                      Selected Element
                    </h4>
                    <div className="text-xs space-y-1 text-green-700 dark:text-green-400">
                      <p>
                        <span className="font-medium">Selector:</span>{' '}
                        <code className="bg-green-100 dark:bg-green-800 px-1 rounded">
                          {selectedElement.selector}
                        </code>
                      </p>
                      {selectedElement.componentName && (
                        <p>
                          <span className="font-medium">Component:</span>{' '}
                          {selectedElement.componentName}
                        </p>
                      )}
                      {selectedElement.componentPath && (
                        <p>
                          <span className="font-medium">File:</span> {selectedElement.componentPath}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Size:</span>{' '}
                        {selectedElement.dimensions.width}x{selectedElement.dimensions.height}px
                      </p>
                    </div>
                  </div>
                )}

                {/* Screenshot Preview */}
                {screenshot.dataUrl && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Screenshot Preview
                    </h4>
                    <img
                      src={screenshot.dataUrl}
                      alt="Screenshot"
                      className="w-full rounded border border-blue-200 dark:border-blue-700"
                    />
                    {screenshot.annotations?.length > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        {screenshot.annotations.length} annotation(s)
                      </p>
                    )}
                  </div>
                )}

                {/* Instructions */}
                {!selectedElement.selector && !screenshot.dataUrl && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Start by selecting an element or capturing a screenshot
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="annotate"
            className="flex-1 flex flex-col mt-0 p-0 data-[state=inactive]:hidden"
          >
            {screenshot.dataUrl ? (
              <ScreenshotAnnotator
                screenshotDataUrl={screenshot.dataUrl}
                annotations={screenshot.annotations || []}
                onAnnotationsChange={handleAnnotationsChange}
                onClose={handleCloseAnnotator}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-gray-500">Capture a screenshot first</p>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="generate"
            className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden"
          >
            <PromptGenerator
              route={currentRoute}
              selectedElement={selectedElement}
              screenshot={screenshot}
              issueDescription={issueDescription}
              requestedChange={requestedChange}
              viewportSize={viewportSize}
              onDescriptionChange={setIssueDescription}
              onRequestedChangeChange={setRequestedChange}
              onReset={handleReset}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default DevToolsPanel;
