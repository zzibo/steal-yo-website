interface TimelineProps {
  parts: Array<{ type: string; text?: string }>;
}

export function Timeline({ parts }: TimelineProps) {
  const text = parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("");

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
      <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}
