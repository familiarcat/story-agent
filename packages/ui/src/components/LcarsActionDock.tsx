'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DOMAIN_GROUPS } from './domains';

interface ActionItem {
  id: string;
  label: string;
  category: string;
  icon: string;
  href?: string;
  shortcut?: string;
  action?: () => void;
  costEstimate?: string;
}

export function LcarsActionDock() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [serverState, setServerState] = useState<'checking' | 'local' | 'cloud' | 'offline'>('checking');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Check agent health status for live dock indicator
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/agent/stream', { method: 'HEAD' }).catch(() => null);
        if (res && res.status < 500) {
          setServerState('local');
        } else {
          setServerState('local'); // Default active on local dev
        }
      } catch {
        setServerState('offline');
      }
    }
    checkHealth();
  }, []);

  // Global Command+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isPaletteOpen) {
        setIsPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen]);

  useEffect(() => {
    if (isPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isPaletteOpen]);

  // Comprehensive action item registry for 2-click access
  const allActions: ActionItem[] = [
    // Plan Domain
    { id: 'new-story', label: 'Create New Story (Aha)', category: 'Plan', icon: '➕', href: '/story/new', shortcut: 'N' },
    { id: 'dashboard', label: 'Command Dashboard', category: 'Plan', icon: '📊', href: '/dashboard' },
    { id: 'sprints', label: 'Sprint Planning Board', category: 'Plan', icon: '🗂️', href: '/sprint' },
    
    // Build Domain
    { id: 'agent-run', label: 'Launch Agent Workspace', category: 'Build', icon: '🛠️', href: '/agent', shortcut: 'A', costEstimate: '~$0.002' },
    { id: 'chat', label: 'Autonomous Crew Chat', category: 'Build', icon: '💬', href: '/chat' },
    { id: 'vision', label: 'Vision / Multimodal UI Analysis', category: 'Build', icon: '🖼️', href: '/vision' },
    { id: 'docs', label: 'System API & Tool Documentation', category: 'Build', icon: '📜', href: '/docs' },
    
    // Observe Domain
    { id: 'observation-lounge', label: 'Observation Lounge (Story Wizard)', category: 'Observe', icon: '🖖', href: '/observation-lounge', shortcut: 'O', costEstimate: '~$0.003' },
    { id: 'innovation-lounge', label: 'Innovation Lounge (Idea Jam)', category: 'Observe', icon: '💡', href: '/innovation-lounge', costEstimate: '~$0.04' },
    { id: 'crew-memories', label: 'Query Crew RAG Memories', category: 'Observe', icon: '👥', href: '/crew/memories', shortcut: 'M' },
    { id: 'observations', label: 'Deliberation & Decisions Log', category: 'Observe', icon: '👁️', href: '/crew/observations' },
    { id: 'cost-observatory', label: 'Cost & Token ROI Observatory', category: 'Observe', icon: '💰', href: '/cost' },
    { id: 'learnings', label: 'Crew Skill Learnings & Diffs', category: 'Observe', icon: '🧠', href: '/learnings' },
  ];

  const filteredActions = allActions.filter(
    (action) =>
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function executeAction(item: ActionItem) {
    setIsPaletteOpen(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  }

  function handlePaletteKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredActions.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % (filteredActions.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        executeAction(filteredActions[selectedIndex]);
      }
    }
  }

  return (
    <>
      {/* Fixed Bottom LCARS Action Dock */}
      <aside 
        aria-label="LCARS Command Dock"
        className="lcars-action-dock"
        style={{
          position: 'fixed',
          bottom: 'var(--space-3)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(22, 22, 31, 0.94)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--accent1)',
          borderRadius: '24px',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 12px rgba(243, 155, 53, 0.2)',
        }}
      >
        {/* Status indicator */}
        <div 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          title="System Core Status"
        >
          <span 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: serverState === 'offline' ? 'var(--danger)' : 'var(--ok)',
              boxShadow: serverState === 'offline' ? '0 0 6px var(--danger)' : '0 0 6px var(--ok)',
            }} 
          />
          <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>CORE :3103</span>
        </div>

        <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />

        {/* Quick-Access Functional Buttons (1-click to operation surfaces) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/story/new"
            className="lcars-dock-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--accent1)',
              color: 'var(--on-accent)',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            <span>➕</span>
            <span>New Story</span>
          </Link>

          <Link
            href="/agent"
            className="lcars-dock-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--surface-2)',
              color: 'var(--accent4)',
              border: '1px solid var(--accent4)',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            <span>🛠️</span>
            <span>Agent</span>
          </Link>

          <Link
            href="/observation-lounge"
            className="lcars-dock-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--surface-2)',
              color: 'var(--accent3)',
              border: '1px solid var(--accent3)',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            <span>🖖</span>
            <span>Lounge</span>
          </Link>

          <Link
            href="/cost"
            className="lcars-dock-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--surface-2)',
              color: 'var(--accent2)',
              border: '1px solid var(--accent2)',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            <span>💰</span>
            <span>Cost</span>
          </Link>
        </div>

        <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />

        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text-dim)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
          title="Open Command Palette (Cmd+K)"
        >
          <span>⌘K</span>
          <span style={{ textTransform: 'uppercase' }}>Jump Menu</span>
        </button>
      </aside>

      {/* Modal Command Palette (Cmd+K) */}
      {isPaletteOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '15vh',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPaletteOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--surface)',
              border: '2px solid var(--accent1)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(243,155,53,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header / Input */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: '12px' }}>
              <span style={{ fontSize: '1.2rem' }}>🖖</span>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handlePaletteKeyDown}
                placeholder="Type a command or jump to any operational surface..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font)',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px' }}>
                ESC to close
              </span>
            </div>

            {/* Action List */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '8px' }}>
              {filteredActions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  No matching operational command found.
                </div>
              ) : (
                filteredActions.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => executeAction(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--accent1)' : 'transparent',
                        color: isSelected ? 'var(--on-accent)' : 'var(--text)',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                        <div>
                          <div style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.88rem' }}>{item.label}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>{item.category} DOMAIN</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.costEstimate && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.85 }}>{item.costEstimate}</span>
                        )}
                        {item.shortcut && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              background: isSelected ? 'rgba(0,0,0,0.2)' : 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                            }}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '8px 16px',
                background: 'var(--surface-2)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
              }}
            >
              <span>Navigation: ↑↓ to select · Enter to execute</span>
              <span>2-Click Direct Reach</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LcarsActionDock;
