import type {
  AddStarResult,
  IStarRepository,
} from '@api/domain/repositories/IStarRepository';
import type { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';

export class InMemoryStarRepository implements IStarRepository {
  private readonly keys = new Set<string>();

  constructor(private readonly userRepository?: InMemoryUserRepository) {}

  private key(starredUserId: string, sessionToken: string): string {
    return `${starredUserId}:${sessionToken}`;
  }

  private syncUserCount(starredUserId: string, count: number): void {
    this.userRepository?.setStarCount(starredUserId, count);
  }

  /** Align seeded star counts with the star store used by GetStarCount. */
  seedCount(starredUserId: string, count: number): void {
    for (const k of [...this.keys]) {
      if (k.startsWith(`${starredUserId}:`)) this.keys.delete(k);
    }
    for (let i = 0; i < count; i += 1) {
      this.keys.add(this.key(starredUserId, `seed-token-${i}`));
    }
    this.syncUserCount(starredUserId, count);
  }

  async addStar(input: {
    starredUserId: string;
    sessionToken: string;
    starrerUserId?: string | null;
  }): Promise<AddStarResult> {
    void input.starrerUserId;
    const k = this.key(input.starredUserId, input.sessionToken);
    const created = !this.keys.has(k);
    if (created) {
      this.keys.add(k);
    }
    const starCount = await this.countStars(input.starredUserId);
    this.syncUserCount(input.starredUserId, starCount);
    return { created, starCount };
  }

  async countStars(starredUserId: string): Promise<number> {
    let count = 0;
    for (const k of this.keys) {
      if (k.startsWith(`${starredUserId}:`)) count += 1;
    }
    return count;
  }
}

