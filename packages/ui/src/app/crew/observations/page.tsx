'use client';

import { useState } from 'react';
import { ObservationListView } from '@/components/ObservationListView';
import { ObservationDetailView } from '@/components/ObservationDetailView';

export default function ObservationsPage() {
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Observation Lounge</h1>
          <p className="text-slate-600 mt-2">
            Browse past crew deliberations and their execution outcomes. Track how crew decisions
            perform in the real world.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* List */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Past Deliberations</h2>
            <ObservationListView
              onSelectObservation={setSelectedObservationId}
              selectedId={selectedObservationId || undefined}
            />
          </div>

          {/* Detail */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {selectedObservationId ? (
              <>
                <h2 className="text-lg font-bold text-slate-900 mb-4">Deliberation Details</h2>
                <ObservationDetailView
                  observationId={selectedObservationId}
                  onOutcomeRecorded={() => {
                    // Refresh the list when outcome is recorded
                  }}
                />
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <p>Select a deliberation to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
