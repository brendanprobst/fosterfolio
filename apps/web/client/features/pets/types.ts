/** Mirrors public pet API shapes used by the bio page. */

export const PET_SPECIES = ["dog", "cat", "rabbit", "bird", "other"] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];

export const PET_STATUSES = [
  "actively_fostering",
  "available",
  "adopted",
  "medical_hold",
] as const;

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

export type PetOwnerSummary = {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ImportantLink = { label: string; url: string };

export type PetPublic = {
  id: string;
  ownerId: string;
  owner: PetOwnerSummary | null;
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
  importantLinks: ImportantLink[];
  createdAt: string;
  updatedAt: string;
  meta: PetMeta;
  updates: PetUpdateSummary[];
};

export type PetWritePayload = {
  name: string;
  species: string;
  breed?: string | null;
  ageValue?: number | null;
  ageUnit?: string | null;
  sex?: string | null;
  size?: string | null;
  status?: string;
  subStatus?: string | null;
  shelterLinkName?: string | null;
  shelterLinkUrl?: string | null;
  primaryPhotoUrl?: string | null;
  bioMarkdown?: string | null;
  importantLinks?: ImportantLink[] | null;
};
