"use client";

import { useQuery } from "@tanstack/react-query";
import { AboutSection } from "./about-section";
import { Skeleton } from "@/components/ui/skeleton";

interface AboutData {
  about: {
    id: string;
    location: string;
    email: string;
    content: string;
  } | null;
  experiences: unknown[];
}

const DEFAULT_CONTENT = `<p>I am an Architecture graduate with professional experience as an Interior Designer, as well as previous internships and freelance projects. My work covers site measurement, design concept development, 3D visualization, and technical drawings for residential renovations and exhibition booths.</p><p>I am proficient in design software, adaptable, and collaborative, with strong skills in planning, supervision, and quality control. I am seeking opportunities as an Interior Designer or Junior Architect to further grow, develop my skills, and contribute to innovative projects.</p><p>Please feel free to contact me via email or direct message if there are any job opportunities that match my qualifications.</p>`;

async function fetchAboutData(): Promise<AboutData> {
  const res = await fetch("/api/about");
  if (!res.ok) throw new Error("Failed to fetch about data");
  return res.json();
}

export function AboutContent() {
  const { data, isLoading, isError } = useQuery<AboutData>({
    queryKey: ["about"],
    queryFn: fetchAboutData,
    staleTime: 60 * 1000,
  });

  const location = data?.about?.location ?? "Jakarta, Indonesia";
  const email = data?.about?.email ?? "taufaniafrinda21@gmail.com";
  const content = data?.about?.content ?? DEFAULT_CONTENT;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-muted-foreground">
        <p className="text-sm">Failed to load content. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <AboutSection location={location} email={email} content={content} />
    </div>
  );
}
