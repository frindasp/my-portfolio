import { Metadata } from "next";
import { MapPin, Mail, Briefcase, Calendar, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Taufania Frinda — Architecture graduate and Interior Designer based in Jakarta.",
};

const experiences = [
  {
    company: "Saturuma Interior Design & Build",
    role: "Interior Designer",
    type: "Kontrak",
    period: "Feb 2026 – Saat ini · 3 bln",
    location: "Jakarta Timur, Jakarta Raya, Indonesia · Di lokasi",
    skills: ["Space Planning", "3D Modeling", "Interior Design"],
    description: [],
  },
  {
    company: "West Interior",
    role: "Interior Designer",
    type: "Purnawaktu",
    period: "Mei 2025 – Feb 2026 · 10 bln",
    location: "Surabaya, Jawa Timur, Indonesia · Di lokasi",
    skills: ["Interior Design", "Space Planning", "3D Modeling", "Technical Drawing", "AutoCAD"],
    description: [],
  },
  {
    company: "Pekerja Lepas",
    role: "Freelance Architect & Interior Designer",
    type: "Pekerja Lepas",
    period: "Jan 2025 – Feb 2026 · 1 thn 2 bln",
    location: "Jarak Jauh",
    skills: ["3D Modeling", "Technical Drawing", "AutoCAD", "SketchUp", "D5 Render"],
    description: [
      "Residential: Collaborated with a contractor to produce 2D construction drawings for a house renovation. Responsibilities included on-site measurement of existing conditions and creating detailed technical drawings.",
      "Workplace: Redesigned a meeting room to improve spatial efficiency and comfort — measured the existing space, developed multiple 3D proposals, and provided furniture recommendations tailored to the client's needs.",
    ],
  },
  {
    company: "Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR)",
    role: "Project Supervisor Assistant",
    type: "Magang",
    period: "Agu 2022 – Des 2022 · 5 bln",
    location: "Kecamatan Serang, Banten, Indonesia · Di lokasi",
    skills: ["SketchUp", "Microsoft Office", "Quality Control", "3D Modeling", "AutoCAD"],
    description: [
      "Performed data input for TKDN calculation on the construction work package of the architectural work section, and checked the materials on the Domestic Production Goods/Services Inventory List.",
      "Performed quality inspections for 64 room units in the Tanjung Lesung workers' apartment project, ensuring compliance with construction standards and project schedules.",
      "Monitored weekly progress on construction of the Kemenkumham Poltekip and Poltekim dormitory flats project.",
      "Contributed to the 3D garden design and architectural design process of the Poltekip and Poltekim Kemenkumham dormitory flats project.",
    ],
  },
  {
    company: "PT. Surya Andalan Bumi Persada",
    role: "Field Supervisor",
    type: "Magang",
    period: "Apr 2022 – Jun 2022 · 3 bln",
    location: "Surabaya, Jawa Timur, Indonesia · Di lokasi",
    skills: ["Microsoft Office", "Construction", "RAB Calculation"],
    description: [
      "Monitored the weekly progress of the construction project of a 2-storey residential house in the Puri Galaxy Surabaya housing complex.",
      "Performed RAB calculations on architectural work in the Construction of a 2-floor residential house in Puri Galaxy Surabaya.",
    ],
  },
];

export default function About() {
  return (
    <div className="max-w-3xl mx-auto space-y-16 py-8">
      {/* ── About Section ── */}
      <section>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <MapPin className="w-4 h-4" />
          <span>Jakarta, Indonesia</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-6">
          About
        </h1>

        <div className="space-y-4 text-base leading-relaxed text-foreground/80">
          <p>
            I am an Architecture graduate with professional experience as an Interior Designer,
            as well as previous internships and freelance projects. My work covers site
            measurement, design concept development, 3D visualization, and technical drawings
            for residential renovations and exhibition booths.
          </p>
          <p>
            I am proficient in design software, adaptable, and collaborative, with strong skills
            in planning, supervision, and quality control. I am seeking opportunities as an
            Interior Designer or Junior Architect to further grow, develop my skills, and
            contribute to innovative projects.
          </p>

          <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 shrink-0" />
            <a
              href="mailto:taufaniafrinda21@gmail.com"
              className="hover:text-foreground transition-colors underline underline-offset-4"
            >
              taufaniafrinda21@gmail.com
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            Please feel free to contact me via email or direct message if there are any job
            opportunities that match my qualifications.
          </p>
        </div>
      </section>

      {/* ── Experience Section ── */}
      <section>
        <div className="flex items-center gap-2 mb-8">
          <Briefcase className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-2xl font-semibold tracking-tight">Pengalaman</h2>
        </div>

        <ol className="relative border-l border-border space-y-10 ml-3">
          {experiences.map((exp, idx) => (
            <li key={idx} className="pl-8 relative">
              {/* Timeline dot */}
              <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-border bg-background" />

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
                  {exp.period}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {exp.location}
                </span>
              </div>

              {/* Description bullets */}
              {exp.description.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm text-foreground/75 list-disc list-outside ml-4">
                  {exp.description.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              )}

              {/* Skill tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {exp.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-full text-xs border border-border bg-muted text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
