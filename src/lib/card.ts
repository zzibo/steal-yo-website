import { z } from "zod";

export const stopSchema = z.object({
  order: z.number().describe("1, 2, or 3"),
  time: z.string().describe("Suggested time, e.g. '6:30 PM'"),
  name: z.string().describe("Venue name"),
  type: z.enum(["pre-activity", "main-event", "post-activity"]),
  category: z.string().describe("e.g. wine bar, restaurant, park"),
  description: z.string().describe("One sentence on why this fits the date vibe"),
  address: z.string().describe("Full street address in San Francisco"),
  price: z.string().describe("Price level: $, $$, $$$, or $$$$"),
  rating: z.number().describe("Rating out of 5"),
  mapsUrl: z.string().describe("Google Maps URL for the venue"),
  lat: z.number().describe("Latitude"),
  lng: z.number().describe("Longitude"),
});

export const cardSchema = z.object({
  vibe: z.string().describe("2-3 word vibe tag, e.g. 'Cozy Evening' or 'Late Night Adventure'"),
  stops: z.array(stopSchema).length(3).describe("Exactly 3 stops: pre-activity, main-event, post-activity"),
});

export type CardData = z.infer<typeof cardSchema>;
export type Stop = z.infer<typeof stopSchema>;

export interface Card {
  slug: string;
  sourceUrl: string;
  platform: string;
  city: string;
  vibe: string;
  stops: Stop[];
  mapUrl: string | null;
  createdAt: string;
}
