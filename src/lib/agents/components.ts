import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ComponentAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { extractCandidateComponents } from "./page-tools";
import { ComponentSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a UI component curator. You receive pre-extracted component candidates from a webpage. Your job is to pick the TOP 3-5 most visually interesting and unique components.

RULES:
- Pick components that showcase the site's design craft
- SKIP generic elements: plain text links, basic divs with no styling, simple paragraphs
- For each picked component, use the ACTUAL HTML and CSS provided — do not invent
- Identify the component library origin (MUI, shadcn/ui, Chakra, Bootstrap, etc.) with SPECIFIC evidence from class names or data attributes
- Write a brief description of what makes each component interesting
- Note variants if the candidates show multiple similar components with differences

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

    const candidatesText = candidates.map((c, i) =>
      `### Candidate ${i + 1} (matched: ${c.selector})\nTag: ${c.tag} | Classes: ${c.classes}\nParent: <${c.parentTag} class="${c.parentClasses}"> (${c.siblingCount} children)\n\nHTML:\n${c.outerHtml}\n\nCSS Rules:\n${c.matchingCss || "(no matching CSS found in <style> tags)"}`
    ).join("\n\n---\n\n");

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: ComponentSchema }),
      prompt: `Pick the 3-5 best components from these ${candidates.length} candidates.\n\n${overview}${techContext}\n\n## Component Candidates\n\n${candidatesText}`,
    });

    if (!output) throw new Error("No output generated");
    return output as ComponentAnalysis;
  });
}
