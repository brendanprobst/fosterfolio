import { User, type SocialLink } from '@api/domain/entities/User';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { isUuid } from '@api/domain/value-objects/UserHandle';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { chunk, inList } from '@api/infrastructure/adapters/dataAdapter/postgrestFilters';

type UserRecord = {
  id: string;
  email: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  zip_code: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  social_links: SocialLink[] | null;
  shelters_text: string | null;
  created_at: string;
  deleted_at: string | null;
};

const USER_SELECT =
  'id,email,handle,display_name,avatar_url,bio,zip_code,city,state,lat,lng,social_links,shelters_text,created_at,deleted_at';

function toUser(row: UserRecord): User {
  return new User({
    id: row.id,
    email: row.email,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    zipCode: row.zip_code,
    city: row.city,
    state: row.state,
    lat: row.lat,
    lng: row.lng,
    socialLinks: Array.isArray(row.social_links) ? row.social_links : [],
    sheltersText: row.shelters_text,
    createdAt: new Date(row.created_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  });
}

export class UserRepository implements IUserRepository {
  private readonly table: string;
  private readonly starsTable: string;
  private readonly aliasesTable: string;
  private readonly handleChangesTable: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_USERS_TABLE?.trim() || 'users';
    this.starsTable = process.env.SUPABASE_PROFILE_STARS_TABLE?.trim() || 'profile_stars';
    this.aliasesTable = process.env.SUPABASE_USER_HANDLE_ALIASES_TABLE?.trim() || 'user_handle_aliases';
    this.handleChangesTable =
      process.env.SUPABASE_USER_HANDLE_CHANGES_TABLE?.trim() || 'user_handle_changes';
  }

  async findById(id: string): Promise<User | null> {
    // The id column is uuid; a non-uuid (e.g. a mistyped handle) can never match and would make Postgres error.
    if (!isUuid(id)) return null;
    const rows = await this.dataAdapter.get<UserRecord[]>(
      `${this.table}?select=${USER_SELECT}&id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`
    );
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async listActiveIds(ids: string[]): Promise<Set<string>> {
    const active = new Set<string>();
    for (const batch of chunk([...new Set(ids)])) {
      const rows = await this.dataAdapter.get<Array<{ id: string }>>(
        `${this.table}?select=id&id=in.${inList(batch)}&deleted_at=is.null`
      );
      for (const row of rows) active.add(row.id);
    }
    return active;
  }

  async findByHandle(handle: string): Promise<User | null> {
    const rows = await this.dataAdapter.get<UserRecord[]>(
      `${this.table}?select=${USER_SELECT}&handle=eq.${encodeURIComponent(handle)}&deleted_at=is.null&limit=1`
    );
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async isHandleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
    let path = `${this.table}?select=id&handle=eq.${encodeURIComponent(handle)}&limit=1`;
    if (exceptUserId) {
      path += `&id=neq.${encodeURIComponent(exceptUserId)}`;
    }
    const rows = await this.dataAdapter.get<Array<{ id: string }>>(path);
    return rows.length > 0;
  }

  async findAliasOwner(handle: string): Promise<string | null> {
    const rows = await this.dataAdapter.get<Array<{ user_id: string }>>(
      `${this.aliasesTable}?select=user_id&handle=eq.${encodeURIComponent(handle)}&limit=1`
    );
    return rows[0]?.user_id ?? null;
  }

  async recordAlias(handle: string, userId: string): Promise<void> {
    await this.dataAdapter.post(
      `${this.aliasesTable}?on_conflict=handle`,
      [{ handle, user_id: userId }],
      { headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' } }
    );
  }

  async countHandleChangesSince(userId: string, since: Date): Promise<number> {
    const { count } = await this.dataAdapter.getWithCount<unknown[]>(
      `${this.handleChangesTable}?select=user_id&user_id=eq.${encodeURIComponent(userId)}&changed_at=gte.${encodeURIComponent(since.toISOString())}`
    );
    return count ?? 0;
  }

  async oldestHandleChangeSince(userId: string, since: Date): Promise<Date | null> {
    const rows = await this.dataAdapter.get<Array<{ changed_at: string }>>(
      `${this.handleChangesTable}?select=changed_at&user_id=eq.${encodeURIComponent(userId)}&changed_at=gte.${encodeURIComponent(since.toISOString())}&order=changed_at.asc&limit=1`
    );
    return rows[0] ? new Date(rows[0].changed_at) : null;
  }

  async recordHandleChange(userId: string, at: Date): Promise<void> {
    await this.dataAdapter.post(
      this.handleChangesTable,
      [{ user_id: userId, changed_at: at.toISOString() }],
      { headers: { Prefer: 'return=minimal' } }
    );
  }

  async save(user: User): Promise<void> {
    const row = user.toPersistence();
    await this.dataAdapter.post(
      `${this.table}?on_conflict=id`,
      [row],
      {
        headers: {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
      }
    );
  }

  async countStars(userId: string): Promise<number> {
    const { count } = await this.dataAdapter.getWithCount<unknown[]>(
      `${this.starsTable}?select=id&starred_user_id=eq.${encodeURIComponent(userId)}`
    );
    return count ?? 0;
  }
}
