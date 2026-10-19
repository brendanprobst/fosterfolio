import { UserAvatar } from "@client/components/UserAvatar";
import { buttonVariants } from "@client/components/ui/button";
import { petHrefFromFosterMe } from "@client/lib/petBioPath";
import { cn } from "@client/lib/utils";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export type FosterMePreviewPet = {
  id: string;
  name: string;
  ageValue: number | null;
  ageUnit: string | null;
  size: string | null;
  primaryPhotoUrl: string | null;
};

function ageUnitWord(value: number, unit: string): string {
  if (value !== 1) return unit;
  return unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

function ageLabel(pet: FosterMePreviewPet): string | null {
  if (pet.ageValue == null) return null;
  const unit = pet.ageUnit ?? "years";
  return `${pet.ageValue} ${ageUnitWord(pet.ageValue, unit)}`;
}

function weightLabel(size: string | null): string | null {
  const trimmed = size?.trim();
  if (!trimmed) return null;
  return trimmed.replaceAll("_", " ");
}

function PreviewCard({
  pet,
  ownerRef,
  large,
  newTab,
}: {
  pet: FosterMePreviewPet;
  ownerRef: string;
  large: boolean;
  /** Several pets: open each bio in a new tab so the visitor keeps the grid. */
  newTab: boolean;
}) {
  const age = ageLabel(pet);
  const weight = weightLabel(pet.size);
  const Arrow = newTab ? ArrowUpRight : ArrowRight;
  return (
    <Link
      href={petHrefFromFosterMe(ownerRef, pet.id)}
      aria-label={newTab ? `${pet.name} (opens in a new tab)` : pet.name}
      // `opener` (not the implicit noopener) so the new tab inherits sessionStorage,
      // which carries first-touch link attribution onto pet_viewed and the inquiry.
      {...(newTab ? { target: "_blank", rel: "opener" } : {})}
      className={cn(
        "group hover:bg-muted/40 focus-visible:ring-ring/50 flex flex-col items-center gap-3 rounded-2xl p-4 text-center transition-colors outline-none focus-visible:ring-[3px]",
        large
          ? "w-full max-w-sm"
          : "w-full min-[480px]:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]",
      )}
    >
      <UserAvatar
        name={pet.name}
        url={pet.primaryPhotoUrl}
        className={cn(
          "ring-offset-background ring-primary/0 group-hover:ring-primary/40 ring-2 ring-offset-2 transition-[box-shadow,transform] duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
          large ? "size-56 text-4xl" : "size-40 text-3xl sm:size-44",
        )}
      />
      <span className="text-xl font-semibold tracking-tight">{pet.name}</span>
      {weight ? <span className="text-muted-foreground text-sm">Weight {weight}</span> : null}
      {age ? <span className="text-muted-foreground text-sm">Age {age}</span> : null}
      <span
        aria-hidden
        className="text-muted-foreground group-hover:text-primary inline-flex items-center gap-1 text-xs font-medium transition-colors"
      >
        Meet {pet.name}
        <Arrow className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </Link>
  );
}

export function FosterMePreview({
  pets,
  ownerRef,
  displayName,
  fallback,
  isOwner,
}: {
  pets: FosterMePreviewPet[];
  ownerRef: string;
  displayName: string;
  fallback: boolean;
  isOwner: boolean;
}) {
  const single = pets.length === 1;
  const heading = single
    ? `Meet ${pets[0]?.name ?? "this pet"}`
    : `Meet the pets ${displayName} is fostering.`;

  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        {single ? (
          <p className="text-muted-foreground text-sm">fostered by {displayName}</p>
        ) : null}
        {fallback && pets[0] ? (
          <p className="border-border bg-muted/40 rounded-lg border px-3 py-2 text-sm" role="status">
            This may not be who {displayName} is fostering right now. Ask if {pets[0].name} is
            still looking for a home.
          </p>
        ) : null}
        {isOwner ? (
          <Link href="/profile/links" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Manage links
          </Link>
        ) : null}
      </div>
      <div
        className={cn(
          single
            ? "flex justify-center"
            : // Flex-wrap, not grid: a partly filled row (2 of 3, the 4th of 4) stays centered.
              "flex w-full flex-wrap justify-center gap-4",
        )}
      >
        {pets.map((pet) => (
          <PreviewCard key={pet.id} pet={pet} ownerRef={ownerRef} large={single} newTab={!single} />
        ))}
      </div>
    </section>
  );
}
