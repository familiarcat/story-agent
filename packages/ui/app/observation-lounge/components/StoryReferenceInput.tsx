'use client';

import { useEffect, useState } from 'react';
import Typeahead, { type TypeaheadItem } from '@/components/Typeahead';

type AhaStorySuggestion = { referenceNum: string; name: string };

type StoryReferenceInputProps = {
  value: string;
  onChange: (ref: string) => void;
  projectId?: string | null;
};

export default function StoryReferenceInput({ value, onChange, projectId }: StoryReferenceInputProps) {
  const [stories, setStories] = useState<AhaStorySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TypeaheadItem[]>([]);

  // Fetch once per projectId change; /api/aha/stories returns AhaStory[] (referenceNum, name, ...).
  useEffect(() => {
    setStories([]);
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/aha/stories?projectId=${encodeURIComponent(projectId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setStories(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setStories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Debounced client-side filter (250ms).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!projectId || stories.length === 0) {
        setItems([]);
        return;
      }
      const query = value.trim().toLowerCase();
      const matches = query
        ? stories.filter(
            (s) =>
              s.referenceNum.toLowerCase().includes(query) ||
              s.name.toLowerCase().includes(query),
          )
        : stories;
      setItems(
        matches.slice(0, 8).map((s) => ({ id: s.referenceNum, label: s.referenceNum, sublabel: s.name })),
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [value, stories, projectId]);

  return (
    <Typeahead
      value={value}
      onChange={onChange}
      onSelect={(item) => onChange(item.id)}
      items={items}
      loading={loading}
      placeholder="e.g. STORY-123 or full Aha URL"
      inputAriaLabel="Story Reference Number or Aha URL"
    />
  );
}
