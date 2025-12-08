import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileText,
  Sparkles,
  RefreshCw,
  Edit3,
  Eye,
} from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { toast } from 'sonner';
import { parseAIChanges, getChangeTypeBadgeColor } from '@/utils/diffUtils';

// Estimate token count (rough approximation)
const estimateTokens = (text) => {
  if (!text) return 0;
  const plainText = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Math.ceil(plainText.length / 4);
};

// Estimate cost in USD
const estimateCost = (tokens) => {
  return (tokens / 1000) * 0.002;
};

// Strip HTML to get plain text for AI analysis
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * EnhancedAIReviewPanel - AI Review that produces actionable changes
 * Returns structured JSON with specific text replacements
 */
export default function EnhancedAIReviewPanel({
  content,
  title,
  description,
  selectedAssignment,
  selectedTask,
  assignments = [],
  tasks = [],
  referenceDocumentUrls = [],
  onChangesGenerated, // Callback when changes are ready for review
}) {
  const [review, setReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewType, setReviewType] = useState('comprehensive');

  const reviewTypes = [
    {
      value: 'comprehensive',
      label: 'Comprehensive Edit',
      description: 'Full review with grammar, style, clarity, and structure fixes',
      icon: Sparkles,
    },
    {
      value: 'grammar',
      label: 'Grammar & Spelling',
      description: 'Focus on language errors and typos',
      icon: CheckCircle,
    },
    {
      value: 'style',
      label: 'Style & Tone',
      description: 'Improve writing style and consistency',
      icon: Edit3,
    },
    {
      value: 'clarity',
      label: 'Clarity & Conciseness',
      description: 'Make text clearer and more direct',
      icon: Eye,
    },
  ];

  const currentReviewType = reviewTypes.find((t) => t.value === reviewType);

  const buildPrompt = (strippedContent, reviewType) => {
    const assignmentContext = selectedAssignment
      ? assignments.find((a) => a.id === selectedAssignment)
      : null;

    const taskContext = selectedTask ? tasks.find((t) => t.id === selectedTask) : null;

    let focusInstructions = '';

    if (reviewType === 'comprehensive') {
      focusInstructions = `Focus on ALL of the following:
- Grammar and spelling errors
- Style and tone consistency
- Clarity and conciseness
- Sentence structure
- Word choice improvements
- Formatting suggestions`;
    } else if (reviewType === 'grammar') {
      focusInstructions = `Focus ONLY on:
- Spelling mistakes
- Grammar errors
- Punctuation issues
- Subject-verb agreement`;
    } else if (reviewType === 'style') {
      focusInstructions = `Focus ONLY on:
- Tone consistency
- Writing style
- Formality level
- Word choice for better flow`;
    } else if (reviewType === 'clarity') {
      focusInstructions = `Focus ONLY on:
- Removing unnecessary words
- Simplifying complex sentences
- Making meaning clearer
- Improving readability`;
    }

    return `You are an expert editor. Review this document and provide SPECIFIC, ACTIONABLE changes.

${focusInstructions}

Document Context:
- Title: ${title || 'Untitled'}
${description ? `- Description: ${description}` : ''}
${assignmentContext ? `- Assignment: ${assignmentContext.name}` : ''}
${taskContext ? `- Task: ${taskContext.title}` : ''}

Document Content:
"""
${strippedContent.substring(0, 8000)}${strippedContent.length > 8000 ? '\n\n[Content truncated...]' : ''}
"""

You MUST respond with valid JSON in this EXACT format:
{
  "overallScore": <number 0-100>,
  "summary": "<brief 1-2 sentence assessment>",
  "changes": [
    {
      "type": "<grammar|spelling|style|clarity|structure>",
      "originalText": "<EXACT text to replace - must match document exactly>",
      "suggestedText": "<corrected text>",
      "reason": "<brief explanation>"
    }
  ]
}

CRITICAL RULES:
1. originalText MUST be an EXACT match from the document - copy it precisely
2. Keep originalText short (ideally under 100 characters) for accuracy
3. Each change should be atomic - one fix per change
4. Maximum 15 changes - prioritize the most impactful ones
5. If the document is well-written, return fewer or no changes
6. ONLY return valid JSON, no markdown code blocks or extra text`;
  };

  const handleReview = async () => {
    const strippedContent = stripHtml(content);

    if (!content || strippedContent.length < 50) {
      toast.error('Please add more content before requesting a review (minimum 50 characters)');
      return;
    }

    const contentLength = strippedContent.length;
    const estimatedTokenCount = estimateTokens(content);
    const estimatedCostUSD = estimateCost(estimatedTokenCount);

    // Warn for large documents
    if (contentLength > 10000) {
      const confirm = window.confirm(
        `This document is quite large (${contentLength} characters, ~${estimatedTokenCount} tokens).\n\n` +
          `Estimated cost: $${estimatedCostUSD.toFixed(4)}\n\n` +
          `Continue with AI review?`
      );
      if (!confirm) return;
    }

    try {
      setIsReviewing(true);

      const prompt = buildPrompt(strippedContent, reviewType);

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            overallScore: { type: 'number' },
            summary: { type: 'string' },
            changes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  originalText: { type: 'string' },
                  suggestedText: { type: 'string' },
                  reason: { type: 'string' },
                },
                required: ['type', 'originalText', 'suggestedText', 'reason'],
              },
            },
          },
          required: ['overallScore', 'summary', 'changes'],
        },
        file_urls: referenceDocumentUrls.length > 0 ? referenceDocumentUrls : undefined,
      });

      // Parse the response
      let parsedResponse;
      try {
        // Handle both string and object responses
        if (typeof response === 'string') {
          // Clean up response - remove markdown code blocks if present
          let cleanedResponse = response.trim();
          if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.slice(7);
          } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.slice(3);
          }
          if (cleanedResponse.endsWith('```')) {
            cleanedResponse = cleanedResponse.slice(0, -3);
          }
          parsedResponse = JSON.parse(cleanedResponse.trim());
        } else {
          parsedResponse = response;
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError, response);
        toast.error('AI response was not in the expected format. Please try again.');
        return;
      }

      // Process changes with unique IDs
      const processedChanges = parseAIChanges(parsedResponse.changes || []);

      // Validate changes against actual content
      const validatedChanges = processedChanges.filter((change) => {
        const found = strippedContent.includes(change.originalText);
        if (!found) {
          console.warn(
            `Change not found in document: "${change.originalText.substring(0, 50)}..."`
          );
        }
        return found;
      });

      if (processedChanges.length > 0 && validatedChanges.length === 0) {
        toast.warning('AI suggested changes but none matched the document text. Try again.');
      }

      const reviewResult = {
        overallScore: parsedResponse.overallScore || 0,
        summary: parsedResponse.summary || 'Review complete',
        changes: validatedChanges,
        type: reviewType,
        timestamp: new Date().toISOString(),
        documentLength: contentLength,
        tokensUsed: estimatedTokenCount,
        originalChangesCount: processedChanges.length,
        validatedChangesCount: validatedChanges.length,
      };

      setReview(reviewResult);

      if (validatedChanges.length > 0) {
        toast.success(`Found ${validatedChanges.length} suggested improvements`);
      } else {
        toast.success('Document looks great! No changes suggested.');
      }
    } catch (error) {
      console.error('Error generating review:', error);
      toast.error('Failed to generate review. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReviewChanges = () => {
    if (review?.changes && onChangesGenerated) {
      onChangesGenerated(review.changes);
    }
  };

  const contentLength = stripHtml(content).length;
  const estimatedTokenCount = estimateTokens(content);
  const estimatedCostUSD = estimateCost(estimatedTokenCount);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Document Stats */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Document Length</span>
            <Badge variant="outline">{contentLength} characters</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Est. Review Cost</span>
            <Badge variant="outline" className="font-mono">
              ${estimatedCostUSD.toFixed(4)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Review Type Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">Review Type</label>
        <div className="grid grid-cols-2 gap-2">
          {reviewTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setReviewType(type.value)}
                className={`text-left p-3 border rounded-lg transition-all ${
                  reviewType === type.value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {type.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Warning for large documents */}
      {contentLength > 5000 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Large document detected. Review may take longer.
          </AlertDescription>
        </Alert>
      )}

      {/* Review Button */}
      <Button
        onClick={handleReview}
        disabled={isReviewing || !content || contentLength < 50}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
      >
        {isReviewing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Document...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Get Actionable Suggestions
          </>
        )}
      </Button>

      {/* Review Results */}
      {review && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Header with Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${getScoreColor(review.overallScore)}`}>
                  {review.overallScore}
                </div>
                <div>
                  <div className="font-medium text-sm">Quality Score</div>
                  <div className="text-xs text-gray-500">out of 100</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReview} disabled={isReviewing}>
                <RefreshCw className={`w-3 h-3 mr-1 ${isReviewing ? 'animate-spin' : ''}`} />
                Re-analyze
              </Button>
            </div>

            {/* Summary */}
            <p className="text-sm text-gray-600 dark:text-gray-300 border-l-2 border-purple-300 pl-3">
              {review.summary}
            </p>

            {/* Changes Summary */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {reviewTypes.find((t) => t.value === review.type)?.label}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${review.changes.length > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300' : 'bg-green-50 dark:bg-green-950/20 border-green-300'}`}
              >
                {review.changes.length} suggested{' '}
                {review.changes.length === 1 ? 'change' : 'changes'}
              </Badge>
              {review.validatedChangesCount < review.originalChangesCount && (
                <Badge variant="outline" className="text-xs text-gray-500">
                  {review.originalChangesCount - review.validatedChangesCount} unmatched
                </Badge>
              )}
            </div>

            {/* Changes Preview */}
            {review.changes.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Suggested Changes
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {review.changes.slice(0, 5).map((change, index) => (
                    <div
                      key={change.id || index}
                      className="text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${getChangeTypeBadgeColor(change.type)}`}
                        >
                          {change.type}
                        </Badge>
                      </div>
                      <div className="line-through text-red-600 dark:text-red-400 truncate">
                        {change.originalText}
                      </div>
                      <div className="text-green-600 dark:text-green-400 truncate">
                        {change.suggestedText}
                      </div>
                    </div>
                  ))}
                  {review.changes.length > 5 && (
                    <div className="text-xs text-center text-gray-500">
                      +{review.changes.length - 5} more changes
                    </div>
                  )}
                </div>

                {/* Review & Edit Button */}
                <Button onClick={handleReviewChanges} className="w-full mt-2" variant="outline">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Review & Accept Changes
                </Button>
              </div>
            )}

            {/* No Changes */}
            {review.changes.length === 0 && (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-xs text-green-900 dark:text-green-100">
                  Your document looks great! No changes suggested.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!review && !isReviewing && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No review yet</p>
          <p className="text-xs mt-1">Get AI-powered suggestions to improve your document</p>
        </div>
      )}
    </div>
  );
}
