import type { Card, Stop } from "@/lib/card";

interface DateCardProps {
  card: Card;
}

function StopRow({ stop, isLast }: { stop: Stop; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center pt-1">
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 ring-2 ring-neutral-300 ring-offset-2 ring-offset-[#FAF8F5]" />
        {!isLast && (
          <div className="w-px flex-1 border-l border-dashed border-neutral-300 mt-2" />
        )}
      </div>

      {/* Stop content */}
      <div className={isLast ? "pb-0" : "pb-8"}>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
          {stop.time}
        </p>
        <h3 className="font-serif text-xl font-semibold text-neutral-900 mt-0.5 leading-tight">
          {stop.name}
        </h3>
        <p className="text-xs text-neutral-500 mt-1">
          {stop.category}
          <span className="mx-1.5 text-neutral-300">&middot;</span>
          {stop.price}
          {stop.rating > 0 && (
            <>
              <span className="mx-1.5 text-neutral-300">&middot;</span>
              {stop.rating}/5
            </>
          )}
        </p>
        <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
          {stop.description}
        </p>
        <a
          href={stop.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-neutral-400 hover:text-neutral-600 underline underline-offset-2 mt-1.5 transition-colors"
        >
          {stop.address}
        </a>
      </div>
    </div>
  );
}

export function DateCard({ card }: DateCardProps) {
  const sortedStops = [...card.stops].sort((a, b) => a.order - b.order);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#FAF8F5] max-w-md mx-auto shadow-2xl shadow-black/20">
      {/* Film grain overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ borderRadius: "inherit" }}
        aria-hidden
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" opacity="0.04" />
      </svg>

      {/* Light leak gradient */}
      <div
        className="absolute top-0 right-0 w-2/3 h-1/3 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(245,200,120,0.12), transparent 70%)",
        }}
      />

      {/* Card content */}
      <div className="relative z-20 p-8">
        {/* Header */}
        <div className="mb-8">
          <span className="inline-block px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] border border-neutral-300 rounded-full text-neutral-500">
            {card.vibe}
          </span>
        </div>

        {/* Stops timeline */}
        <div>
          {sortedStops.map((stop, i) => (
            <StopRow
              key={i}
              stop={stop}
              isLast={i === sortedStops.length - 1}
            />
          ))}
        </div>

        {/* Map */}
        {card.mapUrl && (
          <div className="mt-8 rounded-xl overflow-hidden border border-neutral-200">
            <img
              src={card.mapUrl}
              alt="Date route map"
              className="w-full h-auto block"
              loading="lazy"
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-medium">
            DateDrop &middot; San Francisco
          </p>
        </div>
      </div>
    </div>
  );
}
