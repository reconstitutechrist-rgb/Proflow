import React from 'react';
import { Folder, Star, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUICK_FILTERS } from '@/hooks/useDocumentFilters';

/**
 * Filter configuration with icons and colors
 */
const FILTER_CONFIG = [
  {
    id: QUICK_FILTERS.ALL,
    label: 'All Documents',
    icon: Folder,
    iconColor: '',
  },
  {
    id: QUICK_FILTERS.STARRED,
    label: 'Starred',
    icon: Star,
    iconColor: 'text-yellow-500',
  },
  {
    id: QUICK_FILTERS.RECENT,
    label: 'Recent',
    icon: Clock,
    iconColor: '',
  },
  {
    id: QUICK_FILTERS.TRASH,
    label: 'Trash',
    icon: Trash2,
    iconColor: 'text-red-500',
  },
];

/**
 * QuickFilters - Quick filter buttons for All, Starred, Recent, Trash
 * @param {Object} props
 * @param {string} props.activeFilter - Currently active filter
 * @param {Object} props.counts - Document counts for each filter
 * @param {Function} props.onFilterChange - Callback when filter changes
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 */
export default function QuickFilters({
  activeFilter,
  counts = {},
  onFilterChange,
  darkMode = false,
}) {
  return (
    <div className="space-y-1">
      {FILTER_CONFIG.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;
        const count = counts[filter.id] || 0;

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all',
              isActive
                ? darkMode
                  ? 'bg-white/10 text-white'
                  : 'bg-gray-100 text-gray-900'
                : darkMode
                  ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={cn(
                  'w-4 h-4',
                  filter.iconColor ||
                    (isActive
                      ? darkMode
                        ? 'text-white'
                        : 'text-gray-700'
                      : darkMode
                        ? 'text-gray-500'
                        : 'text-gray-400')
                )}
              />
              <span>{filter.label}</span>
            </div>
            {count > 0 && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  isActive
                    ? darkMode
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-700'
                    : darkMode
                      ? 'bg-white/10 text-gray-400'
                      : 'bg-gray-100 text-gray-500'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
