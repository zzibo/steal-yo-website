import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeVibe } from "./vibe";
import { analyzeTechStack } from "./techstack";
import { precomputePageData } from "./page-tools";
import { buildPageOverview } from "./utils";
import type { ScrapedPage, CrawlResult } from "../types";

export async function analyzePage(page: ScrapedPage): Promise<CrawlResult> {
  // Pre-compute page data once (<100ms) — tools read from this
  const toolkit = precomputePageData(page);
  const overview = buildPageOverview(page, toolkit);

  // Tech stack runs first (regex + 1 AI step) so we can pass context
  const techStack = await analyzeTechStack(page, toolkit, overview);

  const techContext = {
    framework: techStack.framework?.name,
    css: techStack.cssFramework?.name,
    componentLibrary: techStack.componentLibrary?.name,
  };

  // 3 agents run in parallel
  const [layoutResult, componentsResult, vibeResult] = await Promise.allSettled([
    analyzeLayout(page, toolkit, overview, techContext),
    analyzeComponents(page, toolkit, overview, techStack),
    analyzeVibe(page, toolkit, overview, techStack),
  ]);

  return {
    url: page.url,
    screenshot: page.screenshot,
    layout: layoutResult.status === "fulfilled" ? layoutResult.value : { sections: [], responsiveBreakpoints: [], navigationStructure: [] },
    components: componentsResult.status === "fulfilled" ? componentsResult.value : { components: [] },
    vibe: vibeResult.status === "fulfilled" ? vibeResult.value : { vibe: "" },
    techStack,
    extractedStyles: toolkit.extractedStyles,
    externalStylesheets: toolkit.externalStylesheets,
  };
}
