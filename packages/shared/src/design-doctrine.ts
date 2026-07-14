/**
 * Base UI/UX doctrine for Story Agent across dashboard + VS Code extension surfaces.
 * Inspired by production principles discussed by Michael Okuda and the LCARS lineage,
 * but intentionally abstracted for original, copyright-safe implementation.
 */

export const BASE_DESIGN_THEORY_ID = 'okuda-inspired-story-agent-v1' as const;

export const BASE_DESIGN_PRINCIPLES = [
  'functional_minimalism',
  'calm_advanced_displays',
  'color_as_semantic_structure',
  'typography_as_wayfinding',
  'internal_consistency_for_believability',
  'constraint_driven_coherence',
] as const;

export const BASE_DESIGN_ANTI_PATTERNS = [
  'ornamental_noise_without_operational_value',
  'unbounded_color_entropy',
  'copying_franchise_layouts_or_assets',
  'inconsistent_status_signaling',
  'flat_information_hierarchy',
] as const;

export const BASE_COMPONENT_DIRECTIVES = {
  navigation: 'Prioritize scanability, stable landmarks, and high-contrast active state cues.',
  telemetryPanels: 'At-a-glance first: key numbers, trend context, and clear status semantics.',
  planningViews: 'Temporal structures must support drag/reflow and reveal capacity pressure.',
  cards: 'Use semantic color zoning by meaning, never decoration-only accents.',
  typography: 'Use hierarchy for decision speed; terse labels and compact metadata.',
} as const;

export const BASE_COPYRIGHT_GUARDRAILS = [
  'Do not copy franchise UI assets, exact panel geometry, or canonical color sets.',
  'Use abstract design logic and original token values.',
  'Document inspirations as references, not source assets for direct reuse.',
] as const;

export const BASE_MEMORY_RECALL_HINTS = [
  'okuda-lcars-design-research',
  'ui-doctrine',
  'lcars-inspired',
] as const;
