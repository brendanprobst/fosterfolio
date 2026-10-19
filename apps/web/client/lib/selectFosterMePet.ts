export type FosterMeSelection<T extends { status: string }> =
  | { kind: "active"; pet: T }
  | { kind: "fallback"; pet: T }
  | { kind: "empty" };

/**
 * Confirmed foster-me rule: most recent `actively_fostering` pet, else the
 * most recent pet overall, else empty. Callers must pass pets already sorted
 * `created_at` descending (the list-by-owner API contract).
 */
export function selectFosterMePet<T extends { status: string }>(
  pets: T[],
): FosterMeSelection<T> {
  const active = pets.find((pet) => pet.status === "actively_fostering");
  if (active) return { kind: "active", pet: active };
  if (pets[0]) return { kind: "fallback", pet: pets[0] };
  return { kind: "empty" };
}

/**
 * Every actively fostering pet, newest first. Callers must pass pets already
 * sorted `created_at` descending.
 */
export function selectActiveFosters<T extends { status: string }>(pets: T[]): T[] {
  return pets.filter((pet) => pet.status === "actively_fostering");
}
