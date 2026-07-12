# Navigation Hierarchy & Information Architecture Refactor — Crew Investigation Brief

## Executive Summary
**Goal**: Refactor navigation and page headers to:
1. Remove crew member names from top-level headers (flatten hierarchy)
2. Reorder nav/IA from "BUILD → PLAN → OBSERVE" to "PLAN → BUILD → OBSERVE" 
3. Ensure ordering respected throughout application layout for user mental model

**Impact**: Improves information architecture clarity, aligns with actual workflow phases

---

## Current State (To Be Changed)

### Navigation Order (WRONG)
```
STORY AGENT
├─ BUILD ──────────────────────── (1st)
│  ├─ Agent Workspace
│  ├─ API Docs
│  └─ Vision
├─ PLAN ───────────────────────── (2nd)
│  ├─ Dashboard
│  ├─ Sprint Board
│  └─ New Story
└─ OBSERVE ────────────────────── (3rd)
   ├─ Cost Observatory
   ├─ Learnings
   ├─ Crew Memories
   ├─ Observations
   └─ Observation Lounge
```

### Page Headers (WITH crew names)
```
OBSERVATIONS • QUARK           ← Crew name in header
COST OBSERVATORY • QUARK       ← Crew name in header
LEARNINGS • CREW               ← Crew name in header
```

### Issue
- **Wrong order**: Users see BUILD first, but workflow is PLAN → BUILD → OBSERVE
- **Header clutter**: Crew names in top-level headers (belongs in sections below)
- **Visual hierarchy**: No sense of workflow phases in navigation

---

## Desired State (After Refactor)

### Navigation Order (CORRECT)
```
STORY AGENT
├─ PLAN ────────────────────────── (1st — Define work)
│  ├─ Dashboard
│  ├─ Sprint Board
│  └─ New Story
├─ BUILD ──────────────────────── (2nd — Execute work)
│  ├─ Agent Workspace
│  ├─ API Docs
│  └─ Vision
└─ OBSERVE ────────────────────── (3rd — Learn from work)
   ├─ Cost Observatory
   ├─ Learnings
   ├─ Crew Memories
   ├─ Observations
   └─ Observation Lounge
```

### Page Headers (WITHOUT crew names in top level)
```
👁️ OBSERVATIONS               ← Clean, no crew name
💰 COST OBSERVATORY          ← Clean, no crew name
🧠 LEARNINGS                  ← Clean, no crew name
```

### Crew Attribution (Lower in hierarchy)
```
👁️ OBSERVATIONS

CREW DELIBERATION OUTCOMES • LEARNING LOOP

Deliberation Details
────────────────────────────
Quark · Data                  ← Crew name appears here
```

---

## Investigation Questions for Crew

### 1. **Navigation Reordering**
- [ ] Update `DOMAIN_GROUPS` in `packages/ui/src/components/domains.ts`?
- [ ] Should URL paths change? (/plan/ before /build/?)
- [ ] Any bookmarks/links to update in docs?
- [ ] Update NavBar component order?

### 2. **Header Refactoring**
- [ ] Find all top-level page headers with crew names
- [ ] Remove crew names from headers (keep everywhere else)
- [ ] Verify crew attribution still visible in body/sections

### 3. **Scope of Changes**
Which pages need updating?
- [ ] `/observe` → `/plan` (new primary)
- [ ] `/dashboard` (already in PLAN)
- [ ] `/cost` (move from OBSERVE context?)
- [ ] `/learnings` (move from OBSERVE context?)
- [ ] `/crew/observations` (keep in OBSERVE)
- [ ] `/observation-lounge` (keep in OBSERVE)
- [ ] `/agent` (keep in BUILD)
- [ ] Page titles + breadcrumbs

### 4. **Information Architecture**
- [ ] Should page layout reflect phases visually? (Timeline? Steps?)
- [ ] Any LCARS styling updates to show phase progression?
- [ ] Should sidebar/context show current phase?

### 5. **User Mental Model**
- [ ] Does PLAN → BUILD → OBSERVE make sense to users?
- [ ] Should each phase have an intro/context section?
- [ ] Should there be visual cues showing progression?

---

## Detailed Scope

### Phase 1: Navigation Reordering

**File**: `packages/ui/src/components/domains.ts`

Current:
```typescript
export const DOMAIN_GROUPS: DomainGroup[] = [
  { group: 'Build', owner: 'Geordi · Engineering', ... },  // 1st
  { group: 'Plan', owner: 'Riker · Delivery', ... },       // 2nd
  { group: 'Observe', owner: 'Quark · Data', ... },        // 3rd
];
```

Desired:
```typescript
export const DOMAIN_GROUPS: DomainGroup[] = [
  { group: 'Plan', owner: 'Riker · Delivery', ... },       // 1st
  { group: 'Build', owner: 'Geordi · Engineering', ... },  // 2nd
  { group: 'Observe', owner: 'Quark · Data', ... },        // 3rd
];
```

**Impact**: NavBar, home page, all navigation

---

### Phase 2: Header Refactoring

**Files to Update**:

```
packages/ui/src/app/
├─ cost/page.tsx               (remove "QUARK" from header)
├─ learnings/page.tsx          (remove "CREW" from header)
├─ crew/memories/page.tsx      (update header)
├─ crew/observations/page.tsx  (update header — PRIMARY)
└─ observation-lounge/page.tsx (update header)
```

**Pattern**:
```typescript
// Before
<div>💰 COST OBSERVATORY · QUARK</div>

// After
<div>💰 COST OBSERVATORY</div>

// Crew attribution stays in body:
// "Quark · Data" appears in section titles, not page header
```

---

### Phase 3: Breadcrumbs & Navigation Consistency

**Files**:
- `packages/ui/src/components/NavBar.tsx` — order of menu items
- `packages/ui/src/app/page.tsx` — home page domain order
- Breadcrumbs throughout app

**Consistency Check**:
- All pages respect PLAN → BUILD → OBSERVE order
- Sidebar/section navigation matches top nav
- No references to old BUILD-first order

---

### Phase 4: Visual Hierarchy (Optional Enhancement)

If crew wants to go further:
- Add visual phase indicators (1. PLAN | 2. BUILD | 3. OBSERVE)
- Show current phase highlighted
- Optional: Add phase-transition UI (timeline, steps)

---

## Success Criteria

✅ **Navigation reordered** PLAN → BUILD → OBSERVE in all places  
✅ **Headers cleaned** Crew names removed from page headers (keep in body)  
✅ **Consistency** User sees same order everywhere (nav, breadcrumbs, IA)  
✅ **Mental model** User understands workflow phases  
✅ **Attribution preserved** Crew members still visible in sections/details  
✅ **No broken links** All URLs and bookmarks still work  
✅ **Tested** Visual inspection of all affected pages  

---

## Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `packages/ui/src/components/domains.ts` | Reorder DOMAIN_GROUPS | All navigation |
| `packages/ui/src/components/NavBar.tsx` | Update menu order | Top navigation bar |
| `packages/ui/src/app/page.tsx` | Update domain card order | Home page |
| `packages/ui/src/app/cost/page.tsx` | Remove "QUARK" from title | Cost Observatory page |
| `packages/ui/src/app/learnings/page.tsx` | Remove "CREW" from title | Learnings page |
| `packages/ui/src/app/crew/observations/page.tsx` | Update title | Observations page |
| `packages/ui/src/app/observation-lounge/page.tsx` | Update title | Observation Lounge page |
| `packages/ui/src/components/Breadcrumbs.tsx` | Update order refs | All breadcrumbs |

---

## Crew Decisions Needed

### 1. **Breadcrumb Navigation**
- Keep breadcrumbs as-is?
- OR update to show phase?
- Example: `PLAN › Dashboard › Stories` vs current format?

### 2. **Home Page Layout**
- Reorder domain cards to PLAN → BUILD → OBSERVE?
- Add visual phase numbers (1, 2, 3)?
- Add narrative connecting phases?

### 3. **Header Styling**
- When removing crew names, adjust spacing?
- Keep existing styling (LCARS)?
- Any new visual treatment?

### 4. **Documentation**
- Update docs/setup/ references to old order?
- Update README navigation section?
- Update user guides?

---

## Implementation Plan (For Crew)

### Step 1: Reorder Navigation (5 min)
```typescript
// Update domains.ts: reorder DOMAIN_GROUPS array
```

### Step 2: Update Page Headers (10 min)
```typescript
// Remove crew names from page titles:
// "OBSERVATIONS • QUARK" → "OBSERVATIONS"
```

### Step 3: Verify Consistency (10 min)
```
• Check NavBar order
• Check home page domain cards
• Check breadcrumbs
• Check all page headers
```

### Step 4: Visual Inspection (10 min)
```
• Visit each page in browser
• Verify new order visible
• Verify crew names still in body sections
• Check no broken links
```

### Step 5: Commit & Test (5 min)
```bash
git add packages/ui/src/
git commit -m "refactor(ux): reorder navigation PLAN→BUILD→OBSERVE, clean headers"
pnpm run check  # typecheck + build
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **Broken bookmarks** | URLs stay same, just reordered in nav |
| **User confusion** | New order is more logical (workflow phases) |
| **Documentation drift** | Update docs.md, README with new order |
| **Mobile nav issues** | Test on mobile view (if applicable) |

---

## Questions for Crew Deliberation

1. Should PLAN → BUILD → OBSERVE order be reflected in page layout too? (visual timeline?)
2. Should home page show phase narrative? (e.g., "1. Plan your work → 2. Build → 3. Observe")
3. Any other headers hiding crew names that should be cleaned?
4. Should URL structure change? (/plan/ /build/ /observe/ prefixes?)

---

## Deliverables Expected

1. **Code changes**: Reordered navigation + cleaned headers
2. **Verification**: Screenshots showing new order
3. **No regressions**: All links work, no broken navigation
4. **Crew attribution**: Crew names still visible in appropriate places

---

**Severity**: Low (UX/IA refinement)  
**Scope**: Frontend only, UI package  
**Effort**: ~1 hour implementation + testing  
**Owner**: Geordi (UI Engineering) + Riker (IA review)  
**Timeline**: Can ship immediately after approval

---

**Status**: READY FOR CREW DELIBERATION
