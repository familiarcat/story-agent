/**
 * Shared contracts for the Step-1 story picker (crew story-picker mission, RAG 38b41c47).
 * Owned by the foundation; the four team tracks import from here so they compose without
 * cross-editing each other's files.
 */

export type HierarchySelection = {
  clientId: string | null;
  projectId: string | null;
  sprintId: string | null;
  storyId: string | null;
  storyReferenceNum: string | null;
};

export const EMPTY_SELECTION: HierarchySelection = {
  clientId: null,
  projectId: null,
  sprintId: null,
  storyId: null,
  storyReferenceNum: null,
};

/** Worf's write contract: every mutation flows through this action shape (dry-run then confirm). */
export interface WorfGateAction {
  actionType: 'create-story';
  /** Human title, e.g. "Create Story in Sprint SP-42". */
  label: string;
  /** The write payload, shown verbatim in the preview. */
  payload: Record<string, unknown>;
  /** POST target; the modal sends confirm:false for preview, confirm:true to commit. */
  endpoint: string;
}
