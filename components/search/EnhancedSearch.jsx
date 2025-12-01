import React, { useState, useEffect } from "react";
import { db } from "@/api/db";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  FileText,
  FolderOpen,
  MessageSquare,
  CheckCircle,
  Calendar,
  User
} from "lucide-react";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";

export default function EnhancedSearch({ isOpen, onClose, onResultSelect }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (searchQuery.trim().length > 2 && currentWorkspaceId) {
      performSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, currentWorkspaceId]);

  const performSearch = async (query) => {
    if (!currentWorkspaceId) return;

    setIsLoading(true);
    try {
      const [projects, documents, messages, tasks] = await Promise.all([
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }),
        db.entities.Document.filter({ workspace_id: currentWorkspaceId }),
        db.entities.Message.filter({ workspace_id: currentWorkspaceId }, "-created_date", 50),
        db.entities.Task.filter({ workspace_id: currentWorkspaceId }, "-created_date", 50)
      ]);

      const results = [];
      const queryLower = query.toLowerCase();

      // Search projects
      projects.forEach(project => {
        if (
          project.name.toLowerCase().includes(queryLower) ||
          project.description?.toLowerCase().includes(queryLower)
        ) {
          results.push({
            id: project.id,
            type: 'project',
            title: project.name,
            description: project.description,
            icon: FolderOpen,
            metadata: {
              status: project.status,
              priority: project.priority,
              date: project.created_date
            }
          });
        }
      });

      // Search documents
      documents.forEach(doc => {
        if (
          doc.title.toLowerCase().includes(queryLower) ||
          doc.description?.toLowerCase().includes(queryLower) ||
          doc.file_name?.toLowerCase().includes(queryLower)
        ) {
          const project = projects.find(p => p.id === doc.project_id);
          results.push({
            id: doc.id,
            type: 'document',
            title: doc.title,
            description: doc.description || `File: ${doc.file_name}`,
            icon: FileText,
            metadata: {
              project: project?.name,
              type: doc.document_type,
              date: doc.created_date
            }
          });
        }
      });

      // Search messages
      messages.forEach(message => {
        if (message.content.toLowerCase().includes(queryLower)) {
          const project = projects.find(p => p.id === message.project_id);
          results.push({
            id: message.id,
            type: 'message',
            title: `Message from ${message.author_name || message.author_email}`,
            description: message.content.length > 100 
              ? `${message.content.substring(0, 100)}...` 
              : message.content,
            icon: MessageSquare,
            metadata: {
              project: project?.name,
              author: message.author_name || message.author_email,
              date: message.created_date
            }
          });
        }
      });

      // Search tasks
      tasks.forEach(task => {
        if (
          task.title.toLowerCase().includes(queryLower) ||
          task.description?.toLowerCase().includes(queryLower)
        ) {
          const project = projects.find(p => p.id === task.project_id);
          results.push({
            id: task.id,
            type: 'task',
            title: task.title,
            description: task.description || 'No description',
            icon: CheckCircle,
            metadata: {
              project: project?.name,
              status: task.status,
              assignee: task.assigned_to,
              date: task.created_date
            }
          });
        }
      });

      // Sort by relevance (exact matches first, then partial)
      results.sort((a, b) => {
        const aExact = a.title.toLowerCase() === queryLower ? 1 : 0;
        const bExact = b.title.toLowerCase() === queryLower ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        
        // Then by date (newer first)
        return new Date(b.metadata.date) - new Date(a.metadata.date);
      });

      setSearchResults(results.slice(0, 20)); // Limit to 20 results
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'project': return 'bg-blue-100 text-blue-800';
      case 'document': return 'bg-green-100 text-green-800';
      case 'message': return 'bg-purple-100 text-purple-800';
      case 'task': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search projects, documents, messages, tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 text-lg h-12"
          autoFocus
        />
      </div>

      {/* Search Results */}
      <div className="max-h-[500px] overflow-y-auto space-y-2">
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Searching...</p>
          </div>
        )}

        {!isLoading && searchQuery.trim().length <= 2 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Type at least 3 characters to search</p>
          </div>
        )}

        {!isLoading && searchQuery.trim().length > 2 && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No results found for "{searchQuery}"</p>
          </div>
        )}

        {searchResults.map((result) => (
          <Card
            key={`${result.type}-${result.id}`}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              onResultSelect(result);
              onClose();
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <result.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {result.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    </div>
                    <Badge className={getTypeColor(result.type)}>
                      {result.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    {result.metadata.project && (
                      <div className="flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        <span>{result.metadata.project}</span>
                      </div>
                    )}
                    {result.metadata.status && (
                      <div className="flex items-center gap-1">
                        <span>Status: {result.metadata.status}</span>
                      </div>
                    )}
                    {result.metadata.author && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{result.metadata.author}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(result.metadata.date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}