import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FolderPlus,
  Tag,
  Building,
  ChevronRight
} from "lucide-react";

export default function DroppableZone({ 
  droppableId, 
  type = "folder", 
  title, 
  count = 0, 
  icon: Icon = Folder, 
  children,
  isOver = false,
  canDrop = false,
  isEmpty = false 
}) {
  const getZoneStyles = () => {
    if (type === "assignment") {
      return {
        base: "bg-blue-50 border-blue-200 hover:bg-blue-100",
        active: "bg-blue-100 border-blue-400 shadow-md",
        icon: "text-blue-600"
      };
    }
    if (type === "category") {
      return {
        base: "bg-purple-50 border-purple-200 hover:bg-purple-100", 
        active: "bg-purple-100 border-purple-400 shadow-md",
        icon: "text-purple-600"
      };
    }
    if (type === "smart_folder") {
      return {
        base: "bg-green-50 border-green-200 hover:bg-green-100",
        active: "bg-green-100 border-green-400 shadow-md", 
        icon: "text-green-600"
      };
    }
    return {
      base: "bg-gray-50 border-gray-200 hover:bg-gray-100",
      active: "bg-gray-100 border-gray-400 shadow-md",
      icon: "text-gray-600"
    };
  };

  const styles = getZoneStyles();
  const isActive = isOver && canDrop;

  return (
    <Droppable droppableId={droppableId} type="DOCUMENT">
      {(provided, snapshot) => (
        <Card 
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`p-4 border-2 border-dashed transition-all duration-200 ${
            snapshot.isDraggingOver 
              ? styles.active 
              : styles.base
          } ${isEmpty ? 'min-h-[100px]' : ''}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <Icon className={`w-5 h-5 ${styles.icon}`} />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{title}</h4>
              {count > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {count} document{count !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
            {snapshot.isDraggingOver && (
              <div className="text-sm text-gray-600 font-medium">
                Drop to organize
              </div>
            )}
          </div>
          
          {children}
          
          {isEmpty && !snapshot.isDraggingOver && (
            <div className="text-center py-8 text-gray-400">
              <FolderPlus className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Drop documents here</p>
            </div>
          )}
          
          {provided.placeholder}
        </Card>
      )}
    </Droppable>
  );
}