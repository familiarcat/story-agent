/**
 * Pure data module: pairs Supabase clients with Aha projects for the Step-1 hierarchy picker.
 * No React — just fetch + heuristics.
 */

export type AhaProjectLite = { id: string; name: string; referencePrefix: string | null };

export type ClientNode = { id: string; name: string; projects: AhaProjectLite[] };

type ClientRow = { id: string; name: string };
type AhaProjectRaw = { id: string; name: string; referencePrefix?: string | null };

const FIRM_ID = 'familiarcat';

/**
 * Soft mapping: there is NO hard FK between Supabase `clients` and Aha products, so we pair
 * heuristically by name/prefix substring (crew ruling: hide that gap here, not in the UI).
 */
export async function buildClientProjectMap(): Promise<{ clients: ClientNode[] }> {
  const [clientsRes, projectsRes] = await Promise.all([
    fetch('/api/clients'),
    fetch('/api/aha/projects'),
  ]);
  if (!clientsRes.ok) throw new Error(`Failed to load clients (${clientsRes.status})`);
  if (!projectsRes.ok) throw new Error(`Failed to load Aha projects (${projectsRes.status})`);

  const clientsJson = (await clientsRes.json()) as { clients: ClientRow[] };
  const projectsJson = (await projectsRes.json()) as AhaProjectRaw[];

  const projects: AhaProjectLite[] = (Array.isArray(projectsJson) ? projectsJson : []).map((p) => ({
    id: p.id,
    name: p.name,
    referencePrefix: p.referencePrefix ?? null,
  }));

  const nodes: ClientNode[] = (clientsJson.clients ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    projects: [],
  }));

  const matchesClient = (client: ClientNode, project: AhaProjectLite): boolean => {
    const haystack = `${project.name} ${project.referencePrefix ?? ''}`.toLowerCase();
    return haystack.includes(client.id.toLowerCase()) || haystack.includes(client.name.toLowerCase());
  };

  const unmatched: AhaProjectLite[] = [];
  for (const project of projects) {
    const owner = nodes.find((c) => c.id !== FIRM_ID && matchesClient(c, project));
    if (owner) owner.projects.push(project);
    else unmatched.push(project);
  }

  // Every unmatched project lands on the firm node, appended last as the catch-all.
  const firmIdx = nodes.findIndex((c) => c.id === FIRM_ID);
  const firm: ClientNode =
    firmIdx >= 0
      ? nodes.splice(firmIdx, 1)[0]
      : { id: FIRM_ID, name: 'familiarcat', projects: [] };
  firm.name = firm.name.includes('(firm)') ? firm.name : `${firm.name} (firm)`;
  firm.projects.push(...unmatched);
  nodes.push(firm);

  return { clients: nodes };
}
