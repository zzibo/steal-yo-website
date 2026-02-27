import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeDesign } from "./design";
import { analyzeContent } from "./content";
import { analyzeTechStack } from "./techstack";
import { precomputePageData } from "./page-tools";
import { buildPageOverview } from "./utils";
import type { ScrapedPage, CrawlResult } from "../types";

export async function analyzePage(page: ScrapedPage): Promise<CrawlResult> {
  // Pre-compute page data once (<100ms) — tools read from this
  const toolkit = precomputePageData(page);
  const overview = buildPageOverview(page, toolkit);

  // Tech stack runs first so we can pass context to other agents
  const techStack = await analyzeTechStack(page, toolkit, overview);

  const techContext = {
    framework: techStack.framework?.name,
    css: techStack.cssFramework?.name,
    componentLibrary: techStack.componentLibrary?.name,
  };

  // Other 4 agents run in parallel, ALL get tech stack context
  const [layoutResult, componentsResult, designResult, contentResult] = await Promise.allSettled([
    analyzeLayout(page, toolkit, overview, techContext),
    analyzeComponents(page, toolkit, overview, techStack),
    analyzeDesign(page, toolkit, overview, techContext),
    analyzeContent(page, toolkit, overview),
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
