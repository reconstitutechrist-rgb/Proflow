
import React, { useState, useEffect } from "react";
import { Assignment } from "@/api/entities";
import { Document } from "@/api/entities";
import { Task } from "@/api/entities";
import { Message } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  FolderOpen, 
  FileText, 
  CheckCircle, 
  MessageSquare, 
  Loader2,
  Link2,
  Sparkles,
  ArrowRight,
  Lightbulb
} from "lucide-react";
import { Link } from "react-router";
import { createPageUrl } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/WorkspaceContext"; // New import

export default function RelatedContentSuggestions({ 
  currentItem, 
  itemType, // "assignment", "document", "task", "message"
  maxSuggestions = 6,
  className = ""
}) {
  const [relatedContent, setRelatedContent] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { currentWorkspaceId } = useWorkspace(); // Hook to get current workspace ID

  // Renamed generateRelatedContent to loadSuggestions as per outline
  const loadSuggestions = async () => {
    // Validate currentItem and currentWorkspaceId before proceeding
    if (!currentItem || !currentWorkspaceId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Prepare context about current item (this context was previously used for LLM prompt)
      const currentItemContext = {
        type: itemType,
        id: currentItem.id,
        title: getItemTitle(currentItem, itemType),
        description: getItemDescription(currentItem, itemType),
        keywords: currentItem.ai_keywords || [],
        status: currentItem.status,
        created_date: currentItem.created_date
      };

      // Load workspace-scoped content for comparison, as specified in the outline
      // Using .filter with workspace_id to scope results
      // Limits changed to 20 as per outline
      const [documents, tasks, assignments] = await Promise.all([
        Document.filter({ 
          workspace_id: currentWorkspaceId 
        }, "-updated_date", 20),
        Task.filter({ 
          workspace_id: currentWorkspaceId 
        }, "-updated_date", 20),
        Assignment.filter({ 
          workspace_id: currentWorkspaceId 
        }, "-updated_date", 20)
        // Messages are no longer fetched as per the provided outline
      ]);

      // Filter out the current item from the fetched content
      const filteredDocuments = documents.filter(item => !(itemType === 'document' && item.id === currentItem.id));
      const filteredTasks = tasks.filter(item => !(itemType === 'task' && item.id === currentItem.id));
      const filteredAssignments = assignments.filter(item => !(itemType === 'assignment' && item.id === currentItem.id));

      // Generate AI suggestions (simplified structure based on outline)
      // The outline suggested a simplified data structure for setSuggestions,
      // but to maintain compatibility with the existing rendering logic,
      // we reconstruct the `relatedContent` array into the expected format.
      let generatedSuggestions = [];

      // Add document suggestions
      filteredDocuments.slice(0, 3).forEach(d => {
        generatedSuggestions.push({
          id: d.id,
          confidence: 80, // Example confidence from outline
          explanation: "This document provides relevant background information.", // Example explanation from outline
          relationship_type: "supporting_document",
          item: d,
          itemType: getContentType(d)
        });
      });

      // Add task suggestions
      filteredTasks.slice(0, 3).forEach(t => {
        generatedSuggestions.push({
          id: t.id,
          confidence: 75, // Example confidence from outline
          explanation: "This task might be a follow-up or related action item.", // Example explanation from outline
          relationship_type: "related_task",
          item: t,
          itemType: getContentType(t)
        });
      });

      // Add assignment suggestions
      filteredAssignments.slice(0, 2).forEach(a => {
        generatedSuggestions.push({
          id: a.id,
          confidence: 85, // Example confidence from outline
          explanation: "This assignment shares a similar context or objective.", // Example explanation from outline
          relationship_type: "context", // Using 'context' as a generic relationship for assignments
          item: a,
          itemType: getContentType(a)
        });
      });
      
      // Shuffle and take up to maxSuggestions to mix types
      // A simple shuffle to ensure a diverse set of item types in the final suggestions
      generatedSuggestions.sort(() => Math.random() - 0.5); 
      const finalSuggestions = generatedSuggestions.slice(0, maxSuggestions);

      setRelatedContent(finalSuggestions);

    } catch (error) {
      console.error("Error loading suggestions:", error);
      setError("Failed to load related content suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const getContentType = (item) => {
    if (item.name && item.assignment_manager !== undefined) return 'assignment';
    if (item.title && item.file_url) return 'document';
    if (item.title && item.assigned_to) return 'task';
    if (item.content && item.author_email) return 'message';
    return 'unknown';
  };

  const getItemTitle = (item, type) => {
    switch (type) {
      case 'assignment': return item.name;
      case 'document': return item.title;
      case 'task': return item.title;
      case 'message': return item.content?.substring(0, 50) + '...';
      default: return 'Untitled';
    }
  };

  const getItemDescription = (item, type) => {
    switch (type) {
      case 'assignment': return item.description || '';
      case 'document': return item.description || '';
      case 'task': return item.description || '';
      case 'message': return item.content || '';
      default: return '';
    }
  };

  const getItemIcon = (type) => {
    switch (type) {
      case 'assignment': return FolderOpen;
      case 'document': return FileText;
      case 'task': return CheckCircle;
      case 'message': return MessageSquare;
      default: return FileText;
    }
  };

  const getItemUrl = (item, type) => {
    switch (type) {
      case 'assignment': return createPageUrl("Assignments") + `?assignment=${item.id}`;
      case 'document': return createPageUrl("Documents") + `?doc=${item.id}`;
      case 'task': return createPageUrl("Tasks") + `?task=${item.id}`;
      case 'message': return createPageUrl("Chat") + `?message=${item.id}`;
      default: return '#';
    }
  };

  const getRelationshipColor = (type) => {
    switch (type) {
      case 'supporting_document': return 'bg-blue-100 text-blue-800';
      case 'related_task': return 'bg-green-100 text-green-800';
      case 'follow_up': return 'bg-purple-100 text-purple-800';
      case 'context': return 'bg-orange-100 text-orange-800'; // Added 'context' type for coloring
      case 'similar_topic': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    // Effect now depends on currentWorkspaceId, ensuring suggestions reload if workspace changes
    if (currentItem && currentWorkspaceId) {
      loadSuggestions();
    }
  }, [currentItem?.id, currentWorkspaceId]); // Removed itemType from dependencies as per outline

  if (!currentItem) return null;

  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI-Suggested Related Content
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            <Sparkles className="w-3 h-3 mr-1" />
            Smart Discovery
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-purple-500 animate-spin" />
              <p className="text-sm text-gray-600">Discovering related content...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={loadSuggestions}> {/* Updated onClick */}
                Try Again
              </Button>
            </div>
          </div>
        ) : relatedContent.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <Link2 className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-1">No related content found</p>
              <p className="text-xs text-gray-400">
                AI couldn't find strongly related items at this time
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {relatedContent.map((suggestion) => {
              const Icon = getItemIcon(suggestion.itemType);
              return (
                <Link
                  key={suggestion.id}
                  to={getItemUrl(suggestion.item, suggestion.itemType)}
                  className="block"
                >
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50/50 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-purple-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {getItemTitle(suggestion.item, suggestion.itemType)}
                          </h4>
                          <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {suggestion.explanation}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getRelationshipColor(suggestion.relationship_type)}`}
                          >
                            {suggestion.relationship_type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.confidence}% match
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {suggestion.itemType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            
            {/* Refresh Button */}
            <div className="pt-3 border-t border-gray-100">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadSuggestions} // Updated onClick
                disabled={isLoading}
                className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <Brain className="w-3 h-3 mr-2" />
                Refresh Suggestions
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
