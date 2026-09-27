export type SearchPetHit = {
  id: string;
  name: string;
  species: string;
  primaryPhotoUrl: string | null;
  ownerId: string;
  ownerHandle: string | null;
};

export type SearchUserHit = {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
};

export interface ISearchRepository {
  searchPets(query: string, limit: number): Promise<SearchPetHit[]>;
  searchUsers(query: string, limit: number): Promise<SearchUserHit[]>;
}
