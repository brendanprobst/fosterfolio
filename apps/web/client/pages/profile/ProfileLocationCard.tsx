"use client";

import { Button } from "@client/components/ui/button";
import type { UserOwner } from "@client/features/users";
import { parseShelterLinks } from "@client/lib/shelterLinks";
import { cn } from "@client/lib/utils";
import { Building2, MapPin, Pencil } from "lucide-react";

const PROFILE_ZIP_HELP = "Used to help find adopters in your area.";

type ProfileLocationCardProps = {
  user: UserOwner;
  onManage: () => void;
};

/**
 * Read-only ZIP and shelter summary. Editing opens `ProfileLocationDialog`.
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

      <div className="mt-3 space-y-3 text-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className={cn(!location && "text-muted-foreground")}>
              {location || "Add your location"}
            </span>
          </div>
          <p className="text-muted-foreground pl-6 text-xs">{PROFILE_ZIP_HELP}</p>
        </div>
        {savedShelters.length > 0 ? (
          <ul className="space-y-1.5">
            {savedShelters.map((shelter) => (
              <li key={`${shelter.name}-${shelter.url}`} className="flex items-center gap-2">
                <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
                {shelter.url ? (
                  <a
                    href={shelter.url}
                    className="text-primary truncate hover:underline"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {shelter.name}
                  </a>
                ) : (
                  <span className="truncate">{shelter.name}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2">
            <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className="text-muted-foreground">Add the shelters you work with</span>
          </div>
        )}
      </div>
    </section>
  );
}
