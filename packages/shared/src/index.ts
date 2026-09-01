/**
 * @story-agent/shared - Main export barrel
 * Re-exports all public types and functions from shared modules
 */

// Types
export * from './types';

// Database layer
export * from './db';
export * from './crew-db';
export * from './oauth-db';

// PM System
export * from './pm-adapters/jira-adapter';
export * from './pm-adapters/monday-adapter';
export * from './pm-adapters/azure-devops-adapter';
export * from './pm-adapters/types';
export * from './pm-types';
export * from './pm-validation';

// Aha integration
export * from './aha-client';
export * from './aha-credentials';
export * from './aha-events';
export * from './aha-mappers';

// Security & Access Control
export * from './client-security-policy';
export * from './client-registry';
export * from './client-scope';
export * from './policy-checksum';
export * from './control-lane';
export * from './entitlements';
export * from './entitlement-sync';
export * from './delegation-router';
export * from './iam-identity-center';

// Credentials & Auth
export * from './worfgate-credentials';
export * from './worfgate-redact';
export * from './worfgate-credential-providers';
export * from './worfgate-chat-validator';
export * from './worfgate-sync-validator';
export * from './worfgate/pm-tool-policy';

// Documentation & Knowledge
export * from './lounge-provenance';
export * from './lcars-markdown';
export * from './skill-theory';

// UI & Theming
export * from './ui-tokens';
export * from './design-doctrine';
export * from './design-theme-layers';
export * from './client-brand-themes';

// Features & Status
export * from './workflow-status';
export * from './system-status';
export * from './async-status';
export * from './agent-modes';

// Story & Project Management
export * from './story-gravity';
export * from './velocity-metrics';
export * from './velocity-cache';

// Data & Processing
export * from './selection-contract';
export * from './image-input';
export * from './pdf-input';
export * from './file-input';
export * from './pdf-processor';
export * from './pdf-cache';
export * from './vision';
export * from './checksum-storage';
export * from './embedding';
export * from './task-classifier';
export * from './s3-structure';
export { initialStructuredMemoryState, mergeStructuredMemoryPatch, buildStructuredMemoryPatchFromDebate, summarizeStructuredMemory, SOURCE_AUTHORITY } from './structured-memory';

// Business Logic
export * from './business-tier';
export * from './crew-assignment';
export * from './crew-stream';

// Crew Library
export * from './lib/crew-baseline-memories';
export * from './lib/crew-expertise';
export * from './lib/crew-task-routing';
export * from './lib/domain-registry';

// Database documentation
export * from './db-docs';

// Schemas
export * from './schemas/aha-events.schema';