/**
 * Unified-UI information architecture (crew-decided).
 *
 * The crew's ruling: /agent (the agentic loop) is the ORCHESTRATING HUB — it can already invoke every
 * domain via tools — and the 12 surfaces are grouped under three domain owners. This is the single
 * source the NavBar and the orchestrating home page both consume, so the IA never drifts between them.
 */
export interface Surface {
  href: string;
  label: string;
  icon: string;
  desc: string;
  /** The orchestrating hub surface. */
  hub?: boolean;
}

export interface DomainGroup {
  group: string;
  /** Crew domain owner (who is accountable for this group's surfaces). */
  owner: string;
  intent: string;
  items: Surface[];
}

export const DOMAIN_GROUPS: DomainGroup[] = [
  {
    group: 'Build',
    owner: 'Geordi · Engineering',
    intent: 'Write, understand & run code with the crew',
    items: [
      { href: '/agent', label: 'Agent Workspace', icon: '🛠️', hub: true, desc: 'The orchestrating hub — a Claude-Code-grade agentic loop on OpenRouter (read/edit/run/search/git), WorfGate-governed with interactive approvals.' },
      { href: '/docs', label: 'API Docs', icon: '📜', desc: 'The live crew-server OpenAPI surface, rendered with Swagger UI.' },
      { href: '/vision', label: 'Vision', icon: '🖼️', desc: 'Analyze an image/screenshot with a Quark-selected vision model — describe, screenshot→stories, UI review, OCR.' },
    ],
  },
  {
    group: 'Plan',
    owner: 'Riker · Delivery',
    intent: 'Projects, sprints & stories (Aha)',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊', desc: 'Projects and delivery at a glance.' },
      { href: '/sprint', label: 'Sprint Board', icon: '🗂️', desc: 'Stories by sprint, from Aha.' },
      { href: '/story/new', label: 'New Story', icon: '➕', desc: 'Capture a new story for the crew to execute.' },
    ],
  },
  {
    group: 'Observe',
    owner: 'Quark · Data',
    intent: 'Cost, learning, memory & deliberation',
    items: [
      { href: '/cost', label: 'Cost Observatory', icon: '💰', desc: 'Quark spend on OpenRouter and savings vs a frontier baseline.' },
      { href: '/learnings', label: 'Learnings', icon: '🧠', desc: 'The crew self-learning loop — recent agent outcomes.' },
      { href: '/crew/memories', label: 'Crew Memories', icon: '👥', desc: 'Durable RAG memory across the crew.' },
      { href: '/crew/observations', label: 'Observations', icon: '👁️', desc: 'Browse past crew deliberations with execution outcomes.' },
      { href: '/observation-lounge', label: 'Observation Lounge', icon: '🖖', desc: 'Full-crew deliberation on hard questions.' },
    ],
  },
];

export const HUB: Surface = DOMAIN_GROUPS.flatMap(g => g.items).find(s => s.hub)!;
