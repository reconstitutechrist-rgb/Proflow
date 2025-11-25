
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Document } from "@/api/entities";
import { Task } from "@/api/entities";
import { User } from "@/api/entities";
import { base44 } from "@/api/base44Client"; // Added base44 import as per outline
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileEdit,
  Download,
  Copy,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wand2,
  FileText,
  Save,
  Plus,
  Users,
  Bell,
  Zap,
  Target,
  Send,
  MessageCircle,
  Bot,
  User as UserIcon,
  RefreshCw,
  Sparkles,
  Eye,
  AlertTriangle,
  List,
  Languages,
  FileType,
  ArrowRight,
  X,
  Edit3 // Added Edit3 for the Document Studio button
} from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import PromptBuilderWizard from "./PromptBuilderWizard";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

// Assuming createPageUrl is a utility function available in the project
// If not, this import path will need to be adjusted or the function defined inline.
// For example purposes, we'll assume it's imported from a common utilities file.
import { createPageUrl } from '@/lib/utils'; // Adjust path if necessary

const documentTemplates = [
  {
    id: "assignment-brief",
    title: "Assignment Brief",
    description: "A detailed brief outlining project scope, objectives, and deliverables.",
    documentType: "brief",
    icon: FileText,
    suggestedTitle: "Assignment Brief for [Assignment Name]",
    prompt: "Generate a comprehensive assignment brief. Include project overview, objectives, scope (in/out), key deliverables, timeline, roles and responsibilities, and success metrics. The tone should be professional and informative."
  },
  {
    id: "technical-spec",
    title: "Technical Specification",
    description: "Outline of technical requirements, architecture, and implementation details.",
    documentType: "specification",
    icon: Zap,
    suggestedTitle: "Technical Specification for [Assignment Name]",
    prompt: "Create a technical specification document. Detail the system architecture, component breakdown, key technologies, functional and non-functional requirements, and deployment considerations. Focus on clarity and precision for engineers."
  },
  {
    id: "project-plan",
    title: "Project Plan",
    description: "A roadmap detailing tasks, milestones, resources, and risk management.",
    documentType: "plan",
    icon: Target,
    suggestedTitle: "Project Plan for [Assignment Name]",
    prompt: "Develop a detailed project plan. Include an executive summary, project goals, detailed work breakdown structure, resource allocation, risk assessment and mitigation strategies, and communication plan. Ensure it's actionable and trackable."
  },
  {
    id: "status-report",
    title: "Status Report",
    description: "Regular update on project progress, achievements, challenges, and next steps.",
    documentType: "report",
    icon: Bell,
    suggestedTitle: "Weekly Status Report for [Assignment Name]",
    prompt: "Generate a concise weekly status report. Cover progress since the last report, completed tasks, upcoming tasks, any blockers or issues, and a summary of overall project health. Keep it brief and to the point for stakeholders."
  },
];

// Enhanced command detection with context awareness
const detectCommand = (input, hasExistingContent) => {
  const normalizedInput = input.toLowerCase().trim();

  // If there's no existing content, most commands don't make sense
  if (!hasExistingContent) {
    return { type: 'general', confidence: 0.5 };
  }

  // Action-oriented patterns - these indicate the user wants to DO something
  const isActionRequest = /^(can you|could you|please|i want to|i need to|let'?s|now|go ahead and)/i.test(normalizedInput);

  // Summarize patterns - must be action-oriented or very direct
  const summarizePatterns = [
    { pattern: /^summarize\b/, confidence: 0.95 },
    { pattern: /^give\s+me\s+a\s+summary/, confidence: 0.95 },
    { pattern: /^can\s+you\s+summarize/, confidence: 0.9 },
    { pattern: /^please\s+summarize/, confidence: 0.9 },
    { pattern: /^now\s+summarize/, confidence: 0.9 },
    { pattern: /^tldr/i, confidence: 0.95 },
    { pattern: /what'?s\s+the\s+summary/, confidence: 0.85 },
    { pattern: /main\s+points\s+(of|from)\s+(this|the)/, confidence: 0.8 },
  ];

  // Extract entities patterns - must be clear intent
  const extractPatterns = [
    { pattern: /^extract\s+(entities|entity|information|data)/, confidence: 0.95 },
    { pattern: /^can\s+you\s+extract/, confidence: 0.9 },
    { pattern: /^please\s+extract/, confidence: 0.9 },
    { pattern: /^find\s+(the\s+)?(key\s+)?(entities|information|details)/, confidence: 0.85 },
    { pattern: /^pull\s+out\s+(key|important)?\s*(information|details|entities)/, confidence: 0.85 },
    { pattern: /^list\s+(all\s+)?(the\s+)?(entities|key\s+information)/, confidence: 0.85 },
  ];

  // Translate patterns - must be explicit
  const translatePatterns = [
    { pattern: /^translate\s+(this|it|the\s+document)?\s*(to|into|in)\s+(\w+)/, confidence: 0.95 },
    { pattern: /^can\s+you\s+translate/, confidence: 0.9 },
    { pattern: /^please\s+translate/, confidence: 0.9 },
    { pattern: /^convert\s+(this|it)?\s*(to|into)\s+(\w+)/, confidence: 0.85 },
  ];

  // Rewrite/improve patterns
  const rewritePatterns = [
    { pattern: /^rewrite\s+(this|it)?/, confidence: 0.95 },
    { pattern: /^rephrase\s+(this|it)?/, confidence: 0.95 },
    { pattern: /^make\s+(this|it)\s+(more|less)?\s*(formal|casual|concise|detailed)/, confidence: 0.9 },
    { pattern: /^improve\s+(this|the)?\s*(writing|text|content)/, confidence: 0.9 },
    { pattern: /^can\s+you\s+(rewrite|rephrase|improve)/, confidence: 0.85 },
    { pattern: /^change\s+the\s+tone/, confidence: 0.85 },
  ];

  // Expand/elaborate patterns
  const expandPatterns = [
    { pattern: /^expand\s+(this|it|on)/, confidence: 0.95 },
    { pattern: /^elaborate\s+(on)?\s*(this|it)?/, confidence: 0.95 },
    { pattern: /^add\s+more\s+(detail|information)/, confidence: 0.9 },
    { pattern: /^make\s+(this|it)\s+(longer|more\s+detailed)/, confidence: 0.9 },
    { pattern: /^can\s+you\s+(expand|elaborate)/, confidence: 0.85 },
  ];

  // Shorten patterns
  const shortenPatterns = [
    { pattern: /^shorten\s+(this|it)?/, confidence: 0.95 },
    { pattern: /^make\s+(this|it)\s+(shorter|more\s+concise|briefer)/, confidence: 0.9 },
    { pattern: /^condense\s+(this|it)?/, confidence: 0.95 },
    { pattern: /^reduce\s+the\s+length/, confidence: 0.85 },
    { pattern: /^cut\s+down/, confidence: 0.8 },
  ];

  // Check for matches with confidence threshold
  const checkPatterns = (patterns, type, extractLanguage = false) => {
    for (const { pattern, confidence } of patterns) {
      if (pattern.test(normalizedInput)) {
        const finalConfidence = isActionRequest ? Math.min(confidence + 0.05, 1.0) : confidence;

        if (finalConfidence >= 0.75) {
          const result = { type, confidence: finalConfidence };

          if (extractLanguage && type === 'translate') {
            const match = normalizedInput.match(/(?:to|into|in)\s+(\w+)/);
            if (match) {
              result.targetLanguage = match[1].charAt(0).toUpperCase() + match[1].slice(1);
            }
          }

          return result;
        }
      }
    }
    return null;
  };

  // Check all command types
  const summarizeResult = checkPatterns(summarizePatterns, 'summarize');
  if (summarizeResult) return summarizeResult;

  const extractResult = checkPatterns(extractPatterns, 'extract');
  if (extractResult) return extractResult;

  const translateResult = checkPatterns(translatePatterns, 'translate', true);
  if (translateResult) return translateResult;

  const rewriteResult = checkPatterns(rewritePatterns, 'rewrite');
  if (rewriteResult) return rewriteResult;

  const expandResult = checkPatterns(expandPatterns, 'expand');
  if (expandResult) return expandResult;

  const shortenResult = checkPatterns(shortenPatterns, 'shorten');
  if (shortenResult) return shortenResult;

  return { type: 'general', confidence: 0.5 };
};

export default function DocumentGenerator({ assignment, currentUser, onDocumentGenerated }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("create");

  const [shouldGenerateTasks, setShouldGenerateTasks] = useState(true);
  const [shouldNotifyTeam, setShouldNotifyTeam] = useState(true);
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  const [conversationMessages, setConversationMessages] = useState([]);
  const [conversationInput, setConversationInput] = useState("");
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const conversationEndRef = useRef(null);

  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [showDiffView, setShowDiffView] = useState(false);

  const { currentWorkspaceId } = useWorkspace(); // Added from outline

  useEffect(() => {
    const loadTeamMembers = async () => {
      if (assignment?.team_members) {
        try {
          const users = await User.list();
          const assignmentTeam = users.filter(user =>
            assignment.team_members.includes(user.email)
          );
          setTeamMembers(assignmentTeam);
        } catch (error) {
          console.error("Error loading team members:", error);
        }
      }
    };
    loadTeamMembers();
  }, [assignment]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  const handleTemplateSelect = useCallback((template) => {
    setSelectedTemplate(template);
    setDocumentTitle(template.suggestedTitle?.replace("[Assignment Name]", assignment?.name || "New Document") || "");
    setCustomPrompt(template.prompt || "");
    setError("");
    setActiveTab("create");
    setIsConversationMode(true);
    setPendingUpdate(null);

    const contextMessage = {
      id: Date.now().toString(),
      type: 'system',
      content: `Perfect! We're starting with the "${template.title}" template. I'm ready to create a ${template.description.toLowerCase()}. 
You can modify the content later using commands in the chat.

✨ **Pro tip**: You can ask me to:
- **"summarize this"** - Get a quick summary
- **"extract entities"** - Pull out key information like dates, names, requirements
- **"translate to [language]"** - Translate sections or the whole document
- **"make it more concise"** - Shorten the content
- **"expand on this"** - Add more details
- Modify sections, adjust tone, add details, or restructure

Let's create something great!`,
      timestamp: new Date()
    };
    setConversationMessages([contextMessage]);
  }, [assignment?.name]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.documentGeneratorRef = { current: { handleTemplateSelect } };
    }
  }, [handleTemplateSelect]);

  const generateTasksFromDocument = useCallback(async (content, title) => {
    if (!shouldGenerateTasks) return;
    
    setIsGeneratingTasks(true);
    try {
      const response = await base44.integrations.Core.anthropicResearch({ // Updated from anthropicResearch
        question: `Analyze this document and suggest 3-5 actionable tasks that should be created based on its content.

Document Title: ${title}
Document Content:
${content}

For each task, provide:
1. A clear, actionable title
2. A detailed description
3. Priority (low/medium/high/urgent)
4. Estimated effort in hours (1-40)
5. Suggested assignee type (manager/developer/designer/analyst)
6. Due date offset in days from now (3-30)
7. Brief reasoning for why this task is important

Return the tasks as a JSON array with this structure:
[
  {
    "title": "Task title",
    "description": "Detailed description",
    "priority": "medium",
    "estimated_effort": 8,
    "suggested_assignee_type": "developer",
    "due_date_offset_days": 7,
    "reasoning": "Why this task matters"
  }
]`,
        assignment: assignment,
        documents: []
      });

      try {
        const tasks = JSON.parse(response.data.response);
        setSuggestedTasks(Array.isArray(tasks) ? tasks : []);
        
        if (Array.isArray(tasks) && tasks.length > 0) {
          toast.success(`Generated ${tasks.length} task suggestions`, {
            description: "Review the suggested tasks before saving the document."
          });
        }
      } catch (parseError) {
        console.error("Error parsing task suggestions:", parseError);
        toast.warning("Could not generate tasks", {
          description: "The AI response wasn't in the expected format."
        });
        setSuggestedTasks([]);
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast.error("Failed to generate task suggestions", {
        description: "There was an error analyzing the document for tasks."
      });
      setSuggestedTasks([]);
    } finally {
      setIsGeneratingTasks(false);
    }
  }, [shouldGenerateTasks, assignment]);

  const notifyTeam = useCallback(async (documentTitle, documentUrl) => {
    if (!shouldNotifyTeam || !teamMembers || teamMembers.length === 0) return;

    try {
      const notificationPromises = teamMembers.map(async (member) => {
        return base44.integrations.Core.SendEmail({ // Updated from SendEmail
          to: member.email,
          subject: `New Document: ${documentTitle}`,
          body: `Hi ${member.full_name},

A new document has been generated for the assignment "${assignment.name}".

Document: ${documentTitle}
Assignment: ${assignment.name}

You can view and download the document from the Documents page.

Best regards,
${currentUser?.full_name || 'Your Team'}`
        });
      });

      await Promise.all(notificationPromises);
      
      toast.success("Team notified successfully", {
        description: `${teamMembers.length} team member${teamMembers.length !== 1 ? 's' : ''} notified via email.`
      });
    } catch (error) {
      console.error("Error notifying team:", error);
      toast.warning("Failed to notify some team members", {
        description: "The document was saved but some email notifications failed."
      });
    }
  }, [shouldNotifyTeam, teamMembers, assignment, currentUser]);

  const handleConversationMessage = useCallback(async () => {
    if (!conversationInput.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: conversationInput,
      timestamp: new Date()
    };

    setConversationMessages(prev => [...prev, userMessage]);
    const currentInput = conversationInput;
    setConversationInput("");
    setIsChatLoading(true);
    setPendingUpdate(null);

    try {
      const command = detectCommand(currentInput, !!generatedContent);

      let specialPrompt = "";
      let commandType = null;

      if (command.confidence >= 0.75 && !!generatedContent) {
        if (command.type === 'summarize') {
          commandType = 'summarize';
          specialPrompt = `Please provide a concise summary of this document content:

${generatedContent}

Provide a brief executive summary highlighting the main points in 2-3 paragraphs.`;
        } else if (command.type === 'extract') {
          commandType = 'extract';
          specialPrompt = `Extract key entities and information from this document content:

${generatedContent}

Extract and list:
- Important dates and deadlines
- People and organizations mentioned
- Key requirements or specifications
- Action items or deliverables
- Any other critical details

Format as a structured list with clear categories.`;
        } else if (command.type === 'translate') {
          commandType = 'translate';
          const targetLanguage = command.targetLanguage || "Spanish";

          specialPrompt = `Translate this document content to ${targetLanguage}:

${generatedContent}

Provide a professional, accurate translation maintaining the original formatting and structure.`;
        } else if (command.type === 'rewrite') {
          commandType = 'rewrite';
          specialPrompt = `Rewrite this content based on the user's request: "${currentInput}"

Current content:
${generatedContent}

Provide an improved version that addresses their specific request while maintaining the core message.`;
        } else if (command.type === 'expand') {
          commandType = 'expand';
          specialPrompt = `Expand and add more detail to this content:

${generatedContent}

Add more context, examples, and elaboration while maintaining the same structure and flow.`;
        } else if (command.type === 'shorten') {
          commandType = 'shorten';
          specialPrompt = `Make this content more concise:

${generatedContent}

Reduce the length while keeping all the essential information and key points.`;
        }
      }

      if (!commandType) {
        const contextInfo = {
          assignment: assignment?.name,
          document_title: documentTitle,
          document_type: selectedTemplate?.documentType || "other",
          current_content: generatedContent,
          generation_prompt: customPrompt,
          conversation_history: conversationMessages.slice(-5)
        };

        specialPrompt = `You are an AI document generation assistant helping create professional documents. 

Current Context:
${JSON.stringify(contextInfo, null, 2)}

User Request: "${currentInput}"

Respond helpfully to the user's request. If they're asking for:
- Content modifications: Provide specific suggestions or updated content
- Additional sections: Suggest what to add and where
- Clarifications: Explain your approach or reasoning
- Different formatting: Offer alternatives
- Quality improvements: Suggest enhancements

If they want you to modify the existing content, provide the updated version. If they're asking questions, provide helpful explanations. Always be collaborative and constructive.`;
      }

      const response = await base44.integrations.Core.anthropicResearch({ // Updated from anthropicResearch
        question: specialPrompt,
        assignment: assignment,
        documents: []
      });

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        special_command: commandType,
        command_confidence: command.confidence
      };

      setConversationMessages(prev => [...prev, aiMessage]);

      if (['rewrite', 'expand', 'shorten', 'translate'].includes(commandType) &&
          command.confidence >= 0.85 &&
          response.data.response.length > 200) {

        setPendingUpdate({
          id: Date.now().toString(),
          type: commandType,
          previousContent: generatedContent,
          newContent: response.data.response,
          timestamp: new Date(),
          userRequest: currentInput
        });

        toast.info("Review Suggested Changes", {
          description: "The AI has prepared an updated version. Review and apply if you're satisfied.",
          duration: 5000
        });
      }

    } catch (error) {
      console.error("Error in conversation:", error);
      toast.error("Failed to process your request", {
        description: "There was an error communicating with the AI. Please try again."
      });

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I apologize, but I encountered an error processing your request. Please try rephrasing your question or request.",
        timestamp: new Date()
      };
      setConversationMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  }, [conversationInput, assignment, documentTitle, selectedTemplate?.documentType, generatedContent, customPrompt, conversationMessages]);

  const handleApplyPendingUpdate = useCallback(() => {
    if (pendingUpdate) {
      setGeneratedContent(pendingUpdate.newContent);
      toast.success("Changes Applied!", {
        description: `Your document has been updated with the ${pendingUpdate.type} changes.`
      });

      const confirmMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: `✅ Changes applied! The document has been updated based on your "${pendingUpdate.userRequest}" request.`,
        timestamp: new Date()
      };
      setConversationMessages(prev => [...prev, confirmMessage]);

      setPendingUpdate(null);
      setShowDiffView(false);
    }
  }, [pendingUpdate]);

  const handleRejectPendingUpdate = useCallback(() => {
    if (pendingUpdate) {
      toast.info("Changes Discarded", {
        description: "The suggested changes were not applied to your document."
      });

      const rejectMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: "❌ No problem! The document remains unchanged. Feel free to ask for different modifications.",
        timestamp: new Date()
      };
      setConversationMessages(prev => [...prev, rejectMessage]);

      setPendingUpdate(null);
      setShowDiffView(false);
    }
  }, [pendingUpdate]);

  const calculateWordCount = (text) => {
    if (!text) return 0;
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  };

  const generateDocument = async () => {
    if (!selectedTemplate || !documentTitle.trim() || !customPrompt.trim()) {
      toast.error("Missing required fields", {
        description: "Please fill in all required fields before generating your document."
      });
      setError("Please fill in all required fields before generating your document.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setPendingUpdate(null);

    try {
      // Merged prompt from existing and outline for richer context
      const prompt = `Generate a ${selectedTemplate.title} document for this project:

Assignment: ${assignment?.name || 'Unnamed Project'}
Description: ${assignment?.description || 'No description provided'}
Status: ${assignment?.status}
Team Members: ${assignment.team_members?.length || 0} people

Document Request:
- Title: ${documentTitle}
- Type: ${selectedTemplate.documentType}
- Based on Template: ${selectedTemplate.title} - ${selectedTemplate.description}
- Specific Requirements/Custom Prompt: ${customPrompt || selectedTemplate.prompt || selectedTemplate.description}

Create a comprehensive, professional document that:
1. Sounds natural and engaging (not robotic)
2. Uses clear, business-appropriate language
3. Includes all the sections explicitly or implicitly requested
4. Is practical and actionable
5. Feels like it was written by a knowledgeable team member
6. Is formatted as HTML with proper heading tags (h1, h2, h3, etc.), paragraphs, and lists.

Make it comprehensive but not overwhelming. Think of it as something you'd be proud to share with stakeholders or clients. Don't include placeholder text - make it complete and ready to use.`;

      // Changed LLM invocation from anthropicResearch to base44.integrations.Core.InvokeLLM as per outline
      // Assuming base44 is globally available or handled by the framework.
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      // Assuming base44.integrations.Core.InvokeLLM returns the content string directly.
      setGeneratedContent(response);

      if (shouldGenerateTasks) {
        await generateTasksFromDocument(response, documentTitle);
      }

      setActiveTab("preview");

      toast.success("Document generated successfully!", {
        description: "Your document is ready for review and editing."
      });

      if (isConversationMode) {
        const completionMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `✅ Document generated successfully! I've created your ${selectedTemplate?.documentType || 'document'}. 
You can now ask me to refine it using conversational commands.`,
          timestamp: new Date()
        };
        setConversationMessages(prev => [...prev, completionMessage]);
      }

      if (onDocumentGenerated) {
        // Passing the generated content, consistent with original use before saving
        onDocumentGenerated(response);
      }

    } catch (err) {
      console.error("Error generating document:", err);
      toast.error("Failed to generate document", {
        description: "Something went wrong while creating your document. Please try again."
      });
      setError("Oops! Something went wrong while creating your document. Could you try again? If this keeps happening, try simplifying your request.");

      if (isConversationMode) {
        const errorMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: "I encountered an error while generating the document. Please try rephrasing your request or check your internet connection.",
          timestamp: new Date()
        };
        setConversationMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDocument = async () => {
    if (!generatedContent || !documentTitle.trim()) {
      toast.error("Cannot save document", {
        description: "Please generate content and provide a title before saving."
      });
      return;
    }
    if (!currentWorkspaceId) {
      toast.error("Cannot save document", {
        description: "Workspace ID is missing. Please select a workspace."
      });
      return;
    }

    setIsSaving(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${documentTitle}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
                h1, h2, h3 { color: #333; }
                p { margin-bottom: 16px; }
            </style>
        </head>
        <body>
            <h1>${documentTitle}</h1>
            ${generatedContent}
            <hr>
            <p><small>Generated for assignment: ${assignment.name} on ${new Date().toLocaleString()}</small></p>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const file = new File([blob], `${documentTitle.replace(/[^a-z0-9]/gi, '_')}.html`, { type: 'text/html' });

      const uploadResult = await base44.integrations.Core.UploadFile({ file }); // Updated from UploadFile

      const documentData = {
        workspace_id: currentWorkspaceId, // Added workspace_id as per outline
        title: documentTitle,
        description: `AI-generated document for ${assignment.name}`,
        file_url: uploadResult.file_url,
        file_name: `${documentTitle.replace(/[^a-z0-9]/gi, '_')}.html`,
        file_size: blob.size,
        file_type: 'text/html',
        assigned_to_assignments: [assignment.id],
        document_type: selectedTemplate?.documentType || "other",
        ai_analysis: {
          summary: "AI-generated document",
          analysis_status: "completed",
          generation_conversation_length: conversationMessages.length,
          was_conversationally_refined: isConversationMode && conversationMessages.length > 1
        }
      };

      const savedDocument = await Document.create(documentData);

      if (shouldGenerateTasks && suggestedTasks.length > 0) {
        const taskCreationPromises = suggestedTasks.map(async (taskSuggestion) => {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (taskSuggestion.due_date_offset_days || 7));

          let assignedTo = assignment.assignment_manager || currentUser?.email;
          if (taskSuggestion.suggested_assignee_type && teamMembers.length > 0) {
            // Assign to first team member for now, logic can be more sophisticated
            assignedTo = teamMembers[0]?.email || assignedTo;
          }

          return Task.create({
            workspace_id: currentWorkspaceId, // Added workspace_id for tasks
            title: taskSuggestion.title,
            description: `${taskSuggestion.description}\n\nGenerated from document: ${documentTitle}\nReasoning: ${taskSuggestion.reasoning}`,
            assignment_id: assignment.id,
            assigned_to: assignedTo,
            assigned_by: currentUser?.email,
            priority: taskSuggestion.priority || 'medium',
            status: 'todo',
            due_date: dueDate.toISOString().split('T')[0],
            estimated_effort: taskSuggestion.estimated_effort || 2,
            auto_generated: true,
            generation_source: {
              source_type: 'document_analysis',
              source_id: savedDocument.id,
              confidence: 0.85,
              reasoning: `Generated from document: ${documentTitle}`,
              was_conversational: isConversationMode
            },
            related_documents: [savedDocument.id]
          });
        });

        await Promise.all(taskCreationPromises);
      }

      if (shouldNotifyTeam) {
        await notifyTeam(documentTitle, uploadResult.file_url);
      }

      const successDescription = [];
      if (shouldGenerateTasks && suggestedTasks.length > 0) {
        successDescription.push(`${suggestedTasks.length} task${suggestedTasks.length !== 1 ? 's' : ''} created`);
      }
      if (shouldNotifyTeam && teamMembers.length > 0) {
        successDescription.push(`Team notified`);
      }

      toast.success("Document saved successfully!", {
        description: successDescription.length > 0 ? successDescription.join(' • ') : "Your document has been saved to the assignment."
      });

      if (isConversationMode) {
        const saveMessage = {
          id: Date.now().toString(),
          type: 'system',
          content: `🎉 Document saved successfully! ${shouldGenerateTasks && suggestedTasks.length > 0 ? `${suggestedTasks.length} related tasks were created automatically. ` : ''}${shouldNotifyTeam ? `Your team has been notified about the new document.` : ''}`,
          timestamp: new Date()
        };
        setConversationMessages(prev => [...prev, saveMessage]);
      }

      // Changed onDocumentGenerated call to pass the saved document object
      onDocumentGenerated && onDocumentGenerated(savedDocument);

      if (!isConversationMode) {
        setGeneratedContent("");
        setDocumentTitle("");
        setCustomPrompt("");
        setSelectedTemplate(null);
        setSuggestedTasks([]);
      } else {
        setPendingUpdate(null);
        setShowDiffView(false);
      }

    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document", {
        description: "There was an error saving your document. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generatedContent;
    navigator.clipboard.writeText(tempDiv.innerText);
    toast.success("Content copied!", {
      description: "Document content has been copied to your clipboard."
    });
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleWizardComplete = (wizardResult) => {
    setDocumentTitle(wizardResult.title);
    setCustomPrompt(wizardResult.prompt);
    setIsWizardOpen(false);

    toast.success("Prompt optimized!", {
      description: "Your prompt has been enhanced by the wizard. Ready to generate!"
    });

    const wizardMessage = {
      id: Date.now().toString(),
      type: 'system',
      content: `✨ I've crafted an optimized prompt based on your answers. Ready to generate your ${wizardResult.title || 'document'}!`,
      timestamp: new Date()
    };
    setConversationMessages(prev => [...prev, wizardMessage]);
  };

  const handleOpenInEditor = () => {
    if (!generatedContent) return;

    const query = new URLSearchParams({
      fromResearch: 'true',
      assignmentId: assignment?.id || '',
      assignmentName: assignment?.name || 'Generated Document',
      suggestedDocTitle: documentTitle, // Use current documentTitle state
      researchSummary: generatedContent?.substring(0, 500) || '', // Use generatedContent state
      fullContent: generatedContent // Pass full content to editor
    }).toString();

    // Navigate to the Document Studio page
    window.location.href = `${createPageUrl("DocumentStudio")}?${query}`;
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          AI Document Generator
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Zap className="w-3 h-3 mr-1" />
            Conversational AI
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tell me what document you need and I'll create it for you! Try commands like "summarize this", "extract entities", "translate to Spanish", "make it more concise", or "expand on this section".
        </p>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">
              <FileEdit className="w-4 h-4 mr-2" />
              Create Document
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedContent}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6 mt-6">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    Need help crafting the perfect prompt?
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                    Our Prompt Builder Wizard will guide you through creating an optimized prompt by asking targeted questions.
                  </p>
                  <Button
                    onClick={() => setIsWizardOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Launch Prompt Wizard
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  What should we call this document?
                </label>
                <Input
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="e.g., 'Assignment Brief for Client Onboarding'"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Choose a template to get started
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {documentTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <template.icon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white">{template.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Tell me exactly what you want in this document
                </label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Be specific! For example: 'Include an executive summary, list of requirements, timeline with milestones, budget breakdown, and risk assessment. Focus on the technical requirements for our software development assignment.'"
                  className="min-h-32"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  💡 The more details you give me, the better your document will be!
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">Oops!</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={generateDocument}
                disabled={isGenerating || !selectedTemplate || !documentTitle.trim() || !customPrompt.trim()}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 h-12"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating your document... (this might take a minute)
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Document
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Choose a Document Template
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Templates provide a great starting point for your document. Select one to pre-fill the title and prompt, then customize it further.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentTemplates.map((template) => (
                <Card
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplate?.id === template.id
                      ? 'border-green-500 ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <template.icon className="w-4 h-4 text-green-600" />
                      {template.title}
                    </CardTitle>
                    {selectedTemplate?.id === template.id && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{template.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6 mt-6">
            {generatedContent ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Generated Content</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      onClick={handleOpenInEditor}
                      variant="outline"
                      size="sm"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Open in Document Studio
                    </Button>
                    <Button
                      onClick={saveDocument}
                      disabled={isSaving}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save & Create Tasks
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <ReactQuill
                    value={generatedContent}
                    onChange={setGeneratedContent}
                    modules={modules}
                    theme="snow"
                    className="min-h-[400px]"
                  />
                </div>

                {isConversationMode && generatedContent && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-3">
                    <strong>💡 Pro Tip:</strong> You can edit the content directly above, or use the chat below to ask for specific modifications.
                    Try: "summarize this", "extract entities", "translate to [language]", "make it more concise", "expand on this", or ask me to improve sections.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Content Yet</h3>
                <p>Generate a document first from the "Create Document" or "Templates" tab to see its preview here.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {suggestedTasks.length > 0 && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Suggested Tasks ({suggestedTasks.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {suggestedTasks.map((task, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={`border ${getPriorityColor(task.priority)}`} variant="secondary">
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.estimated_effort}h
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Due: +{task.due_date_offset_days} days</span>
                    <span>{task.suggested_assignee_type}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              These tasks will be automatically created when you save the document.
            </p>
          </div>
        )}

        {isConversationMode && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-600" />
              Conversational AI Assistant
            </h3>

            <div className="mb-2 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-3">
              <Sparkles className="w-4 h-4" />
              <div className="flex flex-wrap gap-2">
                <span>Try:</span>
                <Badge variant="outline" className="bg-white dark:bg-gray-800 text-xs">summarize this</Badge>
                <Badge variant="outline" className="bg-white dark:bg-gray-800 text-xs">extract entities</Badge>
                <Badge variant="outline" className="bg-white dark:bg-gray-800 text-xs">translate to [language]</Badge>
                <Badge variant="outline" className="bg-white dark:bg-gray-800 text-xs">make it more concise</Badge>
                <Badge variant="outline" className="bg-white dark:bg-gray-800 text-xs">expand on this</Badge>
              </div>
            </div>

            <Card className="mb-4">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                    AI Conversation
                  </div>
                  {generatedContent && (
                    <Badge variant="outline" className="text-xs">
                      {calculateWordCount(generatedContent)} words
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pendingUpdate && (
                  <div className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                            Suggested Changes Ready
                            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 capitalize">
                              {pendingUpdate.type}
                            </Badge>
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Based on your request: "{pendingUpdate.userRequest}"
                          </p>
                        </div>

                        <div className="flex gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">Current:</span>
                            <Badge variant="secondary" className="font-mono">
                              {calculateWordCount(pendingUpdate.previousContent)} words
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                            <Badge variant="secondary" className="font-mono">
                              {calculateWordCount(pendingUpdate.newContent)} words
                            </Badge>
                            {calculateWordCount(pendingUpdate.newContent) !== calculateWordCount(pendingUpdate.previousContent) && (
                              <Badge variant={calculateWordCount(pendingUpdate.newContent) > calculateWordCount(pendingUpdate.previousContent) ? "default" : "outline"} className="text-xs">
                                {calculateWordCount(pendingUpdate.newContent) > calculateWordCount(pendingUpdate.previousContent) ? '+' : ''}
                                {calculateWordCount(pendingUpdate.newContent) - calculateWordCount(pendingUpdate.previousContent)} words
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            onClick={handleApplyPendingUpdate}
                            className="bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Apply Changes
                          </Button>
                          <Button
                            onClick={handleRejectPendingUpdate}
                            variant="outline"
                            size="sm"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Discard
                          </Button>
                          <Button
                            onClick={() => setShowDiffView(!showDiffView)}
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {showDiffView ? 'Hide' : 'Show'} Preview
                          </Button>
                        </div>

                        {showDiffView && (
                          <div className="mt-4 space-y-3">
                            <Tabs defaultValue="new" className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="current">Current Version</TabsTrigger>
                                <TabsTrigger value="new">Updated Version</TabsTrigger>
                              </TabsList>
                              <TabsContent value="current" className="mt-3">
                                <div className="bg-white dark:bg-gray-900 border rounded-lg p-4 max-h-96 overflow-y-auto">
                                  <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: pendingUpdate.previousContent }} />
                                </div>
                              </TabsContent>
                              <TabsContent value="new" className="mt-3">
                                <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                                  <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: pendingUpdate.newContent }} />
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-4 max-h-96 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                  {conversationMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.type !== 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                          {msg.type === 'system' ? (
                            <Sparkles className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-white" />
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.type === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                            : msg.type === 'system'
                            ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800'
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {msg.special_command && (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-200 dark:border-purple-700">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {msg.special_command}
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {Math.round(msg.command_confidence * 100)}% confidence
                            </span>
                          </div>
                        )}
                        <div
                          className={`prose prose-sm max-w-none ${
                            msg.type === 'user'
                              ? 'prose-invert'
                              : msg.type === 'system'
                              ? 'prose-blue dark:prose-invert'
                              : 'dark:prose-invert'
                          }`}
                          dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }}
                        />
                        <div className="text-xs mt-2 opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {msg.type === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={conversationEndRef} />
                </div>

                <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
                  <div className="flex gap-3">
                    <Input
                      value={conversationInput}
                      onChange={(e) => setConversationInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleConversationMessage();
                        }
                      }}
                      placeholder="Ask me to modify, expand, summarize, translate, or improve the document..."
                      className="flex-1"
                      disabled={isChatLoading}
                    />
                    <Button
                      onClick={handleConversationMessage}
                      disabled={!conversationInput.trim() || isChatLoading}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {isChatLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Try: "summarize this", "translate to Spanish", "make it more concise", "expand on the timeline section"
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <PromptBuilderWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onComplete={handleWizardComplete}
          assignment={assignment}
        />
      </CardContent>
    </Card>
  );
}
