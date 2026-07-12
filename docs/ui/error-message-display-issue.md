# Observation Detail Error Message Display Issue

## Problem
Error messages in the Observation Detail view are not displaying properly:
- Text is cut off or wrapping awkwardly
- "Observation" text appears on separate line
- Error container styling needs adjustment
- User experience is confusing

See: `packages/ui/src/components/ObservationDetailView.tsx` lines 157-170

## Current Code
```typescript
if (error) return (
  <div style={{ color: lcars.danger, fontSize: '0.8rem', lineHeight: 1.5 }}>
    <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Error Loading Deliberation</div>
    <div>{error}</div>
    {error?.includes('too old') && (
      <div style={{ fontSize: '0.7rem', color: lcars.textDim, marginTop: 6 }}>
        The deliberation you're looking for may be archived or beyond the recent 5000 observations buffer. Try searching for similar deliberations or checking older records.
      </div>
    )}
  </div>
);
```

## Investigation Goals

1. **Analyze layout constraints**
   - What is the parent container's max-width? (detail panel)
   - Are there padding/margin constraints causing text cutoff?
   - Should error container have explicit width + word-wrap settings?

2. **Fix text wrapping**
   - Add `word-break: 'break-word'` or `word-wrap: 'break-word'`?
   - Add `whiteSpace: 'normal'` to allow wrapping?
   - Consider line-height impact on readability

3. **Improve visual hierarchy**
   - Should error be in a bordered box (like LCARS panel)?
   - Should background be `lcars.space` with `lcars.danger` border?
   - Better spacing between icon, title, message, and hint?

4. **Consider mobile/responsive**
   - Error message should fit in detail panel at all breakpoints
   - Test with long error text (current text is ~140 chars)

## Deliverables Requested
1. **Fixed error display component** — improved styling/layout
2. **Test cases** — verify text wraps properly at various widths
3. **Before/After screenshots** — show improvement
4. **Optional enhancement** — consider error state as reusable pattern for other pages

## Success Criteria
✅ Error message displays without cutoff  
✅ Text wraps naturally within detail panel  
✅ Visual hierarchy is clear (icon → title → message → hint)  
✅ LCARS styling consistent with rest of UI  
✅ Readable at common viewport sizes

---

**Context:**
- Detail panel is constrained by parent grid (2-column layout, 50% width)
- Font is monospace (`ui-monospace, "Arial Narrow", sans-serif`)
- Colors: `lcars.danger` (red), `lcars.textDim` (dim), `lcars.space` (dark bg)
- Related files: `ObservationDetailView.tsx`, `lcars.ts` (color tokens)

**Assigned to:** Geordi (Engineering) + design review  
**Priority:** Medium (improves UX, low risk refactor)  
**Estimated effort:** 1 deliberation + implementation
