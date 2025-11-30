import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Bot,
  User,
  Loader2,
  FileSearch,
  Lightbulb,
  Shield,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Zap,
  FileText,
  Users as UsersIcon,
  Brain,
  ListCheck,
  Coffee,
  Sparkles,
  Globe,
  Target,
  FolderOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { db } from '@/api/db';

export default function AIResearchAssistant({
  assignment,
  project,
  documents,
  currentUser,
  onResearchComplete,
  allAssignments,
  allProjects,
  pendingQuestion,
  onPendingQuestionUsed
}) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignment?.id || null);
  const [selectedProjectId, setSelectedProjectId] = useState(project?.id || null);
  const [contextType, setContextType] = useState(
    project?.id ? "project" : assignment?.id ? "assignment" : "none"
  );
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);

  const { currentWorkspaceId } = useWorkspace();

  // Handle pending question from suggestions
  useEffect(() => {
    if (pendingQuestion) {
      setInput(pendingQuestion);
      onPendingQuestionUsed?.();
    }
  }, [pendingQuestion, onPendingQuestionUsed]);

  useEffect(() => {
    // Update selected context when props change
    if (project?.id) {
      setSelectedProjectId(project.id);
      setSelectedAssignmentId(null);
      setContextType("project");
    } else if (assignment?.id) {
      setSelectedAssignmentId(assignment.id);
      setSelectedProjectId(null);
      setContextType("assignment");
    } else {
      setSelectedAssignmentId(null);
      setSelectedProjectId(null);
      setContextType("none");
    }
  }, [assignment, project, documents, currentUser]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Find the selected assignment or project from allAssignments/allProjects
      const linkedAssignment = selectedAssignmentId
        ? allAssignments?.find(a => a.id === selectedAssignmentId)
        : null;
      const linkedProject = selectedProjectId
        ? allProjects?.find(p => p.id === selectedProjectId)
        : null;

      // Call our custom Anthropic backend function with web search parameter
      const { data: response } = await db.functions.invoke('anthropicResearch', {
        question: input,
        assignment: linkedAssignment || null,
        project: linkedProject || null,
        documents: linkedAssignment ? documents : [],
        useWebSearch: webSearchEnabled
      });

      if (!response.success) {
        throw new Error(response.error || 'Research failed');
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        research_data: {
          research_type: response.data.research_type,
          confidence_score: response.data.confidence_score,
          recommended_actions: response.data.recommended_actions || [],
          suggested_documents: response.data.suggested_documents || [],
          web_sources_used: response.data.web_sources_used || false
        },
        model_info: {
          provider: "Anthropic Claude",
          model: response.model_used || "claude-sonnet-4-20250514"
        }
      };

      setMessages(prev => [...prev, aiMessage]);

      // Save research to database
      if (currentUser && currentWorkspaceId) {
        try {
          const researchData = {
            workspace_id: currentWorkspaceId,
            user_email: currentUser.email,
            question: input,
            response: response.data.response,
            research_type: response.data.research_type || 'general',
            confidence_score: response.data.confidence_score || 85,
            recommended_actions: response.data.recommended_actions || [],
            suggested_documents: response.data.suggested_documents || []
          };

          // Add assignment_id or project_id if one is selected
          if (selectedAssignmentId) {
            researchData.assignment_id = selectedAssignmentId;
          }
          if (selectedProjectId) {
            researchData.project_id = selectedProjectId;
          }

          await db.entities.AIResearchChat.create(researchData);
          
          if (onResearchComplete) {
            onResearchComplete();
          }
        } catch (error) {
          console.error("Error saving research:", error);
        }
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Sorry about that! I ran into a technical hiccup. Could you try asking your question again?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDocumentFromResearch = (message) => {
    // Build context to pass to DocumentCreator
    const researchContext = {
      fromResearch: "true",
      assignmentId: selectedAssignmentId || "",
      assignmentName: selectedAssignmentId 
        ? (allAssignments?.find(a => a.id === selectedAssignmentId)?.name || assignment?.name || "")
        : "",
      researchQuestion: message.content || "",
      researchType: message.research_data?.research_type || "general",
      suggestedDocTitle: message.research_data?.suggested_documents?.[0]?.title || 
                         message.research_data?.suggested_documents?.[0]?.document_type || 
                         "Research Document",
      recommendedActions: JSON.stringify(message.research_data?.recommended_actions || []),
      researchSummary: message.content.substring(0, 500) // First 500 chars as summary
    };

    // Build URL with parameters
    const params = new URLSearchParams(researchContext);
    navigate(createPageUrl("DocumentCreator") + "?" + params.toString());
  };

  const getResearchTypeIcon = (type) => {
    switch (type) {
      case 'compliance': return <Shield className="w-4 h-4" />;
      case 'licenses': return <FileSearch className="w-4 h-4" />;
      case 'permits': return <FileSearch className="w-4 h-4" />;
      case 'legal': return <BookOpen className="w-4 h-4" />;
      case 'industry_standards': return <CheckCircle className="w-4 h-4" />;
      case 'requirements': return <ListCheck className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  // Friendly starter suggestions based on context
  const starterQuestions = selectedProjectId
    ? [
        "What are the key objectives for this project?",
        "What milestones should we track?",
        "What resources do we need for this project?",
        "What are the potential risks to consider?",
        "How should we measure project success?"
      ]
    : selectedAssignmentId
    ? [
        "What permits or licenses might I need for this assignment?",
        "Are there any compliance requirements I should know about?",
        "What industry standards should I follow?",
        "What documents am I missing?",
        "How can I make sure I'm doing this right?"
      ]
    : [
        "What are the latest trends in [your industry]?",
        "What legal requirements should I consider for [your project type]?",
        "How do I get started with [your topic]?",
        "What best practices should I follow for [your goal]?",
        "What documentation do I need for [your business type]?"
      ];

  // Get display name for current context
  const displayContextName = selectedProjectId
    ? (allProjects?.find(p => p.id === selectedProjectId)?.name || project?.name || "Selected Project")
    : selectedAssignmentId
    ? (allAssignments?.find(a => a.id === selectedAssignmentId)?.name || assignment?.name || "Selected Assignment")
    : null;

  return (
    <Card className="border-0 shadow-md h-[700px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          Research Assistant
          {selectedProjectId ? (
            <Badge variant="outline" className="ml-auto bg-indigo-50 text-indigo-700 border-indigo-200">
              <Target className="w-3 h-3 mr-1" />
              Project Context
            </Badge>
          ) : selectedAssignmentId ? (
            <Badge variant="outline" className="ml-auto bg-purple-50 text-purple-700 border-purple-200">
              <FolderOpen className="w-3 h-3 mr-1" />
              Assignment Context
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-700 border-blue-200">
              <Globe className="w-3 h-3 mr-1" />
              General Research
            </Badge>
          )}
          <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-0">
            <Brain className="w-3 h-3 mr-1" />
            Claude Sonnet 4
          </Badge>
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {selectedProjectId
              ? `Researching for project: ${displayContextName}. Powered by your Anthropic API.`
              : selectedAssignmentId
              ? `Researching for: ${displayContextName}. I've got ${documents.length} documents to work with. Powered by your Anthropic API.`
              : "Ask me anything! Powered by Anthropic's Claude Sonnet 4 via your API key."
            }
          </p>
          {/* Web Search Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webSearchEnabled}
                onChange={(e) => setWebSearchEnabled(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Live Web Search
              </span>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                  <Coffee className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Hey there! 👋 What can I help you research?
                </h3>
                <p className="text-gray-500 mb-6">
                  {selectedProjectId
                    ? "I'm here to help you with project planning, strategy, milestones, risks, and anything else you need for your project."
                    : selectedAssignmentId
                    ? "I'm here to help you figure out compliance requirements, industry standards, legal considerations, and anything else you need to know about your assignment."
                    : "I can help you research any topic - industry trends, compliance requirements, best practices, and more. Ask away!"
                  }
                </p>
                <div className="space-y-2 text-left">
                  <p className="text-sm font-medium text-gray-700 mb-3">Try asking me:</p>
                  {starterQuestions.slice(0, 3).map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start h-auto p-3 text-sm text-gray-600 hover:text-gray-900"
                      onClick={() => setInput(question)}
                    >
                      <Lightbulb className="w-4 h-4 mr-2 flex-shrink-0" />
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="flex-shrink-0">
                    {message.type === 'user' ? (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </div>
                    )}
                  </div>
                  <div className={`rounded-lg p-4 break-words overflow-wrap-anywhere ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-50 text-gray-900'
                  }`}>
                    <div className="prose prose-sm max-w-none break-words">
                      <p className="whitespace-pre-wrap mb-0 break-words overflow-wrap-anywhere">{message.content}</p>
                    </div>
                    
                    {message.type === 'assistant' && message.model_info && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            <Brain className="w-3 h-3 mr-1" />
                            {message.model_info.provider} • {message.model_info.model}
                          </Badge>
                          {/* Show web search indicator */}
                          {message.research_data?.web_sources_used && (
                            <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                              <Globe className="w-3 h-3 mr-1" />
                              Web Search Used
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {message.type === 'assistant' && message.research_data && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {message.research_data.research_type && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getResearchTypeIcon(message.research_data.research_type)}
                              {message.research_data.research_type.replace('_', ' ')}
                            </Badge>
                          )}
                          {message.research_data.confidence_score && (
                            <Badge variant="secondary">
                              {message.research_data.confidence_score}% confident
                            </Badge>
                          )}
                        </div>
                        
                        {message.research_data.recommended_actions && message.research_data.recommended_actions.length > 0 && (
                          <div className="mb-3">
                            <p className="font-semibold text-gray-900 mb-2">Here's what I'd suggest doing:</p>
                            <div className="space-y-2">
                              {message.research_data.recommended_actions.map((action, index) => (
                                <div key={index} className="bg-white p-3 rounded border border-gray-200">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-900">{action.action}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {action.priority} priority
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">{action.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {message.research_data.suggested_documents && message.research_data.suggested_documents.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-900 mb-2">Documents you might want to create:</p>
                            <div className="space-y-2">
                              {message.research_data.suggested_documents.map((doc, index) => (
                                <div key={index} className="bg-white p-3 rounded border border-gray-200">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-900">{doc.title || doc.document_type}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {doc.urgency} urgency
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">{doc.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(message.research_data.suggested_documents?.length > 0 || message.research_data.recommended_actions?.length > 0) && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <Button
                              onClick={() => handleGenerateDocumentFromResearch(message)}
                              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Document with AI Studio
                            </Button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                              Create a document based on this research
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="text-gray-600">Claude is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <Select
              value={
                contextType === "project" && selectedProjectId
                  ? `project:${selectedProjectId}`
                  : contextType === "assignment" && selectedAssignmentId
                    ? `assignment:${selectedAssignmentId}`
                    : "none"
              }
              onValueChange={(value) => {
                if (value === "none") {
                  setSelectedAssignmentId(null);
                  setSelectedProjectId(null);
                  setContextType("none");
                } else if (value.startsWith("project:")) {
                  setSelectedProjectId(value.replace("project:", ""));
                  setSelectedAssignmentId(null);
                  setContextType("project");
                } else if (value.startsWith("assignment:")) {
                  setSelectedAssignmentId(value.replace("assignment:", ""));
                  setSelectedProjectId(null);
                  setContextType("assignment");
                }
              }}
            >
              <SelectTrigger className="w-72">
                <SelectValue>
                  {contextType === "project" && selectedProjectId ? (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600" />
                      <span>{allProjects?.find(p => p.id === selectedProjectId)?.name || "Project"}</span>
                    </div>
                  ) : contextType === "assignment" && selectedAssignmentId ? (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-purple-600" />
                      <span>{allAssignments?.find(a => a.id === selectedAssignmentId)?.name || "Assignment"}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span>General Research (No Context)</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    General Research (No Context)
                  </div>
                </SelectItem>
                {allProjects && allProjects.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Link to Project:</div>
                    {allProjects.map((proj) => (
                      <SelectItem key={`project:${proj.id}`} value={`project:${proj.id}`}>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-indigo-600" />
                          {proj.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {allAssignments && allAssignments.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Link to Assignment:</div>
                    {allAssignments.map((assign) => (
                      <SelectItem key={`assignment:${assign.id}`} value={`assignment:${assign.id}`}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-purple-600" />
                          {assign.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                contextType === "project"
                  ? "Ask about project goals, strategy, requirements..."
                  : contextType === "assignment"
                    ? "Ask about compliance, requirements, best practices..."
                    : "Ask me anything - industry trends, requirements, best practices..."
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {contextType === "project"
              ? `Asking with project context - ${webSearchEnabled ? 'Live web search enabled' : 'Using AI knowledge only'}`
              : contextType === "assignment"
                ? `Asking with assignment context - ${webSearchEnabled ? 'Live web search enabled' : 'Using AI knowledge only'}`
                : `General research mode - ${webSearchEnabled ? 'Live web search enabled' : 'Using AI knowledge only'}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}