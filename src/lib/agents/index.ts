import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeDesign } from "./design";
import { analyzeTechStack } from "./techstack";
import { precomputePageData } from "./page-tools";
import { buildPageOverview } from "./utils";
import { analysisCacheKey, getCached, setCache } from "../cache";
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
  // 2.1: Check analysis cache first
  const cacheKey = analysisCacheKey(page.rawHtml);
  const cached = getCached<CrawlResult>(cacheKey);
  if (cached) {
    console.log(`[analyze] cache hit for ${page.url} (age: ${(cached.age / 1000).toFixed(0)}s)`);
    const result = cached.data;
    onEvent?.({ event: "techstack_done", data: result.techStack });
    onEvent?.({ event: "layout_done", data: result.layout });
    onEvent?.({ event: "components_done", data: result.components });
    onEvent?.({ event: "design_done", data: result.design });
    return result;
  }

  console.log(`[analyze] starting analysis for ${page.url}`);
  const t0 = Date.now();

  const toolkit = precomputePageData(page);
  console.log(`[analyze] precomputed page data in ${Date.now() - t0}ms — ${toolkit.externalStylesheets.length} external stylesheets`);

  const overview = buildPageOverview(page, toolkit);

  // 2.2: Parallelize external CSS fetch with techstack agent
  const cssPromise = toolkit.externalStylesheets.length > 0
    ? (async () => {
        const cssStart = Date.now();
        const { fetchExternalStyles } = await import("./page-tools");
        const externalCss = await fetchExternalStyles(toolkit.externalStylesheets, page.url);
        console.log(`[analyze] fetched external CSS in ${((Date.now() - cssStart) / 1000).toFixed(1)}s — ${externalCss.length} chars`);
        return externalCss;
      })()
    : Promise.resolve("");

  console.log(`[analyze] running techstack agent + CSS fetch in parallel...`);
  const tsStart = Date.now();
  const [externalCss, techStack] = await Promise.all([
    cssPromise,
    analyzeTechStack(page, toolkit, overview),
  ]);
  console.log(`[analyze] techstack done in ${((Date.now() - tsStart) / 1000).toFixed(1)}s`);
  onEvent?.({ event: "techstack_done", data: techStack });

  // Merge external CSS into toolkit after both resolve
  if (externalCss) {
    toolkit.extractedStyles = toolkit.extractedStyles + "\n\n" + externalCss;
  }

  const techContext = {
    framework: techStack.framework?.name,
    css: techStack.cssFramework?.name,
    componentLibrary: techStack.componentLibrary?.name,
  };

  console.log(`[analyze] running layout + components + design in parallel...`);
  const parallelStart = Date.now();
  const [layoutResult, componentsResult, designResult] = await Promise.allSettled([
    analyzeLayout(page, toolkit, overview, techContext).then((r) => {
      console.log(`[analyze] layout done in ${((Date.now() - parallelStart) / 1000).toFixed(1)}s — ${r.sections.length} sections`);
      onEvent?.({ event: "layout_done", data: r });
      return r;
    }),
    analyzeComponents(page, toolkit, overview, techStack).then((r) => {
      console.log(`[analyze] components done in ${((Date.now() - parallelStart) / 1000).toFixed(1)}s — ${r.components.length} components`);
      onEvent?.({ event: "components_done", data: r });
      return r;
    }),
    analyzeDesign(page, toolkit, overview, techStack).then((r) => {
      console.log(`[analyze] design done in ${((Date.now() - parallelStart) / 1000).toFixed(1)}s`);
      onEvent?.({ event: "design_done", data: r });
      return r;
    }),
  ]);

  console.log(`[analyze] all agents done in ${((Date.now() - t0) / 1000).toFixed(1)}s total`);

  const result: CrawlResult = {
    url: page.url,
    screenshot: page.screenshot,
    layout: layoutResult.status === "fulfilled" ? layoutResult.value : { sections: [], responsiveBreakpoints: [], navigationStructure: [] },
    components: componentsResult.status === "fulfilled" ? componentsResult.value : { components: [] },
    design: designResult.status === "fulfilled" ? designResult.value : { styleClassification: { primary: "unknown", secondary: [], summary: "" }, colorPalette: [], typography: [], spacing: { system: "unknown", density: "comfortable" }, effects: { borderRadius: "unknown", shadows: "unknown", animations: "unknown" } },
    techStack,
    extractedStyles: toolkit.extractedStyles,
    externalStylesheets: toolkit.externalStylesheets,
  };

  // 2.1: Cache the result for future re-analyses
  setCache(cacheKey, result);

  return result;
}
