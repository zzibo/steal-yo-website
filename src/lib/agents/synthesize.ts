import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { CrawlResult, SynthesizedResults } from "../types";

const SynthesisSchema = z.object({
  globalColors: z.array(z.object({
    hex: z.string(),
    role: z.string(),
    name: z.string(),
    pageCount: z.number(),
  })),
  globalComponents: z.array(z.object({
    name: z.string(),
    category: z.string(),
    pageUrls: z.array(z.string()),
  })),
  sharedSections: z.array(z.object({
    type: z.string(),
    name: z.string(),
    pageCount: z.number(),
  })),
});

const SYSTEM_PROMPT = `You are a design system analyst. You receive structured analysis results from multiple pages of the same website. Your job is to identify cross-page patterns:

1. **Global Colors**: Colors that appear on multiple pages, with their role and frequency.
2. **Global Components**: Components that appear on multiple pages (e.g. shared navbar, footer, buttons).
3. **Shared Sections**: Layout sections that repeat across pages (e.g. header, footer, CTA).

Focus on patterns that indicate a cohesive design system. Deduplicate similar colors (within a few hex digits). Group components by visual/functional similarity, not just name.`;

export async function synthesizeResults(
  results: CrawlResult[],
): Promise<SynthesizedResults> {
  // Cap at 20 pages to keep context manageable
  const capped = results.slice(0, 20);

  // Build a compact JSON summary for the AI
  const pageSummaries = capped.map((r) => ({
    url: r.url,
    colors: r.design.colorPalette.map((c) => ({ hex: c.hex, role: c.role, name: c.name })),
    components: r.components.components.map((c) => ({ name: c.name, category: c.category })),
    sections: r.layout.sections.map((s) => ({ type: s.type, name: s.name })),
  }));

  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    output: Output.object({ schema: SynthesisSchema }),
    prompt: `Analyze these ${capped.length} pages from the same website and identify cross-page design patterns.\n\n${JSON.stringify(pageSummaries, null, 2)}`,
  });

  if (!output) {
    return { globalColors: [], globalComponents: [], sharedSections: [] };
  }

  return output as SynthesizedResults;
}
