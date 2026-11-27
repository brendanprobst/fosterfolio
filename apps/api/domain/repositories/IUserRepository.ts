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
  /**
   * The id of the user who owns `handle` as a former handle, or null.
   * Aliases are reserved forever for their original owner.
   */
  findAliasOwner(handle: string): Promise<string | null>;
  /** Reserve `handle` for `userId`. A handle that already has an owner keeps it. */
  recordAlias(handle: string, userId: string): Promise<void>;
  /** How many handle changes `userId` made at or after `since`. */
  countHandleChangesSince(userId: string, since: Date): Promise<number>;
  /** The earliest handle change by `userId` at or after `since`, or null. */
  oldestHandleChangeSince(userId: string, since: Date): Promise<Date | null>;
  recordHandleChange(userId: string, at: Date): Promise<void>;
  save(user: User): Promise<void>;
  countStars(userId: string): Promise<number>;
}
