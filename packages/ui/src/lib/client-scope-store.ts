export type ClientScopeRole = 'client_admin' | 'client_delivery' | 'regulated_reader' | 'viewer';

export interface ClientScopeState {
  clientId: string | null;
  role: ClientScopeRole;
}

const CLIENT_ID_KEY = 'sa:selectedClientId';
const CLIENT_ROLE_KEY = 'sa:selectedClientRole';

const DEFAULT_SCOPE: ClientScopeState = {
  clientId: null,
  role: 'client_delivery',
};

function normalizeClientId(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRole(value: string | null | undefined): ClientScopeRole {
  if (value === 'client_admin' || value === 'client_delivery' || value === 'regulated_reader' || value === 'viewer') {
    return value;
  }
  return DEFAULT_SCOPE.role;
}

export function readClientScopeState(): ClientScopeState {
  if (typeof window === 'undefined') return DEFAULT_SCOPE;

  return {
    clientId: normalizeClientId(window.localStorage.getItem(CLIENT_ID_KEY)),
    role: normalizeRole(window.localStorage.getItem(CLIENT_ROLE_KEY)),
  };
}

export function writeClientScopeState(next: ClientScopeState): void {
  if (typeof window === 'undefined') return;

  const clientId = normalizeClientId(next.clientId);
  const role = normalizeRole(next.role);

  if (clientId) {
    window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  } else {
    window.localStorage.removeItem(CLIENT_ID_KEY);
  }

  window.localStorage.setItem(CLIENT_ROLE_KEY, role);
}

export function buildClientScopeHeaders(input?: {
  purpose?: string;
  includeControlled?: boolean;
}): HeadersInit {
  const scope = readClientScopeState();
  const headers: Record<string, string> = {
    'x-client-role': scope.role,
  };

  if (scope.clientId) {
    headers['x-client-id'] = scope.clientId;
  }

  if (input?.purpose) {
    headers['x-controlled-data-purpose'] = input.purpose;
  }

  if (input?.includeControlled) {
    headers['x-include-controlled'] = 'true';
  }

  return headers;
}
