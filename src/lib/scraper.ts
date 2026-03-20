import FirecrawlApp from "@mendable/firecrawl-js";
import type { ScrapedPage, CrawlRequest } from "./types";
import { getCached, setCache, crawlCacheKey } from "./cache";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

export async function scrapePage(url: string): Promise<ScrapedPage> {
  const result = await firecrawl.scrape(url, {
    formats: ["markdown", "html", "rawHtml", "screenshot", "links", "images"],
    onlyMainContent: false,
  });

  if (!result.markdown) {
    throw new Error(`Failed to scrape ${url}: no content returned`);
  }

  return {
    url,
    markdown: result.markdown ?? "",
    html: result.html ?? "",
    rawHtml: result.rawHtml ?? "",
    screenshot: result.screenshot,
    links: result.links ?? [],
    images: (result.images ?? []).map((imgSrc) => {
      try {
        new URL(imgSrc);
        return imgSrc;
      } catch {
        try { return new URL(imgSrc, url).toString(); } catch { return imgSrc; }
      }
    }),
    branding: result.branding as ScrapedPage["branding"],
    metadata: {
      title: Array.isArray(result.metadata?.title) ? result.metadata.title[0] : result.metadata?.title,
      description: Array.isArray(result.metadata?.description) ? result.metadata.description[0] : result.metadata?.description,
      language: Array.isArray(result.metadata?.language) ? result.metadata.language[0] : result.metadata?.language,
    },
  };
}

export async function crawlPages(request: CrawlRequest): Promise<ScrapedPage[]> {
  const key = crawlCacheKey(request.url, request.depth);
  const cached = getCached<ScrapedPage[]>(key);
  if (cached) {
    console.log(`[crawl] cache hit for ${request.url} (depth ${request.depth})`);
    return cached.data;
  }

  console.log(`[crawl] starting crawl: ${request.url} (depth ${request.depth})`);
  const visited = new Set<string>();
  const pages: ScrapedPage[] = [];
  const queue: { url: string; currentDepth: number }[] = [
    { url: request.url, currentDepth: 1 },
  ];

  while (queue.length > 0 && pages.length < 10) {
    const item = queue.shift()!;
    if (visited.has(item.url)) continue;
    visited.add(item.url);

    console.log(`[crawl] scraping page ${pages.length + 1}: ${item.url}`);
    const start = Date.now();
    const page = await scrapePage(item.url);
    console.log(`[crawl] scraped in ${((Date.now() - start) / 1000).toFixed(1)}s — ${page.rawHtml.length} chars HTML, screenshot: ${!!page.screenshot}`);
    pages.push(page);

    if (item.currentDepth < request.depth) {
      const baseHost = new URL(request.url).hostname;
      const childLinks = page.links
        .filter((link) => {
          try {
            return new URL(link).hostname === baseHost;
          } catch {
            return false;
          }
        })
        .slice(0, 5);

      for (const link of childLinks) {
        if (!visited.has(link)) {
          queue.push({ url: link, currentDepth: item.currentDepth + 1 });
        }
      }
    }
  }

  setCache(key, pages);
  return pages;
}
