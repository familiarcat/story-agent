/** Canonical Identity Center group name for a hierarchy node, e.g. groupName('client','jonah') = "client:jonah". */
export function groupName(level, id) {
    return `${level}:${id}`;
}
/** The desired group set from the live hierarchy (tiers + clients + projects + sprints). Sorted, deduped. */
export function desiredGroupsFromHierarchy(input) {
    const g = new Set();
    for (const t of input.tiers ?? [])
        g.add(groupName('tier', t));
    for (const c of input.clients ?? [])
        g.add(groupName('client', c));
    for (const p of input.projects ?? [])
        g.add(groupName('project', p));
    for (const s of input.sprints ?? [])
        g.add(groupName('sprint', s));
    return [...g].sort();
}
/**
 * Diff desired vs existing group names → a reconciliation plan. `protectedGroups` are NEVER deleted
 * (e.g. the baseline tier:commercial / tier:enterprise groups, or groups holding live memberships) —
 * a safety floor so a hierarchy hiccup can't strip access.
 */
export function planReconciliation(desired, existing, protectedGroups = ['tier:commercial', 'tier:enterprise']) {
    const d = new Set(desired);
    const e = new Set(existing);
    const prot = new Set(protectedGroups);
    return {
        toCreate: desired.filter((x) => !e.has(x)),
        toDelete: existing.filter((x) => !d.has(x) && !prot.has(x)),
        unchanged: desired.filter((x) => e.has(x)),
    };
}
/**
 * Parse a human's IAM Identity Center group memberships → entitlement Grants for checkHumanEntitlement.
 * Group `level:id` → a grant at that level (inherits below). Optional `:read`/`:write` suffix sets
 * access (default write). `*` / `admin:*` → full-hierarchy grant. Unrecognized groups are ignored.
 */
export function membershipsToGrants(groupNames, defaultAccess = 'write') {
    const grants = [];
    for (const raw of groupNames) {
        const name = raw.trim();
        if (name === '*' || name === 'admin:*') {
            grants.push({ scope: '*', access: defaultAccess });
            continue;
        }
        const parts = name.split(':');
        const level = parts[0];
        if (!['tier', 'client', 'project', 'sprint'].includes(level))
            continue;
        // trailing access qualifier? e.g. client:jonah:read
        const last = parts[parts.length - 1];
        const access = last === 'read' || last === 'write' ? last : defaultAccess;
        const idParts = access === defaultAccess && last !== 'read' && last !== 'write' ? parts.slice(1) : parts.slice(1, -1);
        const id = idParts.join(':');
        if (!id)
            continue;
        grants.push({ scope: level, id, access });
    }
    return grants;
}
