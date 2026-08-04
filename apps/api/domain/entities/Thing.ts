/**
 * Thing — example domain entity for the template (CRUD vertical slice).
 *
 * DTO convention (Fosterfolio): prefer `toPublicDto()` / `toOwnerDto()` over a
 * single `toPrimitives()` dump. Public endpoints must never return owner-only
 * fields. For Thing both projections are identical (no private fields).
 */
export class Thing {
  constructor(
    public readonly id: number,
    public name: string,
    public readonly createdAt: Date
  ) {}

  updateName(name: string): void {
    this.name = name.trim();
  }

  /** Projection safe for unauthenticated responses. */
  toPublicDto(): { id: number; name: string; createdAt: string } {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
    };
  }

  /** Projection for the resource owner (may include private fields later). */
  toOwnerDto(): { id: number; name: string; createdAt: string } {
    return this.toPublicDto();
  }

  /** @deprecated Prefer toPublicDto / toOwnerDto. Kept for repository tests. */
  toPrimitives(): { id: number; name: string; createdAt: string } {
    return this.toPublicDto();
  }
}
