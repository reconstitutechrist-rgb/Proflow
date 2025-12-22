import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

/**
 * Sanitize user input for safe inclusion in AI prompts
 * Prevents prompt injection by removing/escaping potentially dangerous patterns
 */
const sanitizePromptInput = (input, maxLength = 500) => {
  if (!input || typeof input !== 'string') return '';
  return input
    .slice(0, maxLength) // Limit length
    .replace(/[`${}]/g, '') // Remove template literal chars
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim();
};

export default function OutlineGenerator({
  title,
  description,
  selectedAssignment,
  selectedTask, // New prop
  assignments,
  tasks, // New prop
  onApplyOutline,
}) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedOutline, setGeneratedOutline] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const documentTypes = [
    {
      label: 'Project Proposal',
      prompt: 'Create a comprehensive project proposal outline',
      icon: '📋',
    },
    {
      label: 'Technical Specification',
      prompt: 'Create a detailed technical specification document outline',
      icon: '⚙️',
    },
    {
      label: 'Meeting Minutes',
      prompt: 'Create a meeting minutes template outline',
      icon: '📝',
    },
    {
      label: 'Status Report',
      prompt: 'Create a project status report outline',
      icon: '📊',
    },
    {
      label: 'User Guide',
      prompt: 'Create a user guide/documentation outline',
      icon: '📖',
    },
    {
      label: 'Research Report',
      prompt: 'Create a research report outline',
      icon: '🔬',
    },
    {
      label: 'Business Plan',
      prompt: 'Create a business plan outline',
      icon: '💼',
    },
    {
      label: 'Custom',
      prompt: '',
      icon: '✨',
    },
  ];

  const generateOutline = async (typePrompt = '') => {
    if (!title && !customPrompt && !typePrompt) {
      toast.error('Please enter a document title or custom prompt');
      return;
    }

    try {
      setIsGenerating(true);

      const assignmentContext = selectedAssignment
        ? assignments.find((a) => a.id === selectedAssignment)
        : null;

      const taskContext = selectedTask ? tasks.find((t) => t.id === selectedTask) : null;

      // SECURITY: Sanitize all user inputs to prevent prompt injection
      const safeTitle = sanitizePromptInput(title, 200) || 'Untitled';
      const safeDescription = sanitizePromptInput(description, 500);
      const safeCustomPrompt = sanitizePromptInput(customPrompt, 1000);
      const safeAssignmentName = assignmentContext
        ? sanitizePromptInput(assignmentContext.name, 200)
        : '';
      const safeAssignmentDesc = assignmentContext
        ? sanitizePromptInput(assignmentContext.description, 500)
        : '';
      const safeTaskTitle = taskContext ? sanitizePromptInput(taskContext.title, 200) : '';
      const safeTaskDesc = taskContext ? sanitizePromptInput(taskContext.description, 500) : '';

      const prompt = `Generate a detailed document outline in HTML format.

Document Title: ${safeTitle}
${safeDescription ? `Description: ${safeDescription}` : ''}
${assignmentContext ? `Assignment Context: ${safeAssignmentName} - ${safeAssignmentDesc}` : ''}
${taskContext ? `Specific Task Context: ${safeTaskTitle} - ${safeTaskDesc} (Status: ${taskContext.status}, Priority: ${taskContext.priority})` : ''}
${typePrompt ? `Document Type: ${typePrompt}` : ''}
${safeCustomPrompt ? `Additional Requirements: ${safeCustomPrompt}` : ''}

Create a well-structured outline with:
1. Clear section headings (use <h2>, <h3> tags)
2. Brief descriptions under each heading
3. Subsections where appropriate
4. Placeholder text to guide writing
${taskContext ? `5. Content specifically relevant to the task: ${safeTaskTitle}` : ''}

Format the output as clean HTML with proper heading hierarchy.
Make it comprehensive but concise.
DO NOT include any script tags, event handlers, or javascript code.
Use <p> tags for descriptions and <ul><li> for bullet points where appropriate.`;

      const response = await InvokeLLM({
        // Using InvokeLLM from integrations
        prompt,
        add_context_from_internet: false,
      });

      const sanitizedOutline = DOMPurify.sanitize(response || '');
      setGeneratedOutline(sanitizedOutline);
      toast.success('Outline generated successfully');
    } catch (error) {
      console.error('Error generating outline:', error);
      toast.error('Failed to generate outline. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedOutline) {
      onApplyOutline(generatedOutline);
    }
  };

  const handleTemplateSelect = (type) => {
    setSelectedTemplate(type.label);
    if (type.prompt) {
      generateOutline(type.prompt);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Templates */}
      <div>
        <label className="text-sm font-medium mb-2 block">Quick Templates</label>
        <div className="grid grid-cols-2 gap-2">
          {documentTypes.map((type) => (
            <Button
              key={type.label}
              variant={selectedTemplate === type.label ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTemplateSelect(type)}
              disabled={isGenerating}
              className="justify-start h-auto py-3"
            >
              <span className="mr-2 text-lg">{type.icon}</span>
              <span className="text-xs">{type.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Prompt */}
      <div>
        <label className="text-sm font-medium mb-2 block">Custom Instructions (Optional)</label>
        <Textarea
          placeholder="E.g., 'Include a competitive analysis section' or 'Focus on technical implementation details'"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={3}
          disabled={isGenerating}
        />
      </div>

      {/* Generate Button */}
      <div className="flex gap-2">
        <Button
          onClick={() => generateOutline()}
          disabled={isGenerating || (!title && !customPrompt)}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Outline
            </>
          )}
        </Button>

        {generatedOutline && !isGenerating && (
          <Button
            variant="outline"
            onClick={() => generateOutline()}
            disabled={isGenerating}
            title="Regenerate outline"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Error State */}
      {!title && !customPrompt && !isGenerating && (
        <div className="flex items-start gap-2 p-3 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-orange-900 dark:text-orange-100">
            <p className="font-medium">Tip: Add a document title first</p>
            <p className="mt-1">Or provide custom instructions above to generate an outline.</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {generatedOutline && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="gap-1">
                <Check className="w-3 h-3" />
                Outline Ready
              </Badge>
              <Button size="sm" onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-700">
                Apply to Document
              </Button>
            </div>

            <div
              className="prose dark:prose-invert max-w-none text-sm border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-[400px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: generatedOutline }}
            />

            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              <p>
                💡 This outline will replace your current document content. Make sure to save any
                important work first!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!generatedOutline && !isGenerating && (title || customPrompt) && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed rounded-lg">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">Ready to generate outline</p>
          <p className="text-xs mt-1">Click a template above or the generate button</p>
        </div>
      )}
    </div>
  );
}
