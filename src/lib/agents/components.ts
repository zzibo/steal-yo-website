import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ComponentAnalysis, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit } from "./page-tools";
import { extractCandidateComponents } from "./page-tools";
import { ComponentSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a UI component curator and recreator. You receive pre-extracted component candidates from a webpage. Your job is to:

1. Pick the TOP 5-8 most visually interesting and unique components
2. For each, create BOTH a standalone HTML recreation AND a React TSX component

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

REACT COMPONENT RULES for reactCode:
- Write a complete, copy-pasteable React TSX component
- Start with a TypeScript interface named {ComponentName}Props
- Use a named export: export function ComponentName({ ...props }: ComponentNameProps)
- All styling via Tailwind classes using the site's actual hex colors as arbitrary values (e.g. bg-[#6366f1], text-[#1a1a2e])
- Create typed props for ALL variable content:
  - Text content → string props with realistic default values from the original
  - Images → string props defaulting to placehold.co URLs
  - Click handlers → optional () => void props
  - Lists/arrays → string[] props with example defaults from the original
  - Variants → a variant prop with union type (e.g. variant?: "primary" | "secondary") if the component has visual variants, with conditional Tailwind classes
- Provide default values for ALL optional props via destructuring defaults
- Icons: use inline JSX SVG elements (NOT imported from a library)
- Do NOT include any import statements — the component will be added to a project that already has React
- The component name must be valid PascalCase (e.g. PricingCard, HeroSection, NavBar)
- The React component and the HTML recreation must render the SAME visual output

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
      `### Candidate ${i + 1} (source: ${c.selector}, score: ${c.score.toFixed(2)})\nTag: ${c.tag} | Classes: ${c.classes}\nMetrics: ${c.metrics.subtreeSize} descendants, ${c.metrics.contentLength} chars, ${c.metrics.interactiveCount} interactive elements, ${c.metrics.childDiversity} unique child tags, depth ${c.metrics.depth}\nParent: <${c.parentTag} class="${c.parentClasses}"> (${c.siblingCount} children)\n\nHTML:\n${c.outerHtml}\n\nCSS Rules:\n${c.matchingCss || "(no matching CSS found in <style> tags)"}`
    ).join("\n\n---\n\n");

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: ComponentSchema }),
      messages: [{
        role: "user",
        content: [
          ...(page.screenshot ? [{
            type: "image" as const,
            image: page.screenshot.startsWith("data:")
              ? page.screenshot
              : `data:image/png;base64,${page.screenshot}`,
          }] : []),
          {
            type: "text" as const,
            text: `Pick the 5-8 best components from these ${candidates.length} candidates. For each, provide:
1. The original html/css
2. A standalone Tailwind HTML recreation in recreatedHtml
3. A typed React TSX component in reactCode

${overview}${techContext}${cssVarsBlock}

## Component Candidates

${candidatesText}`,
          },
        ],
      }],
    });

    if (!output) throw new Error("No output generated");

    // Validate TSX syntax and attempt one-shot repair on failures
    const { parseSync } = await import("@swc/core");
    for (const comp of (output as ComponentAnalysis).components) {
      if (!comp.reactCode) continue;
      try {
        parseSync(comp.reactCode, { syntax: "typescript", tsx: true });
      } catch (parseError) {
        const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
        try {
          const { output: fixed } = await generateText({
            model: anthropic("claude-sonnet-4-5-20250929"),
            output: Output.object({ schema: z.object({ reactCode: z.string() }) }),
            prompt: `Fix this React TSX component. It has a syntax error.\n\nError: ${errMsg}\n\nCode:\n${comp.reactCode}\n\nReturn the fixed code only.`,
          });
          if (fixed?.reactCode) comp.reactCode = fixed.reactCode;
        } catch { /* keep original if repair fails */ }
      }
    }

    return output as ComponentAnalysis;
  });
}
