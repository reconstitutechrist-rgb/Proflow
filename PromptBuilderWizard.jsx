
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wand2, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { base44 } from "@/api/base44Client";

export default function PromptBuilderWizard({ isOpen, assignmentId, onDocumentCreated, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [generating, setGenerating] = useState(false);

  const [documentType, setDocumentType] = useState("report");
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [sectionsInput, setSectionsInput] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [includeResearch, setIncludeResearch] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  const steps = [
    "Document Type & Title",
    "Target Audience & Tone/Length",
    "Key Sections",
    "Keywords & Additional Context",
    "Include Research & Review"
  ];
  const totalSteps = steps.length;

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepSubmit = async () => {
    if (!isCurrentStepValid()) {
      toast.error("Please fill in all required fields to proceed.");
      return;
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleGenerate();
    }
  };

  const handleGenerate = async () => {
    if (!currentWorkspaceId) {
      toast.error("No workspace selected. Please select a workspace to generate documents.");
      return;
    }

    setGenerating(true);

    try {
      const sectionsArray = sectionsInput.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      const keywordsArray = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0);

      const prompt = `Generate a professional ${documentType} document with the following requirements:

Title: ${title}
Audience: ${audience}
Tone: ${tone}
Length: ${length}

${sectionsArray.length > 0 ? `
Required Sections:
${sectionsArray.map(s => `- ${s}`).join('\n')}
` : ''}

${additionalContext ? `
Additional Context:
${additionalContext}
` : ''}

${keywordsArray.length > 0 ? `
Keywords to include: ${keywordsArray.join(', ')}
` : ''}

Format the document with proper headings, paragraphs, and structure. Make it professional and ready for use.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: includeResearch
      });

      const documentData = {
        workspace_id: currentWorkspaceId,
        title: title,
        description: `Generated ${documentType} document for ${audience}`,
        content: response || "", // Ensure content is always a string, even if response is null/undefined
        document_type: documentType === 'report' ? 'report' :
                       documentType === 'proposal' ? 'contract' : 'other',
        assigned_to_assignments: assignmentId ? [assignmentId] : [],
        tags: keywordsArray,
        version: "1.0"
      };

      const newDocument = await base44.entities.Document.create(documentData);

      toast.success("Document generated successfully!");

      if (onDocumentCreated) {
        onDocumentCreated(newDocument);
      }

      setDocumentType("report");
      setTitle("");
      setAudience("");
      setTone("professional");
      setLength("medium");
      setSectionsInput("");
      setAdditionalContext("");
      setKeywordsInput("");
      setIncludeResearch(false);
      setCurrentStep(0);
      onClose();
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Failed to generate document", {
        description: error instanceof Error ? error.message : "An unexpected error occurred while generating the document."
      });
    } finally {
      setGenerating(false);
    }
  };

  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 0:
        return title.trim().length > 0 && documentType.trim().length > 0;
      case 1:
        return audience.trim().length > 0 && tone.trim().length > 0 && length.trim().length > 0;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Prompt Builder Wizard
          </DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {totalSteps}: {steps[currentStep]}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="documentType">What type of document are you creating?</Label>
                <Select
                  value={documentType}
                  onValueChange={(value) => setDocumentType(value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="memo">Memo</SelectItem>
                    <SelectItem value="blog post">Blog Post</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">What's the main title or purpose of this document?</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Project Proposal for Q3, Weekly Status Report, Customer Onboarding Email"
                  className="mt-2"
                />
              </div>
              <p className="text-sm text-gray-500">
                💡 This will be the main topic and title of your generated document.
              </p>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="audience">Who is the target audience for this document?</Label>
                <Input
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g., Executive team, Developers, Clients, Stakeholders"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="tone">What tone should the document have?</Label>
                <Select
                  value={tone}
                  onValueChange={(value) => setTone(value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional & Formal</SelectItem>
                    <SelectItem value="friendly">Friendly & Conversational</SelectItem>
                    <SelectItem value="technical">Technical & Precise</SelectItem>
                    <SelectItem value="persuasive">Persuasive & Compelling</SelectItem>
                    <SelectItem value="informative">Informative & Educational</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="length">How long should it be?</Label>
                <Select
                  value={length}
                  onValueChange={(value) => setLength(value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">Brief (1-2 paragraphs)</SelectItem>
                    <SelectItem value="medium">Medium (1-2 pages)</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive (3-5+ pages)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sectionsInput">What key sections or topics must be covered?</Label>
                <Textarea
                  id="sectionsInput"
                  value={sectionsInput}
                  onChange={(e) => setSectionsInput(e.target.value)}
                  placeholder="List main sections, one per line. e.g.:&#10;- Executive Summary&#10;- Introduction&#10;- Problem Statement&#10;- Proposed Solution&#10;- Budget & Timeline&#10;- Conclusion"
                  className="mt-2 min-h-32"
                />
              </div>
              <p className="text-sm text-gray-500">
                💡 Each line will guide the AI to create a distinct section or cover a specific topic.
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="keywordsInput">Are there specific keywords or phrases to include?</Label>
                <Input
                  id="keywordsInput"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="e.g., AI, machine learning, Q3 earnings, customer retention (comma-separated)"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="additionalContext">Any other specific instructions or context?</Label>
                <Textarea
                  id="additionalContext"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g., Include an executive summary, Use bullet points for key findings, Mention our new product launch on Dec 1st."
                  className="mt-2 min-h-32"
                />
              </div>
              <p className="text-sm text-gray-500">
                💡 Optional but helpful! Any style preferences, required sections, or special instructions.
              </p>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeResearch"
                  checked={includeResearch}
                  onCheckedChange={(checked) => setIncludeResearch(Boolean(checked))}
                />
                <label
                  htmlFor="includeResearch"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Allow AI to research additional context from the internet (may increase generation time)
                </label>
              </div>
              <p className="text-sm text-gray-500">
                💡 This can enrich your document with up-to-date or broader information.
              </p>

              <div className="mt-8 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
                <h4 className="font-semibold mb-2">Review your document settings:</h4>
                <p><strong>Document Type:</strong> {documentType}</p>
                <p><strong>Title:</strong> {title}</p>
                <p><strong>Audience:</strong> {audience}</p>
                <p><strong>Tone:</strong> {tone}</p>
                <p><strong>Length:</strong> {length}</p>
                {sectionsInput && <p><strong>Key Sections:</strong> {sectionsInput.split('\n').filter(s => s.trim().length > 0).join(', ')}</p>}
                {keywordsInput && <p><strong>Keywords:</strong> {keywordsInput}</p>}
                {additionalContext && <p><strong>Additional Context:</strong> {additionalContext}</p>}
                <p><strong>Include Internet Research:</strong> {includeResearch ? "Yes" : "No"}</p>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || generating}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleStepSubmit}
            disabled={generating || !isCurrentStepValid()}
            className={currentStep === totalSteps - 1 ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            {generating ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Building Document...
              </>
            ) : currentStep < totalSteps - 1 ? (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
