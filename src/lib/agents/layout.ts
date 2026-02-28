import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LayoutAnalysis, ScrapedPage } from "../types";
import type { PageToolkit } from "./page-tools";
import { layoutTools } from "./page-tools";
import { LayoutSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a layout analysis agent. Analyze a webpage's SPATIAL STRUCTURE — not just what sections exist, but how they are positioned relative to each other.

Available Tools:
- get_landmark_sections: Find header, main, footer, nav, aside, section, article elements
- get_media_queries: Find CSS responsive breakpoints
- get_heading_hierarchy: See the H1-H6 content outline
- query_elements: Query specific CSS selectors to inspect elements
- get_section_hierarchy: Get the full parent-child nesting tree of structural elements

STRATEGY:
1. Use get_section_hierarchy to understand nesting (e.g., sidebar INSIDE main, or NEXT TO main?)
2. Use get_landmark_sections for top-level elements
3. Use query_elements to inspect specific containers for layout CSS classes (grid, flex, columns)
4. Use get_media_queries to identify responsive breakpoints

For each section identify:
- Purpose: header, hero, features, content, CTA, footer, sidebar, navigation, other
- Layout method: grid (CSS Grid), flex (Flexbox row), stack (vertical/block), float, other
- A brief description of what the section contains
- The outer HTML tag with its key classes

IMPORTANT: Capture layout relationships. If a page has a sidebar + main content area, that's a grid/flex parent with two children. If features are in a 3-column grid, note the column structure.`;

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

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      tools: layoutTools(toolkit),
      output: Output.object({ schema: LayoutSchema }),
      stopWhen: stepCountIs(6),
      prompt: `Analyze the layout of this page. Use the available tools to inspect landmarks, headings, and specific elements.\n\n${overview}${techInfo}`,
    });

    if (!output) throw new Error("No output generated");
    return output as LayoutAnalysis;
  });
}
