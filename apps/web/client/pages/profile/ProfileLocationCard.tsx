"use client";

import { OutboundLink } from "@client/components/OutboundLink";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import type { UserOwner } from "@client/features/users";
import { parseShelterLinks } from "@client/lib/shelterLinks";
import { cn } from "@client/lib/utils";
import { Building2, MapPin, Pencil } from "lucide-react";

type ProfileLocationCardProps = {
  user: UserOwner;
  onManage: () => void;
};

/**
 * Read-only ZIP and shelter summary. Editing opens `ProfileLocationDialog`,
 * which is where the ZIP and shelter explanations live.
 */
export function ProfileLocationCard({ user, onManage }: ProfileLocationCardProps) {
  const location = [user.city, user.state].filter(Boolean).join(", ") || user.zipCode;
  const savedShelters = parseShelterLinks(user.sheltersText);

  return (
    <section className="border-border rounded-xl border p-4" aria-label="Location and shelters">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Location & shelters</h2>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Edit location and shelters"
          onClick={onManage}
        >
          <Pencil aria-hidden />
        </Button>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        <li>
          <Badge variant="outline" className={cn(!location && "text-muted-foreground")}>
            <MapPin aria-hidden />
            {location || "Add your location"}
          </Badge>
        </li>
        {savedShelters.length > 0 ? (
          savedShelters.map((shelter) => (
            <li key={`${shelter.name}-${shelter.url}`}>
              {shelter.url ? (
                <Badge variant="outline" render={<OutboundLink href={shelter.url} />}>
                  <Building2 aria-hidden />
                  {shelter.name}
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Building2 aria-hidden />
                  {shelter.name}
                </Badge>
              )}
            </li>
          ))
        ) : (
          <li>
            <Badge variant="outline" className="text-muted-foreground">
              <Building2 aria-hidden />
              Add the shelters you work with
            </Badge>
          </li>
        )}
      </ul>
    </section>
  );
}
