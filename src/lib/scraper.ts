import FirecrawlApp from "@mendable/firecrawl-js";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

const ALLOWED_DOMAINS = ["instagram.com", "tiktok.com"];

const EXTRACTION_SYSTEM_PROMPT = `You extract venue/activity information from social media posts.
Return a JSON object with these fields:
- venueName: string (the restaurant, bar, cafe, or activity name)
- venueType: string (restaurant, bar, cafe, park, museum, etc.)
- cuisine: string | null (if applicable)
- location: string (neighborhood or address if mentioned, otherwise "San Francisco")
- vibe: string[] (2-3 keywords describing the vibe, e.g. ["cozy", "romantic", "upscale"])
- priceRange: string | null ("$", "$$", "$$$", or "$$$$" if you can infer)
- highlights: string[] (notable dishes, features, or reasons to visit)
Return ONLY valid JSON, no markdown.`;

/**
 * Validates that a URL belongs to one of the allowed social media domains.
 * Returns { valid: true, url: URL } or { valid: false, error: string }.
 */
export function validateUrl(rawUrl: string): { valid: true; url: URL } | { valid: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  const hostname = parsed.hostname.replace(/^www\./, "");
  const isAllowed = ALLOWED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return {
      valid: false,
      error: `Unsupported URL. Only ${ALLOWED_DOMAINS.join(", ")} links are accepted.`,
    };
  }

  return { valid: true, url: parsed };
}

/**
 * Analyze an image URL using Claude Vision to identify venue/dish/location details.
 */
async function analyzeImage(imageUrl: string): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: new URL(imageUrl),
            },
            {
              type: "text",
              text: `Analyze this image from a social media post. Describe what you see — identify the venue, dish, drink, or location if possible. Mention any visible signage, food items, decor style, or neighborhood clues. Be concise (2-3 sentences).`,
            },
          ],
        },
      ],
    });
    return text;
  } catch (err) {
    console.error("Image analysis failed:", err);
    return null;
  }
}

export interface ScrapedVenueInfo {
  venueName: string;
  venueType: string;
  cuisine: string | null;
  location: string;
  vibe: string[];
  priceRange: string | null;
  highlights: string[];
  imageAnalysis?: string;
  imageUrl?: string;
}

/**
 * Scrape a social media URL using Firecrawl, extract images, run Claude Vision
 * on the first image, and combine everything into structured venue info.
 */
export async function scrapeAndExtract(url: string): Promise<ScrapedVenueInfo> {
  // Scrape the social media post — request both markdown and images
  const scraped = await firecrawl.scrape(url, {
    formats: ["markdown", "images"],
  });

  if (!scraped.markdown) {
    throw new ScrapeError("Scraping failed: no content could be extracted from this URL");
  }

  // Run image analysis on the first image (if any)
  const firstImageUrl = scraped.images?.find((img) => {
    try {
      const u = new URL(img);
      // Filter out tiny tracking pixels, icons, and data URIs
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  });

  let imageAnalysis: string | null = null;
  if (firstImageUrl) {
    imageAnalysis = await analyzeImage(firstImageUrl);
  }

  // Build the extraction prompt, combining text + image analysis
  let extractionPrompt = `Extract venue info from this social media post:\n\n${scraped.markdown}`;
  if (imageAnalysis) {
    extractionPrompt += `\n\nImage analysis of the post's photo:\n${imageAnalysis}`;
  }

  // Use Claude to extract structured info
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: extractionPrompt,
  });

  let extracted: ScrapedVenueInfo;
  try {
    extracted = JSON.parse(text);
  } catch {
    throw new ScrapeError("Extraction failed: could not parse structured data from the post");
  }

  // Attach image analysis metadata to the response
  if (imageAnalysis) {
    extracted.imageAnalysis = imageAnalysis;
  }
  if (firstImageUrl) {
    extracted.imageUrl = firstImageUrl;
  }

  return extracted;
}

/**
 * Custom error class for scraper-specific errors so callers can distinguish
 * them from unexpected exceptions.
 */
export class ScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScrapeError";
  }
}
