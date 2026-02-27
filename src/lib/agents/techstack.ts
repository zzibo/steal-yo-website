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
