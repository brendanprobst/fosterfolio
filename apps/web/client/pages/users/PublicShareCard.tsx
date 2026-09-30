"use client";

import type { SocialLink } from "@client/features/users";

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
      <ul className="mt-3 space-y-1.5 text-sm">
        {socialLinks.map((link) => (
          <li key={`${link.label}-${link.url}`} className="truncate">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
