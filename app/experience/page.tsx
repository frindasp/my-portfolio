import { Metadata } from "next";
import { ExperienceContent } from "@/components/about/experience-content";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Work experience and career history of Taufania Frinda — Interior Designer and Junior Architect based in Jakarta.",
};

export default function ExperiencePage() {
  return <ExperienceContent />;
}
