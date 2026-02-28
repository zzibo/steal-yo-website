import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ContentAnalysis, ScrapedPage } from "../types";
import type { PageToolkit } from "./page-tools";
import { contentTools } from "./page-tools";
import { ContentSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a content extraction agent. Extract ALL meaningful content from a webpage, organized by section.

Available Tools:
- get_heading_hierarchy: See the H1-H6 content outline
- get_schema_org: Get JSON-LD structured data (articles, products, organizations)
- get_meta_tags: Get all meta tags (title, description, OG image, author)
- get_form_fields: Find form inputs, textareas, buttons with labels
- query_ctas: Find all call-to-action buttons and prominent action links

STRATEGY:
1. Use get_heading_hierarchy to understand section boundaries
2. Map the markdown content to sections by heading
3. Use query_ctas to identify calls-to-action and their placement
4. Use get_schema_org to enrich content with structured data
5. Use get_meta_tags for page metadata

For each section:
- Extract heading and body text
- Include relevant images (convert relative URLs to absolute using the page URL)
- Identify internal vs external links

For meta:
- Extract title, description, OG image
- Extract author and dates if available from meta tags or schema.org

IMPORTANT: Convert all relative image URLs to absolute URLs using the page's base URL.`;

export async function analyzeContent(
  page: ScrapedPage,
  toolkit: PageToolkit,
  overview: string,
): Promise<ContentAnalysis> {
  return withRetry(async () => {
    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: SYSTEM_PROMPT,
      tools: contentTools(toolkit),
      output: Output.object({ schema: ContentSchema }),
      stopWhen: stepCountIs(5),
      prompt: `Extract all content from this page. Use the tools to get headings, structured data, metadata, and CTAs.\n\nPage URL: ${page.url}\nIMPORTANT: Convert all relative image URLs to absolute URLs using this base URL.\n\n${overview}\n\nMarkdown content:\n${page.markdown.slice(0, 15000)}\n\nImages found: ${JSON.stringify(page.images.slice(0, 20))}\nLinks found: ${JSON.stringify(page.links.slice(0, 30))}`,
    });

    if (!output) throw new Error("No output generated");
    return output as ContentAnalysis;
  });
}
