/** Mirrors public pet API shapes used by the bio page. */

export type PetMeta = {
  title: string;
  description: string;
  imageUrl: string | null;
};

export type PetUpdateSummary = {
  id: string;
  bodyText: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PetPublic = {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string | null;
  ageValue: number | null;
  ageUnit: string | null;
  sex: string | null;
  size: string | null;
  status: string;
  subStatus: string | null;
  shelterLinkName: string | null;
  shelterLinkUrl: string | null;
  primaryPhotoUrl: string | null;
  bioMarkdown: string | null;
  importantLinks: Array<{ label: string; url: string }>;
  createdAt: string;
  updatedAt: string;
  meta: PetMeta;
  updates: PetUpdateSummary[];
};
