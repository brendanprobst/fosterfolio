import { charLength } from '@api/domain/channels/channelPresets';

/** Longest link label, in characters after trimming. The DB checks the same bound. */
export const TRACKED_LINK_LABEL_MAX_LENGTH = 100;

/** Absent, null, or a string within the bound. Request bodies are untyped, so check the type too. */
export function isValidTrackedLinkLabel(label: unknown): boolean {
  if (label == null) return true;
  if (typeof label !== 'string') return false;
  return charLength(label.trim()) <= TRACKED_LINK_LABEL_MAX_LENGTH;
}

/** "<name>'s default link", shortening the name with an ellipsis so the label fits. */
export function defaultLinkLabel(displayName: string): string {
  const suffix = "'s default link";
  const room = TRACKED_LINK_LABEL_MAX_LENGTH - charLength(suffix);
  const chars = Array.from(displayName);
  const name = chars.length > room ? `${chars.slice(0, room - 1).join('').trimEnd()}…` : displayName;
  return `${name}${suffix}`;
}
