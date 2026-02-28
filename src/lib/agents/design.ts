import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { DesignAnalysis, ScrapedPage } from "../types";
import type { PageToolkit } from "./page-tools";
import { designTools } from "./page-tools";
import { DesignSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a design token extraction agent. Extract a PRACTICAL, SEMANTIC design system from a webpage.

Available Tools:
- get_css_variables: Get all CSS custom properties (design tokens)
- get_all_colors: Get every unique color value found in the page
- get_font_declarations: Get @font-face rules, Google Fonts links, and font-family usage
- get_spacing_and_radii: Get padding/margin/gap values and border-radius with frequency counts
- analyze_color_usage: See which colors are used for backgrounds, text, and borders with counts
- analyze_typography_usage: Get actual font sizes used on headings and body text

STRATEGY:
1. Color Palette — use DESCRIPTIVE names based on usage:
   - Use analyze_color_usage to understand each color's role
   - Name by function: "Background", "Heading Text", "Brand Blue", "Button BG", "Border Light"
   - Do NOT use generic "primary"/"secondary" unless those are actual CSS variable names
   - Include usage context: "Used for page background", "Used in buttons and links"

2. Typography — FROM ACTUAL USAGE:
   - Use analyze_typography_usage to see real font sizes on H1, H2, body, etc.
   - Build scale from actual usage, not just declarations
   - Name semantically: "Heading 1 / Hero", "Body / Default", "Caption / Small"

3. Spacing — sorted by frequency:
   - Use get_spacing_and_radii for frequency counts
   - Report most-used values first

4. Shadows — name by elevation:
   - "Shadow SM", "Shadow MD", "Shadow LG"

Every color must have a descriptive name and usage context. Spacing sorted by frequency.`;

export async function analyzeDesign(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
  techContext?: { framework?: string; css?: string; componentLibrary?: string },
): Promise<DesignAnalysis> {
  return withRetry(async () => {
    let techInfo = "";
    if (techContext) {
      const parts = [];
      if (techContext.framework) parts.push(`Framework: ${techContext.framework}`);
      if (techContext.css) parts.push(`CSS: ${techContext.css}`);
      if (techContext.componentLibrary) parts.push(`Components: ${techContext.componentLibrary}`);
      if (parts.length) techInfo = `\n\nDetected Tech Stack:\n${parts.join("\n")}`;
    }

    let brandingContext = "";
    if (page.branding) {
      brandingContext = `\n\nBranding data from Firecrawl:\nColors: ${JSON.stringify(page.branding.colors)}\nFonts: ${JSON.stringify(page.branding.fonts)}`;
    }

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      tools: designTools(toolkit),
      output: Output.object({ schema: DesignSchema }),
      stopWhen: stepCountIs(4),
      prompt: `Extract the design system from this page. Use the tools to get CSS variables, colors, fonts, and spacing.\n\n${overview}${techInfo}${brandingContext}`,
    });

    if (!output) throw new Error("No output generated");
    return output as DesignAnalysis;
  });
}
