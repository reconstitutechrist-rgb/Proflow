/**
 * Document Control Type Definitions
 *
 * JSDoc type definitions for the AI Document Control feature.
 * These types define the data structures for analyzing uploaded documents
 * and proposing surgical edits to existing project documents.
 */

/**
 * @typedef {Object} ContentAnalysis
 * @property {Object} primarySubject
 * @property {string} primarySubject.domain - e.g., 'feature', 'budget', 'timeline', 'technical', 'policy'
 * @property {string} primarySubject.specificArea - e.g., 'user-authentication'
 * @property {string} primarySubject.scope - e.g., 'password-reset-flow'
 * @property {ExplicitFact[]} explicitFacts - Facts extracted from the document
 * @property {string[]} outOfScope - Areas explicitly NOT addressed
 * @property {string[]} statedBoundaries - Explicit scope boundaries from the document
 */

/**
 * @typedef {Object} ExplicitFact
 * @property {string} statement - The fact being stated
 * @property {number} confidence - Confidence level (0.0-1.0)
 * @property {string} sourceLocation - Where in the document this was found
 * @property {string} verbatimQuote - Direct quote from the document
 */

/**
 * @typedef {Object} ConfidenceBreakdown
 * @property {number} subjectMatch - How closely subjects match (0.0-1.0)
 * @property {number} factualAlignment - How well facts align (0.0-1.0)
 * @property {number} scopeContainment - Is change within scope (0.0-1.0)
 * @property {number} changeMinimality - Is change minimal (0.0-1.0)
 * @property {number} overall - Weighted overall score (0.0-1.0)
 */

/**
 * @typedef {Object} ChangeEvidence
 * @property {string} sourceQuote - Direct quote from uploaded document justifying change
 * @property {string} sourceLocation - Location in uploaded document
 * @property {string} matchReason - 'exact_subject_match' | 'related_topic' | 'possibly_affected'
 * @property {ConfidenceBreakdown} confidence - Detailed confidence breakdown
 */

/**
 * @typedef {Object} ScopeJustification
 * @property {boolean} withinPrimarySubject - Is change within primary subject
 * @property {boolean} withinSpecificArea - Is change within specific area
 * @property {boolean} withinStatedScope - Is change within stated scope
 * @property {boolean} crossesFeatureBoundary - Does change cross feature boundaries
 * @property {boolean} requiresUserConfirmation - Does change need explicit confirmation
 */

/**
 * @typedef {Object} ProposedChange
 * @property {string} id - Unique change identifier
 * @property {string} documentId - Target document UUID
 * @property {string} documentTitle - Target document title
 * @property {string} sectionName - Name of section being modified
 * @property {number|null} pageNumber - Page number if applicable
 * @property {string} originalText - Current text to be replaced
 * @property {string} proposedText - New text to replace with
 * @property {number} startIndex - Start position in document content
 * @property {number} endIndex - End position in document content
 * @property {'pending'|'approved'|'rejected'|'applied'} status - Change status
 * @property {string|null} userEditedText - User's modified text (if edited)
 * @property {ChangeEvidence} evidence - Evidence chain for the change
 * @property {ScopeJustification} scopeJustification - Scope validation
 * @property {string[]} nonImpact - What this change does NOT affect
 */

/**
 * @typedef {Object} AffectedDocument
 * @property {string} documentId - Document UUID
 * @property {string} documentTitle - Document title
 * @property {number} totalChanges - Number of proposed changes
 * @property {number} overallConfidence - Average confidence score
 * @property {ProposedChange[]} changes - Array of proposed changes
 */

/**
 * @typedef {Object} UploadedDocumentInfo
 * @property {string} id - Generated ID for the upload
 * @property {string} fileName - Original file name
 * @property {number} fileSize - File size in bytes
 * @property {string} extractedContent - Text content extracted from file
 * @property {string|null} linkedToProject - Project UUID if linked
 * @property {string|null} linkedToAssignment - Assignment UUID if linked
 * @property {string|null} linkedToTask - Task UUID if linked
 */

/**
 * @typedef {Object} AnalysisSummary
 * @property {number} totalDocuments - Number of documents with changes
 * @property {number} totalChanges - Total number of proposed changes
 * @property {number} highConfidenceChanges - Changes with confidence >= 0.8
 * @property {number} lowConfidenceChanges - Changes with confidence < 0.5
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {UploadedDocumentInfo} uploadedDocument - Info about uploaded doc
 * @property {AffectedDocument[]} affectedDocuments - Documents with proposed changes
 * @property {AnalysisSummary} summary - Summary statistics
 * @property {ContentAnalysis} contentAnalysis - Analysis of uploaded content
 */

/**
 * @typedef {Object} ApplyResult
 * @property {string} documentId - Document that was updated
 * @property {string} changeId - Change ID that was applied
 * @property {boolean} success - Whether apply succeeded
 * @property {string|null} error - Error message if failed
 * @property {string|null} newVersion - New version number after update
 */

/**
 * @typedef {'upload'|'analyzing'|'preview'|'applying'|'complete'|'error'} DocumentControlStep
 */

/**
 * @typedef {Object} DocumentControlState
 * @property {boolean} isExpanded - Whether panel is expanded
 * @property {DocumentControlStep} currentStep - Current workflow step
 * @property {File|null} uploadedFile - The uploaded file object
 * @property {string|null} linkedAssignment - Selected assignment UUID
 * @property {string|null} linkedTask - Selected task UUID
 * @property {number} analysisProgress - Progress percentage (0-100)
 * @property {string} analysisStatus - Current status message
 * @property {ProposedChange[]} proposedChanges - All proposed changes
 * @property {Set<string>} expandedDocuments - Document IDs with expanded cards
 * @property {ApplyResult[]} appliedChanges - Results of applied changes
 * @property {string|null} savedDocumentId - ID of saved uploaded doc
 * @property {string|null} error - Error message if any
 */

// Confidence thresholds from design document
export const CONFIDENCE_THRESHOLDS = {
  AUTO_APPROVE_ELIGIBLE: 0.9, // High confidence, minimal risk
  STANDARD_PROPOSAL: 0.7, // Normal confidence, show to user
  FLAGGED_FOR_REVIEW: 0.5, // Lower confidence, highlight concerns
  DO_NOT_PROPOSE: 0.3, // Below this, don't suggest the change
};

// Confidence factor weights from design document
export const CONFIDENCE_WEIGHTS = {
  SUBJECT_EXACT_MATCH: 0.3,
  EVIDENCE_DIRECTNESS: 0.3,
  SCOPE_CONTAINMENT: 0.25,
  CHANGE_MINIMALITY: 0.15,
};

// Change status values
export const CHANGE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  APPLIED: 'applied',
};

// Document control workflow steps
export const CONTROL_STEPS = {
  UPLOAD: 'upload',
  ANALYZING: 'analyzing',
  PREVIEW: 'preview',
  APPLYING: 'applying',
  COMPLETE: 'complete',
  ERROR: 'error',
};

export default {
  CONFIDENCE_THRESHOLDS,
  CONFIDENCE_WEIGHTS,
  CHANGE_STATUS,
  CONTROL_STEPS,
};
