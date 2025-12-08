import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Brain,
  Loader2,
  Copy,
  Download,
  CheckCircle,
  FileText,
  Save,
  HelpCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  FolderOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { db } from '@/api/db';

export default function AISummaryButton({
  contentType = 'document', // Changed from 'type' to 'contentType'
  contentId = null, // Changed from 'assignment_id' to 'contentId'
  content,
  title = 'Summary',
  className = '',
  variant = 'default',
  size = 'default',
  disabled = false,
  disabledMessage = null,
  onSummaryGenerated = null, // CRITICAL: New prop
  assignmentId = null, // For linking saved documents to assignments
  projectId = null, // For linking saved documents to projects
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  const { currentWorkspaceId } = useWorkspace(); // CRITICAL: Use workspace context

  const MAX_CONTENT_LENGTH = 50000; // ~12,500 words, safe for most LLMs

  // CRITICAL: New useEffect for checking existing summary
  useEffect(() => {
    if (contentId && currentWorkspaceId && isOpen && !summary) {
      checkExistingSummary();
    }
  }, [contentId, currentWorkspaceId, isOpen]); // Added isOpen to trigger when dialog opens and summary isn't already loaded

  // CRITICAL: Updated generateHash function
  const generateHash = (text) => {
    let hash = 0;
    const str = text?.substring(0, 5000) || ''; // First 5000 chars for hash
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36); // Using base 36 for shorter hash
  };

  // Truncate content for LLM input
  const truncateContent = (text) => {
    if (text.length <= MAX_CONTENT_LENGTH) {
      return text;
    }
    // Try to truncate at a sentence boundary
    const truncated = text.substring(0, MAX_CONTENT_LENGTH);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = Math.max(lastPeriod, lastNewline);

    // Ensure the cut point is not too far back, aiming to cut near MAX_CONTENT_LENGTH
    if (cutPoint > MAX_CONTENT_LENGTH * 0.9) {
      // If a natural break is within the last 10%
      return truncated.substring(0, cutPoint + 1);
    }
    return truncated; // Fallback to hard truncation
  };

  // CRITICAL: Updated checkExistingSummary function
  const checkExistingSummary = async () => {
    if (!contentId || !currentWorkspaceId) return;

    try {
      const contentHash = generateHash(content);
      // db already imported at top level

      const existingSummaries = await db.entities.AISummary.filter(
        {
          workspace_id: currentWorkspaceId,
          content_type: contentType,
          content_id: contentId,
          content_hash: contentHash,
        },
        '-created_date',
        1
      ); // Filter by most recent

      if (existingSummaries.length > 0) {
        const existingSummary = existingSummaries[0];

        // Check if summary is still valid (not expired)
        if (existingSummary.expires_at) {
          const expiryDate = new Date(existingSummary.expires_at);
          if (expiryDate > new Date()) {
            setSummary(existingSummary);
            toast.success('Loaded cached summary');
            return;
          }
        } else {
          // If no expiry, consider it valid
          setSummary(existingSummary);
          toast.success('Loaded cached summary');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking existing summary:', error);
      // Don't toast an error here, it's a background check
    }
  };

  const handleGenerateSummary = async () => {
    if (!content || !currentWorkspaceId) {
      toast.error('No content to summarize or workspace not selected');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Check cache first (only if dialog is open and no summary is currently loaded, and not explicitly asked to regenerate)
      if (!summary) {
        const cached = await checkExistingSummary();
        if (cached) {
          setSummary(cached);
          setIsGenerating(false);
          return;
        }
      }

      const contentHash = generateHash(content);

      // CRITICAL: Strip HTML tags if present
      const strippedContent = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const processedContent = truncateContent(strippedContent);

      if (strippedContent.length > MAX_CONTENT_LENGTH) {
        toast.warning(
          'Content was truncated due to length. Summary will be based on the first ~12,500 words.'
        );
      }

      // CRITICAL: Updated prompt
      const prompt = `Analyze and summarize the following ${contentType}:

${processedContent}

Provide a comprehensive summary with:
1. An executive summary (2-3 sentences)
2. Key points (3-5 bullet points)
3. Action items (if any, with task, assignee, priority)
4. Key decisions made (if any)
5. Important dates or deadlines (if mentioned, in YYYY-MM-DD format)

Format as JSON with the following keys: executive_summary, key_points, action_items (array of objects), decisions (array of strings), dates (array of strings).`;

      // CRITICAL: Use db.integrations.Core.InvokeLLM
      // db already imported at top level
      const response = await db.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            key_points: { type: 'array', items: { type: 'string' } },
            action_items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task: { type: 'string' },
                  assignee: { type: 'string' },
                  priority: { type: 'string' },
                },
                required: ['task'], // Task is required for an action item
              },
            },
            decisions: { type: 'array', items: { type: 'string' } },
            dates: { type: 'array', items: { type: 'string' } },
          },
          required: ['executive_summary', 'key_points'],
        },
      });

      // CRITICAL: Fetch user for requested_by
      const user = await db.auth.me();

      // CRITICAL: Create summary with workspace_id and other new fields
      const summaryData = {
        workspace_id: currentWorkspaceId,
        content_type: contentType,
        content_id: contentId || null,
        content_hash: contentHash,
        title: `${title} - AI Summary (${new Date().toLocaleDateString()})`,
        executive_summary: response.executive_summary,
        key_points: response.key_points || [],
        action_items: response.action_items || [],
        decisions: response.decisions || [],
        dates: response.dates || [], // New field
        confidence_score: 85, // Default confidence score
        word_count: processedContent.split(/\s+/).length,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days cache
        requested_by: user ? user.email : 'system', // CRITICAL: User's email
      };

      const newSummary = await db.entities.AISummary.create(summaryData);

      setSummary(newSummary);

      // CRITICAL: Call onSummaryGenerated callback
      if (onSummaryGenerated) {
        onSummaryGenerated(newSummary);
      }

      toast.success('Summary generated successfully');
    } catch (error) {
      console.error('Error generating summary:', error);

      let errorMessage = 'Failed to generate summary';
      if (error.message?.includes('timeout')) {
        errorMessage =
          'Request timed out. The content might be too large or the server is busy. Try again.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'API rate limit reached. Please wait a moment and try again.';
      } else if (
        error.message?.includes('token limit') ||
        error.message?.includes('context length')
      ) {
        errorMessage = 'Content exceeds token limits. Try with shorter content.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    // Only generate if no summary is already loaded for the current content/workspace
    if (
      !summary ||
      summary.content_id !== contentId ||
      summary.workspace_id !== currentWorkspaceId ||
      summary.content_hash !== generateHash(content)
    ) {
      handleGenerateSummary();
    }
  };

  // CRITICAL: getPriorityColor logic adapted for simpler schema
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // CRITICAL: Updated formatActionItem
  const formatActionItem = (item) => {
    let itemString = `• ${item.task}`;
    if (item.assignee) itemString += ` (Assigned to: ${item.assignee})`;
    if (item.priority) itemString += ` - Priority: ${item.priority}`;
    return itemString;
  };

  const handleCopy = () => {
    if (!summary) return;

    let formattedSummary = `# ${title}\n`;

    formattedSummary += `\n## Executive Summary\n${summary.executive_summary}\n`;

    if (summary.key_points && summary.key_points.length > 0) {
      formattedSummary += `\n## Key Points\n${summary.key_points.map((point) => `• ${point}`).join('\n')}\n`;
    }

    if (summary.action_items && summary.action_items.length > 0) {
      formattedSummary += `\n## Action Items\n${summary.action_items.map((item) => formatActionItem(item)).join('\n')}\n`;
    }

    if (summary.decisions && summary.decisions.length > 0) {
      formattedSummary += `\n## Decisions Made\n${summary.decisions.map((decision) => `• ${decision}`).join('\n')}\n`;
    }

    // CRITICAL: New Dates section
    if (summary.dates && summary.dates.length > 0) {
      formattedSummary += `\n## Important Dates/Deadlines\n${summary.dates.map((date) => `• ${date}`).join('\n')}\n`;
    }

    formattedSummary += `\n---\nGenerated: ${new Date().toLocaleString()}\n`;
    if (summary.confidence_score) {
      formattedSummary += `Confidence Score: ${summary.confidence_score}%\n`;
    }

    navigator.clipboard.writeText(formattedSummary);
    setIsCopied(true);
    toast.success('Summary copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summary) return;

    let formattedSummary = `# ${title}\n`;

    formattedSummary += `\n## Executive Summary\n${summary.executive_summary}\n`;

    if (summary.key_points && summary.key_points.length > 0) {
      formattedSummary += `\n## Key Points\n${summary.key_points.map((point) => `• ${point}`).join('\n')}\n`;
    }

    if (summary.action_items && summary.action_items.length > 0) {
      formattedSummary += `\n## Action Items\n${summary.action_items.map((item) => formatActionItem(item)).join('\n')}\n`;
    }

    if (summary.decisions && summary.decisions.length > 0) {
      formattedSummary += `\n## Decisions Made\n${summary.decisions.map((decision) => `• ${decision}`).join('\n')}\n`;
    }

    // CRITICAL: New Dates section
    if (summary.dates && summary.dates.length > 0) {
      formattedSummary += `\n## Important Dates/Deadlines\n${summary.dates.map((date) => `• ${date}`).join('\n')}\n`;
    }

    formattedSummary += `\n---\nGenerated: ${new Date().toLocaleString()}\n`;
    if (summary.confidence_score) {
      formattedSummary += `Confidence Score: ${summary.confidence_score}%\n`;
    }

    const blob = new Blob([formattedSummary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Summary downloaded');
  };

  const handleSaveAsDocument = async () => {
    if (!summary) return;

    setIsSaving(true);
    try {
      let formattedContent = `# ${title}\n`;

      formattedContent += `\n## Executive Summary\n${summary.executive_summary}\n`;

      if (summary.key_points && summary.key_points.length > 0) {
        formattedContent += `\n## Key Points\n${summary.key_points.map((point) => `• ${point}`).join('\n')}\n`;
      }

      if (summary.action_items && summary.action_items.length > 0) {
        formattedContent += `\n## Action Items\n`;
        summary.action_items.forEach((item) => {
          formattedContent += `${formatActionItem(item)}\n`;
        });
      }

      if (summary.decisions && summary.decisions.length > 0) {
        formattedContent += `\n## Decisions Made\n${summary.decisions.map((decision) => `• ${decision}`).join('\n')}\n`;
      }

      // CRITICAL: New Dates section
      if (summary.dates && summary.dates.length > 0) {
        formattedContent += `\n## Important Dates/Deadlines\n${summary.dates.map((date) => `• ${date}`).join('\n')}\n`;
      }

      formattedContent += `\n---\nGenerated: ${new Date().toLocaleString()}\n`;
      if (summary.confidence_score) {
        formattedContent += `Confidence Score: ${summary.confidence_score}%\n`;
      }

      const blob = new Blob([formattedContent], { type: 'text/plain' });
      const file = new File(
        [blob],
        `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.txt`,
        { type: 'text/plain' }
      );

      // CRITICAL: Use db.integrations.Core.UploadFile
      // db already imported at top level
      const { file_url } = await db.integrations.Core.UploadFile({ file });

      // CRITICAL: Create document record with db.entities.Document
      const documentData = {
        workspace_id: currentWorkspaceId, // CRITICAL: Workspace scoping
        title: `${title} - AI Summary`,
        description: `AI-generated summary created on ${new Date().toLocaleDateString()}`,
        file_url: file_url,
        file_name: file.name,
        file_size: file.size,
        file_type: 'text/plain',
        document_type: 'report',
        tags: ['ai-summary', contentType],
        access_level: 'workspace', // Assuming workspace level access for AI-generated docs
        // Link to assignment(s) - uses array format
        assigned_to_assignments: assignmentId ? [assignmentId] : [],
        // Link to project - uses single ID
        assigned_to_project: projectId || null,
        // AI analysis metadata
        ai_analysis: {
          summary: summary.executive_summary,
          analysis_status: 'completed',
        },
        auto_generated: true,
        folder_path: '/chat-summaries',
      };

      await db.entities.Document.create(documentData);

      toast.success('Summary saved as document');
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving summary as document:', error);
      toast.error('Failed to save summary as document');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={className}
        disabled={disabled}
        title={disabledMessage || 'Generate AI Summary'}
      >
        <Brain className="w-4 h-4 mr-2" />
        AI Summary
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Brain className="w-6 h-6 text-purple-600" />
              {title}
              {summary && ( // Show badge if summary exists (implies it's a generated one)
                <Badge
                  variant="secondary"
                  className="ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              AI-powered summary and key insights for {contentType}
              {currentWorkspaceId && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  • Workspace: {currentWorkspaceId}
                </span>
              )}
              {contentId && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  • Content ID: {contentId}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* CRITICAL: Removed Context Preview Section as per outline */}
          {/* CRITICAL: Removed Focus Question Input as per outline */}

          {isGenerating ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Analyzing content...
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  This may take a moment.
                </p>
              </div>
            </div>
          ) : generationError ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Generation Failed
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{generationError}</p>
                <Button
                  onClick={() => handleGenerateSummary()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : summary ? (
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="summary" className="w-full">
                {/* CRITICAL: Updated TabsList based on new schema */}
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="actions">
                    Actions
                    {summary.action_items?.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {summary.action_items.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="decisions">
                    Decisions
                    {summary.decisions?.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {summary.decisions.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="dates">
                    Dates
                    {summary.dates?.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {summary.dates.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* CRITICAL: Updated Summary Tab Content */}
                <TabsContent value="summary" className="space-y-6 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Executive Summary
                    </h3>
                    <p className="text-gray-900 dark:text-white leading-relaxed">
                      {summary.executive_summary}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Key Points
                    </h3>
                    <ul className="space-y-2">
                      {summary.key_points?.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-900 dark:text-white">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {summary.confidence_score && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Confidence Score</span>
                        <Badge variant={summary.confidence_score >= 80 ? 'default' : 'secondary'}>
                          {summary.confidence_score}%
                        </Badge>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* CRITICAL: Updated Actions Tab Content */}
                <TabsContent value="actions" className="p-4">
                  {summary.action_items && summary.action_items.length > 0 ? (
                    <div className="space-y-3">
                      {summary.action_items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                          <p className="font-medium text-gray-900 dark:text-white mb-3">
                            {item.task}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {item.assignee && (
                              <Badge variant="outline" className="text-xs">
                                👤 {item.assignee}
                              </Badge>
                            )}
                            {item.priority && (
                              <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                                {item.priority} priority
                              </Badge>
                            )}
                            {/* CRITICAL: Removed due_date and linked_documents from display */}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No action items identified</div>
                  )}
                </TabsContent>

                {/* CRITICAL: Decisions Tab Content */}
                <TabsContent value="decisions" className="p-4">
                  {summary.decisions && summary.decisions.length > 0 ? (
                    <div className="space-y-3">
                      {summary.decisions.map((decision, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-900 dark:text-white">{decision}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No decisions recorded</div>
                  )}
                </TabsContent>

                {/* CRITICAL: New Dates Tab Content */}
                <TabsContent value="dates" className="p-4">
                  {summary.dates && summary.dates.length > 0 ? (
                    <div className="space-y-3">
                      {summary.dates.map((date, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
                        >
                          <div className="flex items-start gap-2">
                            <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-900 dark:text-white">{date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No important dates or deadlines identified
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}

          <DialogFooter className="border-t pt-4 flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopy} disabled={!summary || isGenerating}>
                {isCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={!summary || isGenerating}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="default"
                onClick={handleSaveAsDocument}
                disabled={!summary || isGenerating || isSaving}
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save as Document
                  </>
                )}
              </Button>
            </div>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
