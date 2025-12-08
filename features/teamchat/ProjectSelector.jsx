import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen } from 'lucide-react';

export default function ProjectSelector({ projects, selectedProjectId, onSelect }) {
  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  return (
    <Select value={selectedProjectId || '__none__'} onValueChange={(value) => onSelect(value === '__none__' ? null : value)}>
      <SelectTrigger className="h-6 text-[10px] w-auto min-w-[100px] max-w-[180px] border-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 px-1">
        <div className="flex items-center gap-1 truncate">
          <FolderOpen className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <SelectValue placeholder="No project">
            {selectedProject ? (
              <span className="text-gray-600 dark:text-gray-400 truncate">
                {selectedProject.name}
              </span>
            ) : (
              <span className="text-gray-400">No project</span>
            )}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-gray-500">No project</span>
        </SelectItem>
        {projects?.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color || '#3B82F6' }}
              />
              <span className="truncate">{project.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
