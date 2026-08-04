/**
 * API shape for a Thing (ISO timestamp string).
 *
 * Fosterfolio DTO convention: entities expose `toPublicDto()` and
 * `toOwnerDto()`. Use the public projection on unauthenticated routes; never
 * serialize an entity wholesale from a public endpoint.
 */
export type ThingDto = {
  id: number;
  name: string;
  createdAt: string;
};
