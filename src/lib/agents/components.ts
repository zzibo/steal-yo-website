import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ComponentAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { componentTools } from "./page-tools";
import { ComponentSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a UI component extraction agent. Find the TOP 3-5 most visually interesting and unique components on a webpage.

Available Tools:
- query_elements: Find elements by CSS selector (returns outer HTML)
- get_css_variables: Get all CSS custom properties (design tokens)
- get_stylesheet_rules: Search CSS rules by pattern
- get_element_context: See an element's parent and siblings
- check_external_stylesheets: Check if external CSS libraries are loaded

STRATEGY:
1. Survey the page for standout components — hero sections, feature cards, pricing tables, testimonials, unique navigation patterns
2. SKIP generic elements: simple buttons, plain text links, basic inputs, standard badges
3. Pick the 3-5 components that best showcase the site's design craft
4. For each, extract actual HTML + complete CSS (including :hover, CSS variables)

For each component:
- Extract ACTUAL HTML from the page (do not invent)
- Extract relevant CSS rules (include pseudo-class rules like :hover)
- Identify variants if they exist
- Detect library origin (MUI, shadcn/ui, Chakra, Ant Design, Bootstrap) with SPECIFIC evidence

Quality over quantity. Only extract components worth studying.`;

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
      prompt: `Find the 3-5 most visually impressive and unique components on this page. Skip generic elements like plain buttons or simple inputs — focus on components that showcase real design craft.\n\n${overview}${techContext}`,
    });

    if (!output) throw new Error("No output generated");
    return output as ComponentAnalysis;
  });
}
