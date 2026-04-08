"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Briefcase, MapPin, Calendar, Tag, ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Portfolio } from "@/lib/types"
import { useState } from "react"

function computePeriodLabel(startDate?: string, endDate?: string | null): string {
  if (!startDate) return ""
  const start = new Date(startDate + "-01")
  const end = endDate ? new Date(endDate + "-01") : new Date()
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  const years = Math.floor(months / 12)
  const rem = months % 12
  const duration =
    years > 0 && rem > 0
      ? `${years} thn ${rem} bln`
      : years > 0
      ? `${years} thn`
      : `${rem} bln`
  const startLabel = start.toLocaleDateString("id-ID", { month: "short", year: "numeric" })
  const endLabel = endDate
    ? end.toLocaleDateString("id-ID", { month: "short", year: "numeric" })
    : "Saat ini"
  return `${startLabel} – ${endLabel} · ${duration}`
}

async function fetchPortfolio(id: string): Promise<Portfolio> {
  const res = await fetch(`/api/portfolios/${id}`)
  if (!res.ok) throw new Error("Not found")
  return res.json()
}

export function PortfolioDetail({ id }: { id: string }) {
  const [activeImg, setActiveImg] = useState(0)

  const { data: portfolio, isLoading, isError } = useQuery<Portfolio>({
    queryKey: ["portfolio", id],
    queryFn: () => fetchPortfolio(id),
    staleTime: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }

  if (isError || !portfolio) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-muted-foreground">
        <p>Project not found.</p>
        <Link href="/portfolio" className="text-primary text-sm underline mt-2 block">
          ← Back to portfolio
        </Link>
      </div>
    )
  }

  const images = portfolio.PortfolioImage || []
  const tags = portfolio.Tag || []
  const exp = portfolio.Experience

  return (
    <article className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Back nav */}
      <Link
        href="/portfolio"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to portfolio
      </Link>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="space-y-3">
          {/* Main image */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-muted aspect-video">
             <img
              src={images[activeImg].url}
              alt={`${portfolio.title} — image ${activeImg + 1}`}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
               {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    i === activeImg
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  <img src={img.url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">{portfolio.title}</h1>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
             {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-border bg-muted text-muted-foreground"
              >
                <Tag className="w-3 h-3" />
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {portfolio.description && (
          <p className="text-base text-foreground/80 leading-relaxed">{portfolio.description}</p>
        )}
      </div>

      {/* Experience link */}
      {exp && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Related Experience
          </p>
          <Link
            href={`/experience/${exp.id}`}
            className="group flex items-start gap-3 hover:opacity-80 transition-opacity"
          >
            <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                {exp.role}
              </p>
              <p className="text-sm text-muted-foreground">{exp.company}</p>
              {exp.startDate && (
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {computePeriodLabel(exp.startDate, exp.endDate)}
                  </span>
                  {exp.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {exp.location}
                    </span>
                  )}
                </div>
              )}
              {exp.Skill && exp.Skill.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {exp.Skill.map((s) => (
                    <span
                      key={s.id}
                      className="px-2 py-0.5 rounded-full text-xs border border-border bg-background text-muted-foreground"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        </div>
      )}
    </article>
  )
}
