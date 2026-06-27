/**
 * LCARS design tokens — the Library Computer Access/Retrieval System aesthetic (Michael Okuda).
 * Canonical palette uses values in multiples of 0x33 for coordination; black ground; rounded "elbow"
 * frames; condensed all-caps type; <6 main colors per the LCARS guideline.
 */
export const lcars = {
  black: '#000000',
  space: '#0a0a0a',
  neonCarrot: '#FF9933',
  goldenTanoi: '#FFCC66',
  tanoi: '#FFCC99',
  paleCanary: '#FFFF99',
  lilac: '#CC99CC',
  eggplant: '#664466',
  anakiwa: '#99CCFF',
  mariner: '#3366CC',
  bahamaBlue: '#006699',
  danger: '#CC6666',
  text: '#FFCC99',
  textDim: '#9999CC',
} as const;

export type LcarsColor = keyof typeof lcars;

/** Map a persona uiThemeColor → an LCARS hex. */
export function lcarsForTheme(theme: 'gold' | 'blue' | 'red' | 'purple'): string {
  return theme === 'gold' ? lcars.goldenTanoi : theme === 'blue' ? lcars.anakiwa : theme === 'red' ? lcars.danger : lcars.lilac;
}

export interface CrewCell {
  id: string;
  name: string;
  role: string;
  color: string;
}

/** The 11 crew, LCARS-colored (mirrors crew-personas uiThemeColor; static for the client UI). */
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

/** Group color rotation for the LCARS rails. */
export const RAIL_COLORS = [lcars.neonCarrot, lcars.goldenTanoi, lcars.lilac, lcars.anakiwa];
