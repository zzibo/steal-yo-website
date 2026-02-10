export function CardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#FAF8F5] max-w-md mx-auto shadow-2xl shadow-black/20 p-8 animate-pulse">
      {/* Vibe tag */}
      <div className="mb-8">
        <div className="h-6 w-28 bg-neutral-200 rounded-full" />
      </div>

      {/* Stop 1 */}
      <div className="flex gap-4 mb-8">
        <div className="flex flex-col items-center pt-1">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
          <div className="w-px flex-1 border-l border-dashed border-neutral-200 mt-2" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 bg-neutral-200 rounded" />
          <div className="h-6 w-48 bg-neutral-200 rounded" />
          <div className="h-3 w-32 bg-neutral-200 rounded" />
          <div className="h-4 w-full bg-neutral-100 rounded" />
        </div>
      </div>

      {/* Stop 2 */}
      <div className="flex gap-4 mb-8">
        <div className="flex flex-col items-center pt-1">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
          <div className="w-px flex-1 border-l border-dashed border-neutral-200 mt-2" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 bg-neutral-200 rounded" />
          <div className="h-6 w-56 bg-neutral-200 rounded" />
          <div className="h-3 w-36 bg-neutral-200 rounded" />
          <div className="h-4 w-full bg-neutral-100 rounded" />
        </div>
      </div>

      {/* Stop 3 */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center pt-1">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 bg-neutral-200 rounded" />
          <div className="h-6 w-44 bg-neutral-200 rounded" />
          <div className="h-3 w-28 bg-neutral-200 rounded" />
          <div className="h-4 w-full bg-neutral-100 rounded" />
        </div>
      </div>

      {/* Map placeholder */}
      <div className="mt-8 h-36 bg-neutral-200 rounded-xl" />

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
        <div className="h-3 w-40 bg-neutral-200 rounded mx-auto" />
      </div>

      {/* Loading message */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#FAF8F5]/60 backdrop-blur-[1px] rounded-2xl">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-neutral-500 font-medium">
            Planning your date...
          </p>
        </div>
      </div>
    </div>
  );
}
