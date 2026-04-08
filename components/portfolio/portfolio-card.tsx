"use client"

import Link from "next/link"
import { ArrowUpRight, Tag, Briefcase } from "lucide-react"
import type { Portfolio } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PortfolioCardProps {
  portfolio: Portfolio
  priority?: boolean
}

export function PortfolioCard({ portfolio, priority }: PortfolioCardProps) {
  const images = portfolio.images as string[]
  const tags = portfolio.tags as string[]
  const coverImage = images[0]

  return (
    <Link
      href={`/portfolio/${portfolio.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        "transition-all duration-300 ease-out",
        "hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      )}
    >
      {/* Cover image */}
      <div className="relative overflow-hidden bg-muted aspect-[4/3]">
        {coverImage ? (
          <img
            src={coverImage}
            alt={portfolio.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Briefcase className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Arrow icon */}
        <div className="absolute top-3 right-3 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <div className="bg-white/90 dark:bg-black/80 rounded-full p-1.5 backdrop-blur-sm">
            <ArrowUpRight className="w-4 h-4 text-foreground" />
          </div>
        </div>

        {/* Image count badge */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
            +{images.length - 1} more
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {portfolio.title}
        </h3>

        {portfolio.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
            {portfolio.description}
          </p>
        )}

        {/* Experience link */}
        {portfolio.Experience && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
            <Briefcase className="w-3 h-3 shrink-0" />
            <span className="truncate">{portfolio.Experience.company}</span>
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border border-border bg-muted text-muted-foreground"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-xs text-muted-foreground self-center">+{tags.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent line on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 to-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </Link>
  )
}
