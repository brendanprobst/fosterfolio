export type TrackedLinkTarget = 'pet' | 'foster_me';

/**
 * A pet link must name a pet. A foster-me link must not.
 * Callers persist only after `create` returns a link.
 */
export class TrackedLink {
  private constructor(
    readonly target: TrackedLinkTarget,
    readonly petId: string | null
  ) {}

  static create(target: TrackedLinkTarget, petId: string | null | undefined): TrackedLink | null {
    if (target !== 'pet' && target !== 'foster_me') return null;
    const id = typeof petId === 'string' && petId.trim() ? petId.trim() : null;
    if ((target === 'pet') !== (id !== null)) return null;
    return new TrackedLink(target, id);
  }
}
