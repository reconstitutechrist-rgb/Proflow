import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Paperclip,
  Smile,
  Bold,
  Italic,
  Code,
  AtSign
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function RichTextEditor({
  value,
  onChange,
  onSend,
  onFileAttach,
  placeholder = "Type a message...",
  teamMembers = [],
  disabled = false
}) {
  const textareaRef = useRef(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }

    // Detect @ for mentions
    if (e.key === '@') {
      const textarea = textareaRef.current;
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          top: rect.top - 200,
          left: rect.left
        });
        setShowMentions(true);
        setMentionSearch("");
      }
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Track mention search
    if (showMentions) {
      const lastAtIndex = newValue.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const searchText = newValue.substring(lastAtIndex + 1);
        if (searchText.includes(' ') || searchText.includes('\n')) {
          setShowMentions(false);
        } else {
          setMentionSearch(searchText);
        }
      } else {
        setShowMentions(false);
      }
    }
  };

  const insertFormatting = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  const insertMention = (member) => {
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = value.substring(0, lastAtIndex);
      const afterMention = value.substring(lastAtIndex + mentionSearch.length + 1);
      const newValue = beforeAt + `@${member.full_name} ` + afterMention;
      onChange(newValue);
    }
    setShowMentions(false);
  };

  const filteredMembers = teamMembers.filter(member =>
    member.full_name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    member.email?.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const commonEmojis = ['👍', '❤️', '😊', '🎉', '🚀', '👏', '🔥', '✅'];

  return (
    <div className="relative">
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => insertFormatting('**', '**')}
          className="h-8 w-8 p-0"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => insertFormatting('*', '*')}
          className="h-8 w-8 p-0"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => insertFormatting('`', '`')}
          className="h-8 w-8 p-0"
          title="Code"
        >
          <Code className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => {
            onChange(value + '@');
            setShowMentions(true);
          }}
          className="h-8 w-8 p-0"
          title="Mention someone"
        >
          <AtSign className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        {/* Emoji Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-8 w-8 p-0"
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="grid grid-cols-8 gap-1">
              {commonEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="h-8 w-8 p-0 text-lg"
                  onClick={() => onChange(value + emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onFileAttach}
          className="h-8 w-8 p-0"
          title="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      </div>

      {/* Text Input */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[80px] resize-none"
      />

      {/* Mention Suggestions */}
      {showMentions && filteredMembers.length > 0 && (
        <div
          className="absolute bottom-full mb-2 left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
        >
          {filteredMembers.slice(0, 5).map((member) => (
            <button
              key={member.email}
              type="button"
              onClick={() => insertMention(member)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {member.full_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {member.email}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Format Help */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-mono">**bold**</span>
        <span className="mx-2">•</span>
        <span className="font-mono">*italic*</span>
        <span className="mx-2">•</span>
        <span className="font-mono">`code`</span>
        <span className="mx-2">•</span>
        <span className="font-mono">@mention</span>
      </div>
    </div>
  );
}