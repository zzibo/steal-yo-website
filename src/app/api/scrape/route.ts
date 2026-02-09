import { validateUrl, scrapeAndExtract, ScrapeError } from "@/lib/scraper";

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return Response.json({ error: "Missing required field: url" }, { status: 400 });
  }

  // Validate the URL domain
  const validation = validateUrl(url);
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const extracted = await scrapeAndExtract(url);
    return Response.json(extracted);
  } catch (err) {
    if (err instanceof ScrapeError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    console.error("Unexpected scrape error:", err);
    return Response.json({ error: "Scraping failed: an unexpected error occurred" }, { status: 500 });
  }
}
