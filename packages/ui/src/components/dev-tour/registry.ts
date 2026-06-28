import { DOMAIN_GROUPS } from '../domains';

/**
 * Dev Tour registry — descriptions for the developer-only guided tour.
 *
 * SCREEN_TOUR is seeded from the nav IA (domains.ts) so screen copy never drifts, plus the routes
 * that aren't in the nav. COMPONENT_TOUR is keyed by the `data-dev-tour="<id>"` attribute a component
 * opts in with. To add a component to the tour: put `data-dev-tour="my-id"` on its root element and
 * add a `my-id` entry here. (No production impact — see DevTour's hard gate.)
 */
export interface TourCopy {
  title: string;
  description: string;
}

export const SCREEN_TOUR: Record<string, TourCopy> = {
  ...Object.fromEntries(
    DOMAIN_GROUPS.flatMap((g) => g.items).map((s) => [s.href, { title: s.label, description: s.desc }]),
  ),
  '/': { title: 'Home — Orchestrating Hub', description: 'Entry point. The information architecture grouped by domain owners: Build (Geordi), Plan (Riker), Observe (Quark).' },
  '/innovation-lounge': { title: 'Innovation Lounge', description: 'The crew creative jam — 11 persona-driven project pitches, a debate, and Picard’s portfolio resolution. Stored to RAG.' },
  '/story/new': { title: 'New Story', description: 'Capture a new story for the crew to execute.' },
};

export const COMPONENT_TOUR: Record<string, TourCopy> = {
  nav: { title: 'Navigation', description: 'Domain-grouped nav (Build / Plan / Observe). /agent is the orchestrating hub that can invoke every domain via tools.' },
  'il-resolution': { title: "Captain Picard’s Resolution", description: 'The portfolio decision (pursue now / next / park) synthesized from all 11 pitches and the debate, with preserved dissent.' },
  'il-pitches': { title: 'The Pitches', description: 'Each crew member’s original project, generated in their canonical Memory-Alpha persona on their Quark-selected model.' },
  'il-debate': { title: 'The Debate', description: 'Cross-talk over the slate: who each member endorses, the challenge they raise, and proposed synergies.' },
};
