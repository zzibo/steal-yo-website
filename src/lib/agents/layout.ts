import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
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

    const landmarks = JSON.stringify(toolkit.landmarkSections.slice(0, 20), null, 2);
    const headings = JSON.stringify(toolkit.headingHierarchy.slice(0, 30), null, 2);
    const mediaQueries = JSON.stringify(toolkit.mediaQueries.slice(0, 15), null, 2);

    const structuralTags = new Set(["header", "main", "footer", "nav", "aside", "section", "article"]);
    type SectionNode = { tag: string; classes: string; id?: string; children: SectionNode[] };
    const buildTree = (parent: Cheerio<AnyNode>): SectionNode[] => {
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
      model: anthropic("claude-haiku-4-5-20251001"),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: LayoutSchema }),
      prompt: `Analyze the layout of this page using the pre-extracted data below.\n\n${overview}${techInfo}\n\n## Landmark Sections\n${landmarks}\n\n## Heading Hierarchy\n${headings}\n\n## Section Hierarchy (parent-child nesting)\n${sectionHierarchy}\n\n## Media Queries / Breakpoints\n${mediaQueries}`,
    });

    if (!output) throw new Error("No output generated");
    return output as LayoutAnalysis;
  });
}
