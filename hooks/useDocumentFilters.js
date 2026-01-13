import { useState, useMemo, useCallback } from 'react';

/**
 * Quick filter types
 */
export const QUICK_FILTERS = {
  ALL: 'all',
  STARRED: 'starred',
  RECENT: 'recent',
  TRASH: 'trash',
};

/**
 * Default filter state
 */
const DEFAULT_FILTERS = {
  quickFilter: QUICK_FILTERS.ALL,
  selectedProject: null,
  selectedAssignment: null,
  searchQuery: '',
  typeFilter: 'all',
};

/**
 * Hook for managing document filter state and computing filtered documents
 * @param {Object} options - Hook options
 * @param {Array} options.documents - All documents from the workspace
 * @param {string} options.workspaceId - Current workspace ID
 * @returns {Object} Filter state, setters, and computed values
 */
export function useDocumentFilters({ documents = [], workspaceId }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  /**
   * Set the quick filter (All, Starred, Recent, Trash)
   */
  const setQuickFilter = useCallback((filter) => {
    setFilters((prev) => ({
      ...prev,
      quickFilter: filter,
      // Clear project/assignment selection when changing quick filter
      selectedProject: null,
      selectedAssignment: null,
    }));
  }, []);

  /**
   * Set the selected project filter
   */
  const setSelectedProject = useCallback((projectId) => {
    setFilters((prev) => ({
      ...prev,
      selectedProject: projectId,
      selectedAssignment: null, // Clear assignment when selecting project
    }));
  }, []);

  /**
   * Set the selected assignment filter
   */
  const setSelectedAssignment = useCallback((assignmentId) => {
    setFilters((prev) => ({
      ...prev,
      selectedAssignment: assignmentId,
    }));
  }, []);

  /**
   * Set the search query
   */
  const setSearchQuery = useCallback((query) => {
    setFilters((prev) => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  /**
   * Set the document type filter
   */
  const setTypeFilter = useCallback((type) => {
    setFilters((prev) => ({
      ...prev,
      typeFilter: type,
    }));
  }, []);

  /**
   * Clear all filters to defaults
   */
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  /**
   * Compute document counts for each quick filter
   */
  const documentCounts = useMemo(() => {
    const validDocs = documents.filter((doc) => doc.document_type !== 'folder_placeholder');

    return {
      all: validDocs.filter((doc) => !doc.is_deleted && !doc.is_outdated).length,
      starred: validDocs.filter((doc) => doc.is_starred && !doc.is_deleted).length,
      recent: Math.min(20, validDocs.filter((doc) => !doc.is_deleted && !doc.is_outdated).length),
      trash: validDocs.filter((doc) => doc.is_deleted).length,
    };
  }, [documents]);

  /**
   * Compute filtered documents based on all active filters
   */
  const filteredDocuments = useMemo(() => {
    let result = documents.filter((doc) => doc.document_type !== 'folder_placeholder');

    // Step 1: Apply quick filter
    switch (filters.quickFilter) {
      case QUICK_FILTERS.ALL:
        // Show non-deleted, non-outdated documents
        result = result.filter((doc) => !doc.is_deleted && !doc.is_outdated);
        break;

      case QUICK_FILTERS.STARRED:
        // Show starred, non-deleted documents
        result = result.filter((doc) => doc.is_starred && !doc.is_deleted);
        break;

      case QUICK_FILTERS.RECENT:
        // Show non-deleted, non-outdated, sorted by updated_date, limit 20
        result = result
          .filter((doc) => !doc.is_deleted && !doc.is_outdated)
          .sort((a, b) => {
            const dateA = new Date(a.updated_date || a.created_date);
            const dateB = new Date(b.updated_date || b.created_date);
            return dateB - dateA;
          })
          .slice(0, 20);
        break;

      case QUICK_FILTERS.TRASH:
        // Show only deleted documents
        result = result.filter((doc) => doc.is_deleted);
        break;

      default:
        result = result.filter((doc) => !doc.is_deleted && !doc.is_outdated);
    }

    // Step 2: Apply project filter (if not viewing trash)
    if (filters.selectedProject && filters.quickFilter !== QUICK_FILTERS.TRASH) {
      result = result.filter((doc) => doc.assigned_to_project === filters.selectedProject);
    }

    // Step 3: Apply assignment filter (if not viewing trash)
    if (filters.selectedAssignment && filters.quickFilter !== QUICK_FILTERS.TRASH) {
      result = result.filter((doc) =>
        doc.assigned_to_assignments?.includes(filters.selectedAssignment)
      );
    }

    // Step 4: Apply search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (doc) =>
          doc.title?.toLowerCase().includes(query) ||
          doc.file_name?.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query)
      );
    }

    // Step 5: Apply type filter
    if (filters.typeFilter && filters.typeFilter !== 'all') {
      result = result.filter((doc) => doc.document_type === filters.typeFilter);
    }

    // Sort results (unless already sorted for 'recent')
    if (filters.quickFilter !== QUICK_FILTERS.RECENT) {
      result = result.sort((a, b) => {
        // Starred documents first (if not in starred filter already)
        if (filters.quickFilter !== QUICK_FILTERS.STARRED) {
          if (a.is_starred && !b.is_starred) return -1;
          if (!a.is_starred && b.is_starred) return 1;
        }
        // Then by date
        const dateA = new Date(a.updated_date || a.created_date);
        const dateB = new Date(b.updated_date || b.created_date);
        return dateB - dateA;
      });
    }

    return result;
  }, [documents, filters]);

  /**
   * Get documents for a specific project (useful for tree counts)
   */
  const getProjectDocumentCount = useCallback(
    (projectId) => {
      return documents.filter(
        (doc) =>
          doc.assigned_to_project === projectId &&
          !doc.is_deleted &&
          !doc.is_outdated &&
          doc.document_type !== 'folder_placeholder'
      ).length;
    },
    [documents]
  );

  /**
   * Get documents for a specific assignment (useful for tree counts)
   */
  const getAssignmentDocumentCount = useCallback(
    (assignmentId) => {
      return documents.filter(
        (doc) =>
          doc.assigned_to_assignments?.includes(assignmentId) &&
          !doc.is_deleted &&
          !doc.is_outdated &&
          doc.document_type !== 'folder_placeholder'
      ).length;
    },
    [documents]
  );

  /**
   * Check if any filters are active (beyond defaults)
   */
  const hasActiveFilters = useMemo(() => {
    return (
      filters.quickFilter !== QUICK_FILTERS.ALL ||
      filters.selectedProject !== null ||
      filters.selectedAssignment !== null ||
      filters.searchQuery.trim() !== '' ||
      filters.typeFilter !== 'all'
    );
  }, [filters]);

  return {
    // Filter state
    filters,

    // Filter setters
    setQuickFilter,
    setSelectedProject,
    setSelectedAssignment,
    setSearchQuery,
    setTypeFilter,
    clearFilters,

    // Computed values
    filteredDocuments,
    documentCounts,
    hasActiveFilters,

    // Utility functions
    getProjectDocumentCount,
    getAssignmentDocumentCount,
  };
}

export default useDocumentFilters;
