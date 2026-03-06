import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ComponentAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { extractCandidateComponents } from "./page-tools";
import { ComponentSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a UI component curator and recreator. You receive pre-extracted component candidates from a webpage. Your job is to:

1. Pick the TOP 3-5 most visually interesting and unique components
2. For each, create a STANDALONE recreation using Tailwind CSS

SELECTION RULES:
- Pick components that showcase the site's design craft
- SKIP generic elements: plain text links, basic divs with no styling, simple paragraphs
- Identify the component library origin (MUI, shadcn/ui, Chakra, Bootstrap, etc.) with SPECIFIC evidence
- Note variants if the candidates show multiple similar components with differences

RECREATION RULES for recreatedHtml:
- Write clean, self-contained HTML that uses ONLY Tailwind CSS classes for styling
- The recreation should visually match the original component's appearance (colors, spacing, typography, layout)
- Extract actual colors from the original CSS/classes and use them as Tailwind arbitrary values like bg-[#6366f1]
- Use inline SVGs for any icons (do NOT reference external icon files)
- For images, use https://placehold.co/ placeholder URLs (e.g. https://placehold.co/400x200/e2e8f0/64748b?text=Hero+Image)
- NO relative URLs, NO external dependencies, NO JavaScript
- The HTML must render correctly on its own inside a <body> tag with only Tailwind CSS loaded
- Match the original's border-radius, shadows, padding, gaps, and font sizes as closely as possible
- If the original uses specific fonts, add them via Tailwind arbitrary values

Quality over quantity. Only include components worth studying.`;

export async function analyzeComponents(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
  techStack?: TechStackDetection,
): Promise<ComponentAnalysis> {
  return withRetry(async () => {
    const candidates = extractCandidateComponents(toolkit);

    if (candidates.length === 0) {
      return { components: [] };
    }

    let techContext = "";
    if (techStack) {
      techContext = `\n\nDetected Tech Stack:\nFramework: ${techStack.framework?.name || "unknown"}\nCSS: ${techStack.cssFramework?.name || "unknown"}\nComponent Library: ${techStack.componentLibrary?.name || "unknown"}`;
    }

    // Include CSS variables for color/spacing reference
    const cssVars = toolkit.cssVariables.slice(0, 30).map((v) => `${v.name}: ${v.value}`).join("\n");
    const cssVarsBlock = cssVars ? `\n\n## CSS Variables (Design Tokens)\n${cssVars}` : "";

    const candidatesText = candidates.map((c, i) =>
      `### Candidate ${i + 1} (matched: ${c.selector})\nTag: ${c.tag} | Classes: ${c.classes}\nParent: <${c.parentTag} class="${c.parentClasses}"> (${c.siblingCount} children)\n\nHTML:\n${c.outerHtml}\n\nCSS Rules:\n${c.matchingCss || "(no matching CSS found in <style> tags)"}`
    ).join("\n\n---\n\n");

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: ComponentSchema }),
      prompt: `Pick the 3-5 best components from these ${candidates.length} candidates. For each, provide the original html/css AND a standalone Tailwind recreation in recreatedHtml.\n\n${overview}${techContext}${cssVarsBlock}\n\n## Component Candidates\n\n${candidatesText}`,
    });

    if (!output) throw new Error("No output generated");
    return output as ComponentAnalysis;
  });
}
