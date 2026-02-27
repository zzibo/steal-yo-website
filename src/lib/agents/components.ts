import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ComponentAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { componentTools } from "./page-tools";
import { ComponentSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a UI component extraction agent. Find and extract all reusable UI components from a webpage.

You have tools to inspect the page:
- query_elements: Find elements by CSS selector (buttons, cards, inputs, etc.)
- get_css_variables: Get design token CSS variables
- get_stylesheet_rules: Search CSS rules by pattern
- get_element_context: See an element's parent and siblings for context

Strategy:
1. Use query_elements to find common component patterns (button, [class*=btn], [class*=card], form, nav, [class*=hero], footer)
2. Use get_stylesheet_rules to find the CSS for each component
3. Use get_css_variables to resolve any design tokens
4. Use get_element_context if you need to understand component composition

For each component:
- Extract the ACTUAL HTML from the page (do not invent)
- Extract relevant CSS rules
- Identify variants (different sizes, colors, states)
- Detect if it comes from a known library (MUI, shadcn/ui, Chakra, Ant Design, Radix, Headless UI) by analyzing class patterns, data attributes, and CSS variable naming conventions
- Provide attribution with confidence and reasoning`;

export async function analyzeComponents(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
  techStack?: TechStackDetection,
): Promise<ComponentAnalysis> {
  return withRetry(async () => {
    let techContext = "";
    if (techStack) {
      techContext = `\n\nDetected Tech Stack:\nFramework: ${techStack.framework?.name || "unknown"}\nCSS: ${techStack.cssFramework?.name || "unknown"}\nComponent Library: ${techStack.componentLibrary?.name || "unknown"}`;
    }

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      tools: componentTools(toolkit),
      output: Output.object({ schema: ComponentSchema }),
      stopWhen: stepCountIs(5),
      prompt: `Extract all reusable UI components from this page. Use the tools to query for elements and inspect their CSS.\n\n${overview}${techContext}`,
    });

    if (!output) throw new Error("No output generated");
    return output as ComponentAnalysis;
  });
}
