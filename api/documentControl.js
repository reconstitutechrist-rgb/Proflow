/**
 * Document Control API
 *
 * Core analysis and application logic for the AI Document Control feature.
 * Analyzes uploaded documents and proposes surgical edits to existing
 * project documents based on extracted facts.
 *
 * Key principle: Evidence-based changes only. No inference chains.
 */

import { InvokeLLM } from './integrations';
import { db } from './db';
import { searchProjectDocuments } from './projectBrain';
import {
  CONFIDENCE_THRESHOLDS,
  CONFIDENCE_WEIGHTS,
  CHANGE_STATUS,
} from '@/features/documents/documentControlTypes';

/**
 * Generate a unique ID for changes
 */
function generateChangeId() {
  return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate SHA-256 hash of content for change detection
 */
async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract text content from a file
 * Supports: .txt, .md, .json, and uses LLM for PDF
 */
export async function extractFileContent(file) {
  const fileName = file.name.toLowerCase();

  // Text-based files - read directly
  if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.json')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // PDF files - use LLM extraction
  if (fileName.endsWith('.pdf')) {
    // Read file as text (for now, proper PDF extraction would need a library)
    // This is a placeholder - in production, use pdf.js or similar
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read PDF'));
      reader.readAsText(file);
    });

    // If we got readable text, return it; otherwise use LLM to help
    if (text && text.length > 100 && !text.includes('\x00')) {
      return text;
    }

    // Use LLM to extract text from PDF content
    const result = await InvokeLLM({
      prompt: `Extract all text content from this document. Return ONLY the extracted text, preserving the structure and formatting as much as possible. Do not add any commentary or summaries.\n\nDocument content:\n${text.substring(0, 10000)}`,
      system_prompt: `You are a document text extractor. Extract text faithfully without modification.`,
    });

    return typeof result === 'string' ? result : result?.response || '';
  }

  throw new Error(`Unsupported file type: ${fileName}`);
}

/**
 * Analyze uploaded document to extract facts and classify content
 * Phase 1: Content Extraction & Classification
 */
export async function analyzeUploadedDocument(content, fileName) {
  if (!content || content.trim().length === 0) {
    return {
      success: false,
      error: 'No content to analyze',
      contentAnalysis: null,
    };
  }

  const analysisSchema = {
    type: 'object',
    properties: {
      primarySubject: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description:
              'Category: feature, budget, timeline, technical, policy, process, specification, or other',
          },
          specificArea: {
            type: 'string',
            description: 'The specific feature, area, or topic being addressed',
          },
          scope: {
            type: 'string',
            description: 'The specific aspect or scope within that area',
          },
        },
        required: ['domain', 'specificArea', 'scope'],
      },
      explicitFacts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            statement: { type: 'string', description: 'The factual statement' },
            confidence: {
              type: 'number',
              description: 'Confidence 0.0-1.0 that this is explicitly stated',
            },
            sourceLocation: {
              type: 'string',
              description: 'Where in document (e.g., "Paragraph 2", "Section 3")',
            },
            verbatimQuote: {
              type: 'string',
              description: 'Direct quote from document supporting this fact',
            },
          },
          required: ['statement', 'confidence', 'sourceLocation', 'verbatimQuote'],
        },
        description: 'Facts EXPLICITLY stated in the document (not inferred)',
      },
      outOfScope: {
        type: 'array',
        items: { type: 'string' },
        description: 'Areas/topics NOT addressed by this document',
      },
      statedBoundaries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Explicit scope limitations stated in the document',
      },
    },
    required: ['primarySubject', 'explicitFacts', 'outOfScope', 'statedBoundaries'],
  };

  try {
    const result = await InvokeLLM({
      prompt: `Analyze this document and extract ONLY what is EXPLICITLY stated.

DOCUMENT: "${fileName}"
---
${content.substring(0, 15000)}
---

CRITICAL RULES:
1. Only extract facts that are EXPLICITLY stated - no inference
2. Include verbatim quotes as evidence for each fact
3. Identify what this document is specifically about (not broadly)
4. Note what is NOT addressed (helps prevent scope creep later)
5. If the document states any limitations or boundaries, capture them

Return structured analysis.`,
      system_prompt: `You are a precise document analyzer. Your job is to extract ONLY what is explicitly stated in documents. You must NEVER infer, assume, or extrapolate. Every fact must have a direct verbatim quote as evidence.`,
      response_json_schema: analysisSchema,
    });

    return {
      success: true,
      contentAnalysis: result,
      fileName,
      contentLength: content.length,
    };
  } catch (error) {
    console.error('Error analyzing document:', error);
    return {
      success: false,
      error: error.message || 'Analysis failed',
      contentAnalysis: null,
    };
  }
}

/**
 * Find sections in project documents that match the uploaded content
 * Phase 2: Scope-Bounded Document Search
 */
export async function findMatchingSections(contentAnalysis, projectId, _workspaceId) {
  if (!contentAnalysis || !projectId) {
    return { success: false, error: 'Missing required parameters', matches: [] };
  }

  const { primarySubject, explicitFacts } = contentAnalysis;

  // Build search queries from the analysis
  const searchQueries = [
    primarySubject.specificArea,
    primarySubject.scope,
    ...explicitFacts.slice(0, 5).map((f) => f.statement),
  ].filter(Boolean);

  try {
    // Search project documents using Project Brain
    const allMatches = [];

    for (const query of searchQueries) {
      const results = await searchProjectDocuments(query, projectId, {
        limit: 10,
        threshold: 0.4,
      });

      for (const result of results) {
        // Check if we already have this chunk
        const existing = allMatches.find(
          (m) => m.document_id === result.document_id && m.chunk_index === result.chunk_index
        );

        if (existing) {
          // Update similarity if this query found better match
          existing.similarity = Math.max(existing.similarity, result.similarity);
          existing.matchedQueries.push(query);
        } else {
          allMatches.push({
            ...result,
            matchedQueries: [query],
          });
        }
      }
    }

    // Sort by similarity and deduplicate by document
    const documentMatches = new Map();

    for (const match of allMatches) {
      const docId = match.document_id;
      if (!documentMatches.has(docId)) {
        documentMatches.set(docId, {
          documentId: docId,
          documentName: match.document_name,
          chunks: [],
          maxSimilarity: 0,
        });
      }

      const doc = documentMatches.get(docId);
      doc.chunks.push({
        chunkIndex: match.chunk_index,
        chunkText: match.chunk_text,
        similarity: match.similarity,
        matchedQueries: match.matchedQueries,
      });
      doc.maxSimilarity = Math.max(doc.maxSimilarity, match.similarity);
    }

    // Convert to array and sort by max similarity
    const matches = Array.from(documentMatches.values())
      .sort((a, b) => b.maxSimilarity - a.maxSimilarity)
      .slice(0, 10); // Top 10 documents

    return {
      success: true,
      matches,
      totalChunksFound: allMatches.length,
    };
  } catch (error) {
    console.error('Error finding matching sections:', error);
    return { success: false, error: error.message, matches: [] };
  }
}

/**
 * Generate proposed changes based on facts and matching sections
 * Phase 3: Change Generation with Evidence
 */
export async function generateProposedChanges(contentAnalysis, matchingSections, uploadedFileName) {
  if (!contentAnalysis || !matchingSections?.length) {
    return { success: false, error: 'No content or matches to process', changes: [] };
  }

  const { primarySubject, explicitFacts } = contentAnalysis;
  const proposedChanges = [];

  // Process each matching document
  for (const docMatch of matchingSections) {
    const { documentId, documentName, chunks } = docMatch;

    // Combine relevant chunks for analysis
    const relevantContent = chunks
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .map((c) => c.chunkText)
      .join('\n\n');

    const changeSchema = {
      type: 'object',
      properties: {
        proposedChanges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sectionName: { type: 'string', description: 'Name or description of the section' },
              originalText: {
                type: 'string',
                description: 'EXACT text from existing document to replace',
              },
              proposedText: { type: 'string', description: 'New text to replace with' },
              sourceQuote: {
                type: 'string',
                description: 'Verbatim quote from uploaded doc justifying change',
              },
              sourceLocation: {
                type: 'string',
                description: 'Where in uploaded doc the evidence is',
              },
              subjectMatchScore: {
                type: 'number',
                description: 'How closely subjects match (0.0-1.0)',
              },
              reasoning: { type: 'string', description: 'Brief explanation of why this change' },
            },
            required: [
              'sectionName',
              'originalText',
              'proposedText',
              'sourceQuote',
              'subjectMatchScore',
              'reasoning',
            ],
          },
        },
        noChangesReason: {
          type: 'string',
          description: 'If no changes proposed, explain why',
        },
      },
      required: ['proposedChanges'],
    };

    try {
      const result = await InvokeLLM({
        prompt: `Compare the uploaded document facts with this existing document section and propose SURGICAL changes.

UPLOADED DOCUMENT: "${uploadedFileName}"
PRIMARY SUBJECT: ${primarySubject.domain} > ${primarySubject.specificArea} > ${primarySubject.scope}

EXPLICIT FACTS FROM UPLOADED DOCUMENT:
${explicitFacts.map((f, i) => `${i + 1}. "${f.statement}" [Source: ${f.verbatimQuote}]`).join('\n')}

---

EXISTING DOCUMENT: "${documentName}"
CONTENT TO ANALYZE:
${relevantContent.substring(0, 8000)}

---

CRITICAL RULES:
1. ONLY propose changes for text that DIRECTLY addresses the same subject as the uploaded document
2. Each change MUST have a verbatim quote from the uploaded document as evidence
3. Make MINIMAL changes - only modify what is explicitly outdated
4. Do NOT modify related topics, adjacent features, or make improvements
5. If the existing text doesn't contradict the new facts, do NOT propose a change
6. originalText must be EXACT text from the existing document (copy-paste precision)

If you cannot find clear evidence for a change, do NOT propose it.`,
        system_prompt: `You are a surgical document editor. You make ONLY the minimum changes necessary to update documents based on new information. You NEVER expand scope, make improvements, or modify anything without explicit evidence. Every change must trace directly to a fact in the source document.`,
        response_json_schema: changeSchema,
      });

      // Process the LLM results into ProposedChange objects
      if (result?.proposedChanges?.length > 0) {
        for (const change of result.proposedChanges) {
          // Calculate confidence scores
          const confidence = calculateConfidence(change);

          // Skip low-confidence changes
          if (confidence.overall < CONFIDENCE_THRESHOLDS.DO_NOT_PROPOSE) {
            continue;
          }

          // Find the actual position in the document content
          const startIndex = relevantContent.indexOf(change.originalText);

          proposedChanges.push({
            id: generateChangeId(),
            documentId,
            documentTitle: documentName,
            sectionName: change.sectionName,
            pageNumber: null, // Would need PDF parsing for this
            originalText: change.originalText,
            proposedText: change.proposedText,
            startIndex: startIndex >= 0 ? startIndex : null,
            endIndex: startIndex >= 0 ? startIndex + change.originalText.length : null,
            status: CHANGE_STATUS.PENDING,
            userEditedText: null,
            evidence: {
              sourceQuote: change.sourceQuote,
              sourceLocation: change.sourceLocation || 'Uploaded document',
              matchReason:
                change.subjectMatchScore >= 0.9 ? 'exact_subject_match' : 'related_topic',
              confidence,
            },
            scopeJustification: {
              withinPrimarySubject: change.subjectMatchScore >= 0.8,
              withinSpecificArea: change.subjectMatchScore >= 0.7,
              withinStatedScope: true,
              crossesFeatureBoundary: false,
              requiresUserConfirmation:
                confidence.overall < CONFIDENCE_THRESHOLDS.STANDARD_PROPOSAL,
            },
            nonImpact: [],
          });
        }
      }
    } catch (error) {
      console.error(`Error generating changes for ${documentName}:`, error);
    }
  }

  return {
    success: true,
    changes: proposedChanges,
    totalChanges: proposedChanges.length,
  };
}

/**
 * Calculate confidence scores for a proposed change
 */
function calculateConfidence(change) {
  const subjectMatch = change.subjectMatchScore || 0.5;
  const evidenceDirectness = change.sourceQuote ? 0.9 : 0.3;
  const scopeContainment = 1.0; // Assume in scope if we got here
  const changeMinimality = calculateMinimality(change.originalText, change.proposedText);

  const overall =
    subjectMatch * CONFIDENCE_WEIGHTS.SUBJECT_EXACT_MATCH +
    evidenceDirectness * CONFIDENCE_WEIGHTS.EVIDENCE_DIRECTNESS +
    scopeContainment * CONFIDENCE_WEIGHTS.SCOPE_CONTAINMENT +
    changeMinimality * CONFIDENCE_WEIGHTS.CHANGE_MINIMALITY;

  return {
    subjectMatch,
    factualAlignment: evidenceDirectness,
    scopeContainment,
    changeMinimality,
    overall: Math.min(overall, 1.0),
  };
}

/**
 * Calculate how minimal a change is (higher = more minimal = better)
 */
function calculateMinimality(original, proposed) {
  if (!original || !proposed) return 0.5;

  const originalLen = original.length;
  const proposedLen = proposed.length;

  // If lengths are similar, likely a minimal change
  const lengthRatio = Math.min(originalLen, proposedLen) / Math.max(originalLen, proposedLen);

  // Check word overlap
  const originalWords = new Set(original.toLowerCase().split(/\s+/));
  const proposedWords = new Set(proposed.toLowerCase().split(/\s+/));
  const intersection = [...originalWords].filter((w) => proposedWords.has(w));
  const wordOverlap = intersection.length / Math.max(originalWords.size, proposedWords.size);

  // Higher overlap = more minimal change
  return lengthRatio * 0.3 + wordOverlap * 0.7;
}

/**
 * Apply approved changes to documents
 * Creates version history entries and updates content
 */
export async function applyDocumentChanges(approvedChanges, userId, _workspaceId) {
  if (!approvedChanges?.length) {
    return { success: false, error: 'No changes to apply', results: [] };
  }

  const results = [];

  // Group changes by document
  const changesByDoc = new Map();
  for (const change of approvedChanges) {
    if (change.status !== CHANGE_STATUS.APPROVED) continue;

    if (!changesByDoc.has(change.documentId)) {
      changesByDoc.set(change.documentId, []);
    }
    changesByDoc.get(change.documentId).push(change);
  }

  // Process each document
  for (const [documentId, changes] of changesByDoc) {
    try {
      // Get current document
      const document = await db.entities.Document.get(documentId);
      if (!document) {
        results.push({
          documentId,
          changeIds: changes.map((c) => c.id),
          success: false,
          error: 'Document not found',
        });
        continue;
      }

      // Get document content (from embedding_cache or extracted_text)
      let content = document.extracted_text || '';
      if (!content && document.embedding_cache?.chunks) {
        content = document.embedding_cache.chunks.map((c) => c.text).join('\n\n');
      }

      if (!content) {
        results.push({
          documentId,
          changeIds: changes.map((c) => c.id),
          success: false,
          error: 'No document content available',
        });
        continue;
      }

      // Calculate content hash before changes
      const originalHash = await hashContent(content);

      // Sort changes by startIndex descending (apply from end to preserve indices)
      const sortedChanges = [...changes].sort((a, b) => (b.startIndex || 0) - (a.startIndex || 0));

      let updatedContent = content;
      const appliedChangeIds = [];

      for (const change of sortedChanges) {
        const textToReplace = change.userEditedText || change.proposedText;
        const originalText = change.originalText;

        // Try to find and replace the text
        const index = updatedContent.indexOf(originalText);
        if (index >= 0) {
          updatedContent =
            updatedContent.substring(0, index) +
            textToReplace +
            updatedContent.substring(index + originalText.length);
          appliedChangeIds.push(change.id);
        } else {
          // Text not found - document may have changed
          results.push({
            documentId,
            changeId: change.id,
            success: false,
            error: 'Original text not found - document may have been modified',
          });
        }
      }

      if (appliedChangeIds.length === 0) {
        continue;
      }

      // Create version history entry
      const currentVersion = document.version || '1.0';
      const versionParts = currentVersion.split('.');
      const newVersion = `${versionParts[0]}.${parseInt(versionParts[1] || 0) + 1}.${Date.now()}`;

      const versionHistory = [
        ...(document.version_history || []),
        {
          version: currentVersion,
          file_url: document.file_url,
          created_date: new Date().toISOString(),
          created_by: userId,
          change_notes: `AI-assisted update: ${changes.map((c) => c.sectionName).join(', ')}`,
          content_hash: originalHash,
        },
      ];

      // Update document
      await db.entities.Document.update(documentId, {
        extracted_text: updatedContent,
        version: newVersion,
        version_history: versionHistory,
        updated_date: new Date().toISOString(),
      });

      results.push({
        documentId,
        documentTitle: document.title,
        changeIds: appliedChangeIds,
        success: true,
        newVersion,
        changesApplied: appliedChangeIds.length,
      });
    } catch (error) {
      console.error(`Error applying changes to document ${documentId}:`, error);
      results.push({
        documentId,
        changeIds: changes.map((c) => c.id),
        success: false,
        error: error.message,
      });
    }
  }

  return {
    success: results.some((r) => r.success),
    results,
    totalApplied: results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + (r.changesApplied || 0), 0),
  };
}

/**
 * Save the uploaded document to the project's Miscellaneous folder
 */
export async function saveUploadedDocument(file, projectId, workspaceId, _userId) {
  try {
    // Upload the file
    const fileUrl = await db.integrations.Core.UploadFile({ file });

    // Extract content for indexing
    let extractedContent = '';
    try {
      extractedContent = await extractFileContent(file);
    } catch (e) {
      console.warn('Could not extract content:', e);
    }

    // Create document record
    const document = await db.entities.Document.create({
      workspace_id: workspaceId,
      title: file.name,
      file_name: file.name,
      file_url: fileUrl.file_url,
      file_size: file.size,
      file_type: file.type,
      folder_path: '/Miscellaneous',
      assigned_to_project: projectId,
      version: '1.0',
      version_history: [],
      extracted_text: extractedContent.substring(0, 50000), // Limit stored text
      created_date: new Date().toISOString(),
    });

    return {
      success: true,
      documentId: document.id,
      documentTitle: document.title,
    };
  } catch (error) {
    console.error('Error saving uploaded document:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main orchestration function - runs the full analysis pipeline
 */
export async function runDocumentControlAnalysis(file, projectId, workspaceId, onProgress) {
  const progressCallback = onProgress || (() => {});

  try {
    // Step 1: Extract content
    progressCallback({
      step: 'extracting',
      progress: 10,
      message: 'Extracting document content...',
    });
    const content = await extractFileContent(file);

    // Step 2: Analyze content
    progressCallback({ step: 'analyzing', progress: 30, message: 'Analyzing document content...' });
    const analysis = await analyzeUploadedDocument(content, file.name);

    if (!analysis.success) {
      return { success: false, error: analysis.error };
    }

    // Step 3: Find matching sections
    progressCallback({
      step: 'matching',
      progress: 50,
      message: 'Finding related documents...',
    });
    const matches = await findMatchingSections(analysis.contentAnalysis, projectId, workspaceId);

    if (!matches.success || matches.matches.length === 0) {
      return {
        success: true,
        noMatches: true,
        message: 'No related documents found in this project.',
        contentAnalysis: analysis.contentAnalysis,
        uploadedDocument: {
          fileName: file.name,
          fileSize: file.size,
          extractedContent: content,
        },
      };
    }

    // Step 4: Generate proposed changes
    progressCallback({
      step: 'generating',
      progress: 70,
      message: 'Generating proposed changes...',
    });
    const changes = await generateProposedChanges(
      analysis.contentAnalysis,
      matches.matches,
      file.name
    );

    // Step 5: Build final result
    progressCallback({ step: 'complete', progress: 100, message: 'Analysis complete' });

    // Group changes by document
    const affectedDocuments = [];
    const changesByDoc = new Map();

    for (const change of changes.changes) {
      if (!changesByDoc.has(change.documentId)) {
        changesByDoc.set(change.documentId, {
          documentId: change.documentId,
          documentTitle: change.documentTitle,
          changes: [],
          totalChanges: 0,
          overallConfidence: 0,
        });
      }
      const doc = changesByDoc.get(change.documentId);
      doc.changes.push(change);
      doc.totalChanges++;
      doc.overallConfidence =
        (doc.overallConfidence * (doc.totalChanges - 1) + change.evidence.confidence.overall) /
        doc.totalChanges;
    }

    for (const doc of changesByDoc.values()) {
      affectedDocuments.push(doc);
    }

    return {
      success: true,
      uploadedDocument: {
        fileName: file.name,
        fileSize: file.size,
        extractedContent: content.substring(0, 1000) + (content.length > 1000 ? '...' : ''),
      },
      contentAnalysis: analysis.contentAnalysis,
      affectedDocuments,
      summary: {
        totalDocuments: affectedDocuments.length,
        totalChanges: changes.changes.length,
        highConfidenceChanges: changes.changes.filter(
          (c) => c.evidence.confidence.overall >= CONFIDENCE_THRESHOLDS.STANDARD_PROPOSAL
        ).length,
        lowConfidenceChanges: changes.changes.filter(
          (c) => c.evidence.confidence.overall < CONFIDENCE_THRESHOLDS.FLAGGED_FOR_REVIEW
        ).length,
      },
    };
  } catch (error) {
    console.error('Document control analysis error:', error);
    return {
      success: false,
      error: error.message || 'Analysis failed',
    };
  }
}

export default {
  extractFileContent,
  analyzeUploadedDocument,
  findMatchingSections,
  generateProposedChanges,
  applyDocumentChanges,
  saveUploadedDocument,
  runDocumentControlAnalysis,
};
