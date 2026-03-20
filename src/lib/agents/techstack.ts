import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { TechStackDetection, ScrapedPage } from "../types";
import type { PageToolkit } from "./page-tools";
import { techStackTools } from "./page-tools";
import { TechStackSchema } from "./schemas";
import { withRetry } from "./utils";

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

const SYSTEM_PROMPT = `You are a tech stack detection agent. Quickly confirm or fill gaps in heuristic findings for a webpage's frontend technologies.

Available Tools:
- get_script_tags: Inspect script tags for framework signatures and CDN URLs
- get_meta_tags: Check meta tags for generator and framework hints
- get_html_attributes: Check <html> and <body> attributes for framework markers

In ONE step: call the tools, confirm heuristic findings, fill any gaps. Use "high" confidence only with 2+ strong evidence pieces. Use null for fields with no findings.`;

export async function analyzeTechStack(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
): Promise<TechStackDetection> {
  // Phase 1: Fast heuristics
  const heuristic = runHeuristics(page.rawHtml);

  // Phase 2: AI with tools fills gaps and confirms
  try {
    const result = await withRetry(async () => {
      const { output } = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        system: SYSTEM_PROMPT,
        tools: techStackTools(toolkit),
        output: Output.object({ schema: TechStackSchema }),
        stopWhen: stepCountIs(1),
        prompt: `Detect technologies on this page. Use the available tools to inspect scripts, meta tags, link tags, and framework data.\n\nHeuristic findings:\n${JSON.stringify(heuristic, null, 2)}\n\n${overview}`,
      });

      if (!output) throw new Error("No output generated");
      return output;
    });

    const ai = result as TechStackDetection;

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
