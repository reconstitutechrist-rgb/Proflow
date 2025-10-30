import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Brain,
  Link2,
  Calendar,
  GripVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DraggableDocument({ 
  document: doc, 
  index, 
  viewMode = "grid", 
  selectedDocuments = [],
  onDocumentSelect,
  onView,
  onDelete,
  getAssignmentNames,
  canDeleteDocument 
}) {
  const isSelected = selectedDocuments.includes(doc.id);

  const DocumentCard = ({ provided, snapshot, children }) => {
    const Component = viewMode === "grid" ? Card : "div";
    const baseClass = viewMode === "grid" 
      ? "group hover:shadow-lg transition-all duration-200 cursor-move border-0 shadow-md"
      : "hover:bg-gray-50 transition-colors border-0 shadow-md";
    
    const dragClass = snapshot.isDragging 
      ? "shadow-xl transform rotate-1 opacity-90 scale-105" 
      : "";
    
    const selectedClass = isSelected 
      ? "ring-2 ring-blue-500 bg-blue-50" 
      : "";

    return (
      <Component 
        className={`${baseClass} ${dragClass} ${selectedClass}`}
        {...provided.draggableProps}
        ref={provided.innerRef}
      >
        {children}
      </Component>
    );
  };

  if (viewMode === "grid") {
    return (
      <Draggable draggableId={`doc-${doc.id}`} index={index}>
        {(provided, snapshot) => (
          <DocumentCard provided={provided} snapshot={snapshot}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onDocumentSelect(doc.id, checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onView(doc)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {canDeleteDocument(doc) && (
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => onDelete(doc)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-4" onClick={() => onView(doc)}>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base truncate">{doc.title}</h4>
                  <p className="text-sm text-gray-500 truncate">{doc.file_name}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{getAssignmentNames(doc.assigned_to_assignments)}</span>
                <span>{((doc.file_size || 0) / 1024 / 1024).toFixed(1)} MB</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {doc.version && (
                  <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                )}
                {doc.ai_analysis?.analysis_status === 'completed' && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                    <Brain className="w-3 h-3 mr-1" />
                    AI Analyzed
                  </Badge>
                )}
                {doc.related_documents?.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Link2 className="w-3 h-3 mr-1" />
                    {doc.related_documents.length} linked
                  </Badge>
                )}
              </div>
            </CardContent>
          </DocumentCard>
        )}
      </Draggable>
    );
  }

  // List view
  return (
    <Draggable draggableId={`doc-${doc.id}`} index={index}>
      {(provided, snapshot) => (
        <DocumentCard provided={provided} snapshot={snapshot}>
          <Card className="mb-3">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onDocumentSelect(doc.id, checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">{doc.title}</h4>
                    {doc.version && (
                      <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>{getAssignmentNames(doc.assigned_to_assignments)}</span>
                    <span>{((doc.file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                    <span>
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(doc.created_date).toLocaleDateString()}
                    </span>
                    {doc.ai_analysis?.analysis_status === 'completed' && (
                      <div className="flex items-center gap-1 text-purple-600">
                        <Brain className="w-3 h-3" />
                        <span className="text-xs">AI Analyzed</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(doc)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                  {canDeleteDocument(doc) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(doc)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </DocumentCard>
      )}
    </Draggable>
  );
}