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
  breed?: string | null;
  species?: string | null;
  sex?: string | null;
  primaryPhotoUrl: string | null;
};

function singularUnit(unit: string): string {
  return unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

function pronoun(sex: string | null | undefined): { subject: string; be: string } {
  const key = sex?.trim().toLowerCase();
  if (key === "male") return { subject: "he", be: "is" };
  if (key === "female") return { subject: "she", be: "is" };
  return { subject: "they", be: "are" };
}

function article(next: string): string {
  return /^(8|11|18|[aeiou])/i.test(next) ? "an" : "a";
}

/** "Meet Frankie, he is a 5 year old Lab Mix". Falls back gracefully on sparse data. */
export function meetSentence(pet: FosterMePreviewPet): string {
  const breed = pet.breed?.trim() || null;
  const noun = breed ?? (pet.species?.trim() || null);
  const age =
    pet.ageValue == null
      ? null
      : `${pet.ageValue} ${singularUnit(pet.ageUnit ?? "years")} old`;
  const description = [age, noun].filter(Boolean).join(" ");
  if (!description) return `Meet ${pet.name}`;
  const { subject, be } = pronoun(pet.sex);
  const finalNoun = noun ?? "pet";
  const full = age && !noun ? `${age} ${finalNoun}` : description;
  return `Meet ${pet.name}, ${subject} ${be} ${article(full)} ${full}`;
}

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
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
      <span
        aria-hidden
        className={cn(
          buttonVariants({ size: "lg" }),
          "group-hover:bg-primary/90 h-auto max-w-full whitespace-normal py-2.5 text-center text-base leading-snug font-semibold shadow-sm",
        )}
      >
        <span>{meetSentence(pet)}</span>
        <Arrow className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
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
        {/* Single pet: the card's button is the headline, so keep the h1 for screen readers only. */}
        <h1 className={single ? "sr-only" : "text-3xl font-semibold tracking-tight"}>{heading}</h1>
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
      {single ? (
        <p className="text-muted-foreground text-sm italic">fostered by {firstName(displayName)}</p>
      ) : null}
    </section>
  );
}
