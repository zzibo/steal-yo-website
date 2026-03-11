import { crawlPages } from "@/lib/scraper";
import { analyzePage } from "@/lib/agents";
import type { CrawlRequest } from "@/lib/types";

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  let body: Partial<CrawlRequest>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url, depth = 1 } = body;

  if (!url || typeof url !== "string") {
    return Response.json({ error: "Missing required field: url" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return Response.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (depth < 1 || depth > 3) {
    return Response.json({ error: "Depth must be 1-3" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const pages = await crawlPages({ url, depth });
        controller.enqueue(encoder.encode(sseEvent("crawl_done", {
          pageCount: pages.length,
          screenshot: pages[0]?.screenshot || null,
          url,
        })));

        // Analyze first page with streaming events
        // For multi-page, we stream the first page's events and batch the rest
        const firstPage = pages[0];
        if (!firstPage) {
          controller.enqueue(encoder.encode(sseEvent("done", {})));
          controller.close();
          return;
        }

        const result = await analyzePage(firstPage, (e) => {
          controller.enqueue(encoder.encode(sseEvent(e.event, e.data)));
        });

        // If there are more pages, analyze them (without individual streaming)
        const allResults = [result];
        if (pages.length > 1) {
          const remaining = await Promise.all(
            pages.slice(1).map((page) => analyzePage(page))
          );
          allResults.push(...remaining);
        }

        controller.enqueue(encoder.encode(sseEvent("done", { results: allResults })));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        controller.enqueue(encoder.encode(sseEvent("error", { error: message })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const maxDuration = 300;
