
import React, { useState, useEffect, useCallback } from "react";
import * as Core from "@/api/integrations"; // For InvokeLLM - This will be replaced
import { Document } from "@/api/entities"; // This will be replaced
import { useWorkspace } from "../workspace/WorkspaceContext"; // For currentWorkspaceId
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Select is still imported but not used for document selection anymore
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // For refinement options
import { Textarea } from "@/components/ui/textarea"; // For custom instructions
import {
  RefreshCw,
  CheckCircle2,
  Loader2,
  Sparkles,
  FileText,
  Save,
  Download,
  Users
} from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { anthropicResearch } from "@/api/functions"; // Not used in the new changes, but was there
import ContentRewriter from "../tools/ContentRewriter";
import GrammarAssistant from "../tools/GrammarAssistant";
import AudienceRewriter from "./AudienceRewriter";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { base44 } from "@/api/base44Client"; // New import for base44

export default function DocumentRefiner({ document, onRefineComplete }) {
  const [editorContent, setEditorContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false); // New state for AI refinement
  const [activeRefinementTool, setActiveRefinementTool] = useState("ai-refiner"); // Default to new AI refiner tab
  const quillRef = React.useRef(null);

  const [refineOptions, setRefineOptions] = useState({
    improveClarity: false,
    enhanceProfessionalism: false,
    addTechnicalDetails: false,
    simplifyLanguage: false,
    expandContent: false,
    improveStructure: false
  });
  const [customInstructions, setCustomInstructions] = useState("");
  const [showDialog, setShowDialog] = useState(false); // Declared but not used in provided outline

  const { currentWorkspaceId } = useWorkspace();

  // Initialize editorContent when the document prop changes
  useEffect(() => {
    if (document) {
      setEditorContent(document.content || "");
    } else {
      setEditorContent("");
    }
  }, [document]);

  const handleApplyChanges = (newContent) => {
    setEditorContent(newContent);
    toast.success("Changes applied!", {
      description: "The refinements have been applied to your document."
    });
  };

  const handleRefine = async () => {
    if (!document || !currentWorkspaceId) {
      toast.error("Document or workspace not available");
      return;
    }

    // CRITICAL: Validate document is in current workspace
    if (document.workspace_id !== currentWorkspaceId) {
      toast.error("Cannot refine documents from other workspaces");
      console.error("Security violation: Cross-workspace document refine attempt", {
        documentWorkspace: document.workspace_id,
        currentWorkspace: currentWorkspaceId
      });
      return;
    }

    const selectedOptions = Object.entries(refineOptions)
      .filter(([, value]) => value)
      .map(([key]) => key);

    if (selectedOptions.length === 0 && !customInstructions.trim()) {
      toast.error("Please select at least one refinement option or provide custom instructions");
      return;
    }

    try {
      setRefining(true);

      // Use editorContent, not document.content, as the source for refinement
      const strippedContent = editorContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      const refinementInstructions = selectedOptions.map(option => {
        switch (option) {
          case 'improveClarity':
            return 'Improve clarity and readability';
          case 'enhanceProfessionalism':
            return 'Enhance professional tone and language';
          case 'addTechnicalDetails':
            return 'Add more technical details and specifics';
          case 'simplifyLanguage':
            return 'Simplify language for broader audience';
          case 'expandContent':
            return 'Expand content with more examples and explanations';
          case 'improveStructure':
            return 'Improve document structure and organization';
          default:
            return option;
        }
      }).join(', ');

      const prompt = `Refine the following document according to these instructions:

${refinementInstructions}

${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

Original Document:
${strippedContent.substring(0, 15000)}

Return the refined document maintaining the same general structure but improved according to the instructions. Format as HTML.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      // CRITICAL: Update document while maintaining workspace_id
      await base44.entities.Document.update(document.id, {
        content: response,
        workspace_id: currentWorkspaceId, // CRITICAL: Maintain workspace_id
        version: `${parseFloat(document.version || "1.0") + 0.1}`,
        version_history: [
          {
            version: document.version,
            content: document.content, // This refers to the content *before* this refinement step
            created_date: new Date().toISOString(),
            created_by: "AI Refiner", // Replaced currentUser?.email as currentUser is not a prop
            change_notes: "Version before AI refinement"
          },
          ...(document.version_history || [])
        ]
      });

      setEditorContent(response); // Update the editor with the refined content

      toast.success("Document refined successfully!");
      setShowDialog(false); // If there's a dialog for options, close it

      if (onRefineComplete) {
        onRefineComplete();
      }
    } catch (error) {
      console.error("Error refining document:", error);
      toast.error("Failed to refine document");
    } finally {
      setRefining(false);
    }
  };


  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            Document Refiner
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Polish & Perfect
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Use AI tools to rewrite content, fix grammar, improve style, and perfect your writing.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Document Editor */}
          {document && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Document Content</Label>
                  {/* Removed the 'Save Refined Version' button as handleRefine now handles saving */}
                </div>
                <div className="relative border rounded-lg">
                  <ReactQuill
                    ref={quillRef}
                    value={editorContent}
                    onChange={setEditorContent}
                    modules={modules}
                    theme="snow"
                    className="min-h-[300px]"
                    readOnly={loading || refining}
                  />
                  {(loading || refining) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Refinement Tools */}
              <div>
                <Label className="mb-3 block">Refinement Tools</Label>
                <Tabs value={activeRefinementTool} onValueChange={setActiveRefinementTool}>
                  <TabsList className="grid w-full grid-cols-4"> {/* Changed grid-cols to 4 */}
                    <TabsTrigger value="ai-refiner" disabled={loading || refining}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Refiner
                    </TabsTrigger>
                    <TabsTrigger value="rewriter" disabled={loading || refining}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Content Rewriter
                    </TabsTrigger>
                    <TabsTrigger value="grammar" disabled={loading || refining}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Grammar Assistant
                    </TabsTrigger>
                    <TabsTrigger value="audience" disabled={loading || refining}>
                      <Users className="w-4 h-4 mr-2" />
                      Audience Adapter
                    </TabsTrigger>
                  </TabsList>

                  {/* New AI Refiner Tab Content */}
                  <TabsContent value="ai-refiner" className="mt-4">
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Select predefined options or provide custom instructions for AI-powered document refinement.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(refineOptions).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={key}
                              checked={value}
                              onCheckedChange={(checked) =>
                                setRefineOptions((prev) => ({ ...prev, [key]: checked }))
                              }
                              disabled={refining}
                            />
                            <Label htmlFor={key} className="capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </Label>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="custom-instructions">Custom Instructions (Optional)</Label>
                        <Textarea
                          id="custom-instructions"
                          placeholder="e.g., 'Make it sound more formal and academic.'"
                          value={customInstructions}
                          onChange={(e) => setCustomInstructions(e.target.value)}
                          disabled={refining}
                          rows={4}
                        />
                      </div>

                      <Button
                        onClick={handleRefine}
                        disabled={refining || (!Object.values(refineOptions).some(Boolean) && !customInstructions.trim())}
                        className="w-full"
                      >
                        {refining ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Refining Document...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Refine Document with AI
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="rewriter" className="mt-4">
                    <ContentRewriter
                      initialText={editorContent}
                      onApplyRewrite={handleApplyChanges}
                      disabled={loading || refining}
                    />
                  </TabsContent>

                  <TabsContent value="grammar" className="mt-4">
                    <GrammarAssistant
                      initialText={editorContent}
                      onApplyCorrections={handleApplyChanges}
                      disabled={loading || refining}
                    />
                  </TabsContent>

                  <TabsContent value="audience" className="mt-4">
                    <AudienceRewriter
                      initialText={editorContent}
                      onApplyRewrite={handleApplyChanges}
                      quillRef={quillRef}
                      disabled={loading || refining}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}

          {!document && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Selected</h3>
              <p>Please provide a document to start refining it.</p>
            </div>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
