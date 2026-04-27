"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { ArrowLeft, Briefcase, Calendar, MapPin, FolderOpen } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { PortfolioCard } from "@/components/portfolio/portfolio-card"
import type { Experience, Portfolio } from "@/lib/types"

function computePeriodLabel(startDate: string, endDate?: string | null): string {
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

async function fetchExperience(id: string): Promise<Experience> {
  const res = await fetch(`/api/experiences/${id}`)
  if (!res.ok) throw new Error("Not found")
  return res.json()
}

export function ExperienceDetail({ id }: { id: string }) {
  const { data: exp, isLoading, isError } = useQuery<Experience>({
    queryKey: ["experience", id],
    queryFn: () => fetchExperience(id),
    staleTime: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2 pt-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}
        </div>
      </div>
    )
  }

  if (isError || !exp) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-muted-foreground">
        <p>Experience not found.</p>
        <Link href="/experience" className="text-primary text-sm underline mt-2 block">
          ← Back to experience
        </Link>
      </div>
    )
  }

  const description = exp.description as string[]
  const skills = exp.skills ?? []
  const images = exp.images ?? []
  const portfolios = exp.portfolios ?? []

  return (
    <article className="max-w-3xl mx-auto py-8 space-y-10">
      {/* Back nav */}
      <Link
        href="/experience"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to experience
      </Link>

      {/* Header */}
      <div className="space-y-3">
        {images[0] && (
          <img
            src={images[0].url}
            alt={exp.company}
            className="w-16 h-16 rounded-xl object-cover border border-border"
          />
        )}
        <h1 className="text-3xl font-bold tracking-tight">{exp.role}</h1>
        <p className="text-lg text-muted-foreground">
          {exp.company}
          <span className="mx-2">·</span>
          <span className="text-sm">{exp.type}</span>
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {computePeriodLabel(exp.startDate, exp.endDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {exp.location}
          </span>
        </div>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s.id}
                className="px-3 py-1 rounded-full text-sm border border-border bg-muted text-muted-foreground"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {description.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsibilities</p>
          <ul className="space-y-3 text-sm text-foreground/80">
            {description.map((point, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground mt-1 shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Portfolio */}
      {portfolios.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Related Projects</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {portfolios.map((p) => (
              <PortfolioCard key={p.id} portfolio={p} />
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
