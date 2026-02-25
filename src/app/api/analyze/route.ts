import { NextResponse } from "next/server";
import { crawlPages } from "@/lib/scraper";
import { analyzePage } from "@/lib/agents";
import type { CrawlRequest, CrawlResult } from "@/lib/types";

export async function POST(req: Request) {
  let body: Partial<CrawlRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url, depth = 1 } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (depth < 1 || depth > 3) {
    return NextResponse.json({ error: "Depth must be 1-3" }, { status: 400 });
  }

  try {
    const pages = await crawlPages({ url, depth });
    const results: CrawlResult[] = await Promise.all(
      pages.map((page) => analyzePage(page))
    );
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Analysis failed: " + (err instanceof Error ? err.message : "unknown error") },
      { status: 500 }
    );
  }
}

export const maxDuration = 300;
