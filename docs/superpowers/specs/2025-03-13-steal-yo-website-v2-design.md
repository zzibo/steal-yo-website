# steal-yo-website v2 — Full Redesign Spec

## Overview

Transform steal-yo-website from a working MVP into a launch-ready, viral-worthy design reverse-engineering tool. Three parallel workstreams: AI pipeline upgrades, UX overhaul, and interactivity/export improvements.

**Pitch:** "Paste a URL. Get its entire design system and copy-pasteable React components in 60 seconds."

---

## Workstream 1: AI Pipeline Upgrades

### 1A. Vision-Augmented Component Detection

**File:** `src/lib/agents/components.ts`

Pass `page.screenshot` (base64 from Firecrawl) as an image content part to the component agent alongside the HTML candidates. Claude Sonnet supports vision — the AI currently recreates components it has never *seen*.

**Change:** In `analyzeComponents()`, add the screenshot as an image part in the prompt messages. Firecrawl returns `screenshot` as a base64 string — wrap it as a data URL (`data:image/png;base64,${page.screenshot}`) for the AI SDK image content part:
```typescript
messages: [{
  role: "user",
  content: [
    { type: "image", image: `data:image/png;base64,${page.screenshot}` },
    { type: "text", text: `Pick the 5-8 best components...` }
  ]
}]
```

**Impact:** Dramatically better recreation fidelity. Components that derive visual identity from CSS (gradients, shadows, layout) will be accurately captured.

### 1B. TSX Validation + One-Shot Repair

**File:** `src/lib/agents/components.ts`

After `generateText` returns, parse each `reactCode` with `@swc/core` (lightweight, works at runtime without needing `typescript` as a prod dependency). If parse fails, make a single repair call with the error message.

```typescript
import { parseSync } from "@swc/core";

for (const comp of output.components) {
  try {
    parseSync(comp.reactCode, { syntax: "typescript", tsx: true });
  } catch (parseError) {
    // One-shot repair — not an agentic loop
    const { output: fixed } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      prompt: `Fix this TSX. Error: ${parseError.message}\n\n${comp.reactCode}`,
      output: Output.object({ schema: z.object({ reactCode: z.string() }) }),
    });
    if (fixed) comp.reactCode = fixed.reactCode;
  }
}
```

**Dependency:** Add `@swc/core` to dependencies (fast native parser, ~2MB, works at runtime).

**Impact:** Catches ~10-20% of components with syntax issues. Near-zero cost when code is valid.

### 1C. External CSS Resolution

**File:** `src/lib/agents/page-tools.ts`, `src/app/api/analyze/route.ts`

After crawling, fetch up to 5 external stylesheets (URLs already in `toolkit.externalStylesheets`). Concatenate with inline styles. Pass to agents for better CSS rule matching.

**Error handling:**
- 3-second timeout per stylesheet fetch
- Best-effort: if some fetches fail (CORS, timeout, 404), continue with whatever succeeded
- For relative URLs, resolve against `page.url` base
- For Tailwind-based sites (detected via class pattern heuristics), skip fetching — Claude understands Tailwind natively

Cap fetched CSS at 200KB total.

### 1D. Increase Candidate Volume

**File:** `src/lib/agents/page-tools.ts`, `src/lib/agents/components.ts`

- Increase candidate cap from 15 to 20 in `extractCandidateComponents`
- Change system prompt from "TOP 3-5" to "TOP 5-8" components
- Add visual complexity signals to scoring: count of distinct Tailwind classes, presence of gradients/shadows in inline styles

### 1E. Multi-Page Synthesis Agent

**New file:** `src/lib/agents/synthesize.ts`

After all pages are analyzed, run a synthesis agent that:
- Merges color palettes (deduplicate hex values, flag "global" vs "page-specific")
- Merges components (structurally similar components across pages → one component with variant prop)
- Promotes repeated layout sections (header, footer) to "shared layout"
- Generates unified Tailwind config covering all pages

Operates on structured JSON (cheap, fast). Cap at 20 pages max for synthesis to avoid token limit issues. Makes `depth > 1` crawls meaningful.

### 1F. Crawl + Analysis Caching

**Files:** `src/lib/scraper.ts`, `src/lib/agents/index.ts`, `src/app/api/analyze/route.ts`

Two-tier content-addressable cache:
- **Tier 1 (crawl):** Hash URL+depth → `ScrapedPage[]`. TTL 24h.
- **Tier 2 (analysis):** Hash full rawHtml (SHA-256 of entire content) → `CrawlResult`. Skip all AI calls on cache hit.

**Storage:** Filesystem-based in local dev (`${process.cwd()}/.cache/`). Gitignored. For production/Vercel, use Vercel KV or Upstash Redis (env-conditional). Start with local-only and add remote backend when deploying.

Add `?force=true` query param to bypass cache. Surface cache status in SSE stream. UI shows "Using cached results from 3h ago" with "Re-analyze" button.

---

## Workstream 2: UX Overhaul

### 2A. Single-Page Dossier (Replace Tabs)

**Files:** `src/components/catalog/CatalogView.tsx`, `src/app/page.tsx` (results merge into home page; delete `src/app/results/page.tsx`)

Remove tab navigation entirely. Render as a single vertical scroll:

1. **Hero:** Polaroid screenshot + site URL
2. **DNA at a Glance:** Compact horizontal strip — color palette dots, primary font, framework badge, component count. All clickable/copyable. ~100px height.
3. **Design System:** Current DesignTab contents with interactive tokens
4. **Component Library:** Current ComponentsTab masonry grid with category filters
5. **Page Structure:** Current LayoutTab browser mockup (without embedded ComponentCards — clicking a section scrolls to the corresponding component)
6. **Under the Hood:** Current TechStackTab, demoted to footer section

Sticky sidebar: thin left-side dots with section labels on hover. Scroll-linked highlighting.

Sections fade in as SSE data arrives — no empty spinners, just progressive content.

### 2B. "Dossier Drop" Reveal Animation

**Files:** `src/app/page.tsx`, `src/components/LoadingSequence.tsx`

Don't `router.push("/results")`. Transform the home page in-place:

1. Results view slides up from below the input, pushing hero content upward
2. URL input shrinks into header breadcrumb via Framer Motion `layoutId="url-bar"`
3. Screenshot polaroid animates from the URL input position (shared layout animation)
4. Each section "drops in" with staggered animation:
   - 20px y-offset
   - Subtle rotation (randomized -1deg to 1deg)
   - 300ms fade-in
   - 80-120ms stagger between cards

### 2C. Fix Iframe Previews

**File:** `src/components/catalog/ComponentCard.tsx`

Three fixes:
1. **Inject styles for "Original" view:** Add `<link>` tags for `externalStylesheets` and a `<style>` block with `extractedStyles` into the iframe srcDoc. Original previews will look correct.
2. **Skeleton loader:** Replace white flash with a pulsing gray rectangle CSS animation inside the iframe.
3. **Dynamic height:** Replace `onLoad` one-time measurement with `ResizeObserver` inside iframe that posts messages to parent via `postMessage`. Use `sandbox="allow-same-origin allow-scripts"` on iframe to enable messaging from `srcDoc` null-origin iframes. Default 200px, min 80px.

### 2D. Full-Screen Component Inspector

**File:** New `src/components/catalog/ComponentInspector.tsx`

Click a ComponentCard → modal/drawer opens with:
- Full-width preview at actual rendered size
- Responsive controls: phone (375px) / tablet (768px) / desktop (1280px) width toggles
- Code panel on right side with syntax highlighting via Shiki
- Separate copy buttons for React, HTML, CSS
- Side-by-side original vs recreation with draggable divider

### 2E. Skeleton Loading States

**File:** `src/components/catalog/` (per section)

Replace spinner+text loading indicators with skeleton screens that preview the shape of content:
- Design: gray rectangles where color palette will be, font specimen placeholders
- Components: masonry grid of gray card outlines
- Layout: browser chrome mockup with gray section blocks

### 2F. Micro-interactions

**Toast notifications:** Slide-in from bottom-right showing what was copied ("Copied: HeroSection.tsx"). Replace inline `copied` state changes.

**Color swatch stamps:** Click a swatch → stamp-press animation (scale down, spring up with overshoot), checkmark overlay, tooltip "Copied #6366f1".

**Scroll-linked animations:** Section headers with subtle parallax. Component cards fade-up on viewport entry.

**Keyboard shortcuts:** `Cmd+1-5` jump to sections. `Cmd+E` export. `Cmd+N` new crawl. `?` shows shortcut overlay.

**Export button animation:** "Export Steal Kit" → "Packing..." (brief animation) → "Downloaded!" with checkmark.

---

## Workstream 3: Interactivity & Export

### 3A. Click-to-Copy Design Tokens

**File:** `src/components/catalog/DesignTab.tsx`

Every hex code, font family, and spacing value becomes clickable-to-copy with:
- Stamp micro-animation on click
- Toast showing copied value
- Hover tooltip showing hex/RGB/HSL for colors

### 3B. Design Token Export Buttons

**File:** `src/components/catalog/DesignTab.tsx`

Three buttons at top of Design section:
- "Copy as CSS Variables" → `:root { --color-primary: #6366f1; ... }`
- "Copy as Tailwind Config" → `theme: { extend: { colors: { ... } } }`
- "Copy as JSON" → `{ "colors": { "primary": "#6366f1" }, "fonts": { ... } }`

### 3C. Side-by-Side Comparison

**File:** `src/components/catalog/ComponentCard.tsx`, new `src/components/catalog/ComparisonSlider.tsx`

Replace separate Original/Recreated tabs with a split view:
- Left half: original HTML with injected styles
- Right half: Tailwind recreation
- Draggable divider slider between them (before/after pattern)

This is the "screenshot moment" — original Stripe pricing card vs AI recreation, side by side.

### 3D. Component Playground

**File:** New `src/components/catalog/ComponentPlayground.tsx`

Sandpack-based live editor for each component:
1. Parse `reactCode` to extract props interface using `@swc/core` AST parsing (same dep as 1B). Extract interface members, their types, and default values from the destructuring pattern. Falls back to no controls if parsing fails.
2. Generate controls panel: text inputs for strings, color pickers for hex values, toggles for booleans
3. Sandpack renders React + Tailwind in-browser
4. Code editor + preview update in real time

### 3E. Enriched Export

**File:** `src/lib/export.ts`

Add to ZIP:
- `package.json` with name, peerDependencies (react, react-dom), devDependencies (tailwindcss, @storybook/react)
- `components/*.stories.tsx` — Basic Storybook story per component (CSF 3.0, just render with default props as args — keep it simple, no complex knobs)
- Richer `tailwind.config.ts` — include spacing, borderRadius, boxShadow from design analysis (not just colors/fonts)

**Export preview drawer:** Before download, show a right-side drawer listing all files in the ZIP. Each expandable to preview contents. Users can uncheck files they don't want.

### 3F. URL Comparison Mode (v2 stretch — defer if needed)

**File:** New `src/app/compare/page.tsx`

Two URL inputs side by side. Analyze both (2x crawls, 2x AI calls, 2x cost). Show:
- Color palettes side by side
- Typography stacks side by side
- Tech stacks side by side
- Component count comparison

Useful for competitive analysis and design audits. Lower priority than other features — implement last or defer to v3 if time-constrained.

### 3G. "Rebuild This Page" Composite View

**File:** New `src/components/catalog/PageRebuild.tsx`

Button that assembles all extracted components into a full-page layout using the Layout section's section order. Renders in a full-width iframe. Shows a rough clone of the original page built entirely from extracted components.

---

## Implementation Notes

### Dependencies to Add
- `@swc/core` (TSX parsing for validation + props extraction)
- `shiki` (syntax highlighting in component inspector)
- `@codesandbox/sandpack-react` (component playground)
- `sonner` (toast notifications — lightweight, works with Next.js)

### Files to Create
- `src/lib/agents/synthesize.ts`
- `src/components/catalog/ComponentInspector.tsx`
- `src/components/catalog/ComparisonSlider.tsx`
- `src/components/catalog/ComponentPlayground.tsx`
- `src/components/catalog/ExportDrawer.tsx`
- `src/components/catalog/DnaStrip.tsx`
- `src/components/catalog/SectionNav.tsx`
- `src/components/catalog/PageRebuild.tsx`
- `src/components/ui/Toast.tsx`
- `src/app/compare/page.tsx`
- `src/lib/cache.ts`

### Files to Modify (Major)
- `src/app/page.tsx` — merge results view inline, dossier drop animation
- `src/components/catalog/CatalogView.tsx` — remove tabs, single scroll
- `src/components/catalog/ComponentCard.tsx` — fix iframes, add comparison slider
- `src/components/catalog/DesignTab.tsx` — interactive tokens, export buttons
- `src/lib/agents/components.ts` — vision, validation, more candidates
- `src/lib/agents/page-tools.ts` — external CSS, more candidates
- `src/lib/export.ts` — enriched export, Storybook stories
- `src/lib/store.ts` — cache status, comparison mode state
- `src/app/api/analyze/route.ts` — caching, synthesis phase, external CSS fetch
