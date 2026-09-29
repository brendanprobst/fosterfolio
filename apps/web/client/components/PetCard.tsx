import { PetFacts } from "@client/components/PetFacts";
import type { PetPublic } from "@client/features/pets";
import { PawPrint } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type PetCardPet = Pick<
  PetPublic,
  | "id"
  | "name"
  | "status"
  | "primaryPhotoUrl"
  | "ageValue"
  | "ageUnit"
  | "sex"
  | "size"
  | "breed"
>;

type PetCardProps = {
  pet: PetCardPet;
  href: string;
  actions?: ReactNode;
};

function PetCardMedia({ pet }: { pet: PetCardPet }) {
  if (pet.primaryPhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static export; absolute URLs
      <img
        src={pet.primaryPhotoUrl}
        alt=""
        className="aspect-[4/3] w-full object-cover"
      />
    );
  }
  return (
    <div className="bg-muted text-muted-foreground flex aspect-[4/3] w-full items-center justify-center">
      <PawPrint aria-hidden className="size-8" />
    </div>
  );
}

export function PetCard({ pet, href, actions }: PetCardProps) {
  return (
    <article className="border-border bg-card relative overflow-hidden rounded-xl border">
      <Link
        href={href}
        aria-label={pet.name}
        className="hover:bg-muted/40 block transition-colors"
      >
        <PetCardMedia pet={pet} />
        <div className="p-3">
          <PetFacts
            pet={pet}
            title={<p className="truncate text-base font-medium">{pet.name}</p>}
          />
        </div>
      </Link>
      {actions ? (
        <div className="absolute top-2 right-2 z-10">{actions}</div>
      ) : null}
    </article>
  );
}
