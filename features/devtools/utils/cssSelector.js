/**
 * Generates a unique CSS selector for a given DOM element
 * Priority: id > data-testid > unique class combination > nth-child path
 */
export function generateSelector(element) {
  if (!element || element === document.body || element === document.documentElement) {
    return 'body';
  }

  // Priority 1: ID
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  // Priority 2: data-testid
  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }

  // Priority 3: Unique class combination (filter out generated classes)
  const classes = Array.from(element.classList)
    .filter(c => !isGeneratedClassName(c))
    .map(c => CSS.escape(c));

  if (classes.length > 0) {
    const classSelector = `.${classes.join('.')}`;
    try {
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
    } catch (e) {
      // Invalid selector, continue to fallback
    }
  }

  // Priority 4: Build path from root
  return buildSelectorPath(element);
}

/**
 * Check if a class name is likely auto-generated (CSS-in-JS, etc.)
 */
function isGeneratedClassName(className) {
  // Common patterns for generated class names
  const generatedPatterns = [
    /^css-/,           // Emotion
    /^sc-/,            // Styled Components
    /^emotion-/,       // Emotion
    /^_[a-z0-9]+$/i,   // CSS Modules hashes
    /^[a-z]{6,}$/i,    // Random string hashes
    /^jsx-/,           // styled-jsx
    /^svelte-/,        // Svelte
  ];

  return generatedPatterns.some(pattern => pattern.test(className));
}

/**
 * Build a selector path from the element up to a unique ancestor
 */
function buildSelectorPath(element) {
  const path = [];
  let current = element;

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();

    // If element has an ID, use it and stop
    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break;
    }

    // Add useful classes if available
    const meaningfulClasses = Array.from(current.classList)
      .filter(c => !isGeneratedClassName(c))
      .slice(0, 2)  // Limit to first 2 classes
      .map(c => CSS.escape(c));

    if (meaningfulClasses.length > 0) {
      selector += `.${meaningfulClasses.join('.')}`;
    }

    // Add nth-child for disambiguation
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;

    // Stop if we've built enough of a path
    if (path.length >= 4) break;
  }

  return path.join(' > ');
}

/**
 * Get element dimensions and position
 */
export function getElementDimensions(element) {
  if (!element) {
    return { width: 0, height: 0, x: 0, y: 0 };
  }

  const rect = element.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY)
  };
}

/**
 * Get computed styles for an element (useful subset)
 */
export function getElementStyles(element) {
  if (!element) return {};

  const computed = window.getComputedStyle(element);
  return {
    display: computed.display,
    position: computed.position,
    color: computed.color,
    backgroundColor: computed.backgroundColor,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    padding: computed.padding,
    margin: computed.margin,
    border: computed.border,
    borderRadius: computed.borderRadius
  };
}
