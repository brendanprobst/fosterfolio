import type {
  ISearchRepository,
  SearchPetHit,
  SearchUserHit,
} from '@api/domain/repositories/ISearchRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

type HandleEmbed = { handle: string | null } | { handle: string | null }[] | null;

type PetRow = {
  id: string;
  name: string;
  species: string;
  primary_photo_url: string | null;
  owner_id: string;
  owner?: HandleEmbed;
};

type UserRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
};

function embedHandle(value: HandleEmbed | undefined): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return row?.handle ?? null;
}

/**
 * Full-text search via PostgREST websearch (`wfts`) against generated search_vector columns.
 */
export class SearchRepository implements ISearchRepository {
  private readonly petsTable: string;
  private readonly usersTable: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.petsTable = process.env.SUPABASE_PETS_TABLE?.trim() || 'pets';
    this.usersTable = process.env.SUPABASE_USERS_TABLE?.trim() || 'users';
  }

  async searchPets(query: string, limit: number): Promise<SearchPetHit[]> {
    const q = encodeURIComponent(query);
    const rows = await this.dataAdapter.get<PetRow[]>(
      `${this.petsTable}?select=id,name,species,primary_photo_url,owner_id,owner:users!owner_id(handle)&deleted_at=is.null&search_vector=wfts.${q}&limit=${limit}`
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      species: row.species,
      primaryPhotoUrl: row.primary_photo_url,
      ownerId: row.owner_id,
      ownerHandle: embedHandle(row.owner),
    }));
  }

  async searchUsers(query: string, limit: number): Promise<SearchUserHit[]> {
    const q = encodeURIComponent(query);
    const rows = await this.dataAdapter.get<UserRow[]>(
      `${this.usersTable}?select=id,handle,display_name,avatar_url,city,state&deleted_at=is.null&search_vector=wfts.${q}&limit=${limit}`
    );
    return rows.map((row) => ({
      id: row.id,
      handle: row.handle,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      city: row.city,
      state: row.state,
    }));
  }
}
