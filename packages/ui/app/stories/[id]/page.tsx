'use client';

import { StoryDetail } from '../../components/pm';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** UUID type alias */
type UUID = string;

/**
 * Story Detail Page
 * 
 * Full story view with tasks, comments, attachments, audit trail.
 */

interface StoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function StoryDetailPage({ params }: StoryDetailPageProps) {
  const router = useRouter();
  const [storyId, setStoryId] = useState<UUID | undefined>(undefined);

  // Resolve params (Next.js 15 pattern)
  const resolveParams = async () => {
    const resolved = await params;
    setStoryId(resolved.id as UUID);
  };

  if (!storyId) {
    resolveParams();
    return <div className="page loading">Loading story...</div>;
  }

  return (
    <main className="page story-detail-page">
      <div className="page-container">
        <button onClick={() => router.back()} className="btn-back">
          ← Back
        </button>

        <StoryDetail storyId={storyId} onClose={() => router.back()} />
      </div>
    </main>
  );
}
