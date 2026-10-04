import type {
  AddStarResult,
  IStarRepository,
} from '@api/domain/repositories/IStarRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

export class StarRepository implements IStarRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table =
      process.env.SUPABASE_PROFILE_STARS_TABLE?.trim() || 'profile_stars';
  }

  async addStar(input: {
    starredUserId: string;
    sessionToken: string;
    starrerUserId?: string | null;
  }): Promise<AddStarResult> {
    const existing = await this.dataAdapter.get<{ id: string }[]>(
      `${this.table}?select=id&starred_user_id=eq.${encodeURIComponent(input.starredUserId)}&session_token=eq.${encodeURIComponent(input.sessionToken)}&limit=1`
    );
    if (existing[0]) {
      return {
        created: false,
        starCount: await this.countStars(input.starredUserId),
      };
    }

    try {
      await this.dataAdapter.insertReturning(`${this.table}`, [
        {
          starred_user_id: input.starredUserId,
          session_token: input.sessionToken,
          starrer_user_id: input.starrerUserId ?? null,
        },
      ]);
      return {
        created: true,
        starCount: await this.countStars(input.starredUserId),
      };
    } catch {
      // Unique race: treat as idempotent success.
      return {
        created: false,
        starCount: await this.countStars(input.starredUserId),
      };
    }
  }

  async countStars(starredUserId: string): Promise<number> {
    const { count } = await this.dataAdapter.getWithCount<unknown[]>(
      `${this.table}?select=id&starred_user_id=eq.${encodeURIComponent(starredUserId)}`
    );
    return count ?? 0;
  }
}
