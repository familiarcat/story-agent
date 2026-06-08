---
title: "Prompt Engineering & System Instructions Index"
category: "prompts"
tags: ["index", "navigation", "prompts", "system", "crew", "engineering"]
searchable: true
version: "1.0"
last_updated: "2026-06-07"
---

# 🤖 Prompt Engineering Documentation

System prompts, crew member prompts, and prompt engineering configuration files.

---

## 📂 Quick Navigation

| Section | Purpose | Directory |
|---------|---------|-----------|
| **System Prompts** | Core system-level instructions | [system-prompts/](system-prompts/) |
| **Crew Prompts** | Individual crew member prompts | [crew-prompts/](crew-prompts/) |

---

## 📋 Quick Reference

### System Prompts (`system-prompts/`)

**Purpose**: Core instructions that guide system behavior and organization

| File | Purpose | Use Case |
|------|---------|----------|
| [.md-organization.prompt.md](system-prompts/.md-organization.prompt.md) | File organization & RAG integration rules | Reference when organizing new .md files |
| [copilot-session.prompt.md](system-prompts/copilot-session.prompt.md) | Copilot session initialization prompt | Paste into new Copilot chat sessions |

### Crew Prompts (`crew-prompts/`)

**Purpose**: Individual system prompts for each crew member

> **Coming Soon**: Individual crew member prompts will be stored here for reference and auditing.

**Structure**:
```
crew-prompts/
├── picard-strategic-command.md
├── data-architecture-validation.md
├── riker-execution-tactics.md
├── ... (all 11 crew members)
└── README.md (index)
```

---

## 🎯 Using These Files

### For File Organization (System Prompts)

When creating or moving .md files:

1. **Read**: [.md-organization.prompt.md](system-prompts/.md-organization.prompt.md)
2. **Follow**: The folder hierarchy rules
3. **Classify**: Your document by purpose
4. **Place**: In appropriate `docs/` subfolder
5. **Add**: Required frontmatter metadata
6. **Link**: From appropriate index files

### For Copilot Sessions (System Prompts)

When starting a new Copilot chat:

1. **Open**: [copilot-session.prompt.md](system-prompts/copilot-session.prompt.md)
2. **Copy**: Entire content
3. **Paste**: Into new Copilot chat
4. **Submit**: As initial prompt for full context

### For Crew Understanding (Crew Prompts)

When understanding crew member capabilities:

1. **Go To**: [crew-prompts/](crew-prompts/) folder
2. **Select**: Individual crew member file
3. **Review**: Their system prompt, expertise, constraints
4. **Reference**: When assigning tasks

---

## 📊 Frontmatter Template

All prompt files should include:

```yaml
---
title: "Clear, Descriptive Title"
category: "prompts"  # or your category
subcategory: "system-prompts" or "crew-prompts"  # if applicable
tags: ["relevant", "keywords", "for", "discovery"]
searchable: true
version: "1.0"
last_updated: "YYYY-MM-DD"
purpose: "What this file is used for"
---
```

---

## 🔍 Key Prompts by Purpose

| Purpose | File | How to Use |
|---------|------|-----------|
| **New .md files** | [.md-organization.prompt.md](system-prompts/.md-organization.prompt.md) | Reference before organizing files |
| **Copilot context** | [copilot-session.prompt.md](system-prompts/copilot-session.prompt.md) | Paste into new chat |
| **Crew capabilities** | [crew-prompts/](crew-prompts/) | Review individual member |

---

## 📈 Related Documentation

- [docs/ home](../) — Main docs index
- [docs/status/](../status/) — Session & completion reports
- [docs/crew/](../crew/) — Crew member manifests & documentation
- [docs/knowledge/](../knowledge/) — Technical knowledge base

---

## 🏠 Navigation

- [Go back to docs/](../)
- [Go to project root](../../../../)

---

## 📝 Adding New Prompts

To add a new system or crew prompt:

1. Create file in appropriate subfolder: `{name}.prompt.md`
2. Add frontmatter metadata (see template above)
3. Write content with clear sections
4. Link from this README in appropriate section
5. Update last_updated date

**Pattern for crew prompts**:
```
crew-prompts/{crew-name}-{domain}.prompt.md

Examples:
- crew-prompts/picard-strategic-command.prompt.md
- crew-prompts/data-architecture-validation.prompt.md
```

---

**Last Updated**: 2026-06-07  
**Status**: Current  
**Searchable**: Yes  
**Version**: 1.0
