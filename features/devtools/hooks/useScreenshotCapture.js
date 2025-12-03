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

    try {
      // Temporarily hide the bug reporter panel
      const panel = document.querySelector(panelSelector);
      const panelDisplay = panel?.style.display;
      const panelVisibility = panel?.style.visibility;

      if (panel) {
        panel.style.visibility = 'hidden';
      }

      // Also hide any overlay elements
      const overlays = document.querySelectorAll('[data-bug-reporter]');
      const overlayStates = [];
      overlays.forEach(overlay => {
        overlayStates.push({
          element: overlay,
          visibility: overlay.style.visibility
        });
        overlay.style.visibility = 'hidden';
      });

      // Wait a frame for the DOM to update
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Capture the screenshot
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        backgroundColor: null,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        ignoreElements: (element) => {
          // Ignore bug reporter elements
          return element.hasAttribute('data-bug-reporter') ||
                 element.hasAttribute('data-bug-reporter-panel');
        }
      });

      // Restore panel visibility
      if (panel) {
        if (panelVisibility !== undefined) {
          panel.style.visibility = panelVisibility;
        }
        if (panelDisplay !== undefined) {
          panel.style.display = panelDisplay;
        }
      }

      // Restore overlay visibility
      overlayStates.forEach(({ element, visibility }) => {
        element.style.visibility = visibility;
      });

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');

      if (onCapture) {
        onCapture(dataUrl);
      }

      return dataUrl;
    } catch (err) {
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
    error
  };
}

export default useScreenshotCapture;
