import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeDesign } from "./design";
import { analyzeContent } from "./content";
import { analyzeTechStack } from "./techstack";
import type { ScrapedPage, CrawlResult } from "../types";

export async function analyzePage(page: ScrapedPage): Promise<CrawlResult> {
  // Tech stack runs first so we can pass it to component agent
  const techStack = await analyzeTechStack(page);

  // Other 4 agents run in parallel, components gets tech stack context
  const [layoutResult, componentsResult, designResult, contentResult] = await Promise.allSettled([
    analyzeLayout(page),
    analyzeComponents(page, techStack),
    analyzeDesign(page),
    analyzeContent(page),
  ]);

  return {
    url: page.url,
    screenshot: page.screenshot,
    layout: layoutResult.status === "fulfilled" ? layoutResult.value : { sections: [], responsiveBreakpoints: [], navigationStructure: [] },
    components: componentsResult.status === "fulfilled" ? componentsResult.value : { components: [] },
    design: designResult.status === "fulfilled" ? designResult.value : { colors: [], typography: { fontFamilies: [], scale: [] }, spacing: [], borderRadius: [], shadows: [] },
    content: contentResult.status === "fulfilled" ? contentResult.value : { sections: [], images: [], links: [], meta: {} },
    techStack,
  };
}
