import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, FileText, Download, FileDown } from "lucide-react";
import { toast } from "sonner";

// Comprehensive HTML to Markdown converter
const htmlToMarkdown = (html) => {
  if (!html) return "";
  
  let markdown = html;
  
  // Remove HTML comments
  markdown = markdown.replace(/<!--[\s\S]*?-->/g, '');
  
  // Headers (h1-h6)
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n');
  
  // Bold
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  
  // Italic
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Underline (Markdown doesn't have native underline, use HTML)
  markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>');
  
  // Strikethrough
  markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  markdown = markdown.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
  markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
  
  // Code blocks
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '\n```\n$1\n```\n');
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n');
  
  // Inline code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // Links
  markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Images
  markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)');
  
  // Blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
    return '\n> ' + content.trim().replace(/\n/g, '\n> ') + '\n';
  });
  
  // Unordered lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
    let items = content.match(/<li[^>]*>(.*?)<\/li>/gis);
    if (items) {
      return '\n' + items.map(item => {
        const text = item.replace(/<li[^>]*>(.*?)<\/li>/i, '$1').trim();
        return `- ${text}`;
      }).join('\n') + '\n';
    }
    return match;
  });
  
  // Ordered lists
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
    let items = content.match(/<li[^>]*>(.*?)<\/li>/gis);
    if (items) {
      return '\n' + items.map((item, index) => {
        const text = item.replace(/<li[^>]*>(.*?)<\/li>/i, '$1').trim();
        return `${index + 1}. ${text}`;
      }).join('\n') + '\n';
    }
    return match;
  });
  
  // Horizontal rules
  markdown = markdown.replace(/<hr[^>]*>/gi, '\n---\n');
  
  // Line breaks
  markdown = markdown.replace(/<br[^>]*>/gi, '  \n');
  
  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gis, '\n$1\n');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  markdown = markdown.replace(/&nbsp;/g, ' ');
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#39;/g, "'");
  
  // Clean up excessive whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();
  
  return markdown;
};

export default function ExportOptions({ title, content, documentId, onClose }) {
  const [exportFormat, setExportFormat] = useState("html");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

      if (exportFormat === "html") {
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { color: #333; margin-top: 1.5em; }
    p { line-height: 1.6; margin: 1em 0; }
    ul, ol { margin: 1em 0; padding-left: 2em; }
    li { margin: 0.5em 0; }
    blockquote { border-left: 4px solid #ddd; padding-left: 1em; margin: 1em 0; color: #666; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    pre { background: #f4f4f4; padding: 1em; border-radius: 5px; overflow-x: auto; }
    img { max-width: 100%; height: auto; margin: 1em 0; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${content}
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html; charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.html`;
        a.click();
        window.URL.revokeObjectURL(url);

      } else if (exportFormat === "markdown") {
        const markdown = `# ${title}\n\n${htmlToMarkdown(content)}`;

        const blob = new Blob([markdown], { type: 'text/markdown; charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.md`;
        a.click();
        window.URL.revokeObjectURL(url);

      } else if (exportFormat === "txt") {
        // Strip HTML and convert to plain text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        // Convert common elements to text format
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(h => {
          const level = h.tagName.charAt(1);
          h.textContent = '\n' + '='.repeat(Math.max(1, 7 - parseInt(level))) + ' ' + h.textContent + ' ' + '='.repeat(Math.max(1, 7 - parseInt(level))) + '\n';
        });
        
        const lists = tempDiv.querySelectorAll('li');
        lists.forEach((li, index) => {
          li.textContent = '  • ' + li.textContent;
        });
        
        const plainText = `${title}\n${'='.repeat(title.length)}\n\n${tempDiv.textContent}`;

        const blob = new Blob([plainText], { type: 'text/plain; charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast.success(`Document exported as ${exportFormat.toUpperCase()}`);
      onClose();

    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export document");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Select Export Format</Label>
          
          <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <RadioGroupItem value="html" id="html" />
              <Label htmlFor="html" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <div>
                    <div className="font-medium">HTML</div>
                    <div className="text-xs text-gray-500">Fully formatted web page with styling</div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <RadioGroupItem value="markdown" id="markdown" />
              <Label htmlFor="markdown" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileDown className="w-4 h-4" />
                  <div>
                    <div className="font-medium">Markdown</div>
                    <div className="text-xs text-gray-500">Lightweight markup format (.md)</div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <RadioGroupItem value="txt" id="txt" />
              <Label htmlFor="txt" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <div>
                    <div className="font-medium">Plain Text</div>
                    <div className="text-xs text-gray-500">No formatting, text only (.txt)</div>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </div>
    </div>
  );
}