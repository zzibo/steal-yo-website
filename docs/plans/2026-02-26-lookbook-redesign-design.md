# The Lookbook Redesign — Design Document

## Goal

Transform steal-yo-website from a basic tabbed dashboard into an artistic "design lookbook" — an inspiration platform where users discover fonts, colors, design principles, components, and tech stacks from any website, with full export capabilities for AI-friendly design system reproduction.

## Problem

The current MVP crawls websites and shows results in a boring corporate dashboard (tabs, uniform grids). It lacks:
1. Tech stack detection (what framework, CSS library, component library)
2. Component library attribution (is this button from shadcn or custom?)
3. Export functionality (no way to take the design system home)
4. AI-friendly output (can't feed results to an AI to recreate)
5. Artistic presentation (feels like a tool, not an inspiration platform)
6. Educational framing (needs legal protection as a learning platform)

## Architecture

### Backend: 5-Agent Pipeline

```
URL + Depth → Firecrawl Scrape → Raw HTML/MD/Screenshots
                                        ↓
                              Tech Stack Agent (FIRST)
                                        ↓
                    ┌───────────┬───────────┬───────────┐
                    ↓           ↓           ↓           ↓
               Layout      Component    Design      Content
               Agent       Agent        Agent       Agent
               (parallel)  (+attribution)(parallel)  (parallel)
                    ↓           ↓           ↓           ↓
                    └───────────┴───────────┴───────────┘
                                        ↓
                                  Merged Catalog
                                        ↓
                              Lookbook Dashboard
```

Tech stack runs first so its results can be passed to the component agent for library attribution. The other 4 agents run in parallel.

### Tech Stack Detection: Hybrid Approach

**Layer 1 — Deterministic Heuristics (~1ms):**
Pattern-match HTML for high-confidence signals:
- `__NEXT_DATA__` → Next.js (very high)
- `data-reactroot` → React (high)
- `data-v-[hash]` → Vue (high)
- `ng-version` → Angular (very high)
- Tailwind utility class frequency analysis (>30% match → high)
- `.MuiButton-root` → MUI (very high)
- `data-state` + `data-orientation` → Radix/shadcn (high)
- `.ant-btn` → Ant Design (very high)

**Layer 2 — Claude Agent (~2-3s):**
Fills gaps, confirms heuristics, provides confidence scores and human-readable evidence strings. Receives heuristic results as context.

### Component Attribution

The component agent receives detected tech stack context and identifies library provenance:
```typescript
attribution: {
  library: "shadcn/ui Button" | "Bootstrap Card" | null,
  confidence: "high" | "medium" | "low",
  reasoning: "Class patterns match Radix data-state attributes..."
}
```

### Steal Kit Export (Client-Side)

Two modes, both generated entirely client-side using JSZip:

**Mode 1: Markdown Brief** — Single `steal-kit.md` with tech stack, design tokens, component patterns, layout philosophy, and an AI recreation prompt.

**Mode 2: Code Starter ZIP:**
```
steal-kit/
  design-system.md
  tech-stack.md
  style-guide.md
  steal-kit.md          (combined master file)
  components/
    primary-button.html
    hero-section.html
    ...
```

## Frontend: The Lookbook Aesthetic

### Concept: "The Designer's Workbench"

Warm, tactile, craft-inspired. Like opening a well-loved designer's personal scrapbook filled with color swatches, type specimens, and annotated screenshots.

### Color Scheme (App Chrome)

Deliberately neutral-warm so ANY extracted palette pops:
- Background: Kraft paper `#f5f0e8` with subtle grain texture
- Cards: Clean white card stock `#faf8f4`
- Ink: Rich dark brown-black `#2c2825` (not pure black)
- Accent: Terracotta `#c85d3e` (red pencil markup)
- Tape: Semi-transparent yellow `rgba(255, 235, 180, 0.7)`
- Shadows: Warm `rgba(44, 40, 37, 0.12)`

### Typography (App Chrome)

| Role | Font | Usage |
|------|------|-------|
| Headings | Instrument Serif | Section titles, app name |
| Body | DM Sans | UI text, descriptions |
| Code | IBM Plex Mono | HTML, CSS, technical values |
| Annotations | Caveat | Handwritten labels, notes |

### Component Design

**Component Cards:** Square-cornered paper with masking tape or pushpins. Slight random rotation (-2 to +2 deg). On hover: straighten, lift, shadow deepens.

**Color Palette:** Paint chips fanned like a swatch book. Tall narrow rectangles with torn bottom edges. Hover to lift from fan.

**Typography:** Type foundry specimen sheets. Each font rendered at scale with the site's own headline text.

**Layout:** Blueprint/wireframe on graph paper background. Dashed borders, annotation labels in Caveat.

**Tech Stack:** Sticker badges scattered like laptop stickers. Random slight rotations. Spring "slap" entrance animation.

**Library Attribution:** Rubber stamp badges on component cards. Double border, rotated, faded ink effect.

**Code Blocks:** Dark notebook pages with ruled lines and red margin. Warm brown background, not cold black.

**Export Button:** Fixed bottom-right with perforated "tear" edge. Scissors icon. Opens kraft folder modal.

### Animations (Framer Motion)

- Cards "drop" onto scrapbook with spring physics
- Tab transitions feel like turning notebook pages (slide + subtle rotateY)
- Color chips fan out on hover
- Tech stickers "slap" on with bounce
- Code blocks slide out like pulling a page from behind the card
- Export button "tears away" from perforated edge

### Mobile Strategy

Single column "pocketbook" — no rotations, horizontal scroll for swatches/stickers, full-width sticky export bar.

## Legal Framing

- Position as "Design System Analyzer" — analysis and commentary on publicly accessible work
- Every export opens with educational disclaimer
- Component code is simplified/representative, never raw scraped HTML
- Attribution bar on every view: "Analysis of [URL] — for inspiration and learning"
- Ephemeral results (no server-side storage)
- No bulk downloading of entire sites

## New Dependencies

- `jszip` (~130KB gzipped, MIT, 8M+ weekly downloads) — client-side ZIP generation

## Type System Changes

### New Types
- `TechStackDetection` — framework, CSS, component library, build tool, evidence strings
- `ComponentAttribution` — library name, confidence, reasoning
- `StealKitExport` — markdown sections + component files

### Modified Types
- `ExtractedComponent` gains `attribution?: ComponentAttribution`
- `CrawlResult` gains `techStack: TechStackDetection`
- Store `activeTab` gains `"techstack"` option

## Code Quality Improvements

- Add Zod validation to all agent JSON responses (Zod already in deps, unused)
- Use `Promise.allSettled` for graceful agent failure handling
- Fix HTML truncation (intelligent sampling: first 20k + last 10k instead of blind slice)
- Add few-shot examples to agent prompts

## File Impact Summary

**New Files (3):**
- `src/lib/agents/techstack.ts`
- `src/lib/export.ts`
- `src/components/catalog/TechStackTab.tsx`

**Modified Files (8):**
- `src/lib/types.ts`
- `src/lib/agents/components.ts`
- `src/lib/agents/index.ts`
- `src/lib/store.ts`
- `src/components/catalog/CatalogView.tsx`
- `src/components/catalog/TabBar.tsx`
- `src/components/catalog/ComponentCard.tsx`
- `package.json`

**UI Redesign Files (all components rewritten in place):**
- `src/app/layout.tsx` — new fonts
- `src/app/globals.css` — complete theme rework
- `src/app/page.tsx` — landing page restyled
- All `src/components/catalog/*.tsx` — scrapbook aesthetic
