import { generateText, generateObject, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { validateUrl, scrapeAndExtract } from "@/lib/scraper";
import { cardSchema, type Stop } from "@/lib/card";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY!;

async function searchPlaces(query: string) {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.currentOpeningHours,places.websiteUri,places.googleMapsUri,places.location",
      },
      body: JSON.stringify({ textQuery: query }),
    }
  );
  return res.json();
}

async function nearbySearch(lat: number, lng: number, type: string) {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.googleMapsUri,places.location",
      },
      body: JSON.stringify({
        includedTypes: [type],
        maxResultCount: 5,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 800,
          },
        },
      }),
    }
  );
  return res.json();
}

function generateMapUrl(stops: Stop[]): string {
  const markers = stops
    .map((s, i) => {
      const label = String.fromCharCode(65 + i);
      return `markers=color:0x1a1a1a%7Clabel:${label}%7C${s.lat},${s.lng}`;
    })
    .join("&");

  return `https://maps.googleapis.com/maps/api/staticmap?size=600x300&scale=2&maptype=roadmap&style=feature:all%7Csaturation:-100&style=feature:water%7Ccolor:0xE8E4DF&style=feature:landscape%7Ccolor:0xF5F1EC&style=feature:road%7Ccolor:0xD4CFC8&${markers}&key=${GOOGLE_PLACES_KEY}`;
}

export async function POST(req: Request) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  const validation = validateUrl(url);
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  let venueContext = "";
  try {
    const scraped = await scrapeAndExtract(url);
    venueContext = JSON.stringify(scraped, null, 2);
  } catch (err) {
    console.error("Scrape failed:", err);
  }

  // Step 1: Plan the date using tools
  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a date planner for San Francisco. Given information about a venue or activity
(usually extracted from a social media post), plan a complete date itinerary.

Your plan should include 3 stops:
1. **Pre-activity** — something to do before the main event (drinks, a walk, a quick activity)
2. **Main event** — the venue/activity from the post
3. **Post-activity** — something after (dessert, a bar, a scenic spot)

For each stop include: suggested time, venue name, category, why it fits, full address, price level, rating, and Google Maps URL.

Use the lookupVenue tool first to find the main venue and get its coordinates.
Then use findNearby with those coordinates to discover pre and post activities.
The location field in lookupVenue results has latitude and longitude you can pass to findNearby.

Keep the vibe consistent across all stops. Be specific with real SF places.
Keep the tone casual and fun — this is for a real couple, not a travel blog.`,
    prompt: `Plan a date around this:\n\n${venueContext}\n\nOriginal link: ${url}`,
    tools: {
      lookupVenue: tool({
        description:
          "Search for a specific venue by name and location. Returns address, rating, hours, price level, coordinates (location.latitude/longitude), and Google Maps URL.",
        inputSchema: z.object({
          query: z
            .string()
            .describe('Search query, e.g. "Che Fico restaurant San Francisco"'),
        }),
        execute: async ({ query }) => searchPlaces(query),
      }),
      findNearby: tool({
        description:
          "Find nearby places of a certain type within walking distance. Use coordinates from lookupVenue results.",
        inputSchema: z.object({
          lat: z.number().describe("Latitude from a lookupVenue result's location.latitude"),
          lng: z.number().describe("Longitude from a lookupVenue result's location.longitude"),
          type: z
            .string()
            .describe('Google Places type, e.g. "bar", "cafe", "park", "ice_cream_shop", "dessert_shop"'),
        }),
        execute: async ({ lat, lng, type }) => nearbySearch(lat, lng, type),
      }),
    },
    maxSteps: 5,
  });

  // Collect tool results for context
  const toolData = result.steps
    .flatMap((s) => s.toolResults ?? [])
    .map((r) => JSON.stringify(r.result))
    .join("\n\n");

  // Step 2: Structure the plan into card data
  const { object: cardData } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: cardSchema,
    prompt: `Extract structured date plan data from this plan. Include exact coordinates, addresses, ratings, prices, and Google Maps URLs from the venue data.

Plan:
${result.text}

Venue data from Google Places:
${toolData}`,
  });

  const mapUrl = generateMapUrl(cardData.stops);
  const slug = nanoid(8);
  const platform = url.includes("instagram") ? "instagram" : "tiktok";

  // Save to Supabase
  const { error } = await supabase.from("cards").insert({
    slug,
    source_url: url,
    platform,
    city: "sf",
    vibe: cardData.vibe,
    stops: cardData.stops,
    map_url: mapUrl,
  });

  if (error) {
    console.error("Supabase insert failed:", error);
    return Response.json({ error: "Failed to save card" }, { status: 500 });
  }

  return Response.json({
    slug,
    card: {
      slug,
      sourceUrl: url,
      platform,
      city: "sf",
      vibe: cardData.vibe,
      stops: cardData.stops,
      mapUrl,
      createdAt: new Date().toISOString(),
    },
  });
}
