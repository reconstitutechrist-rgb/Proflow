import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FileText,
  File,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Presentation,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { db } from '@/api/db';
import { toast } from 'sonner';

const FILE_TYPE_ICONS = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  ppt: Presentation,
  pptx: Presentation,
  js: FileCode,
  ts: FileCode,
  jsx: FileCode,
  tsx: FileCode,
  json: FileCode,
  html: FileCode,
  css: FileCode,
};

const DOCUMENT_TYPE_COLORS = {
  contract: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  specification: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  design: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  report: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  presentation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function ProjectDocumentsSection({ documents }) {
  const [expandedDocs, setExpandedDocs] = useState({});
  const [summaries, setSummaries] = useState({});
  const [loadingDocs, setLoadingDocs] = useState({});

  const getFileIcon = (fileName) => {
    if (!fileName) return File;
    const extension = fileName.split('.').pop()?.toLowerCase();
    return FILE_TYPE_ICONS[extension] || File;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter out folder placeholders
  const filteredDocs = documents.filter((d) => d.document_type !== 'folder_placeholder');

  const toggleDocument = async (docId) => {
    const isExpanding = !expandedDocs[docId];
    setExpandedDocs((prev) => ({ ...prev, [docId]: isExpanding }));

    // Generate summary on first expand if not cached
    if (isExpanding && !summaries[docId] && !loadingDocs[docId]) {
      await generateSummary(docId);
    }
  };

  const generateSummary = async (docId) => {
    const doc = filteredDocs.find((d) => d.id === docId);
    if (!doc) return;

    // Check if document has content
    const content = doc.content || doc.file_content;
    if (!content || content.trim().length < 50) {
      setSummaries((prev) => ({
        ...prev,
        [docId]: { error: true, message: 'Document has insufficient content for summarization.' },
      }));
      return;
    }

    setLoadingDocs((prev) => ({ ...prev, [docId]: true }));

    try {
      // Strip HTML and truncate
      const strippedContent = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000); // Limit to ~3750 words

      const prompt = `Summarize the following document concisely:

${strippedContent}

Provide a 2-3 sentence executive summary and 3-5 key points as bullet points.

Format as JSON with keys: executive_summary (string), key_points (array of strings).`;

      const response = await db.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            key_points: { type: 'array', items: { type: 'string' } },
          },
          required: ['executive_summary', 'key_points'],
        },
      });

      let parsed;
      try {
        parsed = typeof response === 'string' ? JSON.parse(response) : response;
      } catch {
        parsed = { executive_summary: response, key_points: [] };
      }

      setSummaries((prev) => ({
        ...prev,
        [docId]: { data: parsed },
      }));
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummaries((prev) => ({
        ...prev,
        [docId]: { error: true, message: 'Failed to generate summary. Please try again.' },
      }));
      toast.error('Failed to generate summary');
    } finally {
      setLoadingDocs((prev) => ({ ...prev, [docId]: false }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Documents
          <Badge variant="secondary" className="ml-1">
            {filteredDocs.length}
          </Badge>
        </h2>
      </div>

      {filteredDocs.length === 0 ? (
        <Card className="bg-gray-50 dark:bg-gray-800/50 border-dashed">
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => {
            const FileIcon = getFileIcon(doc.file_name);
            const isExpanded = expandedDocs[doc.id];
            const isLoading = loadingDocs[doc.id];
            const summaryData = summaries[doc.id];

            return (
              <Collapsible
                key={doc.id}
                open={isExpanded}
                onOpenChange={() => toggleDocument(doc.id)}
              >
                <div className="border rounded-lg overflow-hidden">
                  {/* Document Header - Clickable */}
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded flex-shrink-0">
                          <FileIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {doc.title || doc.file_name || 'Untitled Document'}
                          </h3>

                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {doc.document_type && doc.document_type !== 'other' && (
                              <Badge
                                className={`text-xs ${
                                  DOCUMENT_TYPE_COLORS[doc.document_type] ||
                                  DOCUMENT_TYPE_COLORS.other
                                }`}
                              >
                                {doc.document_type}
                              </Badge>
                            )}

                            {doc.created_date && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(doc.created_date)}
                              </span>
                            )}

                            {doc.file_size && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(doc.file_size)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  {/* Expandable Summary Content */}
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 border-t bg-gray-50/50 dark:bg-gray-800/30">
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating AI summary...</span>
                        </div>
                      ) : summaryData?.error ? (
                        <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{summaryData.message}</span>
                        </div>
                      ) : summaryData?.data ? (
                        <div className="space-y-2">
                          {/* Executive Summary */}
                          <div>
                            <div className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                              <Sparkles className="w-3 h-3" />
                              AI Summary
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {summaryData.data.executive_summary}
                            </p>
                          </div>

                          {/* Key Points */}
                          {summaryData.data.key_points?.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Key Points
                              </div>
                              <ul className="space-y-1">
                                {summaryData.data.key_points.map((point, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                                  >
                                    <span className="text-purple-500 mt-1">•</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Regenerate button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateSummary(doc.id);
                            }}
                            className="text-xs"
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Click to load AI summary...</div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
