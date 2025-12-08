import DOMPurify from 'dompurify';

/**
 * Default allowed HTML tags for rich text content
 */
const DEFAULT_ALLOWED_TAGS = [
  'b',
  'i',
  'em',
  'strong',
  'a',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'code',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
  'figure',
  'figcaption',
  'hr',
  'sub',
  'sup',
  'mark',
];

/**
 * Default allowed attributes
 */
const DEFAULT_ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'class',
  'id',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'style',
  'data-*',
];

/**
 * Strict allowed tags for user-generated content (comments, messages)
 */
const STRICT_ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code'];

/**
 * Strict allowed attributes
 */
const STRICT_ALLOWED_ATTR = ['href', 'target', 'rel'];

/**
 * Sanitize HTML content with default settings
 * Suitable for document content and rich text
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitize(html) {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: DEFAULT_ALLOWED_TAGS,
    ALLOWED_ATTR: DEFAULT_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
  });
}

/**
 * Sanitize HTML with strict settings
 * Suitable for user comments, chat messages, and untrusted input
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeStrict(html) {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: STRICT_ALLOWED_TAGS,
    ALLOWED_ATTR: STRICT_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize and return plain text (strip all HTML)
 * @param {string} html - HTML string to convert to plain text
 * @returns {string} Plain text without HTML tags
 */
export function sanitizeToText(html) {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize HTML for inline display (no block elements)
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML with only inline elements
 */
export function sanitizeInline(html) {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'span', 'mark'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

/**
 * Sanitize URL to prevent XSS via javascript: protocol
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or empty string if unsafe
 */
export function sanitizeUrl(url) {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }

  return url;
}

/**
 * Sanitize HTML and add rel="noopener noreferrer" to all links
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML with secure links
 */
export function sanitizeWithSecureLinks(html) {
  if (!html) return '';

  // First sanitize the HTML
  const sanitized = sanitize(html);

  // Then add security attributes to links
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitized;

  const links = tempDiv.querySelectorAll('a');
  links.forEach((link) => {
    if (link.getAttribute('target') === '_blank') {
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return tempDiv.innerHTML;
}

/**
 * Check if HTML content is safe (no script tags, event handlers, etc.)
 * @param {string} html - HTML string to check
 * @returns {boolean} True if content appears safe
 */
export function isHtmlSafe(html) {
  if (!html) return true;

  const sanitized = sanitize(html);

  // Compare lengths - if they differ significantly, content was modified
  const originalLength = html.length;
  const sanitizedLength = sanitized.length;

  // Allow for minor differences due to whitespace normalization
  return Math.abs(originalLength - sanitizedLength) < originalLength * 0.1;
}

export default sanitize;
