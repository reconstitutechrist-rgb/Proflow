/**
 * Attempts to detect React component information from a DOM element
 * Works by accessing React's internal fiber structure (development mode only)
 */
export function getComponentInfo(element) {
  if (!element) return null;

  // Find the React fiber key
  const fiberKey = Object.keys(element).find(
    (key) => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
  );

  if (!fiberKey) {
    return null;
  }

  try {
    const fiber = element[fiberKey];
    let componentFiber = fiber;
    const components = [];

    // Walk up the fiber tree to find function/class components
    while (componentFiber) {
      if (typeof componentFiber.type === 'function') {
        const componentName =
          componentFiber.type.displayName || componentFiber.type.name || 'Anonymous';

        // Get source file if available (dev mode with source maps)
        const source = componentFiber._debugSource;
        let filePath = null;

        if (source) {
          // Clean up the file path
          filePath = source.fileName;

          // Try to make path relative to project root
          const projectIndicators = ['/src/', '/features/', '/components/', '/pages/'];
          for (const indicator of projectIndicators) {
            const index = filePath.indexOf(indicator);
            if (index !== -1) {
              filePath = filePath.substring(index);
              break;
            }
          }

          if (source.lineNumber) {
            filePath += `:${source.lineNumber}`;
          }
        }

        components.push({
          name: componentName,
          filePath,
          // Get a subset of props (avoid circular refs and functions)
          props: getSerializableProps(componentFiber.memoizedProps),
        });

        // Stop after finding 3 components (enough context)
        if (components.length >= 3) break;
      }

      componentFiber = componentFiber.return;
    }

    if (components.length === 0) {
      return null;
    }

    // Return the most immediate component
    return {
      componentName: components[0].name,
      filePath: components[0].filePath,
      componentHierarchy: components.map((c) => c.name),
      props: components[0].props,
    };
  } catch (error) {
    console.warn('Error detecting React component:', error);
    return null;
  }
}

/**
 * Extract serializable props (avoiding functions and circular references)
 */
function getSerializableProps(props) {
  if (!props) return {};

  const result = {};
  const maxProps = 10; // Limit number of props
  let count = 0;

  for (const key of Object.keys(props)) {
    if (count >= maxProps) break;

    // Skip internal props and children
    if (key.startsWith('_') || key === 'children') continue;

    const value = props[key];
    const type = typeof value;

    if (type === 'string' || type === 'number' || type === 'boolean') {
      result[key] = value;
      count++;
    } else if (value === null || value === undefined) {
      result[key] = value;
      count++;
    } else if (type === 'function') {
      result[key] = '[Function]';
      count++;
    } else if (Array.isArray(value)) {
      result[key] = `[Array(${value.length})]`;
      count++;
    } else if (type === 'object') {
      result[key] = '[Object]';
      count++;
    }
  }

  return result;
}

/**
 * Get the React DevTools hook if available
 */
export function getReactDevToolsHook() {
  if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    return window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  }
  return null;
}

/**
 * Check if React DevTools is available
 */
export function isReactDevToolsAvailable() {
  return getReactDevToolsHook() !== null;
}
