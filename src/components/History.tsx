"use client";

import { useEffect, useState, useCallback } from "react";
import { getPlans, deletePlan, type Plan } from "@/lib/history";

export function History() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load plans from localStorage on mount
  useEffect(() => {
    setPlans(getPlans());
  }, []);

  // Re-read plans whenever the panel is opened (picks up newly saved plans)
  useEffect(() => {
    if (open) {
      setPlans(getPlans());
    }
  }, [open]);

  const handleDelete = useCallback((id: string) => {
    deletePlan(id);
    setPlans(getPlans());
    setExpandedId((prev) => (prev === id ? null : prev));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 border border-neutral-800
                   px-4 py-2 text-sm font-medium text-neutral-300
                   hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
            clipRule="evenodd"
          />
        </svg>
        History
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Collapsible panel */}
      {open && (
        <div className="mt-3 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
          {plans.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-neutral-500">
              No plans yet. Generate your first date plan above!
            </p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {plans.map((plan) => {
                const isExpanded = expandedId === plan.id;
                const date = new Date(plan.createdAt);
                const formattedDate = date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <li key={plan.id} className="group">
                    {/* Summary row */}
                    <div className="flex items-center gap-3 px-5 py-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(plan.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="truncate text-sm font-medium text-neutral-200">
                          {plan.url}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {formattedDate}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(plan.id)}
                        title="Delete plan"
                        className="shrink-0 rounded-md p-1.5 text-neutral-600
                                   hover:bg-neutral-800 hover:text-red-400 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-5 pb-4">
                        <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4 text-sm text-neutral-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                          {plan.content}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
