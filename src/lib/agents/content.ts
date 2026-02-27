import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ContentAnalysis, ScrapedPage } from "../types";
import type { PageToolkit } from "./page-tools";
import { contentTools } from "./page-tools";
import { ContentSchema } from "./schemas";
import { withRetry } from "./utils";

const SYSTEM_PROMPT = `You are a content extraction agent. Extract all meaningful content from a webpage organized by section.

You have tools to inspect the page:
- get_heading_hierarchy: See the H1-H6 content outline
- get_schema_org: Get JSON-LD structured data (articles, products, organizations)
- get_meta_tags: Get all meta tags (title, description, OG image, author, etc.)
- get_form_fields: Find form inputs, textareas, buttons with labels

Use these tools to understand the page's content structure. Combine tool results with the provided markdown content.

Extract:
- Text sections organized by heading
- Images with src and alt text
- Links with text, href, and whether they're external
- Meta information (title, description, OG image)`;

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
      stopWhen: stepCountIs(4),
      prompt: `Extract all content from this page. Use the tools to get headings, structured data, and metadata.\n\n${overview}\n\nMarkdown content:\n${page.markdown.slice(0, 15000)}\n\nImages found: ${JSON.stringify(page.images.slice(0, 20))}\nLinks found: ${JSON.stringify(page.links.slice(0, 30))}`,
    });

    if (!output) throw new Error("No output generated");
    return output as ContentAnalysis;
  });
}
