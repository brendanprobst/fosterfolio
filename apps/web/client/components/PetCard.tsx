import { Badge } from "@client/components/ui/badge";
import type { PetPublic } from "@client/features/pets";
import { humanizeToken } from "@client/lib/humanizeToken";
import { cn } from "@client/lib/utils";
import { PawPrint } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type PetCardPet = Pick<
  PetPublic,
  "id" | "name" | "species" | "status" | "primaryPhotoUrl"
> & {
  breed?: string | null;
};

type PetCardProps = {
  pet: PetCardPet;
  href?: string;
  actions?: ReactNode;
};

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "actively_fostering") return "default";
  if (status === "available") return "secondary";
  return "outline";
}

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

function PetCardBody({ pet }: { pet: PetCardPet }) {
  return (
    <div className="space-y-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-medium">{pet.name}</p>
        {pet.status ? (
          <Badge variant={statusVariant(pet.status)} className="capitalize">
            {humanizeToken(pet.status)}
          </Badge>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm capitalize">
        {humanizeToken(pet.species)}
        {pet.breed ? ` · ${pet.breed}` : ""}
      </p>
    </div>
  );
}

export function PetCard({ pet, href, actions }: PetCardProps) {
  const body = (
    <>
      <PetCardMedia pet={pet} />
      <PetCardBody pet={pet} />
    </>
  );

  return (
    <article className="border-border bg-card overflow-hidden rounded-xl border">
      {href ? (
        <Link href={href} className="hover:bg-muted/40 block transition-colors">
          {body}
        </Link>
      ) : (
        body
      )}
      {actions ? (
        <div className={cn("border-border flex flex-wrap gap-1 border-t p-2")}>
          {actions}
        </div>
      ) : null}
    </article>
  );
}
