# Lookbook Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform steal-yo-website from a basic dashboard into an artistic design lookbook with tech stack detection, component attribution, and AI-friendly export.

**Architecture:** 5-agent pipeline (tech stack runs first, then 4 existing agents in parallel with attribution context). Client-side ZIP export via JSZip. Scrapbook UI with warm kraft paper aesthetic, masking tape cards, paint chip colors, specimen typography, and blueprint layouts.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Framer Motion, Zustand, AI SDK + Claude Sonnet, Firecrawl, Zod, JSZip (new)

**Design Doc:** `docs/plans/2026-02-26-lookbook-redesign-design.md`

---

## Phase 1: Backend Foundations

### Task 1: Install JSZip dependency

**Files:**
- Modify: `package.json`

**Step 1: Install jszip**

Run: `npm install jszip`

**Step 2: Verify installation**

Run: `npm ls jszip`
Expected: `jszip@3.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jszip dependency for steal kit export"
```

---

### Task 2: Extend type system with tech stack, attribution, and export types

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add TechStackDetection, ComponentAttribution, StealKitExport types and update ExtractedComponent and CrawlResult**

Add after the existing `ContentAnalysis` interface (after line 98):

```typescript
export interface TechStackDetection {
  framework?: {
    name: string;
    version?: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  cssFramework?: {
    name: string;
    version?: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  componentLibrary?: {
    name: string;
    version?: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  buildTool?: {
    name: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  metaFramework?: {
    features: string[];
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  otherLibraries: {
    name: string;
    category: "animation" | "forms" | "state" | "styling" | "utility" | "other";
    evidence: string[];
  }[];
}

export interface ComponentAttribution {
  library: string | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

export interface StealKitExport {
  designSystem: string;
  techStack: string;
  styleGuide: string;
  components: { filename: string; content: string }[];
  masterFile: string;
}
```

Then update `ExtractedComponent` to add attribution field (add after `description: string;` on line 65):

```typescript
  attribution?: ComponentAttribution;
```

Then update `CrawlResult` to add techStack field (add after `content: ContentAnalysis;` on line 106):

```typescript
  techStack: TechStackDetection;
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Errors about missing `techStack` in agents/index.ts (expected — we'll fix in Task 4)

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TechStackDetection, ComponentAttribution, StealKitExport types"
```

---

### Task 3: Create tech stack detection agent with heuristic pre-scanner

**Files:**
- Create: `src/lib/agents/techstack.ts`

**Step 1: Create the tech stack agent**

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { TechStackDetection, ScrapedPage } from "../types";

const HEURISTIC_PATTERNS = {
  frameworks: [
    { name: "Next.js", patterns: [/__NEXT_DATA__/, /_next\/static/], confidence: "high" as const },
    { name: "Nuxt", patterns: [/__NUXT__/, /\/_nuxt\//], confidence: "high" as const },
    { name: "React", patterns: [/data-reactroot/, /react-dom/, /__reactFiber\$/], confidence: "medium" as const },
    { name: "Vue", patterns: [/data-v-[a-f0-9]{8}/], confidence: "high" as const },
    { name: "Angular", patterns: [/ng-version/, /_nghost-/, /_ngcontent-/], confidence: "high" as const },
    { name: "Svelte", patterns: [/class="[^"]*svelte-[a-z0-9]+/], confidence: "medium" as const },
    { name: "Gatsby", patterns: [/___gatsby/, /gatsby-/], confidence: "high" as const },
    { name: "Astro", patterns: [/astro-island/, /astro-slot/], confidence: "high" as const },
  ],
  css: [
    { name: "Tailwind CSS", patterns: [/class="[^"]*\b(?:flex|grid|px-|py-|mx-|my-|bg-|text-(?:sm|lg|xl)|rounded-|shadow-)\w*/], confidence: "high" as const },
    { name: "Bootstrap", patterns: [/class="[^"]*\b(?:container|row|col-|btn |btn-|navbar)/], confidence: "high" as const },
    { name: "Bulma", patterns: [/class="[^"]*\b(?:columns|column|is-primary)/], confidence: "medium" as const },
  ],
  componentLibraries: [
    { name: "MUI", patterns: [/Mui[A-Z]\w+-root/, /MuiButton/, /MuiPaper/], confidence: "high" as const },
    { name: "shadcn/ui", patterns: [/data-state="(?:open|closed)"/, /data-radix-/], confidence: "medium" as const },
    { name: "Chakra UI", patterns: [/chakra-/, /--chakra-/], confidence: "high" as const },
    { name: "Ant Design", patterns: [/ant-btn/, /ant-card/, /ant-input/], confidence: "high" as const },
    { name: "Radix UI", patterns: [/data-radix-/, /radix-ui/], confidence: "high" as const },
    { name: "Headless UI", patterns: [/data-headlessui-/], confidence: "high" as const },
  ],
  buildTools: [
    { name: "Vite", patterns: [/\/@vite\//, /import\.meta\.env/], confidence: "high" as const },
    { name: "Webpack", patterns: [/webpackJsonp/, /__webpack_require__/], confidence: "medium" as const },
    { name: "Turbopack", patterns: [/turbopack/], confidence: "high" as const },
  ],
};

function runHeuristics(html: string): Partial<TechStackDetection> {
  const result: Partial<TechStackDetection> = { otherLibraries: [] };

  for (const { name, patterns, confidence } of HEURISTIC_PATTERNS.frameworks) {
    if (patterns.some((p) => p.test(html))) {
      if (!result.framework || confidence === "high") {
        result.framework = { name, confidence, evidence: [`Matched pattern in HTML`] };
      }
    }
  }

  for (const { name, patterns, confidence } of HEURISTIC_PATTERNS.css) {
    if (patterns.some((p) => p.test(html))) {
      if (!result.cssFramework || confidence === "high") {
        result.cssFramework = { name, confidence, evidence: [`Matched pattern in HTML`] };
      }
    }
  }

  for (const { name, patterns, confidence } of HEURISTIC_PATTERNS.componentLibraries) {
    if (patterns.some((p) => p.test(html))) {
      if (!result.componentLibrary || confidence === "high") {
        result.componentLibrary = { name, confidence, evidence: [`Matched pattern in HTML`] };
      }
    }
  }

  for (const { name, patterns, confidence } of HEURISTIC_PATTERNS.buildTools) {
    if (patterns.some((p) => p.test(html))) {
      if (!result.buildTool || confidence === "high") {
        result.buildTool = { name, confidence, evidence: [`Matched pattern in HTML`] };
      }
    }
  }

  return result;
}

const SYSTEM_PROMPT = `You are a tech stack detection agent. Given a webpage's HTML and preliminary heuristic findings, identify the frontend technologies used.

Analyze for:
1. Frontend framework (React, Vue, Angular, Svelte, etc.) and meta-frameworks (Next.js, Nuxt, SvelteKit, Astro)
2. CSS approach (Tailwind, Bootstrap, styled-components, CSS Modules, Emotion, etc.)
3. Component library (MUI, shadcn/ui, Chakra UI, Ant Design, Radix UI, Headless UI, etc.)
4. Build tool indicators (Webpack, Vite, Turbopack, Parcel)
5. Meta-framework features (SSR, SSG, ISR indicators)
6. Other libraries (Framer Motion, React Hook Form, Zod, GSAP, etc.)

Return ONLY valid JSON matching this schema:
{
  "framework": { "name": "string", "version": "string or null", "confidence": "high|medium|low", "evidence": ["string"] } | null,
  "cssFramework": { "name": "string", "version": "string or null", "confidence": "high|medium|low", "evidence": ["string"] } | null,
  "componentLibrary": { "name": "string", "version": "string or null", "confidence": "high|medium|low", "evidence": ["string"] } | null,
  "buildTool": { "name": "string", "confidence": "high|medium|low", "evidence": ["string"] } | null,
  "metaFramework": { "features": ["string"], "confidence": "high|medium|low", "evidence": ["string"] } | null,
  "otherLibraries": [{ "name": "string", "category": "animation|forms|state|styling|utility|other", "evidence": ["string"] }]
}

Provide concrete evidence from the HTML. If unsure, use lower confidence. If a field has no findings, return null for that field.`;

export async function analyzeTechStack(page: ScrapedPage): Promise<TechStackDetection> {
  // Phase 1: Fast heuristics
  const heuristic = runHeuristics(page.rawHtml);

  // Phase 2: AI fills gaps and confirms
  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      prompt: `Detect technologies on this page:\n\nURL: ${page.url}\n\nHeuristic findings:\n${JSON.stringify(heuristic, null, 2)}\n\nHTML (first 25KB):\n${page.rawHtml.slice(0, 25000)}`,
    });

    const clean = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    const ai: TechStackDetection = JSON.parse(clean);

    // Merge: heuristic high-confidence wins, AI fills gaps
    return {
      framework: heuristic.framework?.confidence === "high" ? heuristic.framework : (ai.framework ?? heuristic.framework ?? undefined),
      cssFramework: heuristic.cssFramework?.confidence === "high" ? heuristic.cssFramework : (ai.cssFramework ?? heuristic.cssFramework ?? undefined),
      componentLibrary: heuristic.componentLibrary?.confidence === "high" ? heuristic.componentLibrary : (ai.componentLibrary ?? heuristic.componentLibrary ?? undefined),
      buildTool: heuristic.buildTool?.confidence === "high" ? heuristic.buildTool : (ai.buildTool ?? heuristic.buildTool ?? undefined),
      metaFramework: ai.metaFramework ?? undefined,
      otherLibraries: [...(heuristic.otherLibraries || []), ...(ai.otherLibraries || [])],
    };
  } catch {
    // If AI fails, return heuristic-only results
    return {
      ...heuristic,
      otherLibraries: heuristic.otherLibraries || [],
    } as TechStackDetection;
  }
}
```

**Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit 2>&1 | grep techstack`
Expected: No errors from this file (may see errors from index.ts, that's fine)

**Step 3: Commit**

```bash
git add src/lib/agents/techstack.ts
git commit -m "feat: add tech stack detection agent with heuristic pre-scanner"
```

---

### Task 4: Update component agent with attribution and wire up 5-agent orchestrator

**Files:**
- Modify: `src/lib/agents/components.ts`
- Modify: `src/lib/agents/index.ts`

**Step 1: Update component agent prompt and signature**

Replace the entire `SYSTEM_PROMPT` in `src/lib/agents/components.ts` with:

```typescript
const SYSTEM_PROMPT = `You are a UI component extraction agent. Given a webpage's HTML and detected tech stack, identify all reusable UI components.

For each component, extract its HTML and inline/relevant CSS. Focus on: buttons, cards, inputs, modals, navbars, heroes, footers, forms, badges.

IMPORTANT: Detect if components come from known libraries by analyzing:
- Class name patterns (e.g., "MuiButton-root", "ant-btn", "chakra-button")
- Data attributes (e.g., "data-state", "data-radix-", "data-headlessui-")
- HTML structure patterns matching known library documentation
- CSS variable naming conventions (e.g., "--chakra-", "--radius", "--primary")

Example output:
{
  "components": [
    {
      "name": "Primary CTA Button",
      "category": "button",
      "html": "<button class=\\"btn-primary\\">Get Started</button>",
      "css": ".btn-primary { background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; }",
      "variants": ["primary", "large"],
      "description": "Main call-to-action button with rounded corners and purple background.",
      "attribution": { "library": null, "confidence": "high", "reasoning": "Custom component with no known library patterns" }
    }
  ]
}

Return ONLY valid JSON matching this schema. Extract the ACTUAL HTML and CSS from the page. Do not invent or embellish.`;
```

Update the function signature to accept tech stack:

```typescript
export async function analyzeComponents(
  page: ScrapedPage,
  techStack?: TechStackDetection
): Promise<ComponentAnalysis> {
  let techContext = "";
  if (techStack) {
    techContext = `\n\nDetected Tech Stack:\nFramework: ${techStack.framework?.name || "unknown"}\nCSS: ${techStack.cssFramework?.name || "unknown"}\nComponent Library: ${techStack.componentLibrary?.name || "unknown"}`;
  }

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Extract all reusable UI components from this page:\n\nURL: ${page.url}${techContext}\n\nHTML:\n${page.rawHtml.slice(0, 30000)}`,
  });

  const clean = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(clean);
}
```

Add the import at the top:

```typescript
import type { ComponentAnalysis, ScrapedPage, TechStackDetection } from "../types";
```

**Step 2: Update orchestrator in `src/lib/agents/index.ts`**

Replace the entire file:

```typescript
import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeDesign } from "./design";
import { analyzeContent } from "./content";
import { analyzeTechStack } from "./techstack";
import type { ScrapedPage, CrawlResult } from "../types";

export async function analyzePage(page: ScrapedPage): Promise<CrawlResult> {
  // Tech stack runs first so we can pass it to component agent
  const techStack = await analyzeTechStack(page);

  // Other 4 agents run in parallel, components gets tech stack context
  const [layoutResult, componentsResult, designResult, contentResult] = await Promise.allSettled([
    analyzeLayout(page),
    analyzeComponents(page, techStack),
    analyzeDesign(page),
    analyzeContent(page),
  ]);

  return {
    url: page.url,
    screenshot: page.screenshot,
    layout: layoutResult.status === "fulfilled" ? layoutResult.value : { sections: [], responsiveBreakpoints: [], navigationStructure: [] },
    components: componentsResult.status === "fulfilled" ? componentsResult.value : { components: [] },
    design: designResult.status === "fulfilled" ? designResult.value : { colors: [], typography: { fontFamilies: [], scale: [] }, spacing: [], borderRadius: [], shadows: [] },
    content: contentResult.status === "fulfilled" ? contentResult.value : { sections: [], images: [], links: [], meta: {} },
    techStack,
  };
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Clean compilation (0 errors)

**Step 4: Commit**

```bash
git add src/lib/agents/components.ts src/lib/agents/index.ts
git commit -m "feat: add component attribution and 5-agent orchestration with graceful failures"
```

---

### Task 5: Create export utility module

**Files:**
- Create: `src/lib/export.ts`

**Step 1: Create the export module**

```typescript
import JSZip from "jszip";
import type { CrawlResult, StealKitExport } from "./types";

export function generateDesignSystemMd(results: CrawlResult[]): string {
  const design = results[0]?.design;
  if (!design) return "# Design System\n\nNo design data available.\n";

  let md = "# Design System\n\n";

  md += "## Color Palette\n\n";
  md += "| Name | Hex | Usage |\n|------|-----|-------|\n";
  design.colors.forEach((c) => {
    md += `| ${c.name} | \`${c.hex}\` | ${c.usage} |\n`;
  });

  md += "\n## Typography\n\n";
  md += `**Font Families:** ${design.typography.fontFamilies.join(", ")}\n\n`;
  md += "| Name | Size | Weight | Line Height |\n|------|------|--------|-------------|\n";
  design.typography.scale.forEach((s) => {
    md += `| ${s.name} | ${s.size} | ${s.weight} | ${s.lineHeight} |\n`;
  });

  md += "\n## Spacing\n\n";
  md += design.spacing.map((s) => `- \`${s}\``).join("\n") + "\n";

  md += "\n## Border Radius\n\n";
  md += design.borderRadius.map((r) => `- \`${r}\``).join("\n") + "\n";

  md += "\n## Shadows\n\n";
  design.shadows.forEach((s, i) => { md += `${i + 1}. \`${s}\`\n`; });

  return md;
}

export function generateTechStackMd(results: CrawlResult[]): string {
  const ts = results[0]?.techStack;
  if (!ts) return "# Tech Stack\n\nNo tech stack data available.\n";

  let md = "# Tech Stack\n\n";

  const section = (title: string, data?: { name: string; version?: string; confidence: string; evidence: string[] }) => {
    if (!data) return "";
    let s = `## ${title}\n\n**${data.name}**${data.version ? ` v${data.version}` : ""} (${data.confidence} confidence)\n\n`;
    s += "Evidence:\n";
    data.evidence.forEach((e) => { s += `- ${e}\n`; });
    return s + "\n";
  };

  md += section("Framework", ts.framework);
  md += section("CSS Framework", ts.cssFramework);
  md += section("Component Library", ts.componentLibrary);
  md += section("Build Tool", ts.buildTool);

  if (ts.metaFramework) {
    md += `## Meta-Framework Features\n\n`;
    md += ts.metaFramework.features.map((f) => `- ${f}`).join("\n") + "\n\n";
  }

  if (ts.otherLibraries.length > 0) {
    md += "## Other Libraries\n\n";
    ts.otherLibraries.forEach((lib) => {
      md += `- **${lib.name}** (${lib.category})\n`;
    });
  }

  return md;
}

export function generateStyleGuideMd(results: CrawlResult[]): string {
  const r = results[0];
  if (!r) return "# Style Guide\n\nNo data available.\n";

  let md = "# Style Guide\n\n";

  if (r.layout?.sections.length) {
    const methods = [...new Set(r.layout.sections.map((s) => s.layoutMethod))];
    md += `## Layout\n\n**Methods:** ${methods.join(", ")}\n\n`;
    r.layout.sections.forEach((s) => {
      md += `- **${s.name}** (${s.type}, ${s.layoutMethod}): ${s.description}\n`;
    });
    md += "\n";
  }

  if (r.layout?.responsiveBreakpoints.length) {
    md += "## Breakpoints\n\n";
    md += r.layout.responsiveBreakpoints.map((bp) => `- \`${bp}\``).join("\n") + "\n\n";
  }

  return md;
}

export function generateComponentFiles(results: CrawlResult[]): { filename: string; content: string }[] {
  return results.flatMap((r) => r.components.components).map((comp, i) => {
    const slug = comp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      filename: `${slug}-${i}.html`,
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${comp.name}</title>
  <style>
body { font-family: system-ui, sans-serif; padding: 2rem; background: #f5f5f5; }
${comp.css}
  </style>
</head>
<body>
  <!-- ${comp.name} (${comp.category}) -->
  <!-- ${comp.description} -->
${comp.attribution?.library ? `  <!-- Library: ${comp.attribution.library} (${comp.attribution.confidence}) -->` : "  <!-- Custom component -->"}
  ${comp.html}
</body>
</html>`,
    };
  });
}

export function generateMasterMd(results: CrawlResult[]): string {
  const url = results[0]?.url ?? "unknown";
  let md = `# Steal Kit: ${url}\n\n`;
  md += `> Inspired by ${url}. Design principles extracted for educational study.\n`;
  md += `> Generated on ${new Date().toISOString()}\n\n---\n\n`;
  md += generateTechStackMd(results) + "\n---\n\n";
  md += generateDesignSystemMd(results) + "\n---\n\n";
  md += generateStyleGuideMd(results) + "\n---\n\n";

  const comps = results.flatMap((r) => r.components.components);
  if (comps.length) {
    md += "# Component Patterns\n\n";
    comps.forEach((c) => {
      md += `## ${c.name} (${c.category})\n\n`;
      md += `${c.description}\n\n`;
      if (c.attribution?.library) md += `**Library:** ${c.attribution.library}\n\n`;
      md += "```html\n" + c.html + "\n```\n\n";
      if (c.css) md += "```css\n" + c.css + "\n```\n\n";
    });
  }

  return md;
}

export async function exportStealKit(results: CrawlResult[]): Promise<void> {
  const kit: StealKitExport = {
    designSystem: generateDesignSystemMd(results),
    techStack: generateTechStackMd(results),
    styleGuide: generateStyleGuideMd(results),
    components: generateComponentFiles(results),
    masterFile: "",
  };
  kit.masterFile = generateMasterMd(results);

  const zip = new JSZip();
  zip.file("steal-kit.md", kit.masterFile);
  zip.file("design-system.md", kit.designSystem);
  zip.file("tech-stack.md", kit.techStack);
  zip.file("style-guide.md", kit.styleGuide);

  const folder = zip.folder("components");
  kit.components.forEach((c) => folder?.file(c.filename, c.content));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `steal-kit-${new Date().toISOString().split("T")[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Clean compilation

**Step 3: Commit**

```bash
git add src/lib/export.ts
git commit -m "feat: add steal kit export system with markdown + ZIP generation"
```

---

### Task 6: Update store and add TechStack tab to UI

**Files:**
- Modify: `src/lib/store.ts` (line 12: add "techstack" to activeTab union)
- Create: `src/components/catalog/TechStackTab.tsx`
- Modify: `src/components/catalog/TabBar.tsx` (add tech stack to tabs array)
- Modify: `src/components/catalog/CatalogView.tsx` (add export button + tech stack tab)
- Modify: `src/components/catalog/ComponentCard.tsx` (add attribution display)

**Step 1: Update store activeTab type**

In `src/lib/store.ts`, change the `activeTab` type on line 12 from:
```typescript
  activeTab: "components" | "design" | "layout" | "content";
```
to:
```typescript
  activeTab: "components" | "design" | "layout" | "content" | "techstack";
```

**Step 2: Create TechStackTab component**

Create `src/components/catalog/TechStackTab.tsx`:

```typescript
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

function StackCard({ title, data, index }: {
  title: string;
  data?: { name: string; version?: string; confidence: string; evidence: string[] };
  index: number;
}) {
  if (!data) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          data.confidence === "high" ? "bg-green-500/10 text-green-400" :
          data.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400" :
          "bg-red-500/10 text-red-400"
        }`}>
          {data.confidence}
        </span>
      </div>
      <p className="mb-4 text-2xl font-bold text-[var(--accent)]">
        {data.name}{data.version && <span className="ml-2 text-base text-[var(--muted)]">v{data.version}</span>}
      </p>
      <div className="space-y-1">
        {data.evidence.map((e, i) => (
          <p key={i} className="text-sm text-[var(--muted)]">&bull; {e}</p>
        ))}
      </div>
    </motion.div>
  );
}

export function TechStackTab() {
  const { results } = useCrawlStore();
  const ts = results[0]?.techStack;

  if (!ts) return <p className="text-[var(--muted)]">No tech stack data available.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <StackCard title="Framework" data={ts.framework} index={0} />
        <StackCard title="CSS Framework" data={ts.cssFramework} index={1} />
        <StackCard title="Component Library" data={ts.componentLibrary} index={2} />
        <StackCard title="Build Tool" data={ts.buildTool} index={3} />
      </div>

      {ts.metaFramework && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="mb-3 text-lg font-semibold">Meta-Framework Features</h3>
          <div className="flex flex-wrap gap-2">
            {ts.metaFramework.features.map((f) => (
              <span key={f} className="rounded-lg bg-[var(--accent)]/10 px-3 py-1.5 text-sm text-[var(--accent)]">{f}</span>
            ))}
          </div>
        </motion.div>
      )}

      {ts.otherLibraries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="mb-4 text-lg font-semibold">Other Libraries</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ts.otherLibraries.map((lib, i) => (
              <div key={i} className="rounded-lg bg-[var(--background)] p-3">
                <p className="font-medium">{lib.name}</p>
                <p className="text-xs text-[var(--muted)]">{lib.category}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

**Step 3: Update TabBar to include tech stack tab**

In `src/components/catalog/TabBar.tsx`, change the tabs array to:

```typescript
const tabs = [
  { id: "components" as const, label: "Components" },
  { id: "design" as const, label: "Design" },
  { id: "layout" as const, label: "Layout" },
  { id: "content" as const, label: "Content" },
  { id: "techstack" as const, label: "Tech Stack" },
];
```

**Step 4: Update CatalogView with export button and tech stack tab**

In `src/components/catalog/CatalogView.tsx`:

Add imports at top:
```typescript
import { exportStealKit } from "@/lib/export";
import { TechStackTab } from "./TechStackTab";
```

Replace the "New Crawl" button section with:
```typescript
        <div className="flex gap-3">
          <button
            onClick={() => exportStealKit(results)}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
          >
            Export Steal Kit
          </button>
          <button
            onClick={reset}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--surface)]"
          >
            New Crawl
          </button>
        </div>
```

Add the tech stack tab case after the content tab:
```typescript
      {activeTab === "techstack" && <TechStackTab />}
```

**Step 5: Update ComponentCard with attribution display**

In `src/components/catalog/ComponentCard.tsx`, add after the variants section (after the closing `</div>` of the variants flex-wrap block, around line 49):

```typescript
        {component.attribution?.library && (
          <div className="mb-3 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-400">{component.attribution.library}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                component.attribution.confidence === "high" ? "bg-green-500/10 text-green-400" :
                component.attribution.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                "bg-red-500/10 text-red-400"
              }`}>{component.attribution.confidence}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{component.attribution.reasoning}</p>
          </div>
        )}
```

Also add a CSS copy button next to the HTML copy button:

```typescript
          <button
            onClick={() => { navigator.clipboard.writeText(component.css); }}
            className="rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-white"
          >
            Copy CSS
          </button>
```

**Step 6: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/lib/store.ts src/components/catalog/TechStackTab.tsx src/components/catalog/TabBar.tsx src/components/catalog/CatalogView.tsx src/components/catalog/ComponentCard.tsx
git commit -m "feat: add tech stack tab, export button, component attribution UI"
```

---

## Phase 2: Scrapbook UI Redesign

### Task 7: Replace fonts and rework global theme

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update layout.tsx with new fonts**

Replace the entire `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Instrument_Serif, Caveat } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const ibmPlexMono = IBM_Plex_Mono({ variable: "--font-mono", weight: ["400", "500"], subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-serif", weight: "400", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-hand", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "steal yo website",
  description: "Analyze any website's design DNA — components, design tokens, layout, tech stack",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${ibmPlexMono.variable} ${instrumentSerif.variable} ${caveat.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Replace globals.css with scrapbook theme**

Replace the entire `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: #f5f0e8;
  --foreground: #2c2825;
  --accent: #c85d3e;
  --accent-hover: #b5482c;
  --accent-alt: #2d6a4f;
  --surface: #faf8f4;
  --surface-hover: #f0ece2;
  --border: #d4cfc5;
  --muted: #a39e96;
  --ink: #2c2825;
  --ink-light: #6b6560;
  --tape: rgba(255, 235, 180, 0.7);
  --pin: #d4453b;
  --shadow: rgba(44, 40, 37, 0.12);
  --code-bg: #2c2825;
  --code-fg: #e8e0d4;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);
  --font-hand: var(--font-hand);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, -apple-system, sans-serif;
}

/* Paper grain texture */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
  z-index: 9999;
}

@layer utilities {
  .font-serif { font-family: var(--font-serif), serif; }
  .font-hand { font-family: var(--font-hand), cursive; }

  .tape {
    position: relative;
  }
  .tape::before {
    content: "";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%) rotate(2deg);
    width: 70px;
    height: 22px;
    background: var(--tape);
    border: 1px solid rgba(200, 180, 120, 0.3);
    z-index: 1;
  }

  .stamp {
    border: 2px solid currentColor;
    outline: 1px solid currentColor;
    outline-offset: 2px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    opacity: 0.65;
  }

  .torn-bottom {
    clip-path: polygon(0 0, 100% 0, 100% 95%, 97% 97%, 94% 95%, 90% 98%,
      85% 95%, 80% 97%, 75% 96%, 70% 98%, 65% 95%, 60% 97%, 55% 96%,
      50% 98%, 45% 95%, 40% 97%, 35% 96%, 30% 98%, 25% 95%, 20% 97%,
      15% 96%, 10% 98%, 5% 95%, 3% 97%, 0% 96%);
  }

  .bg-blueprint {
    background-color: #edf1f7;
    background-image:
      linear-gradient(rgba(100, 130, 180, 0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(100, 130, 180, 0.12) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  .ruled-lines {
    background-image: repeating-linear-gradient(
      transparent, transparent 19px,
      rgba(255, 255, 255, 0.05) 19px, rgba(255, 255, 255, 0.05) 20px
    );
  }
}
```

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: replace theme with scrapbook aesthetic — kraft paper, new fonts, tape/stamp utilities"
```

---

### Task 8: Restyle landing page with scrapbook aesthetic

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Restyle the landing page**

Replace the entire `src/app/page.tsx`:

```typescript
"use client";

import { useCrawlStore } from "@/lib/store";
import { CatalogView } from "@/components/catalog/CatalogView";
import { motion } from "framer-motion";

export default function Home() {
  const { url, depth, status, error, setUrl, setDepth, startCrawl, results } = useCrawlStore();
  const isLoading = status === "crawling" || status === "analyzing";

  if (status === "done" && results.length > 0) {
    return <CatalogView />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 1.1, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="w-full max-w-xl text-center"
      >
        <h1 className="font-serif mb-2 text-6xl tracking-tight text-[var(--ink)]">
          steal yo website
        </h1>
        <p className="font-hand mb-12 text-lg text-[var(--muted)]">
          Paste any URL. Study its design DNA.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
          className="flex flex-col gap-4"
        >
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-none border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-lg text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] disabled:opacity-50"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-hand text-sm text-[var(--muted)]">Depth</span>
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  disabled={isLoading}
                  className={`h-9 w-9 text-sm font-medium transition ${
                    depth === d
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={startCrawl}
              disabled={!url || isLoading}
              className="bg-[var(--accent)] px-8 py-3 font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isLoading ? (status === "crawling" ? "Crawling..." : "Analyzing...") : "Crawl"}
            </button>
          </div>

          {error && (
            <p className="text-sm text-[var(--accent)]">{error}</p>
          )}
        </motion.div>

        <p className="mt-8 text-xs text-[var(--muted)]">
          For inspiration and learning. Respect original creators&apos; work.
        </p>
      </motion.div>
    </main>
  );
}
```

**Step 2: Verify dev server renders**

Run: `npm run dev` (check visually in browser)

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: restyle landing page with scrapbook aesthetic — serif title, handwritten labels, square corners"
```

---

### Task 9: Restyle CatalogView, TabBar, and DesignTab with scrapbook aesthetic

**Files:**
- Modify: `src/components/catalog/CatalogView.tsx`
- Modify: `src/components/catalog/TabBar.tsx`
- Modify: `src/components/catalog/DesignTab.tsx`

**Step 1: Restyle CatalogView as scrapbook shell**

Replace `src/components/catalog/CatalogView.tsx`:

```typescript
"use client";

import { useCrawlStore } from "@/lib/store";
import { TabBar } from "./TabBar";
import { ComponentsTab } from "./ComponentsTab";
import { DesignTab } from "./DesignTab";
import { LayoutTab } from "./LayoutTab";
import { ContentTab } from "./ContentTab";
import { TechStackTab } from "./TechStackTab";
import { exportStealKit } from "@/lib/export";
import { motion, AnimatePresence } from "framer-motion";

export function CatalogView() {
  const { results, activeTab, reset, url } = useCrawlStore();

  const tabContent: Record<string, React.ReactNode> = {
    components: <ComponentsTab />,
    design: <DesignTab />,
    layout: <LayoutTab />,
    content: <ContentTab />,
    techstack: <TechStackTab />,
  };

  return (
    <div className="min-h-screen px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-dashed border-[var(--border)] pb-4">
        <div>
          <h1 className="font-serif text-2xl text-[var(--ink)]">steal yo website</h1>
          <p className="font-hand text-sm text-[var(--muted)]">
            {url} &mdash; {results.length} page(s) analyzed
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportStealKit(results)}
            className="bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
          >
            Export Steal Kit
          </button>
          <button
            onClick={reset}
            className="border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink-light)] transition hover:bg-[var(--surface)]"
          >
            New Crawl
          </button>
        </div>
      </div>

      {/* Hero screenshot */}
      {results[0]?.screenshot && (
        <div className="mx-auto mb-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, rotate: -3, y: 20 }}
            animate={{ opacity: 1, rotate: -2, y: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="tape bg-white p-4 pb-12 shadow-lg"
            style={{ boxShadow: "4px 6px 20px var(--shadow)" }}
          >
            <img src={results[0].screenshot} alt="Page screenshot" className="w-full" />
            <p className="font-hand mt-2 text-center text-sm text-[var(--muted)]">{url}</p>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8">
        <TabBar />
      </div>

      {/* Content with page-turn transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          {tabContent[activeTab]}
        </motion.div>
      </AnimatePresence>

      {/* Footer disclaimer */}
      <div className="mt-16 border-t border-dashed border-[var(--border)] pt-4 text-center">
        <p className="font-hand text-xs text-[var(--muted)]">
          Analysis of {url} &mdash; for inspiration and learning only
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Restyle TabBar as notebook dividers**

Replace `src/components/catalog/TabBar.tsx`:

```typescript
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

const tabs = [
  { id: "components" as const, label: "Components", color: "#c85d3e" },
  { id: "design" as const, label: "Design", color: "#2d6a4f" },
  { id: "layout" as const, label: "Layout", color: "#5b7fa5" },
  { id: "content" as const, label: "Content", color: "#b8933a" },
  { id: "techstack" as const, label: "Tech Stack", color: "#7c5cbf" },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useCrawlStore();

  return (
    <div className="flex gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="relative px-5 py-2.5 text-sm font-medium transition"
          style={{
            borderTop: `3px solid ${activeTab === tab.id ? tab.color : "transparent"}`,
            background: activeTab === tab.id ? "var(--surface)" : "transparent",
            color: activeTab === tab.id ? "var(--ink)" : "var(--muted)",
          }}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 border border-[var(--border)] border-b-0 bg-[var(--surface)]"
              style={{ borderTop: `3px solid ${tab.color}` }}
              transition={{ type: "spring", duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Restyle DesignTab with paint chips and specimen sheets**

Replace `src/components/catalog/DesignTab.tsx`:

```typescript
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";
import { useState } from "react";

export function DesignTab() {
  const { results } = useCrawlStore();
  const design = results[0]?.design;
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  if (!design) return <p className="text-[var(--muted)]">No design data extracted.</p>;

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  return (
    <div className="space-y-16">
      {/* Color Palette — Paint Chips */}
      <section>
        <h2 className="font-serif mb-8 text-2xl text-[var(--ink)]">Color Palette</h2>
        <div className="flex flex-wrap gap-4">
          {design.colors.map((color, i) => (
            <motion.div
              key={color.hex}
              initial={{ opacity: 0, y: -20, rotate: (i * 7 % 5) - 2 }}
              animate={{ opacity: 1, y: 0, rotate: (i * 7 % 5) - 2 }}
              whileHover={{ y: -12, rotate: 0, scale: 1.05, zIndex: 10 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => copyColor(color.hex)}
              className="w-20 cursor-pointer torn-bottom"
            >
              <div className="h-28 w-full" style={{ backgroundColor: color.hex }} />
              <div className="bg-[var(--surface)] px-2 py-2">
                <p className="font-hand text-xs text-[var(--ink)]">{color.name}</p>
                <p className="font-mono text-[10px] text-[var(--muted)]">
                  {copiedHex === color.hex ? "Copied!" : color.hex}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Typography — Specimen Sheet */}
      <section>
        <h2 className="font-serif mb-8 text-2xl text-[var(--ink)]">Type Specimen</h2>
        <div className="mb-6 flex flex-wrap gap-3">
          {design.typography.fontFamilies.map((font) => (
            <span key={font} className="border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-lg" style={{ fontFamily: font }}>
              {font}
            </span>
          ))}
        </div>
        <div className="space-y-0">
          {design.typography.scale.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-baseline justify-between border-b border-dotted border-[var(--border)] py-4"
            >
              <span style={{ fontSize: item.size, fontWeight: item.weight, lineHeight: item.lineHeight }}>
                {item.name}
              </span>
              <span className="font-mono text-xs text-[var(--muted)]">
                {item.size} / {item.weight} / {item.lineHeight}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Border Radius & Shadows */}
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Border Radius</h2>
          <div className="flex flex-wrap gap-4">
            {design.borderRadius.map((radius) => (
              <div key={radius} className="text-center">
                <div className="mb-2 h-16 w-16 border-2 border-[var(--accent)] bg-[var(--surface)]" style={{ borderRadius: radius }} />
                <span className="font-mono text-xs text-[var(--muted)]">{radius}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Shadows</h2>
          <div className="space-y-4">
            {design.shadows.map((shadow) => (
              <div key={shadow} className="bg-[var(--surface)] p-4" style={{ boxShadow: shadow }}>
                <span className="font-mono text-xs text-[var(--muted)]">{shadow}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
```

**Step 4: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/catalog/CatalogView.tsx src/components/catalog/TabBar.tsx src/components/catalog/DesignTab.tsx
git commit -m "feat: restyle catalog, tabs, and design tab with scrapbook aesthetic"
```

---

### Task 10: Restyle ComponentsTab and ComponentCard with scrapbook cards

**Files:**
- Modify: `src/components/catalog/ComponentsTab.tsx`
- Modify: `src/components/catalog/ComponentCard.tsx`

**Step 1: Restyle ComponentsTab with scattered masonry grid**

Replace `src/components/catalog/ComponentsTab.tsx`:

```typescript
"use client";

import { useCrawlStore } from "@/lib/store";
import { ComponentCard } from "./ComponentCard";
import { useState } from "react";

export function ComponentsTab() {
  const { results } = useCrawlStore();
  const allComponents = results.flatMap((r) => r.components.components);
  const [filter, setFilter] = useState("all");

  const categories = ["all", ...new Set(allComponents.map((c) => c.category))];
  const filtered = filter === "all" ? allComponents : allComponents.filter((c) => c.category === filter);

  if (allComponents.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-2xl text-[var(--ink)]">No components found</p>
        <p className="font-hand mt-2 text-[var(--muted)]">Try crawling a different URL or increasing depth</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              filter === cat
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
        {filtered.map((component, i) => (
          <div key={`${component.name}-${i}`} className="mb-6 break-inside-avoid">
            <ComponentCard component={component} index={i} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Restyle ComponentCard with tape, stamps, and notebook code**

Replace `src/components/catalog/ComponentCard.tsx`:

```typescript
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExtractedComponent } from "@/lib/types";

export function ComponentCard({ component, index }: { component: ExtractedComponent; index: number }) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const rotation = ((index * 7) % 5) - 2;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -30, rotate: rotation, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotate: rotation, scale: 1 }}
      whileHover={{ rotate: 0, y: -4, scale: 1.02, boxShadow: "4px 8px 24px var(--shadow)" }}
      transition={{ type: "spring", damping: 20, stiffness: 150, delay: Math.min(index * 0.06, 0.5) }}
      className="tape relative overflow-hidden bg-[var(--surface)]"
      style={{ boxShadow: "2px 3px 12px var(--shadow)" }}
    >
      {/* Library stamp */}
      {component.attribution?.library && (
        <div className="absolute right-2 top-2 z-10 -rotate-12 stamp px-2 py-1 text-[10px] text-[var(--accent)]">
          {component.attribution.library}
        </div>
      )}

      {/* Preview */}
      <div className="border-b border-dashed border-[var(--border)] bg-white p-4">
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:60px;}${component.css}</style></head><body>${component.html}</body></html>`}
          className="h-24 w-full border-0"
          sandbox="allow-same-origin"
          title={component.name}
        />
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium text-[var(--ink)]">{component.name}</h3>
          <span className="font-hand text-xs text-[var(--accent)]">{component.category}</span>
        </div>
        <p className="mb-3 text-sm text-[var(--muted)]">{component.description}</p>

        {component.variants.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {component.variants.map((v) => (
              <span key={v} className="bg-[var(--background)] px-2 py-0.5 text-xs text-[var(--muted)]">{v}</span>
            ))}
          </div>
        )}

        {component.attribution?.library && (
          <div className="mb-3 border-l-2 border-[var(--accent)] bg-[var(--background)] px-3 py-2">
            <p className="text-xs font-medium text-[var(--accent)]">{component.attribution.library}</p>
            <p className="text-xs text-[var(--muted)]">{component.attribution.reasoning}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => setShowCode(!showCode)}
            className="bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]">
            {showCode ? "Hide Code" : "View Code"}
          </button>
          <button onClick={() => copy(component.html, "html")}
            className="bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]">
            {copied === "html" ? "Copied!" : "Copy HTML"}
          </button>
          <button onClick={() => copy(component.css, "css")}
            className="bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]">
            {copied === "css" ? "Copied!" : "Copy CSS"}
          </button>
        </div>

        {/* Code notebook */}
        <AnimatePresence>
          {showCode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 overflow-hidden"
            >
              <div className="ruled-lines overflow-x-auto bg-[var(--code-bg)] p-4" style={{ borderLeft: "2px solid rgba(200,80,60,0.3)" }}>
                <p className="mb-2 font-mono text-[10px] text-[var(--accent)] opacity-50">HTML</p>
                <pre className="font-mono text-xs text-[var(--code-fg)]"><code>{component.html}</code></pre>
                {component.css && (
                  <>
                    <p className="mb-2 mt-4 font-mono text-[10px] text-[var(--accent)] opacity-50">CSS</p>
                    <pre className="font-mono text-xs text-[var(--code-fg)]"><code>{component.css}</code></pre>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/catalog/ComponentsTab.tsx src/components/catalog/ComponentCard.tsx
git commit -m "feat: restyle components with masonry grid, tape cards, stamps, notebook code"
```

---

### Task 11: Restyle LayoutTab and ContentTab with blueprint and clipping aesthetics

**Files:**
- Modify: `src/components/catalog/LayoutTab.tsx`
- Modify: `src/components/catalog/ContentTab.tsx`

**Step 1: Restyle LayoutTab with blueprint aesthetic**

Replace `src/components/catalog/LayoutTab.tsx`:

```typescript
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

const sectionColors: Record<string, string> = {
  header: "#6366f1", hero: "#8b5cf6", features: "#06b6d4", content: "#10b981",
  cta: "#f59e0b", footer: "#64748b", sidebar: "#ec4899", navigation: "#6366f1", other: "#737373",
};

export function LayoutTab() {
  const { results } = useCrawlStore();
  const layout = results[0]?.layout;

  if (!layout) return <p className="text-[var(--muted)]">No layout data extracted.</p>;

  return (
    <div className="space-y-12">
      <section className="bg-blueprint rounded-none p-8">
        <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Page Structure</h2>
        <div className="mx-auto max-w-2xl space-y-3">
          {layout.sections.map((section, i) => (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="overflow-hidden border-2 border-dashed bg-white/50"
              style={{ borderColor: sectionColors[section.type] ?? sectionColors.other }}
            >
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium text-[var(--ink)]">{section.name}</h3>
                  <p className="font-hand text-sm text-[var(--muted)]">{section.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className="bg-white/80 px-2 py-1 text-xs text-[var(--muted)]">{section.type}</span>
                  <span className="font-mono bg-white/80 px-2 py-1 text-xs" style={{ color: sectionColors[section.type] }}>
                    {section.layoutMethod}
                  </span>
                </div>
              </div>
              <pre className="border-t border-dashed border-[var(--border)] bg-[var(--code-bg)] p-3 font-mono text-xs text-[var(--code-fg)]">
                <code>{section.htmlSnippet}</code>
              </pre>
            </motion.div>
          ))}
        </div>
      </section>

      {layout.navigationStructure.length > 0 && (
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Navigation</h2>
          <div className="flex flex-wrap gap-2">
            {layout.navigationStructure.map((nav) => (
              <span key={nav.href} className="border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--ink)]">
                {nav.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {layout.responsiveBreakpoints.length > 0 && (
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Breakpoints</h2>
          <div className="flex gap-4">
            {layout.responsiveBreakpoints.map((bp) => (
              <div key={bp} className="bg-[var(--surface)] px-4 py-3 text-center">
                <span className="font-mono text-lg font-medium text-[var(--ink)]">{bp}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

**Step 2: Restyle ContentTab with clipping board aesthetic**

Replace `src/components/catalog/ContentTab.tsx`:

```typescript
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export function ContentTab() {
  const { results } = useCrawlStore();
  const content = results[0]?.content;

  if (!content) return <p className="text-[var(--muted)]">No content extracted.</p>;

  return (
    <div className="space-y-12">
      {/* Meta — File Folder */}
      <section className="border border-[var(--border)] bg-[#faf3e0] p-6">
        <h2 className="font-serif mb-4 text-xl text-[var(--ink)]">Meta</h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <dt className="font-hand text-xs text-[var(--muted)]">Title</dt>
            <dd className="text-sm text-[var(--ink)]">{content.meta.title ?? "\u2014"}</dd>
          </div>
          <div>
            <dt className="font-hand text-xs text-[var(--muted)]">Description</dt>
            <dd className="text-sm text-[var(--ink)]">{content.meta.description ?? "\u2014"}</dd>
          </div>
        </dl>
        {content.meta.ogImage && (
          <img src={content.meta.ogImage} alt="OG" className="mt-4 max-h-40" />
        )}
      </section>

      {/* Text — Newspaper Clippings */}
      <section>
        <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Text Content</h2>
        <div className="columns-1 gap-4 md:columns-2">
          {content.sections.map((sec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="mb-4 break-inside-avoid bg-[#faf6ee] p-4"
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            >
              <span className="font-hand float-right text-[10px] text-[var(--muted)]">H{(i % 3) + 2}</span>
              <h3 className="font-serif mb-1 text-sm text-[var(--accent)]">{sec.heading}</h3>
              <p className="text-sm text-[var(--ink-light)]">{sec.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Images — Polaroids */}
      {content.images.length > 0 && (
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Images ({content.images.length})</h2>
          <div className="flex flex-wrap gap-6">
            {content.images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ rotate: 0, y: -4 }}
                transition={{ delay: i * 0.03 }}
                className="w-48 bg-white p-2 pb-8 shadow-md"
                style={{ transform: `rotate(${(i * 3 % 5) - 2}deg)` }}
              >
                <img src={img.src} alt={img.alt} className="aspect-video w-full object-cover" />
                <p className="font-hand mt-2 truncate text-xs text-[var(--muted)]">{img.alt || "No alt"}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Links — Sticky Notes */}
      {content.links.length > 0 && (
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Links ({content.links.length})</h2>
          <div className="flex flex-wrap gap-3">
            {content.links.map((link, i) => {
              const colors = ["#fef3c7", "#fce7f3", "#dbeafe", "#d1fae5"];
              return (
                <div
                  key={i}
                  className="w-40 p-3 shadow-sm"
                  style={{ backgroundColor: colors[i % colors.length], transform: `rotate(${(i % 3) - 1}deg)` }}
                >
                  <p className="truncate text-xs font-medium text-[var(--ink)]">{link.text || link.href}</p>
                  <p className="font-hand text-[10px] text-[var(--muted)]">
                    {link.isExternal ? "external" : "internal"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
```

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/catalog/LayoutTab.tsx src/components/catalog/ContentTab.tsx
git commit -m "feat: restyle layout (blueprint) and content (clipping board) tabs"
```

---

### Task 12: Restyle TechStackTab with sticker badges

**Files:**
- Modify: `src/components/catalog/TechStackTab.tsx`

**Step 1: Replace TechStackTab with sticker aesthetic**

Replace `src/components/catalog/TechStackTab.tsx`:

```typescript
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

function Sticker({ name, confidence, index }: { name: string; confidence: string; index: number }) {
  const rotation = ((index * 13) % 11) - 5;
  return (
    <motion.div
      initial={{ scale: 0, rotate: rotation * 2 }}
      animate={{ scale: 1, rotate: rotation }}
      transition={{ type: "spring", damping: 12, stiffness: 300, delay: index * 0.1 }}
      whileHover={{ scale: 1.1, rotate: 0, y: -4 }}
      className="inline-flex items-center gap-2 border-2 border-white bg-[var(--surface)] px-4 py-2 shadow-md"
    >
      <span className="text-sm font-semibold text-[var(--ink)]">{name}</span>
      <span className={`stamp px-1.5 py-0.5 text-[9px] ${
        confidence === "high" ? "text-[var(--accent-alt)]" : "text-[var(--muted)]"
      }`}>
        {confidence === "high" ? "confirmed" : "likely"}
      </span>
    </motion.div>
  );
}

function DetailCard({ title, data, index }: {
  title: string;
  data?: { name: string; version?: string; confidence: string; evidence: string[] };
  index: number;
}) {
  if (!data) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.1 }}
      className="border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg text-[var(--ink)]">{title}</h3>
        <span className={`stamp px-2 py-1 text-[10px] ${
          data.confidence === "high" ? "text-[var(--accent-alt)]" : "text-[var(--muted)]"
        }`}>{data.confidence}</span>
      </div>
      <p className="mb-3 text-xl font-bold text-[var(--accent)]">
        {data.name}{data.version && <span className="ml-2 text-sm font-normal text-[var(--muted)]">v{data.version}</span>}
      </p>
      <div className="space-y-1">
        {data.evidence.map((e, i) => (
          <p key={i} className="text-xs text-[var(--muted)]">&bull; {e}</p>
        ))}
      </div>
    </motion.div>
  );
}

export function TechStackTab() {
  const { results } = useCrawlStore();
  const ts = results[0]?.techStack;

  if (!ts) return <p className="text-[var(--muted)]">No tech stack data available.</p>;

  const stickers = [ts.framework, ts.cssFramework, ts.componentLibrary, ts.buildTool].filter(Boolean);

  return (
    <div className="space-y-10">
      {/* Sticker Cluster */}
      <section className="flex flex-wrap items-center justify-center gap-4 py-8">
        {stickers.map((s, i) => (
          <Sticker key={s!.name} name={s!.name} confidence={s!.confidence} index={i} />
        ))}
      </section>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DetailCard title="Framework" data={ts.framework} index={0} />
        <DetailCard title="CSS Framework" data={ts.cssFramework} index={1} />
        <DetailCard title="Component Library" data={ts.componentLibrary} index={2} />
        <DetailCard title="Build Tool" data={ts.buildTool} index={3} />
      </div>

      {ts.otherLibraries.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Other Libraries</h3>
          <div className="flex flex-wrap gap-3">
            {ts.otherLibraries.map((lib, i) => (
              <div key={i} className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-sm font-medium text-[var(--ink)]">{lib.name}</p>
                <p className="font-hand text-xs text-[var(--muted)]">{lib.category}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/catalog/TechStackTab.tsx
git commit -m "feat: restyle tech stack tab with sticker badges and stamp aesthetics"
```

---

## Phase 3: Final Polish

### Task 13: Verify full app works end-to-end

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Manual smoke test**

1. Open http://localhost:3000
2. Verify scrapbook landing page renders (serif title, kraft paper background)
3. Enter a URL (e.g., https://vercel.com) and crawl
4. Verify all 5 tabs render (Components, Design, Layout, Content, Tech Stack)
5. Verify Export Steal Kit button downloads a ZIP
6. Verify component cards show attribution stamps when libraries are detected
7. Verify code view shows HTML and CSS in notebook style

**Step 3: Production build test**

Run: `npm run build`
Expected: Clean build with no errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete lookbook redesign — scrapbook UI, tech stack detection, steal kit export"
```

---

## Summary

| Phase | Tasks | What It Delivers |
|-------|-------|-----------------|
| **1: Backend** | Tasks 1-6 | Tech stack agent, component attribution, export system, new tab + button |
| **2: UI Redesign** | Tasks 7-12 | Scrapbook theme, paint chips, specimen sheets, blueprints, sticker badges, tape cards |
| **3: Polish** | Task 13 | End-to-end verification |

**Total: 13 tasks, ~5-8 hours of focused implementation**

**New files:** 3 (`techstack.ts`, `export.ts`, `TechStackTab.tsx`)
**Modified files:** 12 (types, agents, store, all UI components, layout, globals)
**New dependency:** 1 (`jszip`)
