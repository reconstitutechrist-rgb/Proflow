import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, FolderOpen, AlertCircle, User } from 'lucide-react';

export default function TaskFilters({
  assignments,
  selectedAssignment,
  onAssignmentChange,
  priorityFilter,
  onPriorityChange,
  searchQuery,
  onSearchChange,
  users = [],
}) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters Row - REMOVED STATUS FILTER (handled by tabs now) */}
      <div className="flex flex-wrap gap-3">
        {/* Assignment Filter */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <FolderOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <Select value={selectedAssignment} onValueChange={onAssignmentChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Assignments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              {assignments.map((assignment) => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
          <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info Message */}
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
        <Filter className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <p>Use tabs above to filter by status. Filters here apply across all status tabs.</p>
      </div>
    </div>
  );
}
