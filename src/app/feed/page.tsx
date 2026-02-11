import { supabase } from "@/lib/supabase";
import type { Card, Stop } from "@/lib/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed — DateDrop",
  description: "Browse shareable date cards for San Francisco",
};

export const revalidate = 60;

interface DbCard {
  slug: string;
  source_url: string;
  platform: string;
  city: string;
  vibe: string;
  stops: Stop[];
  map_url: string | null;
  created_at: string;
}

async function getCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("slug, source_url, platform, city, vibe, stops, map_url, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return (data as DbCard[]).map((d) => ({
    slug: d.slug,
    sourceUrl: d.source_url,
    platform: d.platform,
    city: d.city,
    vibe: d.vibe,
    stops: d.stops,
    mapUrl: d.map_url,
    createdAt: d.created_at,
  }));
}

function FeedCard({ card }: { card: Card }) {
  const sortedStops = [...card.stops].sort((a, b) => a.order - b.order);
  const date = new Date(card.createdAt);
  const formatted = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <a
      href={`/d/${card.slug}`}
      className="group block rounded-2xl bg-[#FAF8F5] overflow-hidden shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1 transition-all duration-200"
    >
      <div className="p-6">
        {/* Vibe + date */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-block px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] border border-neutral-300 rounded-full text-neutral-500">
            {card.vibe}
          </span>
          <span className="text-[10px] text-neutral-400">{formatted}</span>
        </div>

        {/* Stops */}
        <div className="space-y-3">
          {sortedStops.map((stop, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-serif font-semibold text-neutral-900 truncate">
                  {stop.name}
                </p>
                <p className="text-[10px] text-neutral-500 truncate">
                  {stop.time} &middot; {stop.category}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map preview */}
      {card.mapUrl && (
        <div className="border-t border-neutral-200">
          <img
            src={card.mapUrl}
            alt=""
            className="w-full h-28 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            loading="lazy"
          />
        </div>
      )}
    </a>
  );
}

export default async function FeedPage() {
  const cards = await getCards();

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <a href="/" className="font-serif text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
              DateDrop
            </a>
            <p className="text-sm text-neutral-500 mt-1">
              Date cards for San Francisco
            </p>
          </div>
          <a
            href="/"
            className="rounded-xl bg-white text-neutral-900 px-5 py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors"
          >
            Create a card
          </a>
        </div>

        {/* Grid */}
        {cards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-500">No cards yet. Be the first!</p>
            <a
              href="/"
              className="inline-block mt-4 rounded-xl bg-white text-neutral-900 px-5 py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors"
            >
              Create a card
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <FeedCard key={card.slug} card={card} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
