'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type TypeaheadItem = { id: string; label: string; sublabel?: string };

type TypeaheadProps = {
  value: string;
  onChange: (text: string) => void;
  onSelect: (item: TypeaheadItem) => void;
  items: TypeaheadItem[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  inputAriaLabel?: string;
};

export default function Typeahead({
  value,
  onChange,
  onSelect,
  items,
  placeholder,
  disabled,
  loading,
  inputAriaLabel,
}: TypeaheadProps) {
  const [focused, setFocused] = useState(false);
  const [closed, setClosed] = useState(false); // Escape / selection close
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const open = focused && !closed && items.length > 0;

  // Reset active option when the candidate list changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [items]);

  // Outside mousedown closes.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const select = (item: TypeaheadItem) => {
    onSelect(item);
    setClosed(true);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setClosed(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1 >= items.length ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 < 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < items.length) {
      e.preventDefault();
      select(items[activeIndex]);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        className="input"
        style={{ width: '100%' }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-label={inputAriaLabel}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(e) => {
          setClosed(false);
          onChange(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div className="dropdown" role="listbox" id={listboxId}>
          {loading && (
            <span className="meta" style={{ display: 'block', padding: 'var(--space-2) var(--space-3)' }}>
              Searching…
            </span>
          )}
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="dropdown-item"
              role="option"
              aria-selected={index === activeIndex ? 'true' : 'false'}
              // mousedown fires before blur/outside-close
              onMouseDown={(e) => {
                e.preventDefault();
                select(item);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {item.label}
              {item.sublabel && (
                <span className="meta" style={{ marginLeft: 'var(--space-2)' }}>
                  {item.sublabel}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
