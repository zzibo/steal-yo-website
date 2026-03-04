# Agent Pipeline Overhaul — Design

## Problems
1. **600s+ runtime**: Layout (6 steps), Components (5 steps), Vibe (3 steps) use multi-step AI tool loops. Each step is a full Sonnet round-trip (~15-30s). Tools return pre-computed data from memory in 0ms — the round-trips are pure waste.
2. **Components detect nothing**: Agent relies on AI guessing CSS selectors. No fallback if it picks wrong selectors.
3. **Design tab is a prose blob**: `{ vibe: string }` — no structure for colors, fonts, style classification, spacing.

## Solution: Pre-compute everything, AI only curates

### A. Speed — Eliminate Tool Loops

| Agent | Before | After |
|-------|--------|-------|
| TechStack | Heuristics + 1 AI step | Keep as-is |
| Layout | 6-step tool loop | Inject data into prompt, 1 AI step, no tools |
| Components | 5-step tool loop | Cheerio pre-extracts candidates, AI curates in 1 step, no tools |
| Design (was Vibe) | 3-step tool loop | Inject colors/fonts/spacing, 1 AI step, no tools |

Expected: ~180s wall-clock → ~20-30s.

### B. Component Pre-Extraction

New `extractCandidateComponents(toolkit)` in `page-tools.ts`:
- Query selectors: `[class*=card]`, `[class*=hero]`, `[class*=nav]`, `[class*=btn]`, `[class*=pricing]`, `[class*=feature]`, `[class*=testimonial]`, `[class*=cta]`, `[class*=banner]`, `[class*=modal]`, `[class*=footer]`, `form`, `section > div > div`
- Per match: outer HTML (3KB cap), matching CSS rules, parent context
- Deduplicate by class similarity
- Return top ~15 candidates

AI receives candidates, picks top 3-5, enriches with descriptions/attribution.

### C. Design Schema (replaces VibeSchema)

```typescript
DesignSchema = z.object({
  styleClassification: z.object({
    primary: z.string(),          // "neo-brutalist", "glassmorphism", "minimalist"
    secondary: z.array(z.string()),
    summary: z.string(),          // 2-3 sentences max
  }),
  colorPalette: z.array(z.object({
    hex: z.string(),
    role: z.enum(["primary","secondary","accent","background","surface","text","muted","border","error","success"]),
    name: z.string(),             // "Deep Navy", "Coral Accent"
  })),
  typography: z.array(z.object({
    family: z.string(),
    role: z.enum(["heading","body","accent","mono","display"]),
    weights: z.array(z.string()),
    style: z.string(),            // "geometric sans-serif"
  })),
  spacing: z.object({
    system: z.string(),           // "8px grid", "4px base"
    density: z.enum(["compact","comfortable","spacious"]),
  }),
  effects: z.object({
    borderRadius: z.string(),     // "sharp (0px)", "pill"
    shadows: z.string(),          // "flat", "dramatic depth"
    animations: z.string(),       // "none", "micro-interactions"
  }),
})
```

### D. UI Changes

- Rename "Vibe" → "Design" tab
- Tab order: Design (first) → Components → Layout → Tech Stack
- Design tab renders structured cards:
  - Style classification card (tags + summary)
  - Color palette card (hex swatches with role labels)
  - Typography card (font stacks + weights + style descriptions)
  - Spacing & Effects card (density, border-radius, shadows, animations)
