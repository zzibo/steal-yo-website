import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ComponentAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { componentTools } from "./page-tools";
import { ComponentSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a UI component extraction agent. Find and extract RENDERABLE, SELF-CONTAINED UI components from a webpage.

Available Tools:
- query_elements: Find elements by CSS selector (returns outer HTML)
- get_css_variables: Get all CSS custom properties (design tokens)
- get_stylesheet_rules: Search CSS rules by pattern
- get_element_context: See an element's parent and siblings
- check_external_stylesheets: Check if external CSS libraries are loaded

STRATEGY:
1. Use query_elements to find common patterns: button, [class*=btn], [class*=card], form, nav, [class*=hero], footer, input, [class*=modal]
2. Use get_stylesheet_rules to find CSS for each component class
3. Use get_css_variables to resolve design tokens referenced in CSS
4. Use check_external_stylesheets to identify library dependencies

For each component:
- Extract ACTUAL HTML from the page (do not invent)
- Extract relevant CSS rules (include pseudo-class rules like :hover)
- Identify variants (sizes, colors, states)
- Detect library origin by analyzing:
  * MUI: .MuiButton-root, .MuiPaper-elevation, data-testid="mui-*"
  * shadcn/ui: data-radix-*, data-state="open|closed"
  * Chakra: .chakra-button, CSS vars --chakra-*
  * Ant Design: .ant-btn, .ant-card
  * Bootstrap: .btn, .btn-primary, .card
- Attribution needs SPECIFIC evidence (class names, data attributes found)

IMPORTANT: Include complete CSS needed to render each component. If a component uses CSS variables, include the variable declarations too.`;

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
      stopWhen: stepCountIs(7),
      prompt: `Extract all reusable UI components from this page. Use the tools to query for elements and inspect their CSS.\n\n${overview}${techContext}`,
    });

    if (!output) throw new Error("No output generated");
    return output as ComponentAnalysis;
  });
}
