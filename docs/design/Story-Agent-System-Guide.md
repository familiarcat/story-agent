# Story Agent Architecture & Refactoring Guide (Draft)

> **Status:** Initial blueprint generated from project goals. This
> document is intended to be expanded as the repository is analyzed
> module-by-module.

## Executive Summary

This guide proposes evolving Story Agent into a **repository-aware AI
orchestration platform**.

### Vision

``` text
VS Code / Claude Code / Web UI
            │
            ▼
      Story Agent Core
            │
 ┌──────────┼──────────┐
 │ Context Engine      │
 │ Crew Manager        │
 │ MCP Gateway         │
 │ Prompt Builder      │
 │ Memory              │
 └──────────┼──────────┘
            ▼
      OpenRouter Gateway
            ▼
  Claude / GPT / Gemini / DeepSeek / Qwen
```

------------------------------------------------------------------------

# Current Architecture (Hypothesis)

``` mermaid
flowchart TD
VSCode --> Participant
Participant --> ChatEngine
ChatEngine --> ChatClient
ChatClient --> LLM
LLM --> Response
```

## Observed Gaps

-   Workspace awareness is limited.
-   Repository graph is not first-class context.
-   Crew activation appears downstream of chat.
-   Model routing is not centralized.

------------------------------------------------------------------------

# Target Architecture

``` mermaid
flowchart TD
Editor --> StoryAgent

StoryAgent --> ContextEngine
StoryAgent --> CrewManager
StoryAgent --> MCPServer
StoryAgent --> PromptBuilder

ContextEngine --> RepositoryIndex
CrewManager --> Planner
CrewManager --> Architect
CrewManager --> Coder
CrewManager --> Reviewer
CrewManager --> Researcher

PromptBuilder --> OpenRouter
OpenRouter --> Claude
OpenRouter --> GPT5
OpenRouter --> Gemini
OpenRouter --> DeepSeek
OpenRouter --> Qwen
```

------------------------------------------------------------------------

# Repository Context Engine

Responsibilities

-   Parse workspace
-   Build AST graph
-   Dependency graph
-   Git awareness
-   Symbol index
-   Semantic search
-   Vector retrieval

Output

-   Current file
-   Related files
-   Call graph
-   Imports
-   Tests
-   Git diff
-   Relevant documentation

------------------------------------------------------------------------

# MCP Ecosystem

``` mermaid
graph LR

VSCode --> MCP

ClaudeCode --> MCP

Web --> MCP

MCP --> Workspace
MCP --> Crew
MCP --> Memory
MCP --> OpenRouter
```

Suggested tools

-   workspace.tree
-   workspace.read
-   workspace.search
-   workspace.symbols
-   git.status
-   activateCrew
-   switchModel
-   runPlanner
-   runReviewer
-   generateArchitecture

------------------------------------------------------------------------

# Crew Personas

## Architect

Skills

-   software architecture
-   DDD
-   event systems
-   distributed systems

Goals

-   preserve architecture
-   reduce coupling

Constraints

-   avoid breaking public APIs
-   preserve backward compatibility

------------------------------------------------------------------------

## Planner

Skills

-   decomposition
-   roadmap generation
-   sprint planning

Goals

-   deterministic plans
-   measurable milestones

Constraints

-   avoid implementation until approved

------------------------------------------------------------------------

## Senior Engineer

Skills

-   TypeScript
-   React
-   Node
-   VS Code Extension API
-   MCP

Goals

-   minimal diffs
-   maintainability

Constraints

-   compile cleanly
-   preserve tests

------------------------------------------------------------------------

## Reviewer

Skills

-   code quality
-   security
-   performance

Goals

-   detect regressions

Constraints

-   no speculative criticism

------------------------------------------------------------------------

## Researcher

Skills

-   documentation
-   APIs
-   standards

Goals

-   verify assumptions

Constraints

-   distinguish verified vs inferred

------------------------------------------------------------------------

# Prompt Engineering Principles

1.  Repository-first reasoning
2.  Plan before coding
3.  Read before writing
4.  Small atomic commits
5.  Preserve architecture
6.  Validate after edits
7.  Explain reasoning
8.  Prefer composition
9.  Maintain testability
10. Stream structured output

------------------------------------------------------------------------

# Universal Orchestrator Prompt

You are Story Agent, the autonomous software architecture orchestrator.

Mission: Understand the complete repository before modifying code. Build
a semantic model of the workspace, identify architectural boundaries,
and coordinate specialized expert agents to produce the smallest correct
change.

Agents: - Architect - Planner - Senior Engineer - Reviewer - Researcher

Workflow:

1.  Scan repository.
2.  Build dependency graph.
3.  Determine affected modules.
4.  Retrieve only relevant context.
5.  Produce implementation plan.
6.  Execute minimal changes.
7.  Run validation.
8.  Review output.
9.  Summarize changes.
10. Recommend follow-up work.

Output Contract:

-   Executive Summary
-   Impacted Files
-   Architectural Analysis
-   Implementation Plan
-   Code Changes
-   Validation Results
-   Risks
-   Next Steps

Never invent repository structure. Read before editing. Preserve
architectural integrity. Optimize for maintainability, determinism, and
traceability.

------------------------------------------------------------------------

# Next Expansion

This draft should be expanded into:

1.  Complete repository architecture map
2.  File-by-file analysis
3.  VS Code extension internals
4.  MCP server internals
5.  OpenRouter gateway design
6.  Memory subsystem
7.  Crew lifecycle
8.  Streaming architecture
9.  Sequence diagrams
10. Migration roadmap
