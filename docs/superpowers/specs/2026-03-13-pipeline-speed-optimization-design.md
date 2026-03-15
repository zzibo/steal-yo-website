# AI Pipeline Speed Optimization — Design Spec

## Overview

The current AI analysis pipeline takes 7-12 minutes per page, primarily due to the components agent sending a single massive prompt (~50-65k tokens) and performing up to 8 TSX repair calls. This spec redesigns the pipeline to complete in ~1-1.5 minutes through model tiering, parallel component generation, prompt caching, and eliminating the repair loop.

**Goal:** Reduce end-to-end analysis time from 7-12 minutes to under 2 minutes without sacrificing output quality.

---

## Change 1: Model Tiering — Haiku for Lightweight Agents

**Files to modify:**
- `src/lib/agents/techstack.ts`
- `src/lib/agents/layout.ts`

**What changes:**

Switch the `model` parameter from `claude-sonnet-4-5-20250929` to `claude-haiku-4-5-20251001` for techstack and layout agents. These are classification/extraction tasks that don't require Sonnet's reasoning depth.

| Agent | Current Model | New Model | Rationale |
|-------|--------------|-----------|-----------|
| techstack | Sonnet 4.5 | Haiku 4.5 | Pattern matching on HTML class names and script tags |
| layout | Sonnet 4.5 | Haiku 4.5 | Extracting section structure from DOM, not generating code |
| design | Sonnet 4.5 | Sonnet 4.5 | Stays — nuanced color/typography analysis needs stronger model |
| components | Sonnet 4.5 | Split (see Change 2) | Two-phase approach |

**Expected speedup:** Haiku is 4-5x faster than Sonnet for these tasks. Techstack/layout drop from 15-30s to 5-10s each.

---

## Change 2: Two-Phase Component Generation

**File to modify:** `src/lib/agents/components.ts`

**Current approach:** One `generateText` call receives all 20 candidates (full HTML + CSS + screenshot) and generates 5-8 components with both HTML recreations and React code. Input: ~50k tokens. Output: ~15k tokens. Time: 5-10 minutes.

**New approach — two phases:**

### Phase 1: Selection (Haiku, single call, ~5s)

Input to the AI:
- Compact summaries of all candidates (selector, score, metrics, first 200 chars of HTML — NOT full HTML/CSS)
- Screenshot for visual context

Output:
- Array of indices identifying the top 5 candidates worth recreating
- Brief rationale for each selection

This is a ranking/classification task — Haiku handles it well.

### Phase 2: Generation (Sonnet, 5 parallel calls, ~30s wall clock)

For each selected candidate, make an independent `generateText` call:

Input per call (~8k tokens each):
- System prompt (identical across all 5 — cached after first call)
- Full HTML + CSS of ONE candidate
- Screenshot
- CSS variables / design tokens
- Tech stack context

Output per call (~3k tokens each):
- `recreatedHtml` — standalone Tailwind HTML
- `reactCode` — typed React TSX component
- Component metadata (name, category, library origin)

All 5 calls run via `Promise.allSettled`. Wall clock time = slowest single call (~25-35s).

**Why this works:**
- Each call has 6x fewer input tokens and 5x fewer output tokens than the current monolithic call
- Token generation speed is relatively constant per call — splitting doesn't add overhead
- Parallel execution means total time = 1x call time, not 5x

**Schema changes in `src/lib/agents/schemas.ts`:**
- New `ComponentSelectionSchema` for Phase 1 output: `z.object({ selections: z.array(z.object({ index: z.number(), reason: z.string() })) })`
- Existing `ComponentSchema` stays for Phase 2 but represents a single component, not an array

---

## Change 3: Prompt Caching

**File to modify:** `src/lib/agents/components.ts`

Enable prompt caching via Anthropic provider headers. The component generation system prompt is identical across all 5 parallel Phase 2 calls.

Implementation:
```typescript
model: anthropic("claude-sonnet-4-5-20250929", {
  cacheControl: true,
})
```

And in the system prompt message, add cache control breakpoints:
```typescript
system: [
  { type: "text", text: SYSTEM_PROMPT, experimental_providerMetadata: { anthropic: { cacheControl: { type: "ephemeral" } } } }
]
```

**Expected benefit:**
- After the first of 5 parallel calls processes, remaining 4 get cached system prompt (~85% latency reduction on those tokens)
- On re-crawls of similar sites, the system prompt is already cached from the previous run
- Cost reduction: cached input tokens are 90% cheaper

---

## Change 4: Remove TSX Repair Loop

**Files to modify:**
- `src/lib/agents/components.ts` — remove the SWC parse + repair loop
- `src/lib/agents/schemas.ts` — add `tsxValid` boolean field to component schema

**Current approach:** After generation, parse each `reactCode` with `@swc/core`. On parse failure, make a repair API call. This adds 5-8 API calls, each taking 5-15s.

**New approach:**
- Still parse with SWC to validate syntax
- If it fails, set `component.tsxValid = false`
- Do NOT make a repair call
- The frontend shows a warning badge on components with invalid TSX
- Users can still copy the code and fix it themselves

**Rationale:** The repair loop costs 30-90s for marginal quality improvement. With better per-component prompts (Phase 2), TSX quality should improve naturally since each call focuses on a single component.

---

## Change 5: Reduce Candidate Volume

**File to modify:** `src/lib/agents/page-tools.ts`

Reduce the candidate cap in `extractCandidateComponents` from 20 to 12. The Phase 1 selection step picks the best 5 from 12 — still ample options but produces less noise.

Also reduce the `outerHtml` truncation limit from the current value to 3000 chars per candidate (for Phase 1 summaries, only 200 chars are sent; full HTML is only sent in Phase 2 for selected candidates).

---

## Performance Budget

| Stage | Current | After | Change |
|-------|---------|-------|--------|
| Crawl (Firecrawl) | 30s | 30s | — |
| Techstack (Haiku) | 15-30s | 5-10s | -66% |
| Layout + Design + Components selection | 15-30s + 5-10min | 5-10s + 15-30s + 5s | -90% |
| Components generation (5 parallel) | (included above) | 25-35s | (new) |
| TSX repair | 30-90s | 0s | -100% |
| **Total** | **7-12 min** | **1-1.5 min** | **~85% faster** |

---

## Dependencies

No new dependencies. We remove the need for `@swc/core` repair calls (though we keep it for validation — it's already installed).

---

## Risks and Mitigations

1. **Haiku quality for techstack/layout may be worse** — Mitigated: these are classification tasks with structured schemas. If quality drops, we can switch individual agents back to Sonnet without affecting the component pipeline.

2. **Phase 1 selection may miss good candidates** — Mitigated: the selection prompt gets the screenshot for visual context, and 12 candidates with scores is a small enough set for Haiku to rank well.

3. **Parallel API calls may hit rate limits** — Mitigated: 5 parallel calls is well within Anthropic's default rate limits. The techstack/layout/design agents are already running in parallel.

4. **Prompt caching may not activate for all parallel calls** — Mitigated: even if only 2-3 of 5 get cache hits, that's still meaningful speedup. The caching becomes more valuable on re-crawls.
