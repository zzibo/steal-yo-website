import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LayoutAnalysis, ScrapedPage } from "../types";

const SYSTEM_PROMPT = `You are a layout analysis agent. Given a webpage's HTML, identify all major sections and their layout methods.

Return ONLY valid JSON matching this schema:
{
  "sections": [
    {
      "name": "string",
      "type": "header|hero|features|content|cta|footer|sidebar|navigation|other",
      "layoutMethod": "grid|flex|stack|float|other",
      "description": "string (1-2 sentences)",
      "htmlSnippet": "string (outer HTML tag with classes only)"
    }
  ],
  "responsiveBreakpoints": ["string"],
  "navigationStructure": [{ "label": "string", "href": "string" }]
}`;

export async function analyzeLayout(page: ScrapedPage): Promise<LayoutAnalysis> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Analyze the layout of this page:\n\nURL: ${page.url}\n\nHTML:\n${page.html.slice(0, 15000)}`,
  });

  return JSON.parse(text);
}
