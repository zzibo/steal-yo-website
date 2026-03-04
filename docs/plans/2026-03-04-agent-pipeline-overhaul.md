# Agent Pipeline Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 600s+ agent runtime, broken component detection, and unstructured design output

**Architecture:** Eliminate multi-step AI tool loops. Pre-compute all data with cheerio, inject into prompts, single-step AI for curation only. Replace vibe prose blob with structured design schema.

**Tech Stack:** Next.js 16, AI SDK 6 (generateText + Output.object), Cheerio, Zod, React 19, Tailwind 4, Framer Motion

---

## Task 1: Add extractCandidateComponents to page-tools.ts

**Files:**
- Modify: `src/lib/agents/page-tools.ts`

### Step 1: Add extractCandidateComponents function

Add this function after the existing extraction functions (after `extractExternalStylesheets`), before the tool factory section:

```typescript
// ── Component candidate extraction ───────────────────────────────

export interface ComponentCandidate {
  selector: string;
  tag: string;
  classes: string;
  outerHtml: string;
  matchingCss: string;
  parentTag: string;
  parentClasses: string;
  siblingCount: number;
}

const COMPONENT_SELECTORS = [
  '[class*="card"]', '[class*="Card"]',
  '[class*="hero"]', '[class*="Hero"]',
  '[class*="nav"]', '[class*="Nav"]',
  '[class*="btn"]', '[class*="Btn"]', '[class*="button"]', '[class*="Button"]',
  '[class*="pricing"]', '[class*="Pricing"]',
  '[class*="feature"]', '[class*="Feature"]',
  '[class*="testimonial"]', '[class*="Testimonial"]',
  '[class*="cta"]', '[class*="CTA"]',
  '[class*="banner"]', '[class*="Banner"]',
  '[class*="modal"]', '[class*="Modal"]',
  '[class*="footer"]', '[class*="Footer"]',
  '[class*="header"]', '[class*="Header"]',
  '[class*="sidebar"]', '[class*="Sidebar"]',
  '[class*="accordion"]', '[class*="Accordion"]',
  '[class*="tab"]', '[class*="Tab"]',
  '[class*="dropdown"]', '[class*="Dropdown"]',
  '[class*="carousel"]', '[class*="Carousel"]',
  '[class*="slider"]', '[class*="Slider"]',
  '[class*="menu"]', '[class*="Menu"]',
  '[class*="tooltip"]', '[class*="Tooltip"]',
  'form',
  'table',
];

export function extractCandidateComponents(toolkit: PageToolkit): ComponentCandidate[] {
  const candidates: ComponentCandidate[] = [];
  const seenHtml = new Set<string>();

  for (const selector of COMPONENT_SELECTORS) {
    try {
      toolkit.$(selector).each((_, el) => {
        if (candidates.length >= 20) return;
        const $el = toolkit.$(el);
        const outerHtml = toolkit.$.html(el)?.slice(0, 3000) || "";

        // Skip tiny elements (likely just icons or labels)
        if (outerHtml.length < 50) return;

        // Skip elements that are just wrappers with one text child
        const children = $el.children();
        const textLen = $el.text().trim().length;
        if (children.length === 0 && textLen < 20) return;

        // Deduplicate by first 200 chars of HTML
        const signature = outerHtml.slice(0, 200);
        if (seenHtml.has(signature)) return;
        seenHtml.add(signature);

        const classes = $el.attr("class")?.slice(0, 300) || "";
        const parent = $el.parent();

        // Find matching CSS rules
        const matchingCss = findMatchingCssRules(toolkit, classes);

        candidates.push({
          selector,
          tag: $el.prop("tagName")?.toLowerCase() || "",
          classes,
          outerHtml,
          matchingCss,
          parentTag: parent.prop("tagName")?.toLowerCase() || "",
          parentClasses: parent.attr("class")?.slice(0, 200) || "",
          siblingCount: parent.children().length,
        });
      });
    } catch {
      // invalid selector, skip
    }
  }

  return candidates.slice(0, 15);
}

function findMatchingCssRules(toolkit: PageToolkit, classes: string): string {
  if (!classes) return "";
  const classNames = classes.split(/\s+/).filter(Boolean).slice(0, 5);
  const rules: string[] = [];

  toolkit.$("style").each((_, el) => {
    const css = toolkit.$(el).html() || "";
    for (const className of classNames) {
      const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`[^{}]*\\.${escaped}[^{]*\\{[^}]*\\}`, "gi");
      let m;
      while ((m = re.exec(css)) !== null) {
        if (rules.length >= 15) break;
        rules.push(m[0].trim().slice(0, 500));
      }
    }
  });

  return rules.join("\n\n").slice(0, 3000);
}
```

### Step 2: Export the new function

The function is already exported with `export function`. The interface `ComponentCandidate` is also exported. No additional changes needed.

### Step 3: Commit

```bash
git add src/lib/agents/page-tools.ts
git commit -m "feat: add cheerio-based component candidate extraction"
```

---

## Task 2: Replace VibeSchema with DesignSchema

**Files:**
- Modify: `src/lib/agents/schemas.ts`
- Modify: `src/lib/types.ts`

### Step 1: Replace VibeSchema with DesignSchema in schemas.ts

Replace the entire VibeSchema block at the bottom of schemas.ts:

Old:
```typescript
// Matches VibeAnalysis in types.ts
export const VibeSchema = z.object({
  vibe: z.string().describe("2-4 paragraph prose description of the site's design philosophy, mood, and aesthetic"),
});
```

New:
```typescript
// Matches DesignAnalysis in types.ts
export const DesignSchema = z.object({
  styleClassification: z.object({
    primary: z.string().describe("Primary design style: neo-brutalist, glassmorphism, minimalist, corporate, editorial, playful, etc."),
    secondary: z.array(z.string()).describe("Supporting style tags"),
    summary: z.string().describe("2-3 sentence design brief"),
  }),
  colorPalette: z.array(z.object({
    hex: z.string().describe("Hex color code like #6366f1"),
    role: z.enum(["primary", "secondary", "accent", "background", "surface", "text", "muted", "border", "error", "success"]),
    name: z.string().describe("Human-readable color name like 'Deep Navy'"),
  })),
  typography: z.array(z.object({
    family: z.string(),
    role: z.enum(["heading", "body", "accent", "mono", "display"]),
    weights: z.array(z.string()),
    style: z.string().describe("Classification like 'geometric sans-serif', 'humanist serif'"),
  })),
  spacing: z.object({
    system: z.string().describe("Spacing system: '8px grid', '4px base', 'fluid/clamp-based', 'tailwind default'"),
    density: z.enum(["compact", "comfortable", "spacious"]),
  }),
  effects: z.object({
    borderRadius: z.string().describe("e.g. 'sharp (0px)', 'subtle (4px)', 'rounded (12px)', 'pill'"),
    shadows: z.string().describe("e.g. 'flat', 'subtle elevation', 'dramatic depth'"),
    animations: z.string().describe("e.g. 'none', 'micro-interactions', 'heavy motion'"),
  }),
});
```

### Step 2: Replace VibeAnalysis with DesignAnalysis in types.ts

Replace:
```typescript
export interface VibeAnalysis {
  vibe: string;
}
```

With:
```typescript
export interface DesignAnalysis {
  styleClassification: {
    primary: string;
    secondary: string[];
    summary: string;
  };
  colorPalette: {
    hex: string;
    role: "primary" | "secondary" | "accent" | "background" | "surface" | "text" | "muted" | "border" | "error" | "success";
    name: string;
  }[];
  typography: {
    family: string;
    role: "heading" | "body" | "accent" | "mono" | "display";
    weights: string[];
    style: string;
  }[];
  spacing: {
    system: string;
    density: "compact" | "comfortable" | "spacious";
  };
  effects: {
    borderRadius: string;
    shadows: string;
    animations: string;
  };
}
```

Also in types.ts, update CrawlResult to use `design` instead of `vibe`:

Replace:
```typescript
  vibe: VibeAnalysis;
```

With:
```typescript
  design: DesignAnalysis;
```

And update the StealKitExport — replace `vibe: string;` with `design: string;` (the export.ts will be updated in a later task).

### Step 3: Commit

```bash
git add src/lib/agents/schemas.ts src/lib/types.ts
git commit -m "feat: replace VibeSchema/VibeAnalysis with structured DesignSchema/DesignAnalysis"
```

---

## Task 3: Rewrite layout agent — single-step, no tools

**Files:**
- Modify: `src/lib/agents/layout.ts`

### Step 1: Rewrite layout.ts

Replace the entire file:

```typescript
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LayoutAnalysis, ScrapedPage } from "../types";
import type { PageToolkit } from "./page-tools";
import { LayoutSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a layout analysis agent. Given pre-extracted page structure data, analyze the spatial layout.

For each section identify:
- Purpose: header, hero, features, content, CTA, footer, sidebar, navigation, other
- Layout method: grid (CSS Grid), flex (Flexbox), stack (vertical/block), float, other
- Brief description of what the section contains
- The outer HTML tag with its key classes (short snippet, not full HTML)

Capture layout RELATIONSHIPS. If a page has sidebar + main content, note the parent container using grid/flex. If features use a 3-column grid, note that.`;

export async function analyzeLayout(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
  techContext?: { framework?: string; css?: string; componentLibrary?: string },
): Promise<LayoutAnalysis> {
  return withRetry(async () => {
    let techInfo = "";
    if (techContext) {
      const parts = [];
      if (techContext.framework) parts.push(`Framework: ${techContext.framework}`);
      if (techContext.css) parts.push(`CSS: ${techContext.css}`);
      if (techContext.componentLibrary) parts.push(`Components: ${techContext.componentLibrary}`);
      if (parts.length) techInfo = `\n\nDetected Tech Stack:\n${parts.join("\n")}`;
    }

    // Pre-compute all data that tools would have returned
    const landmarks = JSON.stringify(toolkit.landmarkSections.slice(0, 20), null, 2);
    const headings = JSON.stringify(toolkit.headingHierarchy.slice(0, 30), null, 2);
    const mediaQueries = JSON.stringify(toolkit.mediaQueries.slice(0, 15), null, 2);

    // Build section hierarchy inline
    const structuralTags = new Set(["header", "main", "footer", "nav", "aside", "section", "article"]);
    type SectionNode = { tag: string; classes: string; id?: string; children: SectionNode[] };
    const buildTree = (parent: cheerio.Cheerio<cheerio.Element>): SectionNode[] => {
      const nodes: SectionNode[] = [];
      parent.children().each((_, el) => {
        const $el = toolkit.$(el);
        const tag = $el.prop("tagName")?.toLowerCase() || "";
        if (!structuralTags.has(tag)) return;
        nodes.push({
          tag,
          classes: $el.attr("class")?.slice(0, 200) || "",
          id: $el.attr("id") || undefined,
          children: buildTree($el),
        });
      });
      return nodes;
    };
    const sectionHierarchy = JSON.stringify(buildTree(toolkit.$("body")), null, 2);

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: LayoutSchema }),
      prompt: `Analyze the layout of this page using the pre-extracted data below.\n\n${overview}${techInfo}\n\n## Landmark Sections\n${landmarks}\n\n## Heading Hierarchy\n${headings}\n\n## Section Hierarchy (parent-child nesting)\n${sectionHierarchy}\n\n## Media Queries / Breakpoints\n${mediaQueries}`,
    });

    if (!output) throw new Error("No output generated");
    return output as LayoutAnalysis;
  });
}
```

Note: The import of cheerio types may need adjustment. Since `toolkit.$` is a CheerioAPI, `toolkit.$("body")` returns a Cheerio element. The buildTree function should work with the toolkit's $ instance. You may need to add `import * as cheerio from "cheerio";` at the top if needed for types.

### Step 2: Commit

```bash
git add src/lib/agents/layout.ts
git commit -m "feat: rewrite layout agent — single-step, no tool loops"
```

---

## Task 4: Rewrite component agent — cheerio candidates, single-step AI

**Files:**
- Modify: `src/lib/agents/components.ts`

### Step 1: Rewrite components.ts

Replace the entire file:

```typescript
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ComponentAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { extractCandidateComponents } from "./page-tools";
import { ComponentSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a UI component curator. You receive pre-extracted component candidates from a webpage. Your job is to pick the TOP 3-5 most visually interesting and unique components.

RULES:
- Pick components that showcase the site's design craft
- SKIP generic elements: plain text links, basic divs with no styling, simple paragraphs
- For each picked component, use the ACTUAL HTML and CSS provided — do not invent
- Identify the component library origin (MUI, shadcn/ui, Chakra, Bootstrap, etc.) with SPECIFIC evidence from class names or data attributes
- Write a brief description of what makes each component interesting
- Note variants if the candidates show multiple similar components with differences

Quality over quantity. Only include components worth studying.`;

export async function analyzeComponents(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
  techStack?: TechStackDetection,
): Promise<ComponentAnalysis> {
  return withRetry(async () => {
    // Pre-extract candidates using cheerio
    const candidates = extractCandidateComponents(toolkit);

    if (candidates.length === 0) {
      return { components: [] };
    }

    let techContext = "";
    if (techStack) {
      techContext = `\n\nDetected Tech Stack:\nFramework: ${techStack.framework?.name || "unknown"}\nCSS: ${techStack.cssFramework?.name || "unknown"}\nComponent Library: ${techStack.componentLibrary?.name || "unknown"}`;
    }

    const candidatesText = candidates.map((c, i) =>
      `### Candidate ${i + 1} (matched: ${c.selector})\nTag: ${c.tag} | Classes: ${c.classes}\nParent: <${c.parentTag} class="${c.parentClasses}"> (${c.siblingCount} children)\n\nHTML:\n${c.outerHtml}\n\nCSS Rules:\n${c.matchingCss || "(no matching CSS found in <style> tags)"}`
    ).join("\n\n---\n\n");

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: ComponentSchema }),
      prompt: `Pick the 3-5 best components from these ${candidates.length} candidates.\n\n${overview}${techContext}\n\n## Component Candidates\n\n${candidatesText}`,
    });

    if (!output) throw new Error("No output generated");
    return output as ComponentAnalysis;
  });
}
```

### Step 2: Commit

```bash
git add src/lib/agents/components.ts
git commit -m "feat: rewrite component agent — cheerio pre-extraction, single-step AI"
```

---

## Task 5: Rewrite vibe agent -> design agent with structured output

**Files:**
- Rename: `src/lib/agents/vibe.ts` -> `src/lib/agents/design.ts`

### Step 1: Delete vibe.ts and create design.ts

Create the new file `src/lib/agents/design.ts`:

```typescript
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { DesignAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { DesignSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a UI design analyst. Given pre-extracted design data from a webpage, produce a structured design analysis.

Use professional design terminology:
- Style classification: neo-brutalist, glassmorphism, minimalist, corporate-clean, editorial, neumorphism, flat, material, skeuomorphic, retro, playful, dark-luxe, etc.
- Typography styles: geometric sans-serif, humanist sans-serif, transitional serif, slab serif, monospace, display/decorative, handwritten
- Color roles: identify which colors serve as primary, secondary, accent, background, surface, text, muted, border

RULES:
- Use the ACTUAL hex values from the data — do not invent colors
- Use the ACTUAL font families from the data — do not invent fonts
- Keep the summary to 2-3 sentences max — think design brief, not essay
- For spacing, infer the system from the spacing values provided
- For effects, infer from border-radius values and any animation/transition CSS`;

export async function analyzeDesign(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
  techStack?: TechStackDetection,
): Promise<DesignAnalysis> {
  return withRetry(async () => {
    let techContext = "";
    if (techStack) {
      const parts = [];
      if (techStack.framework?.name) parts.push(`Framework: ${techStack.framework.name}`);
      if (techStack.cssFramework?.name) parts.push(`CSS: ${techStack.cssFramework.name}`);
      if (techStack.componentLibrary?.name) parts.push(`Components: ${techStack.componentLibrary.name}`);
      if (parts.length) techContext = `\n\nDetected Tech Stack:\n${parts.join("\n")}`;
    }

    const colors = JSON.stringify(toolkit.allColors.slice(0, 50));
    const cssVars = JSON.stringify(toolkit.cssVariables.slice(0, 60), null, 2);
    const fonts = JSON.stringify(toolkit.fontDeclarations, null, 2);
    const spacing = JSON.stringify(toolkit.spacingValues.slice(0, 20), null, 2);
    const borderRadius = JSON.stringify(toolkit.borderRadiusValues.slice(0, 10), null, 2);

    const markdownSnippet = page.markdown.slice(0, 3000);

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: DesignSchema }),
      prompt: `Analyze the design system of this website.\n\n${overview}${techContext}\n\n## Colors Found\n${colors}\n\n## CSS Variables (Design Tokens)\n${cssVars}\n\n## Font Declarations\n${fonts}\n\n## Spacing Values (by frequency)\n${spacing}\n\n## Border Radius Values\n${borderRadius}\n\n## Content Preview\n${markdownSnippet}`,
    });

    if (!output) throw new Error("No output generated");
    return output as DesignAnalysis;
  });
}
```

### Step 2: Delete the old vibe.ts

```bash
rm src/lib/agents/vibe.ts
```

### Step 3: Commit

```bash
git add src/lib/agents/design.ts
git rm src/lib/agents/vibe.ts
git commit -m "feat: replace vibe agent with structured design agent"
```

---

## Task 6: Update orchestrator (index.ts)

**Files:**
- Modify: `src/lib/agents/index.ts`

### Step 1: Update imports and function

Replace the entire file:

```typescript
import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeDesign } from "./design";
import { analyzeTechStack } from "./techstack";
import { precomputePageData } from "./page-tools";
import { buildPageOverview } from "./utils";
import type { ScrapedPage, CrawlResult } from "../types";

export async function analyzePage(page: ScrapedPage): Promise<CrawlResult> {
  // Pre-compute page data once (<100ms) — all agents read from this
  const toolkit = precomputePageData(page);
  const overview = buildPageOverview(page, toolkit);

  // Tech stack runs first (regex + 1 AI step) so we can pass context
  const techStack = await analyzeTechStack(page, toolkit, overview);

  const techContext = {
    framework: techStack.framework?.name,
    css: techStack.cssFramework?.name,
    componentLibrary: techStack.componentLibrary?.name,
  };

  // 3 agents run in parallel — each is now a single AI call
  const [layoutResult, componentsResult, designResult] = await Promise.allSettled([
    analyzeLayout(page, toolkit, overview, techContext),
    analyzeComponents(page, toolkit, overview, techStack),
    analyzeDesign(page, toolkit, overview, techStack),
  ]);

  return {
    url: page.url,
    screenshot: page.screenshot,
    layout: layoutResult.status === "fulfilled" ? layoutResult.value : { sections: [], responsiveBreakpoints: [], navigationStructure: [] },
    components: componentsResult.status === "fulfilled" ? componentsResult.value : { components: [] },
    design: designResult.status === "fulfilled" ? designResult.value : { styleClassification: { primary: "unknown", secondary: [], summary: "" }, colorPalette: [], typography: [], spacing: { system: "unknown", density: "comfortable" }, effects: { borderRadius: "unknown", shadows: "unknown", animations: "unknown" } },
    techStack,
    extractedStyles: toolkit.extractedStyles,
    externalStylesheets: toolkit.externalStylesheets,
  };
}
```

### Step 2: Commit

```bash
git add src/lib/agents/index.ts
git commit -m "feat: update orchestrator — design replaces vibe, single-step agents"
```

---

## Task 7: Update store and UI — rename vibe->design, reorder tabs

**Files:**
- Modify: `src/lib/store.ts`
- Modify: `src/components/catalog/TabBar.tsx`
- Modify: `src/components/catalog/CatalogView.tsx`
- Rename: `src/components/catalog/VibeTab.tsx` -> `src/components/catalog/DesignTab.tsx`

### Step 1: Update store.ts

In the `activeTab` type union, replace `"vibe"` with `"design"` and change the default:

Change line with `activeTab`:
```typescript
  activeTab: "design" | "components" | "layout" | "techstack";
```

And the default value:
```typescript
  activeTab: "design",
```

And in the `reset` function:
```typescript
  activeTab: "design",
```

Also update the loading stages label — replace `"Reading the vibe"` with `"Analyzing design"` and `"Capturing design philosophy and aesthetic"` with `"Extracting design system and visual language"`.

### Step 2: Update TabBar.tsx

Replace the tabs array:
```typescript
const tabs = [
  { id: "design" as const, label: "Design", color: "#2d6a4f" },
  { id: "components" as const, label: "Components", color: "#c85d3e" },
  { id: "layout" as const, label: "Layout", color: "#5b7fa5" },
  { id: "techstack" as const, label: "Tech Stack", color: "#7c5cbf" },
];
```

### Step 3: Create new DesignTab.tsx

Delete VibeTab.tsx and create DesignTab.tsx:

```tsx
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export function DesignTab() {
  const { results } = useCrawlStore();
  const design = results[0]?.design;

  if (!design) return <p className="text-[var(--muted)]">No design data extracted.</p>;

  return (
    <div className="space-y-8">
      {/* Style Classification */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Style</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="bg-[var(--accent)] px-3 py-1 text-sm font-medium text-white">
            {design.styleClassification.primary}
          </span>
          {design.styleClassification.secondary.map((tag) => (
            <span key={tag} className="border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted)]">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-[var(--ink-light)]">
          {design.styleClassification.summary}
        </p>
      </motion.div>

      {/* Color Palette */}
      {design.colorPalette.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Color Palette</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {design.colorPalette.map((color, i) => (
              <div key={`${color.hex}-${i}`} className="text-center">
                <div
                  className="mx-auto mb-2 h-16 w-16 border border-[var(--border)]"
                  style={{ backgroundColor: color.hex }}
                  title={color.hex}
                />
                <p className="font-mono text-xs text-[var(--ink)]">{color.hex}</p>
                <p className="text-[10px] text-[var(--muted)]">{color.role}</p>
                <p className="text-[10px] text-[var(--ink-light)]">{color.name}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Typography */}
      {design.typography.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Typography</h3>
          <div className="space-y-4">
            {design.typography.map((font, i) => (
              <div key={`${font.family}-${i}`} className="flex items-start justify-between border-b border-dashed border-[var(--border)] pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{font.family}</p>
                  <p className="text-xs text-[var(--muted)]">{font.style}</p>
                  {font.weights.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {font.weights.map((w) => (
                        <span key={w} className="bg-[var(--background)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">{w}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-[var(--accent)]">{font.role}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Spacing & Effects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Spacing & Effects</h3>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Spacing</p>
            <p className="text-sm text-[var(--ink)]">{design.spacing.system}</p>
            <p className="text-xs text-[var(--accent)]">{design.spacing.density}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Corners</p>
            <p className="text-sm text-[var(--ink)]">{design.effects.borderRadius}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Shadows</p>
            <p className="text-sm text-[var(--ink)]">{design.effects.shadows}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Animation</p>
            <p className="text-sm text-[var(--ink)]">{design.effects.animations}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

### Step 4: Update CatalogView.tsx

Replace VibeTab import and usage:

Change import:
```typescript
import { DesignTab } from "./DesignTab";
```

Change tabContent:
```typescript
  const tabContent: Record<string, React.ReactNode> = {
    design: <DesignTab />,
    components: <ComponentsTab />,
    layout: <LayoutTab />,
    techstack: <TechStackTab />,
  };
```

### Step 5: Delete VibeTab.tsx

```bash
rm src/components/catalog/VibeTab.tsx
```

### Step 6: Commit

```bash
git add src/lib/store.ts src/components/catalog/TabBar.tsx src/components/catalog/CatalogView.tsx src/components/catalog/DesignTab.tsx
git rm src/components/catalog/VibeTab.tsx
git commit -m "feat: rename vibe->design tab, reorder tabs, structured design cards UI"
```

---

## Task 8: Update export.ts for design

**Files:**
- Modify: `src/lib/export.ts`

### Step 1: Update references from vibe to design

Replace the `generateVibeMd` function with `generateDesignMd`:

Old:
```typescript
export function generateVibeMd(results: CrawlResult[]): string {
  const vibe = results[0]?.vibe;
  if (!vibe?.vibe) return "# Design Vibe\n\nNo vibe data available.\n";

  return `# Design Vibe\n\n${vibe.vibe}\n`;
}
```

New:
```typescript
export function generateDesignMd(results: CrawlResult[]): string {
  const design = results[0]?.design;
  if (!design) return "# Design Analysis\n\nNo design data available.\n";

  const lines = [
    `# Design Analysis`,
    ``,
    `## Style: ${design.styleClassification.primary}`,
    `Tags: ${design.styleClassification.secondary.join(", ")}`,
    `${design.styleClassification.summary}`,
    ``,
    `## Color Palette`,
    ...design.colorPalette.map(c => `- ${c.hex} (${c.role}) — ${c.name}`),
    ``,
    `## Typography`,
    ...design.typography.map(t => `- ${t.family} [${t.role}] — ${t.style} (${t.weights.join(", ")})`),
    ``,
    `## Spacing & Effects`,
    `- Spacing: ${design.spacing.system} (${design.spacing.density})`,
    `- Corners: ${design.effects.borderRadius}`,
    `- Shadows: ${design.effects.shadows}`,
    `- Animation: ${design.effects.animations}`,
  ];

  return lines.join("\n") + "\n";
}
```

Update `exportStealKit` to use `design` instead of `vibe`:

```typescript
  const kit: StealKitExport = {
    design: generateDesignMd(results),
    techStack: generateTechStackMd(results),
    styleGuide: generateStyleGuideMd(results),
    components: generateComponentFiles(results),
    masterFile: "",
  };
```

And update the zip file name from `vibe.md` to `design.md`:

```typescript
  zip.file("design.md", kit.design);
```

Update `generateMasterMd` to call `generateDesignMd` instead of `generateVibeMd`:

```typescript
  md += generateDesignMd(results) + "\n---\n\n";
```

### Step 2: Commit

```bash
git add src/lib/export.ts
git commit -m "feat: update export to use structured design data"
```

---

## Task 9: Remove unused tool factory exports from page-tools.ts

**Files:**
- Modify: `src/lib/agents/page-tools.ts`

### Step 1: Remove unused exports

The `layoutTools`, `componentTools`, and `vibeTools` functions are no longer used by any agent (layout and components now inject data directly, design agent replaces vibe). Remove them from page-tools.ts. Keep `techStackTools` since techstack.ts still uses tools.

Remove the following functions and all their code:
- `layoutTools` (lines 359-427)
- `componentTools` (lines 429-519)
- `vibeTools` (lines 521-549)

Also remove the `tool` import from `"ai"` and the `z` import from `"zod"` since they are only used by those tool factory functions and `techStackTools`. However, `techStackTools` still uses both `tool` and `z`, so keep those imports.

### Step 2: Commit

```bash
git add src/lib/agents/page-tools.ts
git commit -m "refactor: remove unused tool factory functions (layout, component, vibe)"
```

---

## Task 10: Verify build compiles

### Step 1: Run TypeScript check

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 2: Run dev server smoke test

```bash
npm run dev
```

Expected: Server starts without errors

### Step 3: Commit any fixes if needed
