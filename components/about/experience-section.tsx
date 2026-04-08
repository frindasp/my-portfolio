"use client";

import { MapPin, Calendar, Briefcase } from "lucide-react";

export interface Experience {
  id: string;
  role: string;
  company: string;
  type: string;
  periodLabel: string;
  location: string;
  imageUrl: string | null;
  description: unknown;
  skills: unknown;
  isActive: boolean;
  order: number;
}

interface ExperienceSectionProps {
  experiences: Experience[];
}

export function ExperienceSection({ experiences }: ExperienceSectionProps) {
  if (experiences.length === 0) {
    return (
      <section className="text-center py-12 text-muted-foreground">
        <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>No experiences found.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-8">
        <Briefcase className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight">Experiences</h2>
      </div>

      <ol className="relative border-l border-border space-y-10 ml-3">
        {experiences.map((exp) => {
          const skills = exp.skills as string[];
          const description = exp.description as string[];

          return (
            <li key={exp.id} className="pl-8 relative">
              {/* Timeline dot */}
              <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-border bg-background" />

              {/* Company image if available */}
              {exp.imageUrl && (
                <img
                  src={exp.imageUrl}
                  alt={exp.company}
                  className="w-10 h-10 rounded object-cover border border-border mb-2"
                />
              )}

              {/* Role & Company */}
              <p className="font-semibold text-base leading-snug">{exp.role}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {exp.company}
                <span className="mx-1.5">·</span>
                <span>{exp.type}</span>
              </p>

              {/* Period & Location */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {exp.periodLabel}
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
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-full text-xs border border-border bg-muted text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
