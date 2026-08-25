export interface PmToolPolicy {
  clientId: string;
  pmToolId: string;
  oauth2Scopes: string[];
  encryptedFields: string[];
  iamRole: string;
  cloudTrailEnabled: boolean;
  readOnlyMode: boolean;
}

export const pmToolPolicies: Record<string, PmToolPolicy> = {
  'familiarcat-jira': {
    clientId: 'familiarcat',
    pmToolId: 'jira',
    oauth2Scopes: ['jira:read', 'jira:write:project', 'jira:write:issue'],
    encryptedFields: ['customer_id', 'budget', 'proprietary_field'],
    iamRole: 'story-agent-jira-adapter',
    cloudTrailEnabled: true,
    readOnlyMode: true,
  },
  'familiarcat-monday': {
    clientId: 'familiarcat',
    pmToolId: 'monday',
    oauth2Scopes: ['boards:read', 'items:read:board', 'items:write'],
    encryptedFields: ['customer_id', 'internal_notes'],
    iamRole: 'story-agent-monday-adapter',
    cloudTrailEnabled: true,
    readOnlyMode: true,
  },
};

export function getPolicy(clientId: string, pmToolId: string): PmToolPolicy | undefined {
  return pmToolPolicies[`${clientId}-${pmToolId}`];
}