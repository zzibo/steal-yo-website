import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ContentAnalysis, ScrapedPage } from "../types";

const SYSTEM_PROMPT = `You are a content extraction agent. Given a webpage's markdown and metadata, extract all meaningful content organized by section.

Return ONLY valid JSON matching this schema:
{
  "sections": [{ "heading": "string", "text": "string" }],
  "images": [{ "src": "string", "alt": "string" }],
  "links": [{ "text": "string", "href": "string", "isExternal": "boolean" }],
  "meta": { "title": "string", "description": "string", "ogImage": "string or null" }
}`;

export async function analyzeContent(page: ScrapedPage): Promise<ContentAnalysis> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Extract all content from this page:\n\nURL: ${page.url}\nTitle: ${page.metadata.title ?? "unknown"}\nDescription: ${page.metadata.description ?? "none"}\n\nMarkdown:\n${page.markdown.slice(0, 20000)}\n\nImages found: ${JSON.stringify(page.images.slice(0, 20))}\nLinks found: ${JSON.stringify(page.links.slice(0, 30))}`,
  });

  const clean = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(clean);
}
