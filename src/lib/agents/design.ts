import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { DesignAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { DesignSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a UI design analyst. Given pre-extracted design data from a webpage, produce a structured design analysis.

Use professional design terminology:
- Style classification: neo-brutalist, glassmorphism, minimalist, corporate-clean, editorial, neumorphism, flat, material, skeuomorphic, retro, playful, dark-luxe, etc.
- Typography styles: geometric sans-serif, humanist sans-serif, transitional serif, slab serif, monospace, display/decorative, handwritten
- Color roles: identify which colors serve as primary, secondary, accent, background, surface, text, muted, border

RULES:
- Use the ACTUAL hex values from the data — do not invent colors
- Use the ACTUAL font families from the data — do not invent fonts
- Keep the summary to 2-3 sentences max — think design brief, not essay
- For spacing, infer the system from the spacing values provided
- For effects, infer from border-radius values and any animation/transition CSS`;

export async function analyzeDesign(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
  techStack?: TechStackDetection,
): Promise<DesignAnalysis> {
  return withRetry(async () => {
    let techContext = "";
    if (techStack) {
      const parts = [];
      if (techStack.framework?.name) parts.push(`Framework: ${techStack.framework.name}`);
      if (techStack.cssFramework?.name) parts.push(`CSS: ${techStack.cssFramework.name}`);
      if (techStack.componentLibrary?.name) parts.push(`Components: ${techStack.componentLibrary.name}`);
      if (parts.length) techContext = `\n\nDetected Tech Stack:\n${parts.join("\n")}`;
    }

    const colors = JSON.stringify(toolkit.allColors.slice(0, 50));
    const cssVars = JSON.stringify(toolkit.cssVariables.slice(0, 60), null, 2);
    const fonts = JSON.stringify(toolkit.fontDeclarations, null, 2);
    const spacing = JSON.stringify(toolkit.spacingValues.slice(0, 20), null, 2);
    const borderRadius = JSON.stringify(toolkit.borderRadiusValues.slice(0, 10), null, 2);

    const markdownSnippet = page.markdown.slice(0, 3000);

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: DesignSchema }),
      prompt: `Analyze the design system of this website.\n\n${overview}${techContext}\n\n## Colors Found\n${colors}\n\n## CSS Variables (Design Tokens)\n${cssVars}\n\n## Font Declarations\n${fonts}\n\n## Spacing Values (by frequency)\n${spacing}\n\n## Border Radius Values\n${borderRadius}\n\n## Content Preview\n${markdownSnippet}`,
    });

    if (!output) throw new Error("No output generated");
    return output as DesignAnalysis;
  });
}
