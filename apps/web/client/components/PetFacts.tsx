import { Badge } from "@client/components/ui/badge";
import { humanizeToken } from "@client/lib/humanizeToken";
import { Cake, CircleHelp, Mars, Scale, Venus, VenusAndMars } from "lucide-react";
import type { ReactNode } from "react";

type PetFactsPet = {
  status: string;
  subStatus?: string | null;
  ageValue: number | null;
  ageUnit: string | null;
  sex: string | null;
  size: string | null;
  breed?: string | null;
  species?: string | null;
};

type PetFactsProps = {
  pet: PetFactsPet;
  /** Name (or other identity) — the most important line. */
  title: ReactNode;
  /** Public bio shows species with the breed. Cards leave it off. */
  showSpecies?: boolean;
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
  if (key === "unsure") return <CircleHelp aria-hidden />;
  return <VenusAndMars aria-hidden />;
}

function ageUnitWord(value: number, unit: string): string {
  if (value !== 1) return unit;
  return unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

function ageLabel(pet: PetFactsPet): string | null {
  if (pet.ageValue == null) return null;
  const unit = pet.ageUnit ?? "years";
  return `${pet.ageValue} ${ageUnitWord(pet.ageValue, unit)}`;
}

/** Free-text weight stays as typed. Legacy tokens only lose underscores. */
function weightLabel(size: string): string {
  return size.replaceAll("_", " ");
}

export function PetFacts({ pet, title, showSpecies = false }: PetFactsProps) {
  const age = ageLabel(pet);
  const sex = pet.sex?.trim() ? pet.sex : null;
  const size = pet.size?.trim() ? pet.size : null;
  const breed = pet.breed?.trim() ? pet.breed : null;
  const species = showSpecies && pet.species?.trim() ? pet.species.trim() : null;
  const weight = size ? weightLabel(size) : null;

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
          {weight ? (
            <li>
              <Badge variant="outline" aria-label={`Weight: ${weight}`}>
                <Scale aria-hidden />
                {weight}
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
      {species || breed ? (
        <p className="text-muted-foreground/70 text-xs tracking-wide italic">
          {species ? <span className="capitalize">{humanizeToken(species)}</span> : null}
          {species && breed ? " · " : null}
          {breed}
        </p>
      ) : null}
    </div>
  );
}
