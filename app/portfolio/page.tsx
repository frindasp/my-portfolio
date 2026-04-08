import { Metadata } from "next"
import { PortfolioGrid } from "@/components/portfolio/portfolio-grid"

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Project portfolio by Taufania Frinda — Interior Design and Architecture works.",
}

export default function PortfolioPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground mt-2 text-base">
          A collection of design and architecture projects I've worked on.
        </p>
      </div>
      <PortfolioGrid />
    </div>
  )
}
