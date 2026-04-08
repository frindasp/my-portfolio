import { Metadata } from "next";
import { MapPin, Mail, Briefcase, Calendar } from "lucide-react";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Taufania Frinda — Architecture graduate and Interior Designer based in Jakarta.",
};

// Revalidate every 60 seconds for near-real-time updates
export const revalidate = 60;

async function getAboutData() {
  const [about, experiences] = await Promise.all([
    prisma.about.findFirst(),
    prisma.experience.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
  ]);
  return { about, experiences };
}

export default async function About() {
  const { about, experiences } = await getAboutData();

  // Fallback values if DB is empty
  const location = about?.location ?? "Jakarta, Indonesia";
  const email = about?.email ?? "taufaniafrinda21@gmail.com";
  const content = about?.content ?? `<p>I am an Architecture graduate with professional experience as an Interior Designer, as well as previous internships and freelance projects. My work covers site measurement, design concept development, 3D visualization, and technical drawings for residential renovations and exhibition booths.</p><p>I am proficient in design software, adaptable, and collaborative, with strong skills in planning, supervision, and quality control. I am seeking opportunities as an Interior Designer or Junior Architect to further grow, develop my skills, and contribute to innovative projects.</p><p>Please feel free to contact me via email or direct message if there are any job opportunities that match my qualifications.</p>`;

  return (
    <div className="max-w-3xl mx-auto space-y-16 py-8">
      {/* ── About Section ── */}
      <section>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-6">
          About
        </h1>

        <div className="space-y-4 text-base leading-relaxed text-foreground/80">
          {/* Render WYSIWYG HTML from CMS */}
          <div
            className="prose prose-sm max-w-none dark:prose-invert [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 shrink-0" />
            <a
              href={`mailto:${email}`}
              className="hover:text-foreground transition-colors underline underline-offset-4"
            >
              {email}
            </a>
          </div>
        </div>
      </section>

      {/* ── Experience Section ── */}
      {experiences.length > 0 && (
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
      )}
    </div>
  );
}
