"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCrawlStore } from "@/lib/store";
import { CatalogView } from "@/components/catalog/CatalogView";

export default function ResultsPage() {
  const router = useRouter();
  const { status, results } = useCrawlStore();

  useEffect(() => {
    if (status !== "done" || results.length === 0) {
      router.replace("/");
    }
  }, [status, results, router]);

  if (status !== "done" || results.length === 0) {
    return null;
  }

  return <CatalogView />;
}
