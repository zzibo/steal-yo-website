import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ComponentAnalysis, ExtractedComponent, ScrapedPage, TechStackDetection } from "../types";
import type { PageToolkit, ComponentCandidate } from "./page-tools";
import { extractCandidateComponents } from "./page-tools";
import { ComponentSelectionSchema, SingleComponentSchema } from "./schemas";
import { withRetry } from "./utils";

// ── Phase 1: Selection prompt (Haiku) ─────────────────────────────

const SELECTION_PROMPT = `You are a UI component curator. You receive a list of pre-extracted component candidates from a webpage with their scores and metrics. Your job is to pick the TOP 5 most visually interesting and unique components worth recreating.

SELECTION RULES:
- Pick components that showcase the site's design craft
- SKIP generic elements: plain text links, basic divs with no styling, simple paragraphs, navbars with only text links
- Prefer components with high subtree richness, interactive elements, and diverse child structures
- Pick a MIX of component types (don't pick 5 cards — pick a hero, a card, a CTA, etc.)
- If fewer than 5 candidates are worth recreating, select fewer

Return the 0-based indices of the candidates you've selected.`;

// ── Phase 2: Generation prompt (Sonnet) ───────────────────────────

const GENERATION_PROMPT = `You are a UI component recreator. You receive ONE component from a webpage. Your job is to:
1. Identify what kind of component it is
2. Create a standalone HTML recreation using Tailwind CSS
3. Create a typed React TSX component

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

Quality over quantity.`;

export async function analyzeComponents(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
  techStack?: TechStackDetection,
): Promise<ComponentAnalysis> {
  return withRetry(async () => {
    const candidates = extractCandidateComponents(toolkit);
    console.log(`[components] ${candidates.length} candidates extracted, screenshot: ${!!page.screenshot}`);

    if (candidates.length === 0) {
      console.log(`[components] no candidates found, skipping`);
      return { components: [] };
    }

    // ── Phase 1: Selection (Haiku) ──────────────────────────────────
    console.log(`[components] Phase 1: selecting top candidates with Haiku...`);
    const selectionStart = Date.now();

    const candidateSummaries = candidates.map((c, i) =>
      `${i}. [${c.tag}] score=${c.score.toFixed(2)} | ${c.metrics.subtreeSize} descendants, ${c.metrics.contentLength} chars, ${c.metrics.interactiveCount} interactive, ${c.metrics.childDiversity} child types, depth ${c.metrics.depth} | source: ${c.selector} | classes: ${c.classes.slice(0, 100)} | html preview: ${c.outerHtml.slice(0, 200)}...`
    ).join("\n");

    let selectedIndices: number[];

    if (candidates.length <= 5) {
      // Skip selection phase if we have 5 or fewer candidates
      selectedIndices = candidates.map((_, i) => i);
      console.log(`[components] skipping selection (only ${candidates.length} candidates)`);
    } else {
      const { output: selection } = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        system: SELECTION_PROMPT,
        output: Output.object({ schema: ComponentSelectionSchema }),
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
              text: `Select the best components from these ${candidates.length} candidates:\n\n${candidateSummaries}`,
            },
          ],
        }],
      });

      if (!selection || !selection.selections.length) {
        throw new Error("No selections returned from Phase 1");
      }

      selectedIndices = selection.selections
        .map(s => s.index)
        .filter(i => i >= 0 && i < candidates.length);

      console.log(`[components] Phase 1 done in ${((Date.now() - selectionStart) / 1000).toFixed(1)}s — selected indices: [${selectedIndices.join(", ")}]`);
    }

    // ── Phase 2: Parallel generation (Sonnet) ───────────────────────
    const selectedCandidates = selectedIndices.map(i => candidates[i]);
    console.log(`[components] Phase 2: generating ${selectedCandidates.length} components in parallel with Sonnet...`);
    const genStart = Date.now();

    let techContext = "";
    if (techStack) {
      techContext = `\n\nDetected Tech Stack:\nFramework: ${techStack.framework?.name || "unknown"}\nCSS: ${techStack.cssFramework?.name || "unknown"}\nComponent Library: ${techStack.componentLibrary?.name || "unknown"}`;
    }

    const cssVars = toolkit.cssVariables.slice(0, 30).map((v) => `${v.name}: ${v.value}`).join("\n");
    const cssVarsBlock = cssVars ? `\n\n## CSS Variables (Design Tokens)\n${cssVars}` : "";

    const generationPromises = selectedCandidates.map((candidate, idx) => {
      const candidateText = `Tag: ${candidate.tag} | Classes: ${candidate.classes}\nMetrics: ${candidate.metrics.subtreeSize} descendants, ${candidate.metrics.contentLength} chars, ${candidate.metrics.interactiveCount} interactive elements, ${candidate.metrics.childDiversity} unique child tags, depth ${candidate.metrics.depth}\nParent: <${candidate.parentTag} class="${candidate.parentClasses}"> (${candidate.siblingCount} children)\n\nHTML:\n${candidate.outerHtml}\n\nCSS Rules:\n${candidate.matchingCss || "(no matching CSS found in <style> tags)"}`;

      return generateText({
        model: anthropic("claude-sonnet-4-5-20250929"),
        system: GENERATION_PROMPT,
        output: Output.object({ schema: SingleComponentSchema }),
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
              text: `Recreate this component as Tailwind HTML and a typed React TSX component.\n\n${overview}${techContext}${cssVarsBlock}\n\n## Component\n\n${candidateText}`,
            },
          ],
        }],
      }).then(({ output }) => {
        console.log(`[components] generated component ${idx + 1}/${selectedCandidates.length}: ${output?.name || "?"} in ${((Date.now() - genStart) / 1000).toFixed(1)}s`);
        return output;
      }).catch(err => {
        console.log(`[components] failed to generate component ${idx + 1}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      });
    });

    const results = await Promise.allSettled(generationPromises);
    console.log(`[components] Phase 2 done in ${((Date.now() - genStart) / 1000).toFixed(1)}s`);

    // ── Post-processing: validate TSX ─────────────────────────────
    const components: ExtractedComponent[] = [];
    const { parseSync } = await import("@swc/core");

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const comp = result.value;

      let tsxValid = true;
      if (comp.reactCode) {
        try {
          parseSync(comp.reactCode, { syntax: "typescript", tsx: true });
        } catch (parseError) {
          const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
          console.log(`[components] TSX invalid in ${comp.name}: ${errMsg.slice(0, 100)}`);
          tsxValid = false;
        }
      }

      components.push({
        name: comp.name,
        category: comp.category,
        html: comp.html,
        css: comp.css,
        recreatedHtml: comp.recreatedHtml,
        reactCode: comp.reactCode,
        tsxValid,
        variants: comp.variants,
        description: comp.description,
        attribution: comp.attribution ?? undefined,
      });
    }

    const totalTime = ((Date.now() - selectionStart) / 1000).toFixed(1);
    console.log(`[components] done — ${components.length} components (${components.filter(c => c.tsxValid).length} valid TSX) in ${totalTime}s total`);

    return { components };
  });
}
