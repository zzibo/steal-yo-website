interface PlanCardProps {
  time: string;
  name: string;
  type: string;
  description: string;
  address?: string;
  priceLevel?: string;
  mapsUrl?: string;
}

export function PlanCard({
  time,
  name,
  type,
  description,
  address,
  priceLevel,
  mapsUrl,
}: PlanCardProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-white" />
        <div className="w-px flex-1 bg-neutral-700" />
      </div>
      <div className="pb-8 space-y-1">
        <p className="text-xs text-neutral-500 uppercase tracking-wider">{time}</p>
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-neutral-400">{type}{priceLevel && ` · ${priceLevel}`}</p>
        <p className="text-sm text-neutral-300">{description}</p>
        {address && (
          <p className="text-xs text-neutral-500">
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-300">
                {address}
              </a>
            ) : (
              address
            )}
          </p>
        )}
      </div>
    </div>
  );
}
