// DB helpers — imports from @story-agent/shared/db so the same SQLite file
// is used by both the MCP server and the Next.js UI without duplicating logic.
export {
  upsertStory,
  listStories,
  getStory,
  getCommentsForStory,
  getRevisionCycles,
  listProjects,
  storeObservationMemory,
  getRecentObservationMemories,
  getRelevantObservationMemories,
  recordObservationMemoryOutcome,
} from '@story-agent/shared/db';
