import type { TrackedLinkRecord } from '@api/domain/repositories/ITrackedLinkRepository';

/**
 * Whether an inquiry may be attributed to this link. A foster-me link covers every inquiry
 * to its owner, with or without a pet. A pet link covers only inquiries about that pet.
 * Archived links still count: printed signs outlive the link's place in the list.
 */
export function linkCreditsInquiry(
  link: Pick<TrackedLinkRecord, 'target' | 'ownerId' | 'petId'>,
  inquiry: { ownerId: string; petId: string | null }
): boolean {
  if (link.ownerId !== inquiry.ownerId) return false;
  if (link.target === 'foster_me') return true;
  return inquiry.petId !== null && link.petId === inquiry.petId;
}
