import { Metadata } from "next";
import { AboutContent } from "@/components/about/about-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Taufania Frinda — Architecture graduate and Interior Designer based in Jakarta.",
};

export default function AboutPage() {
  return <AboutContent />;
}
