import FirecrawlApp from "@mendable/firecrawl-js";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

export async function POST(req: Request) {
  const { url } = await req.json();

  // Scrape the social media post
  const scraped = await firecrawl.scrape(url, {
    formats: ["markdown"],
  });

  if (!scraped.markdown) {
    return Response.json({ error: "Failed to scrape URL" }, { status: 400 });
  }

  // Use Claude to extract structured info from the scraped content
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You extract venue/activity information from social media posts.
Return a JSON object with these fields:
- venueName: string (the restaurant, bar, cafe, or activity name)
- venueType: string (restaurant, bar, cafe, park, museum, etc.)
- cuisine: string | null (if applicable)
- location: string (neighborhood or address if mentioned, otherwise "San Francisco")
- vibe: string[] (2-3 keywords describing the vibe, e.g. ["cozy", "romantic", "upscale"])
- priceRange: string | null ("$", "$$", "$$$", or "$$$$" if you can infer)
- highlights: string[] (notable dishes, features, or reasons to visit)
Return ONLY valid JSON, no markdown.`,
    prompt: `Extract venue info from this social media post:\n\n${scraped.markdown}`,
  });

  try {
    const extracted = JSON.parse(text);
    return Response.json(extracted);
  } catch {
    return Response.json({ error: "Failed to parse extraction", raw: text }, { status: 500 });
  }
}
