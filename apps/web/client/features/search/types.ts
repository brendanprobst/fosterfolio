export type SearchPetHit = {
  id: string;
  name: string;
  species: string;
  primaryPhotoUrl: string | null;
  ownerId: string;
};

export type SearchUserHit = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
};

export type SearchResult = {
  pets: SearchPetHit[];
  users: SearchUserHit[];
};
