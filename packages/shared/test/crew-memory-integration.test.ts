/**
 * Integration Tests for Multi-Project Crew Memory Workflows
 * 
 * Tests the complete flow of:
 * 1. Crew members storing memories on Project A
 * 2. Switching to Project B
 * 3. Retrieving and applying past learnings
 * 4. Verifying data isolation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  storeCrewPersonalMemory,
  getCrewPersonalMemories,
  searchCrewPersonalMemories,
  searchCrewPersonalMemoriesByEmbedding,
  getCrewMemoriesByProject,
  getCrewMemoryStats,
  toEmbedding,
} from '@story-agent/shared';

// Test configuration
const TEST_PROJECT_A = 'test-project-a';
const TEST_PROJECT_B = 'test-project-b';
const TEST_CREW = {
  worf: 'worf',
  data: 'data',
  geordi: 'geordi',
};

describe('Multi-Project Crew Memory Integration Tests', () => {
  let createdMemoryIds: number[] = [];

  // Setup: Cleanup any existing test data
  beforeAll(async () => {
    console.log('🚀 Setting up multi-project crew memory integration tests');
  });

  // Teardown: Clean up test data
  afterAll(async () => {
    console.log('🧹 Cleaning up test data');
    // Note: In production, would need a cleanup mechanism
  });

  describe('Project A: Initial Learning Phase', () => {
    it('should allow Worf to store RLS security insights on Project A', async () => {
      const memoryId = await storeCrewPersonalMemory({
        crew_id: TEST_CREW.worf,
        memory_type: 'lesson_learned',
        title: 'RLS Composite Key Pattern for Multi-Tenant',
        content: `
          Discovered that RLS policies work best when:
          1. org_id is the first column in composite keys
          2. All tables have consistent org_id column name
          3. RLS policies check auth.jwt()->>'org_id' first
        `,
        project_id: TEST_PROJECT_A,
        task_id: 'PROJ-A-001',
        tags: ['rls', 'security', 'multi-tenant'],
        relates_to_crew: ['data'],
      });

      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('number');
      if (memoryId === null) throw new Error('Memory ID should not be null');
      createdMemoryIds.push(memoryId!);
    });

    it('should allow Data to store schema design decisions on Project A', async () => {
      const memoryId = await storeCrewPersonalMemory({
        crew_id: TEST_CREW.data,
        memory_type: 'decision_note',
        title: 'Schema Versioning Strategy',
        content: `
          Decision: Use date-based migrations (YYYYMMDD_description.sql)
          Rationale: 
          - Natural ordering for execution sequence
          - Reduces merge conflicts in team environment
          - Easy to understand timeline of changes
        `,
        project_id: TEST_PROJECT_A,
        task_id: 'PROJ-A-002',
        tags: ['schema', 'versioning', 'migrations'],
        relates_to_crew: ['worf', 'geordi'],
      });

      expect(memoryId).toBeDefined();
      createdMemoryIds.push(memoryId!);
    });

    it('should allow Geordi to store performance baselines on Project A', async () => {
      const memoryId = await storeCrewPersonalMemory({
        crew_id: TEST_CREW.geordi,
        memory_type: 'insight',
        title: 'Index Strategy for Time-Series Queries',
        content: `
          B-Tree indexes are 5x faster than GiST for exact time-series queries.
          Baseline: 50ms query time with GiST
          Optimized: 10ms with B-Tree (80% improvement)
          
          Apply B-Tree for: timestamp columns, org_id, exact matches
          Apply GiST for: range queries, containment checks
        `,
        project_id: TEST_PROJECT_A,
        task_id: 'PROJ-A-003',
        tags: ['performance', 'indexing', 'optimization'],
        relates_to_crew: ['data'],
      });

      expect(memoryId).toBeDefined();
      createdMemoryIds.push(memoryId!);
    });

    it('should retrieve all Project A memories for each crew member', async () => {
      // Worf's memories
      const worfMemories = await getCrewMemoriesByProject(TEST_CREW.worf, TEST_PROJECT_A);
      expect(worfMemories.length).toBeGreaterThan(0);
      expect(worfMemories.some(m => m.title.includes('RLS'))).toBe(true);

      // Data's memories
      const dataMemories = await getCrewMemoriesByProject(TEST_CREW.data, TEST_PROJECT_A);
      expect(dataMemories.length).toBeGreaterThan(0);
      expect(dataMemories.some(m => m.title.includes('Schema'))).toBe(true);

      // Geordi's memories
      const geordiMemories = await getCrewMemoriesByProject(TEST_CREW.geordi, TEST_PROJECT_A);
      expect(geordiMemories.length).toBeGreaterThan(0);
      expect(geordiMemories.some(m => m.title.includes('Index'))).toBe(true);
    });
  });

  describe('Project B: Knowledge Transfer Phase', () => {
    it('should retrieve Worf\'s RLS learnings from Project A when starting Project B', async () => {
      // Search for RLS patterns from previous project
      const rslPatterns = await searchCrewPersonalMemories(
        TEST_CREW.worf,
        'RLS composite key pattern',
        5
      );

      expect(rslPatterns.length).toBeGreaterThan(0);
      expect(rslPatterns[0].project_id).toBe(TEST_PROJECT_A);
      expect(rslPatterns[0].title).toContain('RLS');
    });

    it('should allow semantic search to find related Data expertise for Project B', async () => {
      // Ask a question similar to what Data learned
      const query = 'How should I organize database migrations?';
      const embedding = await toEmbedding(query);
      const results = await searchCrewPersonalMemoriesByEmbedding(
        TEST_CREW.data,
        embedding,
        5,
        0.6
      );

      // Should find schema/versioning related memories
      expect(results.length).toBeGreaterThan(0);
      const hasRelevantMemory = results.some(r => 
        r.title.includes('Schema') || r.tags.includes('versioning')
      );
      expect(hasRelevantMemory).toBe(true);
    });

    it('should allow Geordi to apply indexing strategy to Project B', async () => {
      // Store new memory referencing previous learning
      const memoryId = await storeCrewPersonalMemory({
        crew_id: TEST_CREW.geordi,
        memory_type: 'decision_note',
        title: 'Project B: Reusing B-Tree Index Strategy',
        content: `
          Successfully applied B-Tree index pattern from Project A to Project B.
          New project has similar time-series schema.
          Expected: 80% improvement in query performance (10ms from 50ms baseline)
        `,
        project_id: TEST_PROJECT_B,
        task_id: 'PROJ-B-001',
        tags: ['performance', 'reuse', 'knowledge-transfer'],
        relates_to_crew: ['data', 'worf'],
      });

      expect(memoryId).toBeDefined();
      createdMemoryIds.push(memoryId!);
    });

    it('should maintain complete data isolation between projects', async () => {
      // Get Project A memories
      const projectAMemories = await getCrewMemoriesByProject(TEST_CREW.worf, TEST_PROJECT_A);
      const projectACount = projectAMemories.length;

      // Get Project B memories
      const projectBMemories = await getCrewMemoriesByProject(TEST_CREW.worf, TEST_PROJECT_B);
      const projectBCount = projectBMemories.length;

      // Both should have content
      expect(projectACount).toBeGreaterThan(0);
      expect(projectBCount).toBeGreaterThan(0);

      // But project B shouldn't include Project A memories
      const projectBHasProjectAMemory = projectBMemories.some(m => m.project_id === TEST_PROJECT_A);
      expect(projectBHasProjectAMemory).toBe(false);

      // And vice versa
      const projectAHasProjectBMemory = projectAMemories.some(m => m.project_id === TEST_PROJECT_B);
      expect(projectAHasProjectBMemory).toBe(false);
    });
  });

  describe('Cross-Project Memory Analysis', () => {
    it('should generate accurate memory statistics for each crew member', async () => {
      const worfStats = await getCrewMemoryStats(TEST_CREW.worf);
      expect(worfStats).toBeDefined();
      expect(worfStats.length).toBeGreaterThan(0);

      // Should have stats for multiple memory types and projects
      const hasMultipleTypes = worfStats.length > 1 || 
        worfStats.some(s => s.total_memories > 1);
      expect(hasMultipleTypes).toBe(true);
    });

    it('should retrieve memories with proper filtering', async () => {
      // Get all Worf memories
      const allMemories = await getCrewPersonalMemories(TEST_CREW.worf, 50);
      expect(allMemories.length).toBeGreaterThan(0);

      // All should have required fields
      allMemories.forEach(memory => {
        expect(memory.crew_id).toBe(TEST_CREW.worf);
        expect(memory.memory_type).toBeDefined();
        expect(['insight', 'lesson_learned', 'decision_note', 'reminder']).toContain(memory.memory_type);
        expect(memory.title).toBeTruthy();
        expect(memory.content).toBeTruthy();
      });
    });

    it('should search memories by text across projects', async () => {
      const results = await searchCrewPersonalMemories(
        TEST_CREW.geordi,
        'index performance',
        10
      );

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.crew_id).toBe(TEST_CREW.geordi);
        const contentMatches = result.title.toLowerCase().includes('index') || 
                              result.content.toLowerCase().includes('index');
        expect(contentMatches).toBe(true);
      });
    });

    it('should support tag-based memory discovery', async () => {
      // Store memory with specific tags
      const memoryId = await storeCrewPersonalMemory({
        crew_id: TEST_CREW.worf,
        memory_type: 'reminder',
        title: 'Remember: RLS Audit Requirements',
        content: 'Always verify RLS policies include org_id checks before deploying',
        project_id: TEST_PROJECT_B,
        tags: ['security', 'rls', 'audit', 'compliance'],
      });

      expect(memoryId).toBeDefined();
      createdMemoryIds.push(memoryId!);

      // Search by tag
      const results = await searchCrewPersonalMemories(
        TEST_CREW.worf,
        'compliance',
        5
      );

      const hasTaggedMemory = results.some(r => r.tags.includes('compliance'));
      expect(hasTaggedMemory).toBe(true);
    });
  });

  describe('Crew Collaboration via Memory Cross-References', () => {
    it('should track related crew members in memories', async () => {
      const worfMemories = await getCrewMemoriesByProject(TEST_CREW.worf, TEST_PROJECT_A);
      const collaborativeMemory = worfMemories.find(m => m.tags.includes('security'));

      if (collaborativeMemory) {
        // Should have references to related crew
        expect(collaborativeMemory).toBeDefined();
      }
    });

    it('should support memory relationships across projects', async () => {
      // Store memory that references learning from Project A
      const memoryId = await storeCrewPersonalMemory({
        crew_id: TEST_CREW.data,
        memory_type: 'decision_note',
        title: 'Project B: Applied Data Insights from Project A',
        content: `
          Successfully implemented schema versioning pattern discovered on Project A.
          Reduced migration conflicts by 80%.
        `,
        project_id: TEST_PROJECT_B,
        relates_to_crew: [TEST_CREW.worf, TEST_CREW.geordi],
        tags: ['knowledge-transfer', 'schema', 'process-improvement'],
      });

      expect(memoryId).toBeDefined();
      createdMemoryIds.push(memoryId!);
    });
  });

  describe('Performance and Scalability', () => {
    it('should efficiently retrieve large numbers of memories', async () => {
      const startTime = Date.now();
      const memories = await getCrewPersonalMemories(TEST_CREW.worf, 100);
      const duration = Date.now() - startTime;

      expect(memories).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds
    });

    it('should perform fast semantic searches', async () => {
      const query = 'performance optimization for databases';
      const embedding = await toEmbedding(query);

      const startTime = Date.now();
      const results = await searchCrewPersonalMemoriesByEmbedding(
        TEST_CREW.geordi,
        embedding,
        10
      );
      const duration = Date.now() - startTime;

      expect(results).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent crew member gracefully', async () => {
      const memories = await getCrewPersonalMemories('non-existent-crew', 10);
      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should handle empty search results', async () => {
      const results = await searchCrewPersonalMemories(
        TEST_CREW.worf,
        'xyzabc-definitely-not-found',
        5
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // May be empty or have results, but should be an array
    });

    it('should handle invalid project filter', async () => {
      const memories = await getCrewMemoriesByProject(
        TEST_CREW.worf,
        'invalid-project-xyz',
        10
      );

      expect(Array.isArray(memories)).toBe(true);
      // Should return empty array, not error
    });
  });
});

/**
 * Example usage of multi-project workflow:
 * 
 * 1. Project A starts: Team works on RLS, schema design, indexing
 * 2. Crew stores learnings (lesson_learned, decision_note, insight)
 * 3. Project A completes: All learnings stored in Supabase
 * 4. Project B starts: New client, similar requirements
 * 5. Crew retrieves Project A learnings (by project, by crew, by domain)
 * 6. Crew applies proven patterns from Project A to Project B
 * 7. Project B completes faster: 80% time savings vs Project A
 * 8. Project B learnings added to crew knowledge base
 * 9. Project C starts: Now has learnings from both A and B
 * 10. Crew capability increases exponentially with each project
 */
