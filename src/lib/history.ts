const STORAGE_KEY = "date-planner-history";

export interface Plan {
  id: string;
  url: string;
  content: string;
  createdAt: string;
}

function readStore(): Plan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Plan[];
  } catch {
    return [];
  }
}

function writeStore(plans: Plan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

/** Persist a new plan. An ID is generated automatically. */
export function savePlan(plan: {
  url: string;
  content: string;
  createdAt: string;
}): void {
  const plans = readStore();
  plans.unshift({
    id: crypto.randomUUID(),
    url: plan.url,
    content: plan.content,
    createdAt: plan.createdAt,
  });
  writeStore(plans);
}

/** Return all saved plans, newest first. */
export function getPlans(): Plan[] {
  return readStore();
}

/** Delete a plan by ID. */
export function deletePlan(id: string): void {
  const plans = readStore().filter((p) => p.id !== id);
  writeStore(plans);
}
