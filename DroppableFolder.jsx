import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Folder, FolderOpen, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DroppableFolder({ 
  folder, 
  isExpanded, 
  onToggle, 
  onNavigate,
  documentCount = 0,
  level = 0,
  isDragOver = false
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate(folder.path);
    }
  };

  return (
    <Droppable droppableId={`folder-${folder.path}`} type="DOCUMENT">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          <div
            onClick={handleClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
              snapshot.isDraggingOver 
                ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 border-2 border-blue-400 dark:border-blue-600 shadow-lg scale-105 transform' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent'
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            {folder.children && folder.children.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggle) {
                    onToggle(folder.path);
                  }
                }}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronRight 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            )}

            <div className={`transition-all ${
              snapshot.isDraggingOver 
                ? 'scale-110 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
            }`}>
              {snapshot.isDraggingOver ? (
                <FolderOpen className="w-5 h-5" />
              ) : isExpanded ? (
                <FolderOpen className="w-5 h-5" />
              ) : (
                <Folder className="w-5 h-5" />
              )}
            </div>

            <span className={`flex-1 text-sm font-medium transition-colors ${
              snapshot.isDraggingOver 
                ? 'text-blue-900 dark:text-blue-100 font-semibold' 
                : 'text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
            }`}>
              {folder.name}
            </span>

            {documentCount > 0 && (
              <Badge 
                variant="secondary" 
                className={`text-xs transition-all ${
                  snapshot.isDraggingOver 
                    ? 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100 scale-110' 
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {documentCount}
              </Badge>
            )}

            {snapshot.isDraggingOver && (
              <div className="absolute inset-0 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg pointer-events-none animate-pulse" />
            )}
          </div>

          {/* Drop zone indicator */}
          {snapshot.isDraggingOver && (
            <div className="ml-8 mt-1 mb-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 rounded-r text-sm text-blue-700 dark:text-blue-300 animate-in fade-in duration-200">
              <p className="font-medium flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Drop files here to move to "{folder.name}"
              </p>
            </div>
          )}

          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}