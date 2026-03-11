# Streaming Results via SSE

## Problem

Users wait 3-5 minutes staring at a fake loading sequence before seeing anything. The entire analysis must complete before any results are shown.

## Solution

Stream analysis results via Server-Sent Events (SSE). Navigate to the results page as soon as crawling finishes. Each tab populates independently as its analysis completes.

## Changes

### 1. API Route — SSE Response

`POST /api/analyze` returns a streaming SSE response instead of JSON.

Events emitted in order:
1. `crawl_done` — pages scraped, includes screenshot and page count
2. `techstack_done` — tech stack analysis complete
3. `design_done`, `layout_done`, `components_done` — fired as each finishes (parallel, any order)
4. `done` — all analysis complete

Each event carries its data as a JSON payload in the SSE `data:` field.

### 2. Agent Orchestrator — Event Callback

`analyzePage` accepts an `onEvent` callback. Instead of returning a single `CrawlResult`, it calls `onEvent(eventName, data)` as each phase completes.

### 3. Store — Incremental State

```ts
interface CrawlState {
  url: string;
  depth: number;
  status: "idle" | "crawling" | "analyzing" | "done" | "error";
  error: string | null;
  // Incremental results
  screenshot?: string;
  pageCount: number;
  techStack?: TechStackDetection;
  design?: DesignAnalysis;
  layout?: LayoutAnalysis;
  components?: ComponentAnalysis;
  extractedStyles?: string;
  externalStylesheets?: string[];
  // Assembled for export compatibility
  results: CrawlResult[];
  activeTab: "design" | "components" | "layout" | "techstack";
}
```

`startCrawl()` uses `fetch()` with a `ReadableStream` reader to parse SSE events and update state incrementally.

When `done` event arrives, assemble a `CrawlResult[]` from the individual fields for export compatibility.

### 4. Home Page

Navigate to `/results` when status becomes `"analyzing"` (crawl finished, analysis starting).

Remove the fake timer-based loading stages — the loading sequence reflects real status.

### 5. Results Page

Allow access when `status === "analyzing" || status === "done"` (not just `"done"`).

### 6. CatalogView + TabBar

Each tab checks if its data exists in the store. If not, shows a spinner. TabBar shows a small loading dot next to tabs still in progress.

### 7. LoadingSequence

Driven by real SSE events. Stage 1 (crawling) is active until `crawl_done`. Then navigates away. No more fake timer.

## Files to modify

| File | Change |
|------|--------|
| `src/app/api/analyze/route.ts` | SSE streaming response |
| `src/lib/agents/index.ts` | Add onEvent callback |
| `src/lib/store.ts` | Incremental state, SSE client, assemble results |
| `src/app/page.tsx` | Navigate on analyzing status |
| `src/app/results/page.tsx` | Allow analyzing status |
| `src/components/catalog/CatalogView.tsx` | Per-tab loading |
| `src/components/catalog/TabBar.tsx` | Loading indicator per tab |
| `src/components/LoadingSequence.tsx` | Real progress from store |

## Out of scope

- Per-page streaming (still analyze all pages, just stream phases)
- WebSocket (SSE is sufficient for server→client)
- Caching/persistence of results
