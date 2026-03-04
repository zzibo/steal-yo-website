import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { VibeAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { vibeTools } from "./page-tools";
import { VibeSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a design philosophy agent. Your job is to capture the VIBE of a website — its mood, aesthetic, and design personality — in a prompt-ready prose description.

Available Tools:
- get_css_variables: See design token naming philosophy
- get_all_colors: See the full color palette
- get_font_declarations: See typography choices
- get_heading_hierarchy: Understand content voice and structure
- get_meta_tags: How the site describes itself

STRATEGY:
1. Call the tools to gather design signals
2. Write a 2-4 paragraph prose description covering:
   - Overall mood and energy (minimal? bold? playful? corporate? editorial?)
   - Color philosophy (dark mode? muted earth tones? vibrant gradients? monochrome with accent?)
   - Typography feel (geometric sans? humanist? monospace? serif editorial?)
   - Spacing and density (breathable? compact? generous whitespace?)
   - Content voice (terse? conversational? formal? playful?)
   - Design philosophy (what makes this site distinctive?)

Write it as if briefing a designer: "Recreate a site that feels like..."
Do NOT list CSS values. Do NOT use bullet points. Write flowing prose.
The description should be vivid enough that someone could recreate the feel without seeing the original.`;

export async function analyzeVibe(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
  techStack?: TechStackDetection,
): Promise<VibeAnalysis> {
  return withRetry(async () => {
    let techContext = "";
    if (techStack) {
      const parts = [];
      if (techStack.framework?.name) parts.push(`Framework: ${techStack.framework.name}`);
      if (techStack.cssFramework?.name) parts.push(`CSS: ${techStack.cssFramework.name}`);
      if (techStack.componentLibrary?.name) parts.push(`Components: ${techStack.componentLibrary.name}`);
      if (parts.length) techContext = `\n\nDetected Tech Stack:\n${parts.join("\n")}`;
    }

    let brandingContext = "";
    if (page.branding) {
      brandingContext = `\n\nBranding data:\nColors: ${JSON.stringify(page.branding.colors)}\nFonts: ${JSON.stringify(page.branding.fonts)}`;
    }

    const markdownSnippet = page.markdown.slice(0, 5000);

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      tools: vibeTools(toolkit),
      output: Output.object({ schema: VibeSchema }),
      stopWhen: stepCountIs(3),
      prompt: `Capture the design vibe of this website. Use the tools to understand the design tokens, then write a vivid prose description of the site's aesthetic.\n\n${overview}${techContext}${brandingContext}\n\nContent preview:\n${markdownSnippet}`,
    });

    if (!output) throw new Error("No output generated");
    return output as VibeAnalysis;
  });
}
