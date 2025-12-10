import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router';

const BugReporterContext = createContext();

export const useBugReporter = () => {
  const context = useContext(BugReporterContext);
  if (!context) {
    throw new Error('useBugReporter must be used within BugReporterProvider');
  }
  return context;
};

export const BugReporterProvider = ({ children }) => {
  const location = useLocation();

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Current mode: 'idle' | 'select' | 'annotate'
  const [currentMode, setCurrentMode] = useState('idle');

  // Selected elements info (supports multi-select)
  const [selectedElements, setSelectedElements] = useState([]);

  // Element groups (array of arrays of element indices)
  const [elementGroups, setElementGroups] = useState([]);

  // Backwards compatibility: derive single selectedElement from first element
  const selectedElement = selectedElements[0] || {
    node: null,
    selector: '',
    componentPath: null,
    componentName: null,
    dimensions: { width: 0, height: 0, x: 0, y: 0 },
  };

  // Screenshot and annotations
  const [screenshot, setScreenshot] = useState({
    dataUrl: null,
    annotations: [],
  });

  // Issue details
  const [issueDescription, setIssueDescription] = useState('');
  const [requestedChange, setRequestedChange] = useState('');

  // Viewport size - updates on window resize
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Update viewport size on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Actions
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const startSelectMode = useCallback(() => {
    setCurrentMode('select');
  }, []);

  const startAnnotateMode = useCallback(() => {
    setCurrentMode('annotate');
  }, []);

  const exitMode = useCallback(() => {
    setCurrentMode('idle');
  }, []);

  // Add element to selection (multi-select with Ctrl+Click)
  const addSelectedElement = useCallback((elementInfo) => {
    setSelectedElements((prev) => [...prev, elementInfo]);
  }, []);

  // Remove element from selection by index
  const removeSelectedElement = useCallback((index) => {
    setSelectedElements((prev) => prev.filter((_, i) => i !== index));
    // Also remove from any groups
    setElementGroups((prev) =>
      prev
        .map((group) => group.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)))
        .filter((group) => group.length > 1)
    );
  }, []);

  // Update selected element - handles both single and multi-select
  const updateSelectedElement = useCallback((elementInfo, isMultiSelect = false) => {
    if (isMultiSelect) {
      // Add to existing selection, stay in select mode for more selections
      setSelectedElements((prev) => [...prev, elementInfo]);
      // Don't change mode - stay in select mode for continued multi-select
    } else {
      // Replace selection with single element
      setSelectedElements([elementInfo]);
      setElementGroups([]);
      setCurrentMode('idle');
    }
  }, []);

  // Clear all selected elements
  const clearSelectedElements = useCallback(() => {
    setSelectedElements([]);
    setElementGroups([]);
  }, []);

  // Backwards compat alias
  const clearSelectedElement = clearSelectedElements;

  // Create a group from selected element indices
  const createElementGroup = useCallback((indices) => {
    if (indices.length < 2) return;
    setElementGroups((prev) => [...prev, indices]);
  }, []);

  // Remove a group (ungroup elements)
  const removeElementGroup = useCallback((groupIndex) => {
    setElementGroups((prev) => prev.filter((_, i) => i !== groupIndex));
  }, []);

  const updateScreenshot = useCallback((dataUrl) => {
    setScreenshot((prev) => ({ ...prev, dataUrl }));
  }, []);

  const addAnnotation = useCallback((annotation) => {
    setScreenshot((prev) => ({
      ...prev,
      annotations: [...prev.annotations, annotation],
    }));
  }, []);

  const undoAnnotation = useCallback(() => {
    setScreenshot((prev) => ({
      ...prev,
      annotations: prev.annotations.slice(0, -1),
    }));
  }, []);

  const clearAnnotations = useCallback(() => {
    setScreenshot((prev) => ({
      ...prev,
      annotations: [],
    }));
  }, []);

  const clearScreenshot = useCallback(() => {
    setScreenshot({
      dataUrl: null,
      annotations: [],
    });
  }, []);

  const resetAll = useCallback(() => {
    setCurrentMode('idle');
    setSelectedElements([]);
    setElementGroups([]);
    setScreenshot({
      dataUrl: null,
      annotations: [],
    });
    setIssueDescription('');
    setRequestedChange('');
  }, []);

  const value = {
    // State
    isPanelOpen,
    currentMode,
    selectedElement, // Backwards compat: first element
    selectedElements, // New: full array
    elementGroups, // New: grouping info
    screenshot,
    issueDescription,
    requestedChange,
    viewportSize,
    currentRoute: location.pathname,

    // Actions
    setIsPanelOpen,
    togglePanel,
    setCurrentMode,
    startSelectMode,
    startAnnotateMode,
    exitMode,
    updateSelectedElement,
    addSelectedElement,
    removeSelectedElement,
    clearSelectedElement,
    clearSelectedElements,
    createElementGroup,
    removeElementGroup,
    updateScreenshot,
    addAnnotation,
    undoAnnotation,
    clearAnnotations,
    clearScreenshot,
    setIssueDescription,
    setRequestedChange,
    resetAll,
  };

  return <BugReporterContext.Provider value={value}>{children}</BugReporterContext.Provider>;
};

export default BugReporterProvider;
