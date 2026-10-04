"use client";

import { OutboundLink } from "@client/components/OutboundLink";
import { parseShelterLinks } from "@client/lib/shelterLinks";
import { Building2, MapPin } from "lucide-react";

type PublicLocationCardProps = {
  city: string | null;
  state: string | null;
  sheltersText: string | null;
};

/**
 * Read-only location and shelter summary for a public foster profile.
 * Hidden when both location and shelters are empty.
 */
export function PublicLocationCard({
  city,
  state,
  sheltersText,
}: PublicLocationCardProps) {
  const location = [city, state].filter(Boolean).join(", ");
  const shelters = parseShelterLinks(sheltersText);
  if (!location && shelters.length === 0) return null;

  return (
    <section className="border-border rounded-xl border p-4" aria-label="Location and shelters">
      <h2 className="text-muted-foreground text-sm font-medium">Location & shelters</h2>
      <div className="mt-3 space-y-3 text-sm">
        {location ? (
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span>{location}</span>
          </div>
        ) : null}
        {shelters.length > 0 ? (
          <ul className="space-y-1.5">
            {shelters.map((shelter) => (
              <li key={`${shelter.name}-${shelter.url}`} className="flex items-center gap-2">
                <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
                {shelter.url ? (
                  <OutboundLink
                    href={shelter.url}
                    className="text-primary inline-flex items-center gap-1 truncate hover:underline"
                  >
                    {shelter.name}
                  </OutboundLink>
                ) : (
                  <span className="truncate">{shelter.name}</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
