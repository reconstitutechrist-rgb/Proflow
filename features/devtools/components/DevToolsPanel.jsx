import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bug,
  MousePointer2,
  Camera,
  FileText,
  X,
  Maximize2,
  Minimize2,
  GripVertical,
  Link2,
  Trash2,
} from 'lucide-react';
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
    selectedElements,
    elementGroups,
    removeSelectedElement,
    createElementGroup,
    removeElementGroup,
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

  // Draggable panel state
  const [panelPosition, setPanelPosition] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 470 : 500,
    y: 50,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });
  const panelRef = useRef(null);

  // Handle drag start
  const handleDragStart = useCallback(
    (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) {
        return;
      }
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panelX: panelPosition.x,
        panelY: panelPosition.y,
      };
    },
    [panelPosition]
  );

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      const newX = Math.max(
        50,
        Math.min(window.innerWidth - 500, dragStartRef.current.panelX + deltaX)
      );
      const newY = Math.max(
        20,
        Math.min(window.innerHeight - 100, dragStartRef.current.panelY + deltaY)
      );

      setPanelPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Group all currently selected elements
  const handleGroupSelected = () => {
    if (selectedElements.length < 2) return;
    const indices = selectedElements.map((_, i) => i);
    createElementGroup(indices);
    toast.success(`Grouped ${selectedElements.length} elements`);
  };

  // Check if an element is in any group
  const getElementGroup = (index) => {
    return elementGroups.findIndex((group) => group.includes(index));
  };

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

  if (!isPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-[99998]" onClick={() => setIsPanelOpen(false)} />

      {/* Draggable Panel */}
      <div
        ref={panelRef}
        data-bug-reporter-panel
        className={`fixed z-[99999] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden ${
          isFullscreen ? 'inset-4' : ''
        }`}
        style={
          isFullscreen
            ? {}
            : {
                left: panelPosition.x,
                top: panelPosition.y,
                width: 450,
                maxHeight: 'calc(100vh - 100px)',
              }
        }
      >
        {/* Draggable Header */}
        <div
          className="p-4 border-b bg-linear-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 select-none"
          onMouseDown={handleDragStart}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <div className="p-2 bg-linear-to-br from-orange-500 to-red-600 rounded-lg">
                <Bug className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Visual Bug Reporter</h2>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPanelOpen(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

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
              hasSelectedElement={selectedElements.length > 0}
              hasScreenshot={!!screenshot.dataUrl}
              isCapturing={isCapturing}
              onSelectElement={handleSelectElement}
              onCaptureScreenshot={handleCaptureScreenshot}
            />

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Selected Elements Info */}
                {selectedElements.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-300">
                        Selected Elements ({selectedElements.length})
                      </h4>
                      {selectedElements.length >= 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGroupSelected}
                          className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <Link2 className="w-3 h-3 mr-1" />
                          Group All
                        </Button>
                      )}
                    </div>

                    {/* Element Groups */}
                    {elementGroups.length > 0 && (
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                            {elementGroups.length} Group{elementGroups.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        {elementGroups.map((group, groupIndex) => (
                          <div
                            key={groupIndex}
                            className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 py-1"
                          >
                            <span>
                              Group {groupIndex + 1}: Elements {group.map((i) => i + 1).join(', ')}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeElementGroup(groupIndex)}
                              className="h-5 w-5 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Individual Elements */}
                    {selectedElements.map((el, index) => {
                      const groupIndex = getElementGroup(index);
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            groupIndex >= 0
                              ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white ${
                                    groupIndex >= 0 ? 'bg-purple-500' : 'bg-green-500'
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                  {el.componentName || 'Unknown Component'}
                                </span>
                                {groupIndex >= 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded">
                                    Group {groupIndex + 1}
                                  </span>
                                )}
                              </div>
                              <code className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">
                                {el.selector}
                              </code>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSelectedElement(index)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
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
                {selectedElements.length === 0 && !screenshot.dataUrl && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Start by selecting an element or capturing a screenshot
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Tip: Use Ctrl+Click to select multiple elements
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
              selectedElements={selectedElements}
              elementGroups={elementGroups}
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
      </div>
    </>
  );
}

export default DevToolsPanel;
