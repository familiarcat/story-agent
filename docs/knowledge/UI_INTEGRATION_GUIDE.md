/**
 * UI Integration Guide: Dual-Role Crew-Assisted Dashboard
 * 
 * This guide shows how to integrate the three main UI components:
 * 1. SprintBoard — PM-focused Kanban with sprint metrics
 * 2. DeveloperStoryWorkspace — Dev-focused story execution
 * 3. ProjectManagerDashboard — PM-focused multi-view dashboard
 * 
 * All connected to the autonomous crew system for real-time guidance.
 */

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATION STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

/*
 * packages/ui/src/app/
 * 
 * page.tsx (Home/Role Selection)
 * ├─ User selects: Project Manager or Developer
 * └─ Redirects to appropriate view
 * 
 * pm/
 * ├─ page.tsx
 * │  └─ Layout: ProjectManagerDashboard with view selector
 * ├─ sprint/
 * │  └─ page.tsx → SprintBoard full-screen view
 * ├─ roadmap/
 * │  └─ page.tsx → Roadmap planning view
 * ├─ crew/
 * │  └─ page.tsx → Crew status and workload view
 * └─ budget/
 *    └─ page.tsx → Cost tracking view
 * 
 * developer/
 * ├─ page.tsx
 * │  └─ Shows available stories for developer
 * ├─ story/
 * │  ├─ [storyId]/
 * │  │  └─ page.tsx
 * │  │     └─ DeveloperStoryWorkspace for that story
 * │  └─ available/
 * │     └─ page.tsx → Story list with assignment
 * 
 * api/
 * ├─ crew/
 * │  ├─ insights/route.ts
 * │  ├─ decisions/route.ts
 * │  ├─ decisions/[id]/approve/route.ts
 * │  └─ decisions/[id]/reject/route.ts
 * ├─ agile/
 * │  ├─ sprints/[id]/route.ts
 * │  ├─ stories/route.ts
 * │  └─ stories/[id]/route.ts
 * └─ ...other endpoints
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. HOME PAGE - ROLE SELECTION
// ═══════════════════════════════════════════════════════════════════════════

/*
 * File: packages/ui/src/app/page.tsx
 * 
 * Shows role selection when user first enters.
 * Each role goes to dedicated workspace.
 */

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Story Agent: Crew-Assisted Development
          </h1>
          <p className="text-xl text-gray-600">
            Select your role to begin
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Project Manager Option */}
          <Link href="/pm">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition cursor-pointer">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-2">Project Manager</h2>
              <p className="text-gray-600 mb-6">
                Sprint board, roadmap, crew status, and budget tracking.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>✓ Sprint Kanban board</li>
                <li>✓ Velocity tracking</li>
                <li>✓ Risk & blocker alerts</li>
                <li>✓ Crew decisions</li>
                <li>✓ Budget & cost tracking</li>
              </ul>
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600">
                Enter Dashboard
              </button>
            </div>
          </Link>

          {/* Developer Option */}
          <Link href="/developer">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition cursor-pointer">
              <div className="text-5xl mb-4">💻</div>
              <h2 className="text-2xl font-bold mb-2">Developer</h2>
              <p className="text-gray-600 mb-6">
                Story execution, crew guidance, and code management.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>✓ Story details & acceptance criteria</li>
                <li>✓ Real-time crew execution</li>
                <li>✓ Architecture & security guidance</li>
                <li>✓ Code quality & test strategy</li>
                <li>✓ CI/CD & PR management</li>
              </ul>
              <button className="w-full px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600">
                Select Story
              </button>
            </div>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow">
          <h3 className="font-bold mb-2">🤖 How the Crew Helps</h3>
          <p className="text-sm text-gray-600">
            Both roles have access to the same 11-member autonomous crew:
            Picard (Captain), Data (Architect), Riker (Developer), Geordi (Infrastructure),
            O'Brien (DevOps), Worf (Security), Yar (QA), Troi (Analyst), Crusher (Health),
            Uhura (Communications), and Quark (Finance).
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Project Managers</strong> see project-focused insights (timeline risks, budget, stakeholder alignment).
            <strong>Developers</strong> see code-focused guidance (architecture, security, quality).
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. PROJECT MANAGER WORKSPACE
// ═══════════════════════════════════════════════════════════════════════════

/*
 * File: packages/ui/src/app/pm/page.tsx
 * 
 * Main PM workspace showing dashboard with view selector.
 */

'use client';

import { ProjectManagerDashboard } from '@/components/ProjectManagerDashboard';

export default function PMPage() {
  // Get projectId from query params or default
  const projectId = 'project-1';

  return <ProjectManagerDashboard projectId={projectId} />;
}

/*
 * File: packages/ui/src/app/pm/sprint/page.tsx
 * 
 * Full-screen sprint board view.
 */

import { SprintBoard } from '@/components/SprintBoard';

export default function SprintPage() {
  return (
    <div className="h-screen overflow-hidden">
      <SprintBoard projectId="project-1" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DEVELOPER WORKSPACE
// ═══════════════════════════════════════════════════════════════════════════

/*
 * File: packages/ui/src/app/developer/page.tsx
 * 
 * Developer landing showing available stories in current sprint.
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface AvailableStory {
  id: string;
  ref: string;
  title: string;
  points: number;
  status: string;
  assignee?: string;
}

export default function DeveloperPage() {
  const [stories, setStories] = useState<AvailableStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await fetch('/api/agile/stories?status=ready,in_progress');
        if (res.ok) {
          const data = await res.json();
          setStories(data.stories);
        }
      } catch (err) {
        console.error('Error fetching stories:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center">Loading stories...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Developer Workspace</h1>
      <p className="text-gray-600 mb-6">
        Select a story to begin work. Crew will guide you every step.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {stories.map(story => (
          <Link key={story.id} href={`/developer/story/${story.id}`}>
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{story.title}</h3>
                  <p className="text-sm text-gray-600">{story.ref}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">{story.points}</div>
                  <div className="text-xs text-gray-600">points</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    story.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {story.status}
                </span>

                <button className="text-blue-500 font-medium hover:text-blue-700">
                  Start Work →
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/*
 * File: packages/ui/src/app/developer/story/[storyId]/page.tsx
 * 
 * Individual story workspace.
 */

import { DeveloperStoryWorkspace } from '@/components/DeveloperStoryWorkspace';

export default function DeveloperStoryPage({
  params,
}: {
  params: { storyId: string };
}) {
  // Extract storyRef from story data (would normally fetch)
  const storyRef = 'STORY-456'; // TODO: fetch actual story ref

  return (
    <DeveloperStoryWorkspace
      storyId={params.storyId}
      storyRef={storyRef}
      projectId="project-1"
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/*
 * File: packages/ui/src/app/api/agile/sprints/[id]/route.ts
 * 
 * GET: Fetch sprint details
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Query database for sprint details
  const sprint = {
    id: params.id,
    name: 'Sprint 3',
    startDate: '2024-01-15',
    endDate: '2024-01-29',
    goal: 'Complete OAuth integration',
    status: 'in_progress',
  };

  return NextResponse.json({ sprint });
}

/*
 * File: packages/ui/src/app/api/agile/stories/route.ts
 * 
 * GET: Fetch stories (optionally filtered by sprint)
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sprintId = searchParams.get('sprintId');
  const status = searchParams.get('status');

  // TODO: Query database based on filters
  const stories = [
    {
      id: '1',
      ref: 'STORY-456',
      title: 'Add user authentication with OAuth',
      status: 'in_progress',
      points: 8,
      assignee: 'Alice',
      dueDate: '2024-01-25',
      crewProgress: 65,
      blockers: [],
      hasDecisionPending: false,
      riskLevel: 'low',
    },
    // ... more stories
  ];

  return NextResponse.json({ stories });
}

/*
 * File: packages/ui/src/app/api/stories/[id]/route.ts
 * 
 * GET: Fetch individual story details
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Query database for story details
  const story = {
    id: params.id,
    ref: 'STORY-456',
    title: 'Add user authentication with OAuth',
    description: 'Implement OAuth 2.0 authentication for user login',
    acceptanceCriteria: [
      'User can login with OAuth provider',
      'OAuth token is securely stored',
      'User can logout',
      'Token refresh works automatically',
      'Session expires after timeout',
    ],
    points: 8,
    status: 'in_progress',
    assignee: 'Alice',
    dueDate: '2024-01-25',
    repository: 'github.com/company/api',
    branchName: 'STORY-456-oauth',
    prNumber: 456,
    cicdStatus: 'passed',
    testCoverage: 92,
  };

  return NextResponse.json({ story });
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════

/*
 * TODO: Complete this integration checklist
 * 
 * [ ] Create app/page.tsx (home with role selection)
 * [ ] Create app/pm/page.tsx (PM dashboard)
 * [ ] Create app/pm/sprint/page.tsx (sprint board full screen)
 * [ ] Create app/developer/page.tsx (story list)
 * [ ] Create app/developer/story/[storyId]/page.tsx (story workspace)
 * 
 * [ ] Create API routes:
 *     [ ] /api/agile/sprints/[id]/route.ts
 *     [ ] /api/agile/stories/route.ts
 *     [ ] /api/stories/[id]/route.ts
 *     [ ] /api/crew/insights/route.ts
 *     [ ] /api/crew/decisions/route.ts
 *     [ ] /api/crew/decisions/[id]/approve/route.ts
 *     [ ] /api/crew/decisions/[id]/reject/route.ts
 * 
 * [ ] Connect to database:
 *     [ ] sa_sprint table (sprints)
 *     [ ] sa_story table (stories)
 *     [ ] sa_crew_state table (crew execution)
 *     [ ] sa_crew_insights table (insights)
 *     [ ] sa_crew_decisions table (decisions)
 * 
 * [ ] Connect WebSocket:
 *     [ ] DeveloperStoryWorkspace → ws://localhost:8000
 *     [ ] ProjectManagerDashboard → ws://localhost:8000
 *     [ ] Subscribe to stories on mount
 * 
 * [ ] Test flows:
 *     [ ] PM opens dashboard → sees all stories with crew progress
 *     [ ] PM clicks story → sees real-time crew execution
 *     [ ] Dev opens story → sees crew guidance immediately
 *     [ ] Crew updates received via WebSocket
 *     [ ] PM can approve/reject crew decisions
 *     [ ] Dev can see approved decisions
 * 
 * [ ] Performance optimization:
 *     [ ] Memoize components (React.memo)
 *     [ ] Lazy load heavy components
 *     [ ] Cache API responses (SWR/TanStack Query)
 *     [ ] Virtualize long lists (windowing)
 */

export {};
