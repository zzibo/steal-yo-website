import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { DesignAnalysis, ScrapedPage } from "../types";

const SYSTEM_PROMPT = `You are a design token extraction agent. Given a webpage's HTML and branding data, extract the complete design system.

Return ONLY valid JSON matching this schema:
{
  "colors": [{ "name": "string", "hex": "string", "usage": "string" }],
  "typography": {
    "fontFamilies": ["string"],
    "scale": [{ "name": "string", "size": "string", "weight": "string", "lineHeight": "string" }]
  },
  "spacing": ["string"],
  "borderRadius": ["string"],
  "shadows": ["string"]
}

Extract actual values from the CSS/HTML. Do not invent values.`;

export async function analyzeDesign(page: ScrapedPage): Promise<DesignAnalysis> {
  let brandingContext = "";
  if (page.branding) {
    brandingContext = `\n\nBranding data from Firecrawl:\nColors: ${JSON.stringify(page.branding.colors)}\nFonts: ${JSON.stringify(page.branding.fonts)}`;
  }

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Extract the design system from this page:\n\nURL: ${page.url}${brandingContext}\n\nHTML:\n${page.rawHtml.slice(0, 20000)}`,
  });

  return JSON.parse(text);
}
