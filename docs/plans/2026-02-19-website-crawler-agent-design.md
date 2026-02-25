# Website Crawler Agent — Design

## Goal

A web app that crawls any website, breaks it down into components, design tokens, layout patterns, and content using parallel AI agents, and presents everything as an artistic visual catalog.

## Architecture

User pastes URL with configurable crawl depth (1-3 levels). Firecrawl scrapes HTML + markdown + screenshots. Four parallel Claude agents each analyze a different dimension. Results merge into a unified catalog displayed as a gallery dashboard.

```
URL + Depth → Firecrawl Scrape → Raw HTML/MD/Screenshots
                                        ↓
                    ┌───────────┬───────────┬───────────┐
                    ↓           ↓           ↓           ↓
               Layout      Component    Design      Content
               Agent       Agent        Agent       Agent
                    ↓           ↓           ↓           ↓
                    └───────────┴───────────┴───────────┘
                                        ↓
                                  Merged Catalog
                                        ↓
                                  Gallery Dashboard
```

For depth > 1: discovered links are queued, same pipeline runs per page, components are deduplicated across pages.

## Agents

### Layout Agent
- Page sections (header, hero, features, footer, etc.)
- Layout type per section (grid, flex, stack)
- Responsive breakpoints detected
- Navigation structure

### Component Agent
- Reusable UI components (buttons, cards, inputs, modals, navbars)
- Extracted HTML + CSS per component
- Component variants (primary button, secondary button, etc.)
- Screenshot crop of each component

### Design Agent
- Color palette (primary, secondary, accent, neutrals) with hex values
- Typography scale (font families, sizes, weights, line heights)
- Spacing system
- Border radius, shadows, transitions
- CSS custom properties / design tokens export

### Content Agent
- Text content organized by section
- Images with alt text and dimensions
- Links (internal/external)
- Meta tags, OG data, structured data (JSON-LD)

## Frontend — Artistic Catalog

Not a boring table — a visual gallery like a design museum.

- **Landing:** URL input with depth selector (1-3 levels)
- **Catalog view:** Masonry/grid gallery with 4 tabs: Components, Design, Layout, Content
- **Component cards:** Live component preview (iframe sandbox) + code snippet + copy button
- **Design page:** Color swatches as paint chips, typography specimens, spacing visualizer
- **Layout page:** Wireframe-style diagrams of page structure with annotated sections
- **Content page:** Organized text/images/links, exportable

## Tech Stack

- Next.js 15 (App Router)
- Firecrawl (scraping)
- AI SDK + Claude (4 parallel agents)
- Tailwind CSS (styling)
- Framer Motion (gallery animations)
- iframe sandbox (live component previews)
- Zustand (client state)

No database for v1 — results are ephemeral per session.

## API Routes

- `POST /api/crawl` — URL + depth → Firecrawl scrape → raw data
- `POST /api/analyze` — raw scrape → 4 parallel agents → merged catalog
- `GET /api/status/[jobId]` — poll progress for multi-page crawls
