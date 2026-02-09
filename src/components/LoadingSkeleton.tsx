export function LoadingSkeleton() {
  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-neutral-700" />
        <div className="h-4 w-48 bg-neutral-800 rounded" />
      </div>

      <div className="space-y-3 pl-5">
        <div className="h-3 w-full bg-neutral-800 rounded" />
        <div className="h-3 w-3/4 bg-neutral-800 rounded" />
        <div className="h-3 w-5/6 bg-neutral-800 rounded" />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-neutral-700" />
        <div className="h-4 w-56 bg-neutral-800 rounded" />
      </div>

      <div className="space-y-3 pl-5">
        <div className="h-3 w-full bg-neutral-800 rounded" />
        <div className="h-3 w-2/3 bg-neutral-800 rounded" />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-neutral-700" />
        <div className="h-4 w-40 bg-neutral-800 rounded" />
      </div>

      <div className="space-y-3 pl-5">
        <div className="h-3 w-full bg-neutral-800 rounded" />
        <div className="h-3 w-4/5 bg-neutral-800 rounded" />
      </div>

      <div className="text-center text-neutral-500 text-sm pt-2">
        Scraping post & planning your date...
      </div>
    </div>
  );
}
