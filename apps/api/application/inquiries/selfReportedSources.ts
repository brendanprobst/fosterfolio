export const SELF_REPORTED_SOURCES = [
  'Lawn sign',
  'Instagram',
  'Facebook',
  'Friend or family',
  'Shelter',
  'Search',
  'Other',
] as const;

export type SelfReportedSource = (typeof SELF_REPORTED_SOURCES)[number];

export function isSelfReportedSource(value: string): value is SelfReportedSource {
  return (SELF_REPORTED_SOURCES as readonly string[]).includes(value);
}
