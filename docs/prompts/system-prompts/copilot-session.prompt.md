---
title: "Copilot Session Prompt - Story Agent"
category: "prompts"
subcategory: "system-prompts"
tags: ["copilot", "session", "context", "architecture", "quick-start"]
searchable: true
version: "1.0"
last_updated: "2026-06-07"
purpose: "Paste this into a new Copilot chat session to provide complete project context"
---

# Story Agent - Copilot Session Prompt

Use this prompt in a new Copilot chat session to provide complete context about the Story Agent project.

---

## Context: Story Agent Project Overview

I'm working on **Story Agent**, an agentic system for autonomous story delivery from Aha (product management) through to GitHub PR merge. Please understand the following about our architecture, implementation, and goals.

### Project Status: ACTIVE DEVELOPMENT ✅

The Story Agent has achieved **production-ready status** with ongoing active development:
- ✅ 11-member autonomous crew system with Star Trek personas
- ✅ Enterprise-grade prompt engineering framework
- ✅ Complete archival and auditing system for all LLM calls
- ✅ Cost-optimized model selection per crew member
- ✅ Full TypeScript build passing all checks
- ✅ Phased knowledge corpus (`docs/`) with vector indexing and semantic retrieval
- ✅ Doc retrieval MCP tools (`get_doc_guidance`, `get_role_guidance`, `search_docs`, `list_doc_phases`)
- ✅ WebSocket server for real-time crew state broadcasting
- ✅ Real-time crew state management (`crew-autonomy-manager.ts`, `crew-state-broadcaster.ts`)
- ✅ Agile provider abstraction (Aha, Jira, Stub via `providers/` directory)
- ✅ Sprint planning UI (`/sprint/` route)
- ✅ **3-layer testing infrastructure** (108 tests: unit + integration with mocks + CI/CD ready)
- ✅ **Aha project structure inspection** (roadmap & hierarchy endpoints)
- ✅ **VSCode extension tree view** (project structure in IDE sidebar)

**Git Repository:** `/Users/brady.georgen.ext/Documents/workspace/story-agent`

---

## System Architecture

### High-Level Flow

```
Aha Story → GitHub Branch Creation → LLM-Driven Implementation 
  → Code Generation → PR Creation → Comment Tracking → Revision Loop 
  → PR Merge → Delivery Completion
```

### Key Documents to Reference
- [CREW_MANIFEST.md](../../crew/manifests/crew-manifest.md) - All 11 crew members
- [IMPLEMENTATION_COMPLETE.md](../../knowledge/architecture/implementation-complete.md) - Technical details
- [PHASED_EXECUTION.md](../../phases/PHASED_EXECUTION.md) - Guided learning path

---

## The 11-Member Autonomous Crew

Each crew member has specialized expertise and decision authority:
- **Picard** (Captain & Strategy)
- **Data** (Architecture)
- **Riker** (Execution)
- **Geordi** (Infrastructure)
- **O'Brien** (DevOps)
- **Worf** (Security, Veto Authority)
- **Troi** (Stakeholder)
- **Crusher** (System Health)
- **Uhura** (Documentation)
- **Quark** (Finance)
- **Yar** (QA)

---

## When to Use This Prompt

- **Starting new Copilot chat session:** Copy entire prompt into new chat
- **Adding project context:** Use specific sections (Architecture, Crew, Setup)
- **For new team members:** Share complete prompt for onboarding
- **Reference:** Bookmark this file in your Copilot favorites

---

**Last Updated:** 2026-06-07  
**Status:** Current - Use for all new Copilot sessions  
**Related Files:** [docs/prompts/](../) index, [.github/copilot-instructions.md](../../../../.github/copilot-instructions.md)
