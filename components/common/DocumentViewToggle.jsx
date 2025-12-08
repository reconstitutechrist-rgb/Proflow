import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Folder, FolderKanban } from 'lucide-react';

export default function DocumentViewToggle({ value, onChange }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      className="w-full justify-start bg-gray-100 dark:bg-gray-800 p-1 rounded-lg"
    >
      <ToggleGroupItem
        value="folders"
        aria-label="Folder view"
        className="flex-1 data-[state=on]:bg-white dark:data-[state=on]:bg-gray-700 data-[state=on]:shadow-sm rounded-md px-3 py-1.5 text-sm font-medium transition-all"
      >
        <Folder className="w-4 h-4 mr-2" />
        Folders
      </ToggleGroupItem>
      <ToggleGroupItem
        value="projects"
        aria-label="Project view"
        className="flex-1 data-[state=on]:bg-white dark:data-[state=on]:bg-gray-700 data-[state=on]:shadow-sm rounded-md px-3 py-1.5 text-sm font-medium transition-all"
      >
        <FolderKanban className="w-4 h-4 mr-2" />
        Projects
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
