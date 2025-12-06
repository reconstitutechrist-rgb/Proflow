import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import {
  Edit3,
  Eye,
  Columns,
  GripVertical
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * View modes for the editor
 */
export const VIEW_MODES = {
  EDIT: 'edit',
  PREVIEW: 'preview',
  SPLIT: 'split'
};

/**
 * EditorPreviewSplit - Container for split view editor/preview layout
 * Uses react-resizable-panels for draggable split
 */
export default function EditorPreviewSplit({
  viewMode = VIEW_MODES.EDIT,
  onViewModeChange,
  editorContent,
  previewContent,
  className = ''
}) {
  // Load saved panel size from localStorage
  const [panelSizes, setPanelSizes] = useState(() => {
    try {
      const saved = localStorage.getItem('proflow_editor_panel_sizes');
      return saved ? JSON.parse(saved) : [50, 50];
    } catch {
      return [50, 50];
    }
  });

  // Save panel sizes when changed
  const handlePanelResize = (sizes) => {
    setPanelSizes(sizes);
    localStorage.setItem('proflow_editor_panel_sizes', JSON.stringify(sizes));
  };

  // Render based on view mode
  if (viewMode === VIEW_MODES.EDIT) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <div className="flex-1 overflow-auto">
          {editorContent}
        </div>
      </div>
    );
  }

  if (viewMode === VIEW_MODES.PREVIEW) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <div className="flex-1 overflow-auto">
          {previewContent}
        </div>
      </div>
    );
  }

  // Split view
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      <PanelGroup
        direction="horizontal"
        onLayout={handlePanelResize}
        className="flex-1"
      >
        <Panel
          defaultSize={panelSizes[0]}
          minSize={30}
          className="overflow-auto"
        >
          <div className="h-full border-r border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <Edit3 className="w-3 h-3" />
                Editor
              </span>
            </div>
            <div className="p-4">
              {editorContent}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors cursor-col-resize flex items-center justify-center group">
          <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
        </PanelResizeHandle>

        <Panel
          defaultSize={panelSizes[1]}
          minSize={30}
          className="overflow-auto"
        >
          <div className="h-full">
            <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <Eye className="w-3 h-3" />
                Preview
              </span>
            </div>
            <div className="p-4">
              {previewContent}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

/**
 * ViewModeToggle - Toggle buttons for switching between view modes
 */
function ViewModeToggle({ viewMode, onViewModeChange }) {
  return (
    <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-2">View:</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === VIEW_MODES.EDIT ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange(VIEW_MODES.EDIT)}
                className="h-7 px-2"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit mode only</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === VIEW_MODES.SPLIT ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange(VIEW_MODES.SPLIT)}
                className="h-7 px-2"
              >
                <Columns className="w-4 h-4 mr-1" />
                Split
              </Button>
            </TooltipTrigger>
            <TooltipContent>Side-by-side editor and preview</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === VIEW_MODES.PREVIEW ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange(VIEW_MODES.PREVIEW)}
                className="h-7 px-2"
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
            </TooltipTrigger>
            <TooltipContent>Preview mode only</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export { ViewModeToggle };
