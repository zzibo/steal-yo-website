import { streamText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

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
          "places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.currentOpeningHours,places.websiteUri,places.googleMapsUri",
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
          "places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.googleMapsUri",
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

export async function POST(req: Request) {
  const { messages } = await req.json();

  // The user message contains the social media URL.
  // Step 1: scrape it first via our scrape endpoint.
  const userMessage = messages[messages.length - 1]?.content ?? "";
  const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);

  let venueContext = "";
  if (urlMatch) {
    try {
      const origin = new URL(req.url).origin;
      const scrapeRes = await fetch(`${origin}/api/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlMatch[0] }),
      });
      const scraped = await scrapeRes.json();
      if (!scraped.error) {
        venueContext = `\n\nExtracted from the social media post:\n${JSON.stringify(scraped, null, 2)}`;
      }
    } catch {
      // If scraping fails, the agent will work with just the URL
    }
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a date planner for San Francisco. Given information about a venue or activity
(usually extracted from a social media post), plan a complete date itinerary.

Your plan should include 3 stops:
1. **Pre-activity** — something to do before the main event (drinks, a walk, a quick activity)
2. **Main event** — the venue/activity from the post
3. **Post-activity** — something after (dessert, a bar, a scenic spot)

For each stop, include:
- Suggested time (e.g. "6:30 PM")
- Venue name
- Why it fits the date
- Address
- Price range if known

Use the tools to look up real venues near the main spot. Keep the vibe consistent across all stops.
Be specific with real SF places. Keep the tone casual and fun — this is for a real couple, not a travel blog.`,
    messages: [
      {
        role: "user",
        content: `Plan a date around this:${venueContext}\n\nOriginal link: ${userMessage}`,
      },
    ],
    tools: {
      lookupVenue: tool({
        description:
          "Search for a specific venue by name and location to get details like address, rating, hours, price level",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              'Search query, e.g. "Che Fico restaurant San Francisco"'
            ),
        }),
        execute: async ({ query }) => searchPlaces(query),
      }),
      findNearby: tool({
        description:
          "Find nearby places of a certain type (bar, cafe, park, etc.) within walking distance of a location",
        inputSchema: z.object({
          lat: z.number().describe("Latitude of the center point"),
          lng: z.number().describe("Longitude of the center point"),
          type: z
            .string()
            .describe(
              'Place type, e.g. "bar", "cafe", "park", "ice_cream_shop"'
            ),
        }),
        execute: async ({ lat, lng, type }) => nearbySearch(lat, lng, type),
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
