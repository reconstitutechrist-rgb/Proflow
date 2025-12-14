import { useState, useCallback } from 'react';
import { exportSessionToPdf } from '@/api/functions';
import { toast } from 'sonner';

/**
 * Hook for managing export functionality in AskAI
 */
export function useAskAIExport({
  messages,
  uploadedDocuments,
  selectedProject,
  selectedAssignment,
  currentSession,
}) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('markdown');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportSession = useCallback(
    async (format) => {
      if (messages.length === 0) {
        toast.error('No messages to export');
        return;
      }

      setIsExporting(true);

      try {
        const sessionTitle = currentSession?.name || `AI Chat - ${new Date().toLocaleDateString()}`;
        const exportDate = new Date().toLocaleString();

        if (format === 'pdf') {
          const exportData = {
            sessionTitle,
            exportDate,
            project: selectedProject,
            assignment: selectedAssignment,
            documents: uploadedDocuments.map((d) => ({
              name: d.name,
              includedInContext: d.includedInContext !== false,
              embeddingModel: d.embeddingModel,
              chunkingStrategy: d.chunkingStrategy,
              tokenCount: d.tokenCount,
              estimatedCost: d.estimatedCost,
              fromCache: d.fromCache,
            })),
            messages: messages.map((m) => ({
              role: m.type === 'user' ? 'You' : 'AI Assistant',
              content: m.content,
              timestamp: m.timestamp,
              excludedFromContext: m.excludedFromContext || false,
              ragMetadata: m.ragMetadata || undefined,
              ragUsed: m.ragUsed || undefined,
            })),
          };

          const response = await exportSessionToPdf(exportData);

          const blob = new Blob([response.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();

          toast.success('PDF exported successfully');
        } else if (format === 'markdown') {
          let markdown = `# ${sessionTitle}\n\n`;
          markdown += `**Export Date:** ${exportDate}\n\n`;

          if (selectedProject) {
            markdown += `**Project:** ${selectedProject.name}\n`;
            if (selectedProject.description)
              markdown += `Description: ${selectedProject.description}\n`;
            markdown += `\n`;
          }

          if (selectedAssignment) {
            markdown += `**Assignment:** ${selectedAssignment.name}\n`;
            if (selectedAssignment.description)
              markdown += `Description: ${selectedAssignment.description}\n`;
            markdown += `\n`;
          }

          if (uploadedDocuments.length > 0) {
            markdown += `## Documents (${uploadedDocuments.length})\n\n`;
            uploadedDocuments.forEach((doc) => {
              let docInfo = `- ${doc.name}`;
              if (!doc.includedInContext) docInfo += ' *(excluded from context)*';
              if (doc.embeddingModel === 'text-embedding-ada-002')
                docInfo += ' *(OpenAI Embeddings)*';
              if (doc.embeddingModel === 'simulated') docInfo += ' *(Simulated Embeddings)*';
              if (doc.chunkingStrategy) docInfo += ` *(Chunking: ${doc.chunkingStrategy})*`;
              if (doc.tokenCount > 0) docInfo += ` *(Tokens: ${doc.tokenCount})*`;
              if (doc.estimatedCost > 0) docInfo += ` *(Cost: $${doc.estimatedCost.toFixed(4)})*`;
              if (doc.fromCache) docInfo += ` *(Cached)*`;
              markdown += `${docInfo}\n`;
            });
            markdown += `\n`;
          }

          markdown += `## Conversation\n\n`;

          messages.forEach((msg) => {
            const role = msg.type === 'user' ? '**You**' : '**AI Assistant**';
            const timestamp = new Date(msg.timestamp).toLocaleTimeString();
            const exclusion = msg.excludedFromContext ? ' *(excluded from context)*' : '';
            let ragInfo = '';
            if (msg.ragMetadata?.usedRAG) {
              ragInfo = ` *(Used RAG: ${msg.ragMetadata.usingRealEmbeddings ? 'OpenAI' : 'Simulated'} embeddings, ${msg.ragMetadata.chunksRetrieved} chunks`;
              if (msg.ragMetadata.chunkTypes && msg.ragMetadata.chunkTypes.length > 0) {
                ragInfo += `, Types: ${msg.ragMetadata.chunkTypes.join(', ')}`;
              }
              ragInfo += `)*`;
            }

            markdown += `### ${role} - ${timestamp}${exclusion}${ragInfo}\n\n`;
            markdown += `${msg.content}\n\n`;
            markdown += `---\n\n`;
          });

          const blob = new Blob([markdown], { type: 'text/markdown' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();

          toast.success('Markdown exported successfully');
        }

        setIsExportDialogOpen(false);
      } catch (error) {
        console.error('Export error:', error);
        toast.error(`Failed to export as ${format.toUpperCase()}`);
      } finally {
        setIsExporting(false);
      }
    },
    [messages, uploadedDocuments, selectedProject, selectedAssignment, currentSession]
  );

  return {
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportFormat,
    setExportFormat,
    isExporting,
    handleExportSession,
  };
}
