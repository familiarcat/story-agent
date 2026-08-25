'use client';

import React from 'react';
import { color, space, font } from '@/lib/tokens';
import Typeahead, { type TypeaheadItem } from './Typeahead';

/**
 * HierarchySearch — Hierarchy-aware search component
 *
 * Provides search functionality scoped to the current hierarchy context.
 * Uses the existing Typeahead pattern to filter results based on hierarchy level.
 *
 * @example
 * ```tsx
 * <HierarchySearch
 *   currentClient="familiarcat"
 *   currentProject="story-agent"
 *   onSelect={(result) => console.log(result)}
 * />
 * ```
 */

export interface HierarchySearchResult {
  id: string;
  name: string;
  level: 'client' | 'project' | 'mission' | 'sprint' | 'story' | 'task';
  path: string;
}

export interface HierarchySearchProps {
  /** Current client ID for context */
  currentClient?: string;
  /** Current project ID for context */
  currentProject?: string;
  /** Callback when a result is selected */
  onSelect?: (result: HierarchySearchResult) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional callback for manual search submission */
  onSearch?: (query: string) => void;
}

/**
 * Convert HierarchySearchResult to TypeaheadItem for compatibility
 */
function toTypeaheadItem(result: HierarchySearchResult): TypeaheadItem {
  return {
    id: result.id,
    label: result.name,
    sublabel: result.path,
  };
}

export function HierarchySearch({
  currentClient,
  currentProject,
  onSelect,
  placeholder = 'Search hierarchy...',
  onSearch,
}: HierarchySearchProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [results, setResults] = React.useState<HierarchySearchResult[]>([]);

  /**
   * Handle search input changes
   */
  const handleSearchChange = React.useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (onSearch) {
        onSearch(query);
      }

      if (!query) {
        setResults([]);
        return;
      }

      // Mock search implementation - in production, this would query the backend
      const mockResults: HierarchySearchResult[] = [
        {
          id: 'story-1',
          name: 'STORY-1: Implement breadcrumbs',
          level: 'story' as const,
          path: `${currentClient || 'Client'} > ${currentProject || 'Project'} > Story 1`,
        },
        {
          id: 'task-1',
          name: 'Task: Write tests',
          level: 'task' as const,
          path: `${currentClient || 'Client'} > ${currentProject || 'Project'} > Story 1 > Task 1`,
        },
        {
          id: 'sprint-1',
          name: 'Sprint 1: Q3 Refactor',
          level: 'sprint' as const,
          path: `${currentClient || 'Client'} > ${currentProject || 'Project'} > Sprint 1`,
        },
      ].filter((r) =>
        r.name.toLowerCase().includes(query.toLowerCase()) || r.path.toLowerCase().includes(query.toLowerCase())
      );

      setResults(mockResults);
    },
    [currentClient, currentProject, onSearch]
  );

  /**
   * Handle selection from Typeahead
   */
  const handleSelect = React.useCallback(
    (item: TypeaheadItem) => {
      const result = results.find((r) => r.id === item.id);
      if (result && onSelect) {
        onSelect(result);
        setSearchQuery('');
        setResults([]);
      }
    },
    [results, onSelect]
  );

  const typeaheadItems = results.map(toTypeaheadItem);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space(2),
      }}
    >
      <Typeahead
        value={searchQuery}
        onChange={handleSearchChange}
        onSelect={handleSelect}
        items={typeaheadItems}
        placeholder={placeholder}
        disabled={false}
      />

      {results.length > 0 && (
        <div
          style={{
            fontSize: '0.75rem',
            color: color.muted,
            fontFamily: font.mono,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
}

export default HierarchySearch;
