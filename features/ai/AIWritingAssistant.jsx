import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Copy, Check, Lightbulb, PenTool, Zap, Info } from 'lucide-react';
import { db } from '@/api/db';
import { toast } from 'sonner';

export default function AIWritingAssistant({
  content,
  title,
  selectedAssignment,
  selectedTask,
  assignments,
  tasks,
  onInsertContent,
  quillRef,
}) {
  const [mode, setMode] = useState('draft');
  const [prompt, setPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const modes = [
    {
      value: 'brainstorm',
      label: 'Brainstorm Ideas',
      icon: Lightbulb,
      description: 'Generate ideas and bullet points',
      systemPrompt: 'Generate creative ideas and bullet points. Be concise and actionable.',
      placeholder: "E.g., 'Ideas for improving our marketing strategy'",
    },
    {
      value: 'draft',
      label: 'Write Content',
      icon: PenTool,
      description: 'Write flowing paragraphs',
      systemPrompt: 'Write clear, flowing paragraphs with proper structure and transitions.',
      placeholder: "E.g., 'Write an introduction about our new product launch'",
    },
    {
      value: 'refine',
      label: 'Improve Text',
      icon: Zap,
      description: 'Improve clarity and tone',
      systemPrompt:
        'Improve clarity, grammar, and tone. Make the text more professional and engaging.',
      placeholder: 'Select text in the editor to improve, or leave empty to improve the beginning',
    },
  ];

  const currentMode = modes.find((m) => m.value === mode);

  const getSelectedText = () => {
    if (quillRef?.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      if (range && range.length > 0) {
        return editor.getText(range.index, range.length);
      }
    }
    return null;
  };

  const generateContent = async () => {
    if (!prompt.trim() && mode !== 'refine') {
      toast.error('Please describe what you need');
      return;
    }

    if (mode === 'refine') {
      const selectedText = getSelectedText();
      if (!selectedText && !content) {
        toast.error('No content to improve. Write something first or select text in the editor.');
        return;
      }
    }

    try {
      setIsGenerating(true);

      const assignmentContext = selectedAssignment
        ? assignments.find((a) => a.id === selectedAssignment)
        : null;

      const taskContext = selectedTask ? tasks.find((t) => t.id === selectedTask) : null;

      let textToRefine = '';
      if (mode === 'refine') {
        const selectedText = getSelectedText();
        if (selectedText && selectedText.trim().length > 0) {
          textToRefine = selectedText;
          toast.info('Improving selected text...');
        } else if (content) {
          const strippedContent = content
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          textToRefine = strippedContent.substring(0, 2000);
          toast.info('Improving beginning of document...');
        }
      }

      const fullPrompt = `${currentMode.systemPrompt}

Document Context:
- Title: ${title || 'Untitled'}
- Current Content Length: ${content?.length || 0} characters
${assignmentContext ? `- Assignment: ${assignmentContext.name}` : ''}
${taskContext ? `- Specific Task: ${taskContext.title} (Status: ${taskContext.status}, Priority: ${taskContext.priority})${taskContext.description ? ` - ${taskContext.description}` : ''}` : ''}

${
  mode === 'refine' && textToRefine
    ? `Current Text to Improve:\n${textToRefine}\n\n${prompt ? `Additional Instructions: ${prompt}` : ''}`
    : `User Request: ${prompt}`
}

Generate helpful content based on the mode and context.
${taskContext ? `Focus content specifically on the task: ${taskContext.title}` : ''}
${mode === 'brainstorm' ? 'Use bullet points and clear formatting.' : ''}
${mode === 'draft' ? 'Write in complete, well-structured paragraphs.' : ''}
${mode === 'refine' ? 'Provide the improved version of the text.' : ''}`;

      const response = await db.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false,
      });

      setGeneratedText(response);
      toast.success('Content generated successfully');
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const handleInsert = () => {
    onInsertContent(generatedText);
    toast.success('Content inserted into document');
    setGeneratedText('');
    setPrompt('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateContent();
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection - Cleaner Design */}
      <div>
        <label className="text-sm font-medium mb-3 block text-gray-700 dark:text-gray-300">
          What do you need help with?
        </label>
        <div className="space-y-2">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                mode === m.value
                  ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <m.icon
                  className={`w-5 h-5 ${mode === m.value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
                />
                <div className="flex-1">
                  <div
                    className={`font-medium text-sm ${mode === m.value ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {m.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {m.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode-specific info */}
      {mode === 'refine' && (
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
            <strong>Tip:</strong> Select text in the editor to improve that specific section, or
            leave nothing selected to improve the beginning of your document.
          </AlertDescription>
        </Alert>
      )}

      {/* Prompt Input - Cleaner */}
      <div>
        <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
          {mode === 'refine' ? 'How should it be improved? (optional)' : 'Describe what you need'}
        </label>
        <Textarea
          placeholder={currentMode.placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={3}
          disabled={isGenerating}
          className="border-gray-200 dark:border-gray-800 focus:border-gray-400 dark:focus:border-gray-600"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Press Ctrl+Enter (Cmd+Enter on Mac) to generate
        </p>
      </div>

      {/* Generate Button - Minimal */}
      <Button
        onClick={generateContent}
        disabled={isGenerating || (!prompt.trim() && mode !== 'refine')}
        className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white transition-all duration-200"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate
          </>
        )}
      </Button>

      {/* Generated Content - Clean Card */}
      {generatedText && (
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                variant="secondary"
                className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              >
                <Check className="w-3 h-3" />
                Generated
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="text-gray-600 dark:text-gray-400"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={handleInsert}
                  className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white"
                >
                  Insert
                </Button>
              </div>
            </div>

            <div className="text-sm whitespace-pre-wrap border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-[300px] overflow-y-auto">
              {generatedText}
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>{generatedText.split(' ').length} words</span>
              <span>{generatedText.length} characters</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State - Minimal */}
      {!generatedText && !isGenerating && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
          <currentMode.icon className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {currentMode.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{currentMode.description}</p>
        </div>
      )}
    </div>
  );
}
