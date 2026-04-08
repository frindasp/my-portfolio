"use client";

import { MapPin, Mail } from "lucide-react";

interface AboutSectionProps {
  location: string;
  email: string;
  content: string;
}

export function AboutSection({ location, email, content }: AboutSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <MapPin className="w-4 h-4" />
        <span>{location}</span>
      </div>

      <h1 className="text-4xl font-bold tracking-tight mb-6">About</h1>

      <div className="space-y-4 text-base leading-relaxed text-foreground/80">
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
  );
}
