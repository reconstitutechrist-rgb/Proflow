/**
 * CompletenessAnalysis Component
 *
 * Uses Claude Sonnet 4.5 (QA Reviewer) to analyze artifacts for completeness.
 * Checks against the original prompt and coding standards.
 */

import React, { useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { invokeLLM, isAnthropicConfigured } from '@/api/anthropicClient';
import { AI_MODELS } from '@/config/aiModels';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

/**
 * Analysis result severity levels
 */
const SEVERITY = {
  PASS: 'pass',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
};

const SEVERITY_CONFIG = {
  [SEVERITY.PASS]: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
  },
  [SEVERITY.INFO]: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  [SEVERITY.WARNING]: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  [SEVERITY.ERROR]: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
  },
};

/**
 * System prompt for completeness analysis
 */
const ANALYSIS_PROMPT = `You are a QA Reviewer analyzing a technical document for completeness and quality.

Review the artifact against these criteria:

1. **Requirements Coverage**
   - Does the document address the original request?
   - Are all stated goals covered?

2. **Technical Completeness**
   - Are code examples complete and runnable?
   - Are file paths and structure clear?
   - Are dependencies and setup steps documented?

3. **Edge Cases & Error Handling**
   - Are error scenarios considered?
   - Are edge cases documented?
   - Is there graceful degradation?

4. **Security Considerations**
   - Are there any obvious security issues?
   - Is input validation mentioned where needed?
   - Are secrets/credentials handled properly?

5. **Best Practices**
   - Does it follow modern coding patterns?
   - Is the code maintainable?
   - Are there any anti-patterns?

OUTPUT FORMAT (JSON):
{
  "overallScore": 0-100,
  "summary": "Brief overall assessment",
  "categories": [
    {
      "name": "Category Name",
      "score": 0-100,
      "severity": "pass|info|warning|error",
      "findings": [
        {
          "title": "Finding title",
          "description": "Detailed description",
          "severity": "pass|info|warning|error",
          "suggestion": "How to improve (optional)"
        }
      ]
    }
  ],
  "missingElements": ["List of missing elements"],
  "suggestions": ["Prioritized list of improvements"]
}

Respond with ONLY the JSON object, no markdown code blocks.`;

/**
 * Finding item component
 */
const FindingItem = ({ finding }) => {
  const [isOpen, setIsOpen] = useState(false);
  const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG[SEVERITY.INFO];
  const Icon = config.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
            config.bg
          )}
        >
          <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
          <span className="flex-1 text-sm font-medium">{finding.title}</span>
          {finding.suggestion && (
            isOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          )}
        </button>
      </CollapsibleTrigger>
      {finding.description && (
        <CollapsibleContent className="pl-6 pr-2 pb-2">
          <div className="text-sm text-muted-foreground mt-1">
            {finding.description}
          </div>
          {finding.suggestion && (
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
              <span className="font-medium text-primary">Suggestion: </span>
              {finding.suggestion}
            </div>
          )}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

/**
 * Category section component
 */
const CategorySection = ({ category }) => {
  const [isOpen, setIsOpen] = useState(true);
  const config = SEVERITY_CONFIG[category.severity] || SEVERITY_CONFIG[SEVERITY.INFO];
  const Icon = config.icon;

  return (
    <div className={cn('border rounded-lg overflow-hidden mb-4', config.border)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
              config.bg
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn('w-5 h-5', config.color)} />
              <span className="font-medium">{category.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={config.color}>
                {category.score}%
              </Badge>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-1">
            {category.findings?.map((finding, idx) => (
              <FindingItem key={idx} finding={finding} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

/**
 * Main CompletenessAnalysis component
 */
const CompletenessAnalysis = ({ artifact, originalPrompt, onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Run the completeness analysis
   */
  const runAnalysis = useCallback(async () => {
    if (!isAnthropicConfigured()) {
      toast.error('Anthropic API key not configured');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `ORIGINAL REQUEST:
${originalPrompt || 'Not provided'}

ARTIFACT TO ANALYZE:
${artifact?.content || artifact || 'No content'}

Analyze this artifact for completeness and quality.`;

      const response = await invokeLLM({
        model: AI_MODELS.QA_REVIEWER.id,
        system_prompt: ANALYSIS_PROMPT,
        prompt,
        response_json_schema: true,
      });

      // Parse response if it's a string
      const result = typeof response === 'string' ? JSON.parse(response) : response;
      setAnalysis(result);
      toast.success('Analysis complete');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message);
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [artifact, originalPrompt]);

  // Get overall score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Completeness Analysis</h3>
            <p className="text-xs text-muted-foreground">
              Powered by Claude Sonnet 4.5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-analyze
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {!analysis && !isAnalyzing && !error && (
          <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
            <CheckCircle2 className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Ready to Analyze</p>
            <p className="text-sm mt-2">
              Click "Run Analysis" to check your artifact for completeness
            </p>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Analyzing artifact completeness...
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Analysis Failed</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="text-center p-6 bg-card border rounded-lg">
              <div className="text-5xl font-bold mb-2">
                <span className={getScoreColor(analysis.overallScore)}>
                  {analysis.overallScore}
                </span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Progress
                value={analysis.overallScore}
                className="h-2 mb-4"
              />
              <p className="text-sm text-muted-foreground">
                {analysis.summary}
              </p>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-medium mb-3">Analysis Categories</h4>
              {analysis.categories?.map((category, idx) => (
                <CategorySection key={idx} category={category} />
              ))}
            </div>

            {/* Missing Elements */}
            {analysis.missingElements?.length > 0 && (
              <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="w-4 h-4" />
                  Missing Elements
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600 dark:text-yellow-400">
                  {analysis.missingElements.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions?.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Suggested Improvements
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  {analysis.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default CompletenessAnalysis;
