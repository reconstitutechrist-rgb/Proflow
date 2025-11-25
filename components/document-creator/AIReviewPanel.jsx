
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertTriangle, Lightbulb, FileText, Sparkles, RefreshCw } from "lucide-react";
import { InvokeLLM } from "@/api/integrations";
import { toast } from "sonner";

// Simple HTML sanitizer - removes script tags and dangerous attributes
const sanitizeHTML = (html) => {
  if (!html) return "";
  
  // Remove script tags and their content
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  cleaned = cleaned.replace(/javascript:/gi, '');
  
  // Remove data: protocol for security
  cleaned = cleaned.replace(/data:text\/html/gi, '');
  
  return cleaned;
};

// Estimate token count (rough approximation)
const estimateTokens = (text) => {
  if (!text) return 0;
  // Strip HTML tags for more accurate count
  const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(plainText.length / 4);
};

// Estimate cost in USD (based on typical LLM pricing)
const estimateCost = (tokens) => {
  // Rough estimate: $0.002 per 1K tokens (average rate)
  return (tokens / 1000) * 0.002;
};

export default function AIReviewPanel({
  content,
  title,
  description,
  selectedAssignment,
  selectedTask,
  assignments,
  tasks
}) {
  const [review, setReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewType, setReviewType] = useState("comprehensive");

  const reviewTypes = [
    {
      value: "comprehensive",
      label: "Comprehensive Review",
      description: "Full analysis of clarity, grammar, tone, and completeness",
      estimatedTokens: "~2000-3000"
    },
    {
      value: "quick",
      label: "Quick Check",
      description: "Fast review focusing on major issues only",
      estimatedTokens: "~500-1000"
    },
    {
      value: "grammar",
      label: "Grammar & Spelling",
      description: "Focus only on language errors",
      estimatedTokens: "~500-1000"
    },
    {
      value: "tone",
      label: "Tone & Style",
      description: "Check if tone matches intended audience",
      estimatedTokens: "~500-1000"
    }
  ];

  const currentReviewType = reviewTypes.find(t => t.value === reviewType);

  const handleReview = async () => {
    if (!content || content.trim().length < 50) {
      toast.error("Please add more content before requesting a review (minimum 50 characters)");
      return;
    }

    // Estimate cost and warn user
    const strippedContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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

      const assignmentContext = selectedAssignment 
        ? assignments.find(a => a.id === selectedAssignment)
        : null;

      const taskContext = selectedTask
        ? tasks.find(t => t.id === selectedTask)
        : null;

      let systemPrompt = "";
      
      if (reviewType === "comprehensive") {
        systemPrompt = `You are an expert editor and writing coach. Provide a comprehensive review of this document.

Analyze:
1. **Clarity & Structure**: Is the content well-organized and easy to follow?
2. **Grammar & Spelling**: Are there any language errors?
3. **Tone & Style**: Is the tone appropriate for the intended audience?
4. **Completeness**: Are there any missing sections or gaps in information?
5. **Consistency**: Is terminology and formatting consistent throughout?
${taskContext ? `6. **Task Alignment**: Does the content effectively address the task: ${taskContext.title}?` : ""}

Provide actionable feedback in a friendly, constructive tone.`;

      } else if (reviewType === "quick") {
        systemPrompt = `You are an expert editor. Provide a quick review focusing on the most critical issues only.

Focus on:
1. Major structural problems
2. Critical grammar or clarity issues
3. Missing essential information
${taskContext ? `4. Whether content addresses the task: ${taskContext.title}` : ""}

Keep it brief and actionable.`;

      } else if (reviewType === "grammar") {
        systemPrompt = `You are a grammar and spelling expert. Review this document for language errors only.

Focus on:
1. Spelling mistakes
2. Grammar errors
3. Punctuation issues
4. Sentence structure problems

List specific issues with suggestions for correction.`;

      } else if (reviewType === "tone") {
        systemPrompt = `You are a tone and style expert. Review this document's tone and writing style.

Analyze:
1. Is the tone appropriate for the intended audience?
2. Is the formality level consistent?
3. Does the writing style match the document type?
4. Are there any tone shifts that seem unintentional?

Provide specific suggestions for improvement.`;
      }

      const fullPrompt = `${systemPrompt}

Document Context:
- Title: ${title || "Untitled"}
- Description: ${description || "No description"}
${assignmentContext ? `- Assignment: ${assignmentContext.name} (${assignmentContext.description})` : ""}
${taskContext ? `- Specific Task: ${taskContext.title} (Status: ${taskContext.status}, Priority: ${taskContext.priority})${taskContext.description ? ` - ${taskContext.description}` : ''}` : ""}

Document Content (${contentLength} characters):
${strippedContent.substring(0, 8000)}${contentLength > 8000 ? '\n\n[Content truncated for analysis...]' : ''}

Provide your review in a structured format with clear sections and actionable recommendations.`;

      const response = await InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false
      });

      setReview({
        content: response,
        type: reviewType,
        timestamp: new Date().toISOString(),
        documentLength: contentLength,
        tokensUsed: estimatedTokenCount
      });

      toast.success("Review completed successfully");

    } catch (error) {
      console.error("Error generating review:", error);
      toast.error("Failed to generate review");
    } finally {
      setIsReviewing(false);
    }
  };

  const contentLength = content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length || 0;
  const estimatedTokenCount = estimateTokens(content);
  const estimatedCostUSD = estimateCost(estimatedTokenCount);

  return (
    <div className="space-y-4">
      {/* Document Stats */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Document Length</span>
            <Badge variant="outline">{contentLength} characters</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Estimated Tokens</span>
            <Badge variant="outline">~{estimatedTokenCount}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Est. Review Cost</span>
            <Badge variant="outline" className="font-mono">${estimatedCostUSD.toFixed(4)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Review Type Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">Review Type</label>
        <div className="space-y-2">
          {reviewTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setReviewType(type.value)}
              className={`w-full text-left p-3 border rounded-lg transition-all ${
                reviewType === type.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{type.description}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {type.estimatedTokens} tokens
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Warning for large documents */}
      {contentLength > 5000 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Large document detected. Review may take longer and cost more tokens.
          </AlertDescription>
        </Alert>
      )}

      {/* Review Button */}
      <Button
        onClick={handleReview}
        disabled={isReviewing || !content || contentLength < 50}
        className="w-full"
      >
        {isReviewing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Document...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Start {currentReviewType.label}
          </>
        )}
      </Button>

      {/* Review Results */}
      {review && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold">Review Complete</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReview}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Re-analyze
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {reviewTypes.find(t => t.value === review.type)?.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {new Date(review.timestamp).toLocaleTimeString()}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {review.tokensUsed} tokens
              </Badge>
            </div>

            <div 
              className="prose dark:prose-invert max-w-none text-sm border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-[500px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(review.content) }}
            />

            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Tip:</strong> Use the AI Writing Assistant to implement suggested improvements.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!review && !isReviewing && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No review yet</p>
          <p className="text-xs mt-1">Click above to start AI review</p>
        </div>
      )}
    </div>
  );
}
