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

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async countStars(userId: string): Promise<number> {
    return this.starCounts.get(userId) ?? 0;
  }
}
