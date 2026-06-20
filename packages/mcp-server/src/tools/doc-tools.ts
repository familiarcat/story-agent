/**
 * MCP Tools for documentation corpus retrieval.
 * 
 * Tools for agents to query phased docs, role-specific guidance, and search.
 */

import {
  retrieveDocKnowledge,
  listDocPhases,
  getRoleGuidance,
  searchDocs,
} from '@story-agent/shared';

// ── Tool Implementations ─────────────────────────────────────────────────────

export async function getDocGuidance(input: {
  phase: 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4';
  tags?: string[];
  query?: string;
  limit?: number;
}) {
  const results = await retrieveDocKnowledge({
    phase: input.phase,
    tags: input.tags,
    query: input.query,
    limit: input.limit,
  });

  return {
    phase: input.phase,
    count: results.length,
    docs: results.map(doc => ({
      id: doc.id,
      doc_id: doc.doc_id,
      doc_path: doc.doc_path,
      title: doc.title,
      heading: doc.heading,
      content: doc.content_text,
      similarity: doc.similarity?.toFixed(3),
    })),
  };
}

export async function getRoleSpecificGuidance(input: {
  role: 'project_manager' | 'developer' | 'lead';
  phase?: 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4';
}) {
  const results = await getRoleGuidance(input.role, input.phase);

  return {
    role: input.role,
    phase: input.phase,
    count: results.length,
    recommendations: results.map(doc => ({
      title: doc.title,
      heading: doc.heading,
      content: doc.content_text,
      doc_path: doc.doc_path,
    })),
  };
}

export async function searchDocumentation(input: {
  keyword: string;
  phase?: 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4';
}) {
  const results = await searchDocs(input.keyword, input.phase);

  return {
    query: input.keyword,
    phase: input.phase,
    count: results.length,
    results: results.map(doc => ({
      title: doc.title,
      heading: doc.heading,
      content: doc.content_text,
      doc_path: doc.doc_path,
      similarity: doc.similarity?.toFixed(3),
    })),
  };
}

export async function listAvailablePhases() {
  const phases = await listDocPhases();

  return {
    phases,
    description: 'Available doc phases for guided learning',
  };
}
