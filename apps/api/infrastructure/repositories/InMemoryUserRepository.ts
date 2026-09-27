import { User } from '@api/domain/entities/User';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();
  private readonly starCounts = new Map<string, number>();

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

  async isHandleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.handle !== handle) continue;
      if (exceptUserId && user.id === exceptUserId) continue;
      return true;
    }
    return false;
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
          displayName: dto.displayName,
          avatarUrl: dto.avatarUrl,
          city: dto.city,
          state: dto.state,
        };
      });
  }
}

