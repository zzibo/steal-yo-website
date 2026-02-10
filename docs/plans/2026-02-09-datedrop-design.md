# DateDrop — Design

## What
Evolution of Date Planner into a viral, shareable web app. Same core: paste an Instagram/TikTok link, get a 3-stop SF date plan. New: the plan renders as a beautiful, shareable visual date card with a unique public URL. A city feed lets anyone browse cards for inspiration.

## Viral Loop
1. Paste link → AI plans date → renders as gorgeous visual card
2. Card gets unique URL (`/d/a3xk9`)
3. Card appears in public city feed
4. User shares card on TikTok/Twitter/IG (screenshot or link)
5. Others see it → visit → create their own card → repeat

## Aesthetic
Polaroid/Film + Editorial mashup:
- Cream/off-white paper texture background with subtle CSS film grain
- Serif headings (Playfair Display) + clean sans body (Inter)
- 3 stops laid out vertically with dotted-line route connecting them
- Each stop: Polaroid-style frame, venue name, time, one-liner
- Vibe tag badge at top ("Cozy Evening", "Late Night Adventure")
- Mini static map at bottom showing 3 pins
- Subtle light-leak gradient overlay
- Download as PNG button

## Core Flow (Updated)
Paste link → Firecrawl scrapes → Claude extracts venue → Claude plans 3-stop itinerary via Google Places tools → returns structured JSON → save to Supabase → render visual card → card gets unique slug

## Stack
- Next.js 15, Vercel AI SDK (`generateObject`), Claude Sonnet 4, Firecrawl, Google Places API, Tailwind, Vercel
- **New:** Supabase (free tier, single `cards` table), `@vercel/og` (Satori) for OG images, Google Static Maps API, nanoid for slugs

## Data Model

```sql
create table cards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  source_url text not null,
  platform text not null,
  city text not null default 'sf',
  vibe text not null,
  stops jsonb not null,
  created_at timestamptz not null default now()
);

create index cards_slug_idx on cards(slug);
create index cards_created_at_idx on cards(created_at desc);
```

Each stop in `stops` JSON:
```json
{
  "order": 1,
  "time": "6:30 PM",
  "name": "Venue Name",
  "type": "pre-activity",
  "category": "wine bar",
  "description": "Why this fits the date vibe.",
  "address": "123 Main St, SF",
  "price": "$$",
  "rating": 4.5,
  "maps_url": "https://maps.google.com/...",
  "lat": 37.7749,
  "lng": -122.4194
}
```

## Routes

| Route | Purpose |
|---|---|
| `GET /` | Home — link input, card generation |
| `GET /d/[slug]` | Individual card page with OG meta |
| `GET /feed` | Public grid of all cards, newest first |
| `POST /api/plan` | Generate structured plan, save to Supabase, return slug |
| `GET /api/og/[slug]` | Dynamic OG image (1200x630) via Satori |

## Key Backend Change
Switch from `streamText` (markdown) to `generateObject` (structured JSON via Zod schema). Claude returns typed card data. Tradeoff: no streaming, but card "reveal" after loading animation is more dramatic and more shareable.

## Implementation Steps

### Phase 1 — Card Generation & Persistence
1. Set up Supabase project + `cards` table schema
2. Add `@supabase/supabase-js`, `nanoid` dependencies
3. Create Zod schema for card data (vibe + 3 stops)
4. Modify `/api/plan` route: switch to `generateObject`, save to Supabase, return `{ slug }`
5. Create Supabase client lib (`src/lib/supabase.ts`)

### Phase 2 — Visual Card Component
6. Add Playfair Display font
7. Build `DateCard` component — the hero visual card with editorial + Polaroid aesthetic
8. Build loading state with animated placeholder card
9. Update home page: show `DateCard` instead of markdown timeline after generation

### Phase 3 — Card Pages & Sharing
10. Build `/d/[slug]` page — fetch card from Supabase, render `DateCard`, set OG meta
11. Build `/api/og/[slug]` — Satori-based OG image generation
12. Add "Copy link" + "Download as PNG" share buttons (html-to-image)

### Phase 4 — Public Feed
13. Build `/feed` page — grid of card thumbnails from Supabase
14. Add vibe tag filtering
15. Link feed from home page nav

### Phase 5 — Polish
16. Card reveal animation (fade-in / slide-up on generation complete)
17. Mini static map on each card (Google Static Maps API)
18. Mobile responsive card layout
19. Error states and edge cases

## No-Build List
- No auth, no accounts, no login
- No comments, no likes, no social features
- No multi-city (SF only for now)
- No editing cards after creation
- No user profiles
