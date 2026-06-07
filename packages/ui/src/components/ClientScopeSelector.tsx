'use client';

import { useEffect, useState } from 'react';
import {
  readClientScopeState,
  writeClientScopeState,
  type ClientScopeRole,
} from '@/lib/client-scope-store';

interface ClientScopeSelectorProps {
  title?: string;
}

const ROLES: ClientScopeRole[] = ['client_admin', 'client_delivery', 'regulated_reader', 'viewer'];

export function ClientScopeSelector({ title = 'Client Scope' }: ClientScopeSelectorProps) {
  const [clientId, setClientId] = useState('');
  const [role, setRole] = useState<ClientScopeRole>('client_delivery');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const state = readClientScopeState();
    setClientId(state.clientId ?? '');
    setRole(state.role);
  }, []);

  const onSave = () => {
    writeClientScopeState({
      clientId: clientId.trim() || null,
      role,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.65rem' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '0.6rem', alignItems: 'end' }}>
        <label>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>Selected Client</div>
          <input
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder="e.g. bayer-int"
            style={{ width: '100%', padding: '0.45rem 0.55rem' }}
          />
        </label>

        <label>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>Role</div>
          <select value={role} onChange={e => setRole(e.target.value as ClientScopeRole)} style={{ width: '100%', padding: '0.45rem 0.55rem' }}>
            {ROLES.map(nextRole => (
              <option key={nextRole} value={nextRole}>{nextRole}</option>
            ))}
          </select>
        </label>

        <button className="btn btn-primary" type="button" onClick={onSave}>
          Save Scope
        </button>
      </div>
      {saved && <div style={{ marginTop: '0.5rem', color: '#065f46', fontSize: '0.85rem' }}>Scope saved</div>}
    </div>
  );
}
