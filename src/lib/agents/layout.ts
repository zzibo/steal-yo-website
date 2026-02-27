import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LayoutAnalysis, ScrapedPage } from "../types";
import type { PageToolkit } from "./page-tools";
import { layoutTools } from "./page-tools";
import { LayoutSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a layout analysis agent. Analyze a webpage's structure to identify all major sections and their layout methods.

You have tools to inspect the page:
- get_landmark_sections: Find header, main, footer, nav, aside, section, article elements
- get_media_queries: Find CSS responsive breakpoints
- get_heading_hierarchy: See the H1-H6 content outline
- query_elements: Query specific CSS selectors to inspect sections

Use these tools to understand the actual page structure. Do not guess — inspect the DOM.

For each section, identify:
- Its purpose (header, hero, features, content, CTA, footer, sidebar, navigation, other)
- The CSS layout method used (grid, flex, stack, float, other)
- A brief description
- A short HTML snippet (the outer tag with classes)`;

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
      stopWhen: stepCountIs(4),
      prompt: `Analyze the layout of this page. Use the available tools to inspect landmarks, headings, and specific elements.\n\n${overview}${techInfo}`,
    });

    if (!output) throw new Error("No output generated");
    return output as LayoutAnalysis;
  });
}
