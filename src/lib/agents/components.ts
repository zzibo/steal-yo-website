import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ComponentAnalysis, ScrapedPage } from "../types";

const SYSTEM_PROMPT = `You are a UI component extraction agent. Given a webpage's HTML, identify all reusable UI components.

For each component, extract its HTML and inline/relevant CSS. Focus on: buttons, cards, inputs, modals, navbars, heroes, footers, forms, badges.

Return ONLY valid JSON matching this schema:
{
  "components": [
    {
      "name": "string",
      "category": "button|card|input|modal|navbar|hero|footer|form|badge|other",
      "html": "string (complete HTML of the component)",
      "css": "string (relevant CSS rules)",
      "variants": ["string"],
      "description": "string (1 sentence)"
    }
  ]
}

Extract the ACTUAL HTML and CSS from the page. Do not invent or embellish.`;

export async function analyzeComponents(page: ScrapedPage): Promise<ComponentAnalysis> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Extract all reusable UI components from this page:\n\nURL: ${page.url}\n\nHTML:\n${page.rawHtml.slice(0, 30000)}`,
  });

  const clean = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(clean);
}
