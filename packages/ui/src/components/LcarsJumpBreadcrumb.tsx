'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export interface QuickJumpItem {
  label: string;
  href: string;
  icon?: string;
  desc?: string;
}

export interface BreadcrumbSegment {
  label: string;
  href?: string;
  icon?: string;
  quickJumps?: QuickJumpItem[];
}

export interface LcarsBreadcrumbProps {
  segments?: BreadcrumbSegment[];
  crumbs?: Array<{ label: string; href?: string }>; // Backwards compatibility for existing usages
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: 'gold' | 'blue' | 'purple' | 'red';
  };
}

export function LcarsJumpBreadcrumb({ segments, crumbs, action }: LcarsBreadcrumbProps) {
  // Normalize input: convert legacy `crumbs` to `segments` if segments not explicitly passed
  const items: BreadcrumbSegment[] = segments || (crumbs ? crumbs.map(c => ({ label: c.label, href: c.href })) : []);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdownIdx(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const variantColor = {
    gold: 'var(--accent1)',
    blue: 'var(--accent4)',
    purple: 'var(--accent3)',
    red: 'var(--danger)',
  }[action?.variant || 'gold'];

  return (
    <nav 
      ref={containerRef}
      aria-label="Interactive Breadcrumb" 
      className="lcars-jump-breadcrumb"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
        padding: 'var(--space-2) var(--space-4)',
        background: 'var(--surface)',
        borderLeft: '4px solid var(--accent1)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        fontSize: '0.82rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
        {items.map((segment, index) => {
          const isLast = index === items.length - 1;
          const hasJumps = segment.quickJumps && segment.quickJumps.length > 0;
          const isOpen = openDropdownIdx === index;

          return (
            <span 
              key={`${segment.label}-${index}`} 
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {segment.icon && <span style={{ opacity: 0.8 }}>{segment.icon}</span>}
                {segment.href && !isLast ? (
                  <Link 
                    href={segment.href} 
                    style={{ 
                      color: 'var(--accent4)', 
                      textDecoration: 'none', 
                      fontWeight: 700,
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--accent4)')}
                  >
                    {segment.label}
                  </Link>
                ) : (
                  <span style={{ color: isLast ? 'var(--text)' : 'var(--text-dim)', fontWeight: isLast ? 700 : 400 }}>
                    {segment.label}
                  </span>
                )}

                {hasJumps && (
                  <button
                    type="button"
                    onClick={() => setOpenDropdownIdx(isOpen ? null : index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--accent2)',
                      padding: '0 4px',
                      fontSize: '0.65rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                    title="Quick jump options"
                    aria-label={`Jump options for ${segment.label}`}
                  >
                    ▼
                  </button>
                )}
              </span>

              {/* Jump Menu Dropdown */}
              {hasJumps && isOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 200,
                    marginTop: '4px',
                    minWidth: '200px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--accent1)',
                    borderRadius: 'var(--radius)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    padding: 'var(--space-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
                    QUICK JUMP
                  </div>
                  {segment.quickJumps?.map((jump, jIdx) => (
                    <Link
                      key={jIdx}
                      href={jump.href}
                      onClick={() => setOpenDropdownIdx(null)}
                      style={{
                        padding: '6px 8px',
                        color: 'var(--text)',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent1)', e.currentTarget.style.color = 'var(--on-accent)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'var(--text)')}
                    >
                      {jump.icon && <span>{jump.icon}</span>}
                      <div>
                        <div>{jump.label}</div>
                        {jump.desc && <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{jump.desc}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {!isLast && <span style={{ color: 'var(--border)', opacity: 0.6 }}>›</span>}
            </span>
          );
        })}
      </div>

      {action && (
        <div>
          {action.href ? (
            <Link
              href={action.href}
              className="lcars-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: variantColor,
                color: 'var(--on-accent)',
                borderRadius: '12px',
                textDecoration: 'none',
              }}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="lcars-btn"
              style={{
                padding: '3px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: variantColor,
                color: 'var(--on-accent)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

export default LcarsJumpBreadcrumb;
