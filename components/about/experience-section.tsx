"use client"

import { MapPin, Calendar, Briefcase } from "lucide-react"
import Link from "next/link"
import type { Experience } from "@/lib/types"

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

interface ExperienceSectionProps {
  experiences: Experience[]
}

export function ExperienceSection({ experiences }: ExperienceSectionProps) {
  if (experiences.length === 0) {
    return (
      <section className="text-center py-12 text-muted-foreground">
        <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>No experiences found.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-8">
        <Briefcase className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight">Experiences</h2>
      </div>

      <ol className="relative border-l border-border space-y-10 ml-3">
        {experiences.map((exp) => {
          const description = exp.description as string[]
          const skills = exp.Skill ?? []
          const images = exp.ExperienceImage ?? []
          const firstImage = images[0]

          return (
            <li key={exp.id} className="pl-8 relative group">
              {/* Timeline dot */}
              <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-border bg-background transition-colors group-hover:border-primary" />

              {/* Company image if available */}
              {firstImage && (
                <img
                  src={firstImage.url}
                  alt={exp.company}
                  className="w-10 h-10 rounded object-cover border border-border mb-2"
                />
              )}

              {/* Role & Company — clickable to detail */}
              <Link
                href={`/experience/${exp.id}`}
                className="group/link inline-block"
              >
                <p className="font-semibold text-base leading-snug group-hover/link:text-primary transition-colors">
                  {exp.role}
                </p>
              </Link>
              <p className="text-sm text-muted-foreground mt-0.5">
                {exp.company}
                <span className="mx-1.5">·</span>
                <span>{exp.type}</span>
              </p>

              {/* Period & Location */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {computePeriodLabel(exp.startDate, exp.endDate)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {exp.location}
                </span>
              </div>

              {/* Description bullets */}
              {description.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm text-foreground/75 list-disc list-outside ml-4">
                  {description.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              )}

              {/* Skill tags */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {skills.map((skill: { id: string; name: string }) => (
                    <span
                      key={skill.id}
                      className="px-2 py-0.5 rounded-full text-xs border border-border bg-muted text-muted-foreground"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
