"use client"

import { useQuery } from "@tanstack/react-query"
import { PortfolioCard } from "./portfolio-card"
import { Skeleton } from "@/components/ui/skeleton"
import { FolderOpen } from "lucide-react"
import type { Portfolio } from "@/lib/types"

async function fetchPortfolios(): Promise<Portfolio[]> {
  const res = await fetch("/api/portfolios")
  if (!res.ok) throw new Error("Failed to fetch portfolios")
  return res.json()
}

function PortfolioSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function PortfolioGrid() {
  const { data: portfolios = [], isLoading, isError } = useQuery<Portfolio[]>({
    queryKey: ["portfolios"],
    queryFn: fetchPortfolios,
    staleTime: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <PortfolioSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="col-span-full text-center py-16 text-muted-foreground">
        <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Failed to load portfolio. Please try again.</p>
      </div>
    )
  }

  if (portfolios.length === 0) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <FolderOpen className="w-14 h-14 mx-auto mb-4 opacity-30" />
        <p className="font-medium">No projects yet</p>
        <p className="text-sm mt-1 opacity-70">Check back soon for portfolio updates.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {portfolios.map((portfolio, i) => (
        <PortfolioCard key={portfolio.id} portfolio={portfolio} priority={i < 3} />
      ))}
    </div>
  )
}
