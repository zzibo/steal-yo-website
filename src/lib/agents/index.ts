import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeDesign } from "./design";
import { analyzeTechStack } from "./techstack";
import { precomputePageData } from "./page-tools";
import { buildPageOverview } from "./utils";
import type { ScrapedPage, CrawlResult } from "../types";

export async function analyzePage(page: ScrapedPage): Promise<CrawlResult> {
  const toolkit = precomputePageData(page);
  const overview = buildPageOverview(page, toolkit);

  const techStack = await analyzeTechStack(page, toolkit, overview);

  const techContext = {
    framework: techStack.framework?.name,
    css: techStack.cssFramework?.name,
    componentLibrary: techStack.componentLibrary?.name,
  };

  const [layoutResult, componentsResult, designResult] = await Promise.allSettled([
    analyzeLayout(page, toolkit, overview, techContext),
    analyzeComponents(page, toolkit, overview, techStack),
    analyzeDesign(page, toolkit, overview, techStack),
  ]);

  return {
    url: page.url,
    screenshot: page.screenshot,
    layout: layoutResult.status === "fulfilled" ? layoutResult.value : { sections: [], responsiveBreakpoints: [], navigationStructure: [] },
    components: componentsResult.status === "fulfilled" ? componentsResult.value : { components: [] },
    design: designResult.status === "fulfilled" ? designResult.value : { styleClassification: { primary: "unknown", secondary: [], summary: "" }, colorPalette: [], typography: [], spacing: { system: "unknown", density: "comfortable" }, effects: { borderRadius: "unknown", shadows: "unknown", animations: "unknown" } },
    techStack,
    extractedStyles: toolkit.extractedStyles,
    externalStylesheets: toolkit.externalStylesheets,
  };
}
