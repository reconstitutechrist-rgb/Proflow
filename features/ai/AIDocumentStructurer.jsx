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
  LayoutList,
  Heading,
  List,
  RefreshCw,
  Edit3,
  ArrowUpDown,
} from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { toast } from 'sonner';
import { parseAIChanges, getChangeTypeBadgeColor } from '@/utils/diffUtils';

// Strip HTML to get plain text
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * AIDocumentStructurer - AI tool for improving document structure
 * Suggests headings, lists, formatting, and organization improvements
 */
export default function AIDocumentStructurer({
  content,
  title,
  description,
  onChangesGenerated, // Callback when changes are ready for review
}) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [structureType, setStructureType] = useState('full');

  const structureTypes = [
    {
      value: 'full',
      label: 'Full Restructure',
      description: 'Complete structural analysis with headings, lists, and organization',
      icon: LayoutList,
    },
    {
      value: 'headings',
      label: 'Headings Only',
      description: 'Add and organize section headings',
      icon: Heading,
    },
    {
      value: 'lists',
      label: 'Lists & Bullets',
      description: 'Convert appropriate text to lists and bullet points',
      icon: List,
    },
    {
      value: 'flow',
      label: 'Improve Flow',
      description: 'Reorganize content for better logical flow',
      icon: ArrowUpDown,
    },
  ];

  const currentType = structureTypes.find((t) => t.value === structureType);

  const buildPrompt = (strippedContent) => {
    let focusInstructions = '';

    if (structureType === 'full') {
      focusInstructions = `Analyze the document structure and suggest improvements for:
1. Adding or improving headings and subheadings
2. Converting sequential items into bullet or numbered lists
3. Reorganizing sections for better logical flow
4. Adding emphasis (bold) for key terms or concepts
5. Breaking up long paragraphs
6. Adding section transitions where needed`;
    } else if (structureType === 'headings') {
      focusInstructions = `Focus ONLY on headings and sections:
1. Identify where headings should be added
2. Suggest better heading text for existing sections
3. Recommend heading hierarchy (H1, H2, H3)
4. Note where sections should be split or combined`;
    } else if (structureType === 'lists') {
      focusInstructions = `Focus ONLY on lists and bullet points:
1. Find sequences that would work better as bullet lists
2. Identify numbered steps that should be a numbered list
3. Convert comma-separated items to lists
4. Find parallel structures that should be formatted as lists`;
    } else if (structureType === 'flow') {
      focusInstructions = `Focus ONLY on content flow and organization:
1. Identify sections that should be reordered
2. Find content that should be grouped together
3. Suggest transitions between sections
4. Note redundant content that could be consolidated`;
    }

    return `You are an expert document structure analyst. Analyze this document and provide SPECIFIC, ACTIONABLE changes to improve its structure.

${focusInstructions}

Document Context:
- Title: ${title || 'Untitled'}
${description ? `- Description: ${description}` : ''}

Document Content:
"""
${strippedContent.substring(0, 8000)}${strippedContent.length > 8000 ? '\n\n[Content truncated...]' : ''}
"""

You MUST respond with valid JSON in this EXACT format:
{
  "structureScore": <number 0-100 rating current structure>,
  "summary": "<brief assessment of current structure>",
  "improvements": [
    {
      "type": "<heading|list|paragraph|emphasis|flow|section>",
      "originalText": "<EXACT text to modify - must match document exactly>",
      "suggestedText": "<restructured version with formatting>",
      "reason": "<why this improves the structure>"
    }
  ]
}

IMPORTANT RULES:
1. originalText MUST be an EXACT match from the document
2. For heading changes, include the heading markers (e.g., "## Section Title")
3. For list conversions, show the full list with bullet points
4. suggestedText should include simple markdown formatting:
   - Use ## for headings
   - Use - or * for bullet lists
   - Use 1. 2. 3. for numbered lists
   - Use **bold** for emphasis
5. Maximum 10 improvements - prioritize most impactful ones
6. ONLY return valid JSON, no markdown code blocks`;
  };

  const handleAnalyze = async () => {
    const strippedContent = stripHtml(content);

    if (!content || strippedContent.length < 50) {
      toast.error('Please add more content before analyzing structure');
      return;
    }

    try {
      setIsAnalyzing(true);

      const prompt = buildPrompt(strippedContent);

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            structureScore: { type: 'number' },
            summary: { type: 'string' },
            improvements: {
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
          required: ['structureScore', 'summary', 'improvements'],
        },
      });

      // Parse the response
      let parsedResponse;
      try {
        if (typeof response === 'string') {
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

      // Convert improvements to standard change format
      const changes = (parsedResponse.improvements || []).map((imp) => ({
        ...imp,
        // Map structure types to change types for consistent display
        type:
          imp.type === 'heading'
            ? 'structure'
            : imp.type === 'list'
              ? 'structure'
              : imp.type === 'paragraph'
                ? 'clarity'
                : imp.type === 'emphasis'
                  ? 'style'
                  : imp.type === 'flow'
                    ? 'structure'
                    : imp.type === 'section'
                      ? 'structure'
                      : imp.type,
        structureType: imp.type, // Keep original type for display
      }));

      // Process with unique IDs
      const processedChanges = parseAIChanges(changes);

      // Validate against content
      const validatedChanges = processedChanges.filter((change) => {
        const found = strippedContent.includes(change.originalText);
        if (!found) {
          console.warn(`Structure change not found: "${change.originalText.substring(0, 50)}..."`);
        }
        return found;
      });

      const analysisResult = {
        structureScore: parsedResponse.structureScore || 0,
        summary: parsedResponse.summary || 'Analysis complete',
        changes: validatedChanges,
        type: structureType,
        timestamp: new Date().toISOString(),
        originalCount: processedChanges.length,
        validatedCount: validatedChanges.length,
      };

      setAnalysis(analysisResult);

      if (validatedChanges.length > 0) {
        toast.success(`Found ${validatedChanges.length} structure improvements`);
      } else {
        toast.success('Document structure looks good!');
      }
    } catch (error) {
      console.error('Error analyzing structure:', error);
      toast.error('Failed to analyze structure. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyChanges = () => {
    if (analysis?.changes && onChangesGenerated) {
      onChangesGenerated(analysis.changes);
    }
  };

  const contentLength = stripHtml(content).length;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'heading':
        return <Heading className="w-3 h-3" />;
      case 'list':
        return <List className="w-3 h-3" />;
      case 'flow':
        return <ArrowUpDown className="w-3 h-3" />;
      default:
        return <LayoutList className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Structure Type Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">Analysis Type</label>
        <div className="grid grid-cols-2 gap-2">
          {structureTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setStructureType(type.value)}
                className={`text-left p-3 border rounded-lg transition-all ${
                  structureType === type.value
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/20'
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

      {/* Analyze Button */}
      <Button
        onClick={handleAnalyze}
        disabled={isAnalyzing || !content || contentLength < 50}
        className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Structure...
          </>
        ) : (
          <>
            <LayoutList className="w-4 h-4 mr-2" />
            Analyze {currentType.label}
          </>
        )}
      </Button>

      {/* Analysis Results */}
      {analysis && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Header with Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${getScoreColor(analysis.structureScore)}`}>
                  {analysis.structureScore}
                </div>
                <div>
                  <div className="font-medium text-sm">Structure Score</div>
                  <div className="text-xs text-gray-500">out of 100</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
                <RefreshCw className={`w-3 h-3 mr-1 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Re-analyze
              </Button>
            </div>

            {/* Summary */}
            <p className="text-sm text-gray-600 dark:text-gray-300 border-l-2 border-teal-300 pl-3">
              {analysis.summary}
            </p>

            {/* Changes Count */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {structureTypes.find((t) => t.value === analysis.type)?.label}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${analysis.changes.length > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300' : 'bg-green-50 dark:bg-green-950/20 border-green-300'}`}
              >
                {analysis.changes.length} improvements found
              </Badge>
            </div>

            {/* Improvements Preview */}
            {analysis.changes.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Suggested Improvements
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {analysis.changes.slice(0, 5).map((change, index) => (
                    <div
                      key={change.id || index}
                      className="text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(change.structureType)}
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${getChangeTypeBadgeColor(change.type)}`}
                        >
                          {change.structureType || change.type}
                        </Badge>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 truncate mb-1">
                        {change.reason}
                      </div>
                      <div className="line-through text-red-600/70 dark:text-red-400/70 truncate text-[11px]">
                        {change.originalText.substring(0, 60)}...
                      </div>
                    </div>
                  ))}
                  {analysis.changes.length > 5 && (
                    <div className="text-xs text-center text-gray-500">
                      +{analysis.changes.length - 5} more improvements
                    </div>
                  )}
                </div>

                {/* Apply Changes Button */}
                <Button onClick={handleApplyChanges} className="w-full mt-2" variant="outline">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Review & Apply Changes
                </Button>
              </div>
            )}

            {/* No Changes */}
            {analysis.changes.length === 0 && (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-xs text-green-900 dark:text-green-100">
                  Your document has great structure! No improvements needed.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!analysis && !isAnalyzing && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No analysis yet</p>
          <p className="text-xs mt-1">Analyze your document structure for improvements</p>
        </div>
      )}
    </div>
  );
}
