import React, { useEffect, Component } from 'react';
import { Button } from '@/components/ui/button';
import { Bug, AlertTriangle } from 'lucide-react';
import { BugReporterProvider, useBugReporter } from './BugReporterProvider';
import { DevToolsPanel } from './components/DevToolsPanel';
import { ElementSelector } from './components/ElementSelector';

/**
 * Error boundary specifically for DevTools - prevents crashes from breaking the main app
 */
class DevToolsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DevTools Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Show a small error indicator instead of crashing the whole app
      return (
        <div className="fixed bottom-20 md:bottom-6 left-6 z-40">
          <Button
            className="w-14 h-14 rounded-full shadow-lg bg-gray-500 hover:bg-gray-600 cursor-not-allowed"
            size="icon"
            title={`DevTools Error: ${this.state.error?.message || 'Unknown error'}`}
            onClick={() => {
              console.error('DevTools failed to load:', this.state.error);
              alert(
                `DevTools Error: ${this.state.error?.message}\n\nCheck browser console for details.`
              );
            }}
          >
            <AlertTriangle className="w-6 h-6 text-white" />
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Internal component that uses the bug reporter context
 */
function BugReporterContent() {
  const { isPanelOpen, setIsPanelOpen, currentMode, updateSelectedElement, exitMode } =
    useBugReporter();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Skip if in input/textarea
      if (
        ['INPUT', 'TEXTAREA'].includes(event.target.tagName) ||
        event.target.contentEditable === 'true'
      ) {
        return;
      }

      // Ctrl+Shift+B to toggle panel
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setIsPanelOpen((prev) => !prev);
      }

      // Escape to cancel current mode
      if (event.key === 'Escape' && currentMode !== 'idle') {
        event.preventDefault();
        exitMode();
        setIsPanelOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentMode, exitMode, setIsPanelOpen]);

  const handleElementSelected = (elementInfo) => {
    updateSelectedElement(elementInfo);
    setIsPanelOpen(true);
  };

  const handleSelectionCancel = () => {
    exitMode();
    setIsPanelOpen(true);
  };

  return (
    <>
      {/* Floating toggle button */}
      <Button
        onClick={() => setIsPanelOpen(true)}
        className="fixed bottom-20 md:bottom-6 left-6 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 z-40"
        size="icon"
        data-bug-reporter="toggle-button"
        title="Visual Bug Reporter (Ctrl+Shift+B)"
      >
        <Bug className="w-6 h-6 text-white" />
      </Button>

      {/* Side panel */}
      <DevToolsPanel />

      {/* Element selector overlay (when in select mode) */}
      <ElementSelector
        isActive={currentMode === 'select'}
        onSelect={handleElementSelected}
        onCancel={handleSelectionCancel}
      />
    </>
  );
}

/**
 * Visual Bug Reporter - Development tool for capturing and reporting UI issues
 *
 * Features:
 * - Element selection with component detection
 * - Screenshot capture with annotation tools
 * - Claude-ready prompt generation
 *
 * Renders in development mode OR when VITE_ENABLE_DEVTOOLS is set to 'true'.
 * Wrapped in error boundary to prevent crashes from breaking the main app.
 */
export function BugReporter() {
  // Render in development mode OR when explicitly enabled via env var
  const isDev = import.meta.env.MODE === 'development';
  const isExplicitlyEnabled = import.meta.env.VITE_ENABLE_DEVTOOLS === 'true';

  if (!isDev && !isExplicitlyEnabled) {
    return null;
  }

  return (
    <DevToolsErrorBoundary>
      <BugReporterProvider>
        <BugReporterContent />
      </BugReporterProvider>
    </DevToolsErrorBoundary>
  );
}

export default BugReporter;
