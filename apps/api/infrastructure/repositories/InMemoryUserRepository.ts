import { User } from '@api/domain/entities/User';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();
  private readonly starCounts = new Map<string, number>();
  private readonly aliases = new Map<string, string>();
  private readonly handleChanges: Array<{ userId: string; changedAt: Date }> = [];

  seed(user: User, starCount = 0): void {
    this.users.set(user.id, user);
    this.starCounts.set(user.id, starCount);
  }

  setStarCount(userId: string, count: number): void {
    this.starCounts.set(userId, count);
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id) ?? null;
    if (!user || user.deletedAt) return null;
    return user;
  }

  async findByHandle(handle: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.deletedAt) continue;
      if (user.handle === handle) return user;
    }
    return null;
  }

  async listActiveIds(ids: string[]): Promise<Set<string>> {
    return new Set(
      ids.filter((id) => {
        const user = this.users.get(id);
        return user != null && !user.deletedAt;
      })
    );
  }

  async isHandleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.handle !== handle) continue;
      if (exceptUserId && user.id === exceptUserId) continue;
      return true;
    }
    return false;
  }

  async findAliasOwner(handle: string): Promise<string | null> {
    return this.aliases.get(handle) ?? null;
  }

  async recordAlias(handle: string, userId: string): Promise<void> {
    if (!this.aliases.has(handle)) this.aliases.set(handle, userId);
  }

  async countHandleChangesSince(userId: string, since: Date): Promise<number> {
    return this.handleChanges.filter(
      (c) => c.userId === userId && c.changedAt.getTime() >= since.getTime()
    ).length;
  }

  async oldestHandleChangeSince(userId: string, since: Date): Promise<Date | null> {
    const times = this.handleChanges
      .filter((c) => c.userId === userId && c.changedAt.getTime() >= since.getTime())
      .map((c) => c.changedAt.getTime());
    return times.length > 0 ? new Date(Math.min(...times)) : null;
  }

  async recordHandleChange(userId: string, at: Date): Promise<void> {
    this.handleChanges.push({ userId, changedAt: at });
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async countStars(userId: string): Promise<number> {
    return this.starCounts.get(userId) ?? 0;
  }

  /** Test/search helper — not part of IUserRepository. */
  async listAllForSearch(): Promise<
    Array<{
      id: string;
      handle: string | null;
      displayName: string | null;
      avatarUrl: string | null;
      city: string | null;
      state: string | null;
    }>
  > {
    return Array.from(this.users.values())
      .filter((u) => !u.deletedAt)
      .map((u) => {
        const dto = u.toPublicDto();
        return {
          id: dto.id,
          handle: dto.handle,
          displayName: dto.displayName,
          avatarUrl: dto.avatarUrl,
          city: dto.city,
          state: dto.state,
        };
      });
  }
}

