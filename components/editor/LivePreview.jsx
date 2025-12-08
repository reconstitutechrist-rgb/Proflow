import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * LivePreview - Real-time preview of document content
 * Renders HTML content with sanitization and prose styling
 */
export default function LivePreview({
  content = '',
  title = '',
  description = '',
  className = '',
  showTitle = true,
  showDescription = true,
  maxHeight = 'none',
}) {
  // Sanitize content for safe rendering
  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(content, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target'], // Allow target attribute for links
      ALLOWED_TAGS: [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'br',
        'hr',
        'ul',
        'ol',
        'li',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'del',
        'a',
        'img',
        'blockquote',
        'pre',
        'code',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'div',
        'span',
        'sup',
        'sub',
        'mark',
      ],
    });
  }, [content]);

  const isEmpty = !content || content.trim() === '' || content === '<p></p>';

  const PreviewContent = () => (
    <div className="p-6">
      {showTitle && title && (
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
      )}

      {showDescription && description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 border-l-4 border-indigo-500 pl-4 italic">
          {description}
        </p>
      )}

      {isEmpty ? (
        <div className="flex items-center justify-center min-h-[200px] text-gray-400 dark:text-gray-600">
          <p className="text-center">
            <span className="block text-4xl mb-2">📝</span>
            Start typing to see preview...
          </p>
        </div>
      ) : (
        <div
          className="prose prose-gray dark:prose-invert max-w-none
            prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white
            prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg
            prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
            prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900 dark:prose-strong:text-white
            prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-4 prose-pre:rounded-lg
            prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:pl-4 prose-blockquote:italic
            prose-ul:list-disc prose-ol:list-decimal
            prose-img:rounded-lg prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      )}
    </div>
  );

  if (maxHeight !== 'none') {
    return (
      <Card className={`bg-white dark:bg-gray-900 ${className}`}>
        <ScrollArea style={{ maxHeight }} className="w-full">
          <CardContent className="p-0">
            <PreviewContent />
          </CardContent>
        </ScrollArea>
      </Card>
    );
  }

  return (
    <Card className={`bg-white dark:bg-gray-900 ${className}`}>
      <CardContent className="p-0">
        <PreviewContent />
      </CardContent>
    </Card>
  );
}
