"use client";

import { useQuery } from "@tanstack/react-query";
import { ExperienceSection, type Experience } from "./experience-section";
import { Skeleton } from "@/components/ui/skeleton";

interface AboutData {
  about: unknown;
  experiences: Experience[];
}

async function fetchAboutData(): Promise<AboutData> {
  const res = await fetch("/api/about");
  if (!res.ok) throw new Error("Failed to fetch experience data");
  return res.json();
}

export function ExperienceContent() {
  const { data, isLoading, isError } = useQuery<AboutData>({
    queryKey: ["about"],
    queryFn: fetchAboutData,
    staleTime: 60 * 1000,
  });

  const experiences = data?.experiences ?? [];

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-10 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-7 w-40" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="pl-8 space-y-2 border-l border-border ml-3">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-muted-foreground">
        <p className="text-sm">Failed to load experiences. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <ExperienceSection experiences={experiences} />
    </div>
  );
}
