/**
 * Theme token bridge — maps the legacy LCARS color names to the SEMANTIC CSS variables defined in
 * globals.css (the token contract, crew theme-system mission RAG MEM 50). Because these resolve to
 * var(--*), every component that references `lcars.*` is now THEME-DRIVEN — switching [data-theme]
 * (lcars / dark / light) re-skins the whole UI with zero component edits. Use `onAccent` for text that
 * sits ON an accent fill (buttons, elbow headers) — NOT `black`, which is the page ground.
 */
export const lcars = {
  black: 'var(--bg)',
  space: 'var(--surface)',
  neonCarrot: 'var(--accent1)',
  goldenTanoi: 'var(--accent2)',
  tanoi: 'var(--text)',
  paleCanary: 'var(--text)',
  lilac: 'var(--accent3)',
  eggplant: 'var(--surface-2)',
  anakiwa: 'var(--accent4)',
  mariner: 'var(--accent4)',
  bahamaBlue: 'var(--accent4)',
  danger: 'var(--danger)',
  ok: 'var(--ok)',
  text: 'var(--text)',
  textDim: 'var(--text-dim)',
  border: 'var(--border)',
  /** Text/icon color that sits on an accent fill (themes set this for contrast). */
  onAccent: 'var(--on-accent)',
} as const;

export type LcarsColor = keyof typeof lcars;

/** Map a persona uiThemeColor → a semantic accent variable. */
export function lcarsForTheme(theme: 'gold' | 'blue' | 'red' | 'purple'): string {
  return theme === 'gold' ? lcars.goldenTanoi : theme === 'blue' ? lcars.anakiwa : theme === 'red' ? lcars.danger : lcars.lilac;
}

export interface CrewCell {
  id: string;
  name: string;
  role: string;
  color: string;
}

/** The 11 crew, themed by semantic accent (mirrors crew-personas uiThemeColor). */
export const CREW_ROSTER: CrewCell[] = [
  { id: 'picard', name: 'Picard', role: 'Command', color: lcars.goldenTanoi },
  { id: 'data', name: 'Data', role: 'Architecture', color: lcars.anakiwa },
  { id: 'worf', name: 'Worf', role: 'Security', color: lcars.danger },
  { id: 'riker', name: 'Riker', role: 'Implementation', color: lcars.goldenTanoi },
  { id: 'geordi', name: 'La Forge', role: 'Infrastructure', color: lcars.neonCarrot },
  { id: 'obrien', name: "O'Brien", role: 'DevOps', color: lcars.neonCarrot },
  { id: 'yar', name: 'Yar', role: 'Quality', color: lcars.danger },
  { id: 'troi', name: 'Troi', role: 'Stakeholder', color: lcars.lilac },
  { id: 'crusher', name: 'Crusher', role: 'Health', color: lcars.lilac },
  { id: 'uhura', name: 'Uhura', role: 'Comms', color: lcars.anakiwa },
  { id: 'quark', name: 'Quark', role: 'Finance', color: lcars.goldenTanoi },
];

/** Accent rotation for rails/group headers. */
export const RAIL_COLORS = [lcars.neonCarrot, lcars.goldenTanoi, lcars.lilac, lcars.anakiwa];
