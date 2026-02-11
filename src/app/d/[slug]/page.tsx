import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DateCard } from "@/components/DateCard";
import type { Card } from "@/lib/card";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCard(slug: string): Promise<Card | null> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;

  return {
    slug: data.slug,
    sourceUrl: data.source_url,
    platform: data.platform,
    city: data.city,
    vibe: data.vibe,
    stops: data.stops,
    mapUrl: data.map_url,
    createdAt: data.created_at,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card) return { title: "Card not found" };

  const stopNames = card.stops
    .sort((a, b) => a.order - b.order)
    .map((s) => s.name)
    .join(" → ");

  return {
    title: `${card.vibe} — DateDrop`,
    description: stopNames,
    openGraph: {
      title: `${card.vibe} — DateDrop`,
      description: stopNames,
      images: [`/api/og/${slug}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${card.vibe} — DateDrop`,
      description: stopNames,
      images: [`/api/og/${slug}`],
    },
  };
}

export default async function CardPage({ params }: Props) {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <a href="/" className="font-serif text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
            DateDrop
          </a>
        </div>

        <DateCard card={card} />

        <div className="flex items-center justify-center gap-3">
          <button
            id="copy-btn"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-neutral-900 px-5 py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
              <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
            </svg>
            Copy link
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
          >
            Create your own
          </a>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `document.getElementById('copy-btn')?.addEventListener('click', function() {
              navigator.clipboard.writeText(window.location.href);
              this.textContent = 'Copied!';
              setTimeout(() => { this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px"><path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" /><path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" /></svg> Copy link'; }, 2000);
            });`,
          }}
        />
      </div>

      <footer className="w-full max-w-2xl pt-16 pb-4 text-center">
        <p className="text-xs text-neutral-600">
          DateDrop &middot; Paste a link, plan a night
        </p>
      </footer>
    </main>
  );
}
