import type { User } from '@api/domain/entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  /** Active users only (`deleted_at` is null). Handle must already be lowercase. */
  findByHandle(handle: string): Promise<User | null>;
  /** The ids among `ids` that belong to active users. */
  listActiveIds(ids: string[]): Promise<Set<string>>;
  /**
   * True when any row — including soft-deleted — already owns this handle.
   * Unique index covers deleted accounts, so a taken handle stays reserved.
   */
  isHandleTaken(handle: string, exceptUserId?: string): Promise<boolean>;
  save(user: User): Promise<void>;
  countStars(userId: string): Promise<number>;
}
