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
  // Only enable in development mode
  if (import.meta.env.MODE !== 'development') {
    return <>{children}</>;
  }

  const location = useLocation();

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Current mode: 'idle' | 'select' | 'annotate'
  const [currentMode, setCurrentMode] = useState('idle');

  // Selected element info
  const [selectedElement, setSelectedElement] = useState({
    node: null,
    selector: '',
    componentPath: null,
    componentName: null,
    dimensions: { width: 0, height: 0, x: 0, y: 0 }
  });

  // Screenshot and annotations
  const [screenshot, setScreenshot] = useState({
    dataUrl: null,
    annotations: []
  });

  // Issue details
  const [issueDescription, setIssueDescription] = useState('');
  const [requestedChange, setRequestedChange] = useState('');

  // Viewport size - updates on window resize
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Update viewport size on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Actions
  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
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

  const updateSelectedElement = useCallback((elementInfo) => {
    setSelectedElement(elementInfo);
    setCurrentMode('idle');
  }, []);

  const clearSelectedElement = useCallback(() => {
    setSelectedElement({
      node: null,
      selector: '',
      componentPath: null,
      componentName: null,
      dimensions: { width: 0, height: 0, x: 0, y: 0 }
    });
  }, []);

  const updateScreenshot = useCallback((dataUrl) => {
    setScreenshot(prev => ({ ...prev, dataUrl }));
  }, []);

  const addAnnotation = useCallback((annotation) => {
    setScreenshot(prev => ({
      ...prev,
      annotations: [...prev.annotations, annotation]
    }));
  }, []);

  const undoAnnotation = useCallback(() => {
    setScreenshot(prev => ({
      ...prev,
      annotations: prev.annotations.slice(0, -1)
    }));
  }, []);

  const clearAnnotations = useCallback(() => {
    setScreenshot(prev => ({
      ...prev,
      annotations: []
    }));
  }, []);

  const clearScreenshot = useCallback(() => {
    setScreenshot({
      dataUrl: null,
      annotations: []
    });
  }, []);

  const resetAll = useCallback(() => {
    setCurrentMode('idle');
    setSelectedElement({
      node: null,
      selector: '',
      componentPath: null,
      componentName: null,
      dimensions: { width: 0, height: 0, x: 0, y: 0 }
    });
    setScreenshot({
      dataUrl: null,
      annotations: []
    });
    setIssueDescription('');
    setRequestedChange('');
  }, []);

  const value = {
    // State
    isPanelOpen,
    currentMode,
    selectedElement,
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
    clearSelectedElement,
    updateScreenshot,
    addAnnotation,
    undoAnnotation,
    clearAnnotations,
    clearScreenshot,
    setIssueDescription,
    setRequestedChange,
    resetAll
  };

  return (
    <BugReporterContext.Provider value={value}>
      {children}
    </BugReporterContext.Provider>
  );
};

export default BugReporterProvider;
