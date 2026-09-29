import { Badge } from "@client/components/ui/badge";
import { humanizeToken } from "@client/lib/humanizeToken";
import { Cake, Mars, Ruler, Venus, VenusAndMars } from "lucide-react";
import type { ReactNode } from "react";

type PetFactsPet = {
  status: string;
  subStatus?: string | null;
  ageValue: number | null;
  ageUnit: string | null;
  sex: string | null;
  size: string | null;
  breed?: string | null;
};

type PetFactsProps = {
  pet: PetFactsPet;
  /** Name (or other identity) — the most important line. */
  title: ReactNode;
};

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "actively_fostering") return "default";
  if (status === "available") return "secondary";
  return "outline";
}

function GenderIcon({ sex }: { sex: string }) {
  const key = sex.trim().toLowerCase();
  if (key === "male") return <Mars aria-hidden />;
  if (key === "female") return <Venus aria-hidden />;
  return <VenusAndMars aria-hidden />;
}

function ageLabel(pet: PetFactsPet): string | null {
  if (pet.ageValue == null) return null;
  return `${pet.ageValue} ${pet.ageUnit ?? "years"}`;
}

export function PetFacts({ pet, title }: PetFactsProps) {
  const age = ageLabel(pet);
  const sex = pet.sex?.trim() ? pet.sex : null;
  const size = pet.size?.trim() ? pet.size : null;
  const breed = pet.breed?.trim() ? pet.breed : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">{title}</div>
        {pet.status ? (
          <Badge variant={statusVariant(pet.status)} className="capitalize">
            {humanizeToken(pet.status)}
          </Badge>
        ) : null}
        {pet.subStatus ? (
          <Badge variant="outline" className="capitalize">
            {humanizeToken(pet.subStatus)}
          </Badge>
        ) : null}
      </div>
      {age || size || sex ? (
        <ul className="flex flex-wrap gap-1" aria-label="Details">
          {age ? (
            <li>
              <Badge variant="outline" className="capitalize" aria-label={`Age: ${age}`}>
                <Cake aria-hidden />
                {age}
              </Badge>
            </li>
          ) : null}
          {size ? (
            <li>
              <Badge
                variant="outline"
                className="capitalize"
                aria-label={`Size: ${humanizeToken(size)}`}
              >
                <Ruler aria-hidden />
                {humanizeToken(size)}
              </Badge>
            </li>
          ) : null}
          {sex ? (
            <li>
              <Badge
                variant="outline"
                className="capitalize"
                aria-label={`Gender: ${humanizeToken(sex)}`}
              >
                <GenderIcon sex={sex} />
                {humanizeToken(sex)}
              </Badge>
            </li>
          ) : null}
        </ul>
      ) : null}
      {breed ? (
        <p className="text-muted-foreground/70 text-xs tracking-wide italic">{breed}</p>
      ) : null}
    </div>
  );
}
