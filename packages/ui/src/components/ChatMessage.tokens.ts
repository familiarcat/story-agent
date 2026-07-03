/**
 * ChatMessage — pure role→LCARS-token bindings (no JSX, node-testable). The reusable chat standard
 * for EVERY surface (web /chat + /agent, VS Code extension, future client projects): each message
 * gets a per-role rounded surface + accent, so "You" vs "Crew" are differentiated by design-system
 * tokens, never ad-hoc color. Extends the LCARS token contract (@/lib/tokens → var(--*)).
 */
export type ChatRole = 'user' | 'crew' | 'assistant';

export interface ChatRoleStyle {
  /** Default sender/headline label. */
  label: string;
  /** Accent for the sender headline + the message's left rail (role differentiation). */
  accent: string;
  /** Message background surface (slightly distinct per role). */
  surface: string;
}

/** Role → tokens. Every value is a `var(--*)` token — never a literal color. `assistant` == crew. */
export function chatRoleStyle(role: ChatRole): ChatRoleStyle {
  if (role === 'user') return { label: 'You', accent: 'var(--accent4)', surface: 'var(--surface-2)' };
  return { label: 'Crew', accent: 'var(--ok)', surface: 'var(--surface)' }; // crew + assistant
}
