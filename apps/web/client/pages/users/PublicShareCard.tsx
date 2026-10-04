"use client";

import { OutboundLink } from "@client/components/OutboundLink";
import { Badge } from "@client/components/ui/badge";
import type { SocialLink } from "@client/features/users";
import { ExternalLink } from "lucide-react";

type PublicShareCardProps = {
  socialLinks: SocialLink[];
};

/**
 * Places this foster posts about their animals. Hidden when the list is empty.
 */
export function PublicShareCard({ socialLinks }: PublicShareCardProps) {
  if (socialLinks.length === 0) return null;

  return (
    <section className="border-border rounded-xl border p-4" aria-label="Where they share">
      <h2 className="text-muted-foreground text-sm font-medium">Where they share</h2>
      <p className="text-muted-foreground mt-1 text-xs">
        Instagram, a foster diary, anywhere they post about the animals they foster.
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {socialLinks.map((link) => (
          <li key={`${link.label}-${link.url}`}>
              <Badge variant="outline" render={<OutboundLink href={link.url} />}>
              {link.label}
              <ExternalLink aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
