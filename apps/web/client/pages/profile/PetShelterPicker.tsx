"use client";

import { Button } from "@client/components/ui/button";
import type { ShelterLink } from "@client/lib/shelterLinks";
import { cn } from "@client/lib/utils";
import { Building2, Plus } from "lucide-react";

type PetShelterPickerProps = {
  shelters: ShelterLink[];
  selectedName: string;
  selectedUrl: string;
  onSelect: (shelter: ShelterLink | null) => void;
  onAddManually: () => void;
};

function isSelected(shelter: ShelterLink, name: string, url: string): boolean {
  return shelter.name === name && shelter.url === url;
}

export function PetShelterPicker({
  shelters,
  selectedName,
  selectedUrl,
  onSelect,
  onAddManually,
}: PetShelterPickerProps) {
  const noneSelected = !selectedName && !selectedUrl;
  const orphan =
    selectedName &&
    !shelters.some((shelter) => isSelected(shelter, selectedName, selectedUrl))
      ? { name: selectedName, url: selectedUrl }
      : null;
  const options = orphan ? [orphan, ...shelters] : shelters;

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <p className="text-sm font-medium" id="pet-shelter-label">
          Shelter
        </p>
        <p className="text-muted-foreground text-xs">
          Choose one of the organizations on your profile, or add a new one.
        </p>
      </div>
      <div role="radiogroup" aria-labelledby="pet-shelter-label" className="space-y-2">
        <button
          type="button"
          role="radio"
          aria-checked={noneSelected}
          aria-label="No shelter"
          className={cn(
            "border-border flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm",
            noneSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
          )}
          onClick={() => onSelect(null)}
        >
          <span className="text-muted-foreground">No shelter listed</span>
        </button>
        {options.map((shelter) => {
          const selected = isSelected(shelter, selectedName, selectedUrl);
          return (
            <button
              key={`${shelter.name}-${shelter.url}`}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={shelter.name}
              className={cn(
                "border-border flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left",
                selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
              )}
              onClick={() => onSelect(shelter)}
            >
              <Building2 className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{shelter.name}</span>
                {shelter.url ? (
                  <span className="text-muted-foreground block truncate text-xs">{shelter.url}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onAddManually}>
        <Plus aria-hidden />
        Add a shelter manually
      </Button>
    </div>
  );
}
