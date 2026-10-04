export type ShelterLink = { name: string; url: string };

function asLink(value: unknown): ShelterLink | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name =
    typeof record.name === "string"
      ? record.name
      : typeof record.label === "string"
        ? record.label
        : "";
  const url = typeof record.url === "string" ? record.url : "";
  const trimmed = name.trim();
  if (!trimmed) return null;
  return { name: trimmed, url: url.trim() };
}

/**
 * `users.shelters_text` is a free-text column. New writes store a JSON array of
 * `{ name, url }` so multiple shelters fit without a migration. Legacy rows are a
 * single name string.
 */
export function parseShelterLinks(raw: string | null | undefined): ShelterLink[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) return [{ name: trimmed, url: "" }];
      return parsed.map(asLink).filter((link): link is ShelterLink => link !== null);
    } catch {
      return [{ name: trimmed, url: "" }];
    }
  }
  return [{ name: trimmed, url: "" }];
}

export function serializeShelterLinks(links: ShelterLink[]): string | null {
  const cleaned = links
    .map((link) => ({ name: link.name.trim(), url: link.url.trim() }))
    .filter((link) => link.name.length > 0);
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}
