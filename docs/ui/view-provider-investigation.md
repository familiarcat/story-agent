# React View Provider System Investigation

## Context
The Story Agent UI currently uses:
- **LCARS design system** (dark Star Trek theme with colors like paleCanary, neonCarrot, eggplant, etc.)
- **Inline React styles** mixed across components (ObservationDetailView, ObservationListView, etc.)
- **CSS variables** in some legacy pages (jonah/page.tsx using `var(--surface)`, `var(--border)`, etc.)
- **Next.js global CSS** (if present)

**Problem:** Presentation logic is scattered:
- LCARS colors defined in `/packages/ui/src/lib/lcars.ts`
- Inline styles in component render methods
- Some global CSS variables
- No centralized view composition system
- Styling bugs: mixed border properties causing React render warnings

## Investigation Goals

### 1. Review React Context/Provider Patterns
- **Context API with useContext**: For theme/color provision
- **Theme provider libraries**: Emotion, styled-components, Material-UI's theme system
- **CSS-in-JS solutions**: pros/cons for TypeScript safety
- **Best practice patterns**: How to expose theme without prop drilling

### 2. Global CSS Architecture
- **CSS Variables (Custom Properties)**: Can LCARS colors live as --lcars-paleCanary?
- **CSS Modules vs Tailwind**: Story Agent uses neither systematically
- **CSS-in-JS vs external CSS**: Trade-offs for this codebase
- **Build-time vs runtime theming**: Which suits Story Agent's needs?

### 3. Component Composition Best Practices
- **Styled components library**: Should we wrap `<div>` + inline styles into reusable components?
- **Compound components**: How to structure theme-aware components hierarchically
- **Type safety**: How to preserve TypeScript inference with theme-based styles
- **Performance**: Re-render implications of context providers

### 4. Integration with LCARS
- **Monospace fonts**: Consistent MONO constant across pages
- **Color palette exposure**: How to make lcars object reactive/injectable
- **Border & spacing tokens**: Systematize the ad-hoc inline values
- **Responsive breakpoints**: Currently missing; should be part of theme

### 5. Migration Path
- **Backwards compatibility**: Existing inline styles still work during transition?
- **Incremental adoption**: Phase in component by component or page by page?
- **Test coverage**: How to verify theme application didn't break styling?
- **Documentation**: For team to use new system

## Deliverables Requested
1. **Architecture decision document**: Recommended React view provider pattern for Story Agent
2. **Proof of concept**: Minimal example (1-2 components) using proposed pattern
3. **Migration checklist**: Steps to refactor ObservationDetailView + one other component
4. **Performance analysis**: Any measurable impact of context providers on render performance
5. **Code style guide**: Updated `.eslintrc` or contributing docs for localized presentation

## Scope
- Focus on **web UI** (`packages/ui`)
- Consider **VSCode extension** compatibility (if theming matters there)
- Legacy pages (jonah, etc.) can be addressed later
- Don't redesign LCARS; just systematize its application

## Success Criteria
- ✅ No more inline border/style property mixing warnings
- ✅ LCARS colors/tokens defined in one place
- ✅ Reusable styled component examples
- ✅ Documentation for crew to follow pattern going forward
- ✅ Existing UI appearance unchanged

---

**Assigned to:** Quark (Data) + Geordi (Engineering) for architecture review
**Priority:** Medium (improves maintainability, unblocks scaling UI)
**Estimated effort:** 2-3 crew lounge deliberations to spec; 1 sprint to implement systematically
