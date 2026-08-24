/**
 * ChatMessage — the cross-project chat-UI standard (crew Observation Lounge, RAG). Renders any chat
 * message with: (1) a typographic HIERARCHY — an uppercase accent SENDER headline above INDENTED,
 * de-emphasized BODY copy; (2) a slightly ROUNDED per-message background with a per-role left rail so
 * "You" vs "Crew" are visually distinct. Everything binds to the LCARS token contract (@/lib/tokens →
 * var(--*)); zero hardcoded color. Use this on every surface that depicts a chat.
 */
'use client';

import React from 'react';
import { space, font } from '@/lib/tokens';
import { chatRoleStyle, type ChatRole } from './ChatMessage.tokens';

export type { ChatRole } from './ChatMessage.tokens';
export { chatRoleStyle } from './ChatMessage.tokens';

interface ChatMessageProps {
  role: ChatRole;
  /** Override the default sender label (You / Crew). */
  sender?: string;
  /** Optional metadata line (e.g. model · cost) — rendered indented + de-emphasized under the body. */
  meta?: React.ReactNode;
  children: React.ReactNode;
}

export function ChatMessage({ role, sender, meta, children }: ChatMessageProps) {
  const s = chatRoleStyle(role);
  const indent = space(3); // body copy indented from the headline — the hierarchy
  return (
    <div
      style={{
        background: s.surface,
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${s.accent}`, // per-role rail → You vs Crew differentiation
        borderRadius: 'var(--radius)',        // slightly rounded message background
        padding: `${space(2)} ${space(3)}`,
        marginBottom: space(2),
      }}
    >
      <div
        style={{
          fontFamily: font.mono,
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: s.accent,
        }}
      >
        {sender ?? s.label}
      </div>
      <div style={{ marginLeft: indent, marginTop: space(1), fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text)' }}>
        {children}
      </div>
      {meta && (
        <div style={{ marginLeft: indent, marginTop: space(1), fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: font.mono }}>
          {meta}
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
