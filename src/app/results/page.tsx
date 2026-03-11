"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCrawlStore } from "@/lib/store";
import { CatalogView } from "@/components/catalog/CatalogView";

export default function ResultsPage() {
  const router = useRouter();
  const { status } = useCrawlStore();

  useEffect(() => {
    if (status === "idle" || status === "crawling") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "idle" || status === "crawling") {
    return null;
  }

  return <CatalogView />;
}
