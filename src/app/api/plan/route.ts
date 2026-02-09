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

// Extract text content from v6 message format (parts-based)
function getMessageText(message: { parts?: Array<{ type: string; text?: string }>; content?: string }): string {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("");
  }
  return typeof message.content === "string" ? message.content : "";
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const userMessage = getMessageText(lastMessage);
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

For each stop, format it like this:

### 🕐 6:30 PM — Venue Name
**Why:** One sentence on why this fits the date vibe.
**Address:** Full address ([Google Maps](maps_url))
**Price:** $$ | **Rating:** 4.5/5

Use the lookupVenue tool first to find the main venue and get its coordinates.
Then use findNearby with those coordinates to discover pre and post activities.
The location field in lookupVenue results has latitude and longitude you can pass to findNearby.

Keep the vibe consistent across all stops. Be specific with real SF places.
Keep the tone casual and fun — this is for a real couple, not a travel blog.`,
    messages: [
      {
        role: "user",
        content: `Plan a date around this:${venueContext}\n\nOriginal link: ${userMessage}`,
      },
    ],
    tools: {
      lookupVenue: tool({
        description:
          "Search for a specific venue by name and location. Returns address, rating, hours, price level, coordinates (location.latitude/longitude), and Google Maps URL.",
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
          "Find nearby places of a certain type within walking distance. Use coordinates from lookupVenue results.",
        inputSchema: z.object({
          lat: z.number().describe("Latitude from a lookupVenue result's location.latitude"),
          lng: z.number().describe("Longitude from a lookupVenue result's location.longitude"),
          type: z
            .string()
            .describe(
              'Google Places type, e.g. "bar", "cafe", "park", "ice_cream_shop", "dessert_shop"'
            ),
        }),
        execute: async ({ lat, lng, type }) => nearbySearch(lat, lng, type),
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
