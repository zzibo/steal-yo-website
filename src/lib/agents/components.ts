import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ComponentAnalysis, ScrapedPage, TechStackDetection } from "../types";

const SYSTEM_PROMPT = `You are a UI component extraction agent. Given a webpage's HTML and detected tech stack, identify all reusable UI components.

For each component, extract its HTML and inline/relevant CSS. Focus on: buttons, cards, inputs, modals, navbars, heroes, footers, forms, badges.

IMPORTANT: Detect if components come from known libraries by analyzing:
- Class name patterns (e.g., "MuiButton-root", "ant-btn", "chakra-button")
- Data attributes (e.g., "data-state", "data-radix-", "data-headlessui-")
- HTML structure patterns matching known library documentation
- CSS variable naming conventions (e.g., "--chakra-", "--radius", "--primary")

Example output:
{
  "components": [
    {
      "name": "Primary CTA Button",
      "category": "button",
      "html": "<button class=\\"btn-primary\\">Get Started</button>",
      "css": ".btn-primary { background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; }",
      "variants": ["primary", "large"],
      "description": "Main call-to-action button with rounded corners and purple background.",
      "attribution": { "library": null, "confidence": "high", "reasoning": "Custom component with no known library patterns" }
    }
  ]
}

Return ONLY valid JSON matching this schema. Extract the ACTUAL HTML and CSS from the page. Do not invent or embellish.`;

export async function analyzeComponents(
  page: ScrapedPage,
  techStack?: TechStackDetection
): Promise<ComponentAnalysis> {
  let techContext = "";
  if (techStack) {
    techContext = `\n\nDetected Tech Stack:\nFramework: ${techStack.framework?.name || "unknown"}\nCSS: ${techStack.cssFramework?.name || "unknown"}\nComponent Library: ${techStack.componentLibrary?.name || "unknown"}`;
  }

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Extract all reusable UI components from this page:\n\nURL: ${page.url}${techContext}\n\nHTML:\n${page.rawHtml.slice(0, 30000)}`,
  });

  const clean = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(clean);
}
