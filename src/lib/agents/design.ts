import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { DesignAnalysis, ScrapedPage } from "../types";
import type { PageToolkit } from "./page-tools";
import { designTools } from "./page-tools";
import { DesignSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a design token extraction agent. Extract the complete design system from a webpage.

You have tools to inspect the page:
- get_css_variables: Get all CSS custom properties (design tokens like --color-primary, --font-size-lg)
- get_all_colors: Get every unique color value found in the page
- get_font_declarations: Get @font-face rules, Google Fonts links, and font-family usage
- get_spacing_and_radii: Get padding/margin/gap values and border-radius values with frequency counts

Use these tools to extract ACTUAL values from the page. Do not guess.

Extract:
- Color palette with descriptive names, hex values, and usage context
- Typography: font families and the complete type scale (name, size, weight, line height)
- Spacing system: common spacing values used
- Border radius values
- Box shadow definitions`;

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
