import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeDesign } from "./design";
import { analyzeContent } from "./content";
import type { ScrapedPage, CrawlResult } from "../types";

export async function analyzePage(page: ScrapedPage): Promise<CrawlResult> {
  const [layout, components, design, content] = await Promise.all([
    analyzeLayout(page),
    analyzeComponents(page),
    analyzeDesign(page),
    analyzeContent(page),
  ]);

  return {
    url: page.url,
    screenshot: page.screenshot,
    layout,
    components,
    design,
    content,
  };
}
