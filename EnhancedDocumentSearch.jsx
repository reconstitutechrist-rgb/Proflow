
import React, { useState, useCallback, useEffect } from "react";
import { Document } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Brain,
  FileText,
  Eye,
  Filter,
  Sparkles,
  Loader2
} from "lucide-react";
import { useWorkspace } from "../workspace/WorkspaceContext"; // Added import

export default function EnhancedDocumentSearch({
  // Removed: documents, onResultsChange
  assignments = [],
  className = "",
  onSelectDocument // Added prop as per outline
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("standard");
  const [isSearching, setIsSearching] = useState(false); // Renamed `searching` to `isSearching` for consistency
  const [selectedAssignment, setSelectedAssignment] = useState("all");
  const [documentType, setDocumentType] = useState("all");
  const [expandedQuery, setExpandedQuery] = useState("");

  // New states for document management
  const [documents, setDocuments] = useState([]); // All documents loaded for the current workspace
  const [filteredDocuments, setFilteredDocuments] = useState([]); // Documents matching current search/filters
  const [loading, setLoading] = useState(false); // For initial document loading

  const { currentWorkspaceId } = useWorkspace(); // Hook to get current workspace ID

  // Function to load documents for the current workspace
  const loadDocuments = useCallback(async () => {
    if (!currentWorkspaceId) {
      setDocuments([]);
      setFilteredDocuments([]);
      return;
    }
    try {
      setLoading(true);
      const docs = await Document.filter( // Using imported Document entity
        { workspace_id: currentWorkspaceId },
        "-updated_date"
      );
      setDocuments(docs);
      setFilteredDocuments(docs); // Initially, all loaded documents are filtered documents
    } catch (error) {
      console.error("Error loading documents:", error);
      setDocuments([]);
      setFilteredDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId]); // Depend on currentWorkspaceId

  // Effect to load documents whenever the workspace ID changes
  useEffect(() => {
    loadDocuments();
  }, [currentWorkspaceId, loadDocuments]); // Ensure loadDocuments is called when workspace changes

  // AI-powered search query expansion (modified for outline's prompt and return type)
  const expandDocumentQuery = useCallback(async (query) => {
    if (!query.trim() || query.length < 3) return [query.toLowerCase()]; // Return array of terms
    
    try {
      // Outline's prompt for keyword generation
      const prompt = `Generate search keywords for: "${query}"
Return 5-8 related terms and synonyms as JSON array.`;

      const response = await InvokeLLM({ // Using imported InvokeLLM
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const allTerms = [query.toLowerCase(), ...(response.keywords || []).map(k => k.toLowerCase())];
      return allTerms; // Return array of strings
    } catch (error) {
      console.error("Error expanding document query:", error);
      return [query.toLowerCase()]; // Fallback, return original query as array
    }
  }, []);

  // Enhanced document search with AI keywords and visual descriptions (modified to operate on internal state)
  const performDocumentSearch = useCallback(async (query, useSemanticSearch) => {
    // Operate on the `documents` state variable
    const docsToFilter = documents;

    // If query is empty and no filters are applied, show all documents
    if (!query.trim() && selectedAssignment === "all" && documentType === "all") {
      setFilteredDocuments(docsToFilter);
      setIsSearching(false);
      setExpandedQuery(""); // Clear expanded query
      return;
    }

    setIsSearching(true);
    setExpandedQuery(""); // Reset expanded query display before new search

    try {
      let searchTermsArray = [query.toLowerCase()];

      // Expand query for semantic search
      if (useSemanticSearch) {
        searchTermsArray = await expandDocumentQuery(query);
        // Set expanded query for UI display, re-joining the terms
        setExpandedQuery(searchTermsArray.join(" "));
      }
      
      const queryTerms = searchTermsArray.filter(term => term.length > 1);

      const filtered = docsToFilter.filter(doc => {
        // Basic filters
        const assignmentMatch = selectedAssignment === "all" || 
          (doc.assigned_to_assignments && doc.assigned_to_assignments.includes(selectedAssignment));
        
        const typeMatch = documentType === "all" || doc.document_type === documentType;
        
        if (!assignmentMatch || !typeMatch) return false;

        // Enhanced text search including AI-generated content
        const searchableText = [
          doc.title,
          doc.description,
          doc.file_name,
          doc.document_type,
          doc.image_description, // AI-generated visual description
          doc.content, // Added doc.content as suggested by outline's semantic search
          ...(doc.tags || []),
          ...(doc.ai_keywords || []), // AI-generated keywords
          // Include analysis data if available
          doc.ai_analysis?.summary,
          ...(doc.ai_analysis?.key_points || []),
          ...(doc.ai_analysis?.potential_gaps || [])
        ].filter(Boolean).join(' ').toLowerCase();

        return queryTerms.some(term => searchableText.includes(term));
      });

      // Sort results by relevance (AI-enhanced documents first, then by match quality)
      const sortedResults = filtered.sort((a, b) => {
        const aHasAI = (a.ai_keywords && a.ai_keywords.length > 0) || a.image_description;
        const bHasAI = (b.ai_keywords && b.ai_keywords.length > 0) || b.image_description;
        
        if (aHasAI && !bHasAI) return -1;
        if (!aHasAI && bHasAI) return 1;
        
        // Secondary sort by creation date
        return new Date(b.created_date) - new Date(a.created_date);
      });

      setFilteredDocuments(sortedResults); // Update internal filtered documents state
    } catch (error) {
      console.error("Document search error:", error);
      setFilteredDocuments(docsToFilter); // Fallback to all loaded documents
    } finally {
      setIsSearching(false);
    }
  }, [documents, selectedAssignment, documentType, expandDocumentQuery]); // Dependencies: documents, filters, and expandDocumentQuery

  // Debounced search execution - adjusted dependencies to trigger when base data changes
  React.useEffect(() => {
    // Do not perform search if documents are still loading, or if there are no documents yet and no search query
    if (loading || (documents.length === 0 && !searchQuery && selectedAssignment === "all" && documentType === "all")) {
        setFilteredDocuments([]); // Clear results if no documents loaded or nothing to search
        return;
    }

    const timeoutId = setTimeout(() => {
      performDocumentSearch(searchQuery, searchMode === "semantic");
    }, searchMode === "semantic" ? 800 : 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchMode, selectedAssignment, documentType, performDocumentSearch, documents.length, loading]); // Added documents.length and loading as dependencies


  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder={searchMode === "semantic" ? 
            "AI-powered document search..." : 
            "Search documents by title, content, or visual description..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 text-base"
        />
        {(isSearching || loading) && ( // Show loader for both initial loading and searching
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Search Mode Toggle and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        {/* Search Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={searchMode === "standard" ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchMode("standard")}
            className="h-9"
          >
            <Search className="w-3 h-3 mr-2" />
            Standard
          </Button>
          <Button
            variant={searchMode === "semantic" ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchMode("semantic")}
            className="h-9"
          >
            <Brain className="w-3 h-3 mr-2" />
            Semantic
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="All Assignments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              {assignments.map(assignment => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="contract">Contracts</SelectItem>
              <SelectItem value="specification">Specifications</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="report">Reports</SelectItem>
              <SelectItem value="presentation">Presentations</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expanded Query Display */}
      {searchMode === "semantic" && expandedQuery && expandedQuery.toLowerCase() !== searchQuery.toLowerCase() && (
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-blue-700 font-medium">Expanded search:</span>
              <code className="bg-white px-2 py-1 rounded text-blue-800 text-xs break-all">
                {expandedQuery}
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Stats */}
      {(searchQuery || filteredDocuments.length > 0 || loading) && ( // Show stats if there's a query, results, or loading
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {loading ? (
              <span>Loading documents...</span>
            ) : (
              <span>Found {filteredDocuments.length} results</span>
            )}
          </div>
          {searchMode === "semantic" && (
            <div className="flex items-center gap-1">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="text-purple-600">AI-Enhanced Search Active</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
