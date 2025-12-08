import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

/**
 * Hook for capturing screenshots using html2canvas
 */
export function useScreenshotCapture({ onCapture, panelSelector = '[data-bug-reporter-panel]' }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    setError(null);

    // Store elements to restore
    const panel = document.querySelector(panelSelector);
    const overlays = document.querySelectorAll('[data-bug-reporter]');

    // Store original styles
    const panelOriginalVisibility = panel?.style.visibility;
    const overlayStates = Array.from(overlays).map((overlay) => ({
      element: overlay,
      visibility: overlay.style.visibility,
    }));

    // Function to restore visibility
    const restoreVisibility = () => {
      if (panel) {
        panel.style.visibility = panelOriginalVisibility || '';
      }
      overlayStates.forEach(({ element, visibility }) => {
        element.style.visibility = visibility || '';
      });
    };

    try {
      // Hide bug reporter elements
      if (panel) {
        panel.style.visibility = 'hidden';
      }
      overlays.forEach((overlay) => {
        overlay.style.visibility = 'hidden';
      });

      // Wait for DOM to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture the screenshot
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        ignoreElements: (element) => {
          // Ignore bug reporter elements
          if (!element || !element.hasAttribute) return false;
          return (
            element.hasAttribute('data-bug-reporter') ||
            element.hasAttribute('data-bug-reporter-panel')
          );
        },
      });

      // Restore visibility before processing
      restoreVisibility();

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');

      if (onCapture) {
        onCapture(dataUrl);
      }

      return dataUrl;
    } catch (err) {
      // Always restore visibility on error
      restoreVisibility();

      console.error('Screenshot capture failed:', err);
      setError(err.message || 'Failed to capture screenshot');
      throw err;
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture, panelSelector]);

  return {
    captureScreenshot,
    isCapturing,
    error,
  };
}

export default useScreenshotCapture;
