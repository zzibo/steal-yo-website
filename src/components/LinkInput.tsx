import { ChangeEvent, FormEvent } from "react";

interface LinkInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function LinkInput({ value, onChange, onSubmit, isLoading }: LinkInputProps) {
  return (
    <form onSubmit={onSubmit} className="flex gap-3">
      <input
        type="url"
        value={value}
        onChange={onChange}
        placeholder="Paste an Instagram or TikTok link..."
        className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3
                   text-neutral-100 placeholder:text-neutral-600
                   focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600
                   transition-colors"
        disabled={isLoading}
        required
      />
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-xl bg-white text-neutral-950 px-6 py-3 font-medium
                   hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors"
      >
        {isLoading ? "Planning..." : "Plan"}
      </button>
    </form>
  );
}
