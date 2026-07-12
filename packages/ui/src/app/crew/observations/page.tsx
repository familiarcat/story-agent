'use client';

import { useState } from 'react';
import { lcars } from '@/lib/lcars';
import { headlineSystem } from '@/lib/headline-system';
import { LcarsScreen, LcarsPanel, LcarsButton } from '@/components/Lcars';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ObservationListView } from '@/components/ObservationListView';
import { ObservationDetailView } from '@/components/ObservationDetailView';

export default function ObservationsPage() {
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);

  return (
    <LcarsScreen title="👁️ Observations · Quark" status="Crew deliberation outcomes · learning loop">
      <Breadcrumbs
        crumbs={[
          { label: 'Observe', href: '/cost' },
          { label: 'Observations' },
        ]}
      />

      {/* Header section */}
      <LcarsPanel title="📊 Observation Lounge" color={lcars.paleCanary} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.82rem', color: lcars.tanoi, lineHeight: 1.5, letterSpacing: 'normal' }}>
          Browse past crew deliberations with execution outcomes. Track how crew decisions perform in the real world.
          Outcomes feed the RAG learning loop — crew becomes hesitant about failed patterns, confident in proven approaches.
        </div>
      </LcarsPanel>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* List panel */}
        <LcarsPanel title="Past Deliberations" color={lcars.neonCarrot}>
          <div style={{ minHeight: 400 }}>
            <ObservationListView
              onSelectObservation={setSelectedObservationId}
              selectedId={selectedObservationId || undefined}
            />
          </div>
        </LcarsPanel>

        {/* Detail panel */}
        <LcarsPanel title="Deliberation Details" color={lcars.goldenTanoi}>
          {selectedObservationId ? (
            <div style={{ minHeight: 400, overflowY: 'auto' }}>
              <ObservationDetailView
                observationId={selectedObservationId}
              />
            </div>
          ) : (
            <div style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: lcars.textDim, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              Select a deliberation to view details
            </div>
          )}
        </LcarsPanel>
      </div>
    </LcarsScreen>
  );
}
