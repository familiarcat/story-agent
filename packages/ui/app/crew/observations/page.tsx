'use client';

import { useState } from 'react';
import { lcars } from '@/lib/lcars';
import { headlineSystem } from '@/lib/headline-system';
import { LcarsScreen, LcarsPanel, LcarsButton } from '@/components/Lcars';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ObservationListView } from '@/components/ObservationListView';
import { ObservationDetailView } from '@/components/ObservationDetailView';
import { ViewHeader, ViewPresentationProvider } from '@/components/ViewPresentation';

export default function ObservationsPage() {
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);

  return (
    <LcarsScreen title="👁️ Observations" status="Crew deliberation outcomes · learning loop">
      <ViewPresentationProvider tone="observe">
        <Breadcrumbs
          crumbs={[
            { label: 'Observe', href: '/cost' },
            { label: 'Observations' },
          ]}
        />

        <ViewHeader
          title="👁️ Observation Lounge"
          subtitle="Browse past crew deliberations with execution outcomes. Track how decisions perform in the real world and feed the RAG learning loop."
          badge="deliberation history"
        />

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* List panel */}
          <LcarsPanel title="Past Deliberations" color={lcars.neonCarrot} style={{ borderRadius: '0.7rem' }}>
            <div style={{ minHeight: 400 }}>
              <ObservationListView
                onSelectObservation={setSelectedObservationId}
                selectedId={selectedObservationId || undefined}
              />
            </div>
          </LcarsPanel>

          {/* Detail panel */}
          <LcarsPanel title="Deliberation Details" color={lcars.goldenTanoi} style={{ borderRadius: '0.7rem' }}>
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
      </ViewPresentationProvider>
    </LcarsScreen>
  );
}
