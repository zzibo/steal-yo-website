import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeDesign } from "./design";
import { analyzeTechStack } from "./techstack";
import { precomputePageData } from "./page-tools";
import { buildPageOverview } from "./utils";
import type { ScrapedPage, CrawlResult } from "../types";

type AnalysisEvent =
  | { event: "techstack_done"; data: CrawlResult["techStack"] }
  | { event: "design_done"; data: CrawlResult["design"] }
  | { event: "layout_done"; data: CrawlResult["layout"] }
  | { event: "components_done"; data: CrawlResult["components"] };

export async function analyzePage(
  page: ScrapedPage,
  onEvent?: (e: AnalysisEvent) => void,
): Promise<CrawlResult> {
  const toolkit = precomputePageData(page);

  if (toolkit.externalStylesheets.length > 0) {
    const { fetchExternalStyles } = await import("./page-tools");
    const externalCss = await fetchExternalStyles(toolkit.externalStylesheets, page.url);
    if (externalCss) {
      toolkit.extractedStyles = toolkit.extractedStyles + "\n\n" + externalCss;
    }
  }

  const overview = buildPageOverview(page, toolkit);

  const techStack = await analyzeTechStack(page, toolkit, overview);
  onEvent?.({ event: "techstack_done", data: techStack });

  const techContext = {
    framework: techStack.framework?.name,
    css: techStack.cssFramework?.name,
    componentLibrary: techStack.componentLibrary?.name,
  };

  const [layoutResult, componentsResult, designResult] = await Promise.allSettled([
    analyzeLayout(page, toolkit, overview, techContext).then((r) => {
      onEvent?.({ event: "layout_done", data: r });
      return r;
    }),
    analyzeComponents(page, toolkit, overview, techStack).then((r) => {
      onEvent?.({ event: "components_done", data: r });
      return r;
    }),
    analyzeDesign(page, toolkit, overview, techStack).then((r) => {
      onEvent?.({ event: "design_done", data: r });
      return r;
    }),
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
