export const PET_SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'other'] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];

export type ImportantLink = { label: string; url: string };

export const MAX_PET_PHOTOS = 10;

export type PetPhoto = { url: string };

export function normalizePetPhotos(
  input: unknown
): { ok: true; photos: PetPhoto[] } | { ok: false; reason: 'invalid' | 'limit' } {
  if (input == null) return { ok: true, photos: [] };
  if (!Array.isArray(input)) return { ok: false, reason: 'invalid' };
  const photos: PetPhoto[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object' || !('url' in item)) {
      return { ok: false, reason: 'invalid' };
    }
    const url = (item as { url: unknown }).url;
    if (typeof url !== 'string') return { ok: false, reason: 'invalid' };
    const trimmed = url.trim();
    if (!trimmed) continue;
    photos.push({ url: trimmed });
  }
  if (photos.length > MAX_PET_PHOTOS) return { ok: false, reason: 'limit' };
  return { ok: true, photos };
}

export type PetMetaDto = {
  title: string;
  description: string;
  imageUrl: string | null;
};

export type PetUpdateSummaryDto = {
  id: string;
  bodyText: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Nested on GET /pets/:id so the bio page is one round-trip (plan §4). */
export type PetOwnerSummaryDto = {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type PetPublicDto = {
  id: string;
  ownerId: string;
  owner: PetOwnerSummaryDto | null;
  name: string;
  species: PetSpecies;
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
  photos: PetPhoto[];
  bioMarkdown: string | null;
  importantLinks: ImportantLink[];
  createdAt: string;
  updatedAt: string;
  meta: PetMetaDto;
  updates: PetUpdateSummaryDto[];
};

export type PetOwnerDto = PetPublicDto;

export type PetProps = {
  id: string;
  ownerId: string;
  name: string;
  species: PetSpecies;
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
  photos: PetPhoto[];
  bioMarkdown: string | null;
  importantLinks: ImportantLink[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export function isPetSpecies(value: string): value is PetSpecies {
  return (PET_SPECIES as readonly string[]).includes(value);
}

function buildMeta(pet: PetProps): PetMetaDto {
  const bio = pet.bioMarkdown?.trim() ?? '';
  const description =
    bio.length === 0
      ? `${pet.name} is looking for a forever home.`
      : bio.length > 200
        ? `${bio.slice(0, 197)}...`
        : bio;
  return {
    title: `${pet.name} · Fosterfolio`,
    description,
    imageUrl: pet.primaryPhotoUrl,
  };
}

export class Pet {
  constructor(private props: PetProps) {}

  get id(): string {
    return this.props.id;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  softDelete(at = new Date()): void {
    this.props.deletedAt = at;
  }

  applyUpdate(input: {
    name?: string;
    species?: PetSpecies;
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
    photos?: PetPhoto[];
    bioMarkdown?: string | null;
    importantLinks?: ImportantLink[] | null;
  }): void {
    if (input.name !== undefined) this.props.name = input.name.trim();
    if (input.species !== undefined) this.props.species = input.species;
    if (input.breed !== undefined) {
      this.props.breed = input.breed === null ? null : input.breed.trim() || null;
    }
    if (input.ageValue !== undefined) this.props.ageValue = input.ageValue;
    if (input.ageUnit !== undefined) {
      this.props.ageUnit =
        input.ageUnit === null ? null : input.ageUnit.trim() || null;
    }
    if (input.sex !== undefined) {
      this.props.sex = input.sex === null ? null : input.sex.trim() || null;
    }
    if (input.size !== undefined) {
      this.props.size = input.size === null ? null : input.size.trim() || null;
    }
    if (input.status !== undefined) this.props.status = input.status.trim();
    if (input.subStatus !== undefined) {
      this.props.subStatus =
        input.subStatus === null ? null : input.subStatus.trim() || null;
    }
    if (input.shelterLinkName !== undefined) {
      this.props.shelterLinkName =
        input.shelterLinkName === null
          ? null
          : input.shelterLinkName.trim() || null;
    }
    if (input.shelterLinkUrl !== undefined) {
      this.props.shelterLinkUrl =
        input.shelterLinkUrl === null
          ? null
          : input.shelterLinkUrl.trim() || null;
    }
    if (input.photos !== undefined) {
      this.props.photos = input.photos;
      this.props.primaryPhotoUrl = input.photos[0]?.url ?? null;
    } else if (input.primaryPhotoUrl !== undefined) {
      this.props.primaryPhotoUrl =
        input.primaryPhotoUrl === null
          ? null
          : input.primaryPhotoUrl.trim() || null;
    }
    if (input.bioMarkdown !== undefined) {
      this.props.bioMarkdown =
        input.bioMarkdown === null ? null : input.bioMarkdown.trim() || null;
    }
    if (input.importantLinks !== undefined) {
      this.props.importantLinks = input.importantLinks ?? [];
    }
    this.props.updatedAt = new Date();
  }

  toPublicDto(
    updates: PetUpdateSummaryDto[] = [],
    owner: PetOwnerSummaryDto | null = null
  ): PetPublicDto {
    return {
      id: this.props.id,
      ownerId: this.props.ownerId,
      owner,
      name: this.props.name,
      species: this.props.species,
      breed: this.props.breed,
      ageValue: this.props.ageValue,
      ageUnit: this.props.ageUnit,
      sex: this.props.sex,
      size: this.props.size,
      status: this.props.status,
      subStatus: this.props.subStatus,
      shelterLinkName: this.props.shelterLinkName,
      shelterLinkUrl: this.props.shelterLinkUrl,
      primaryPhotoUrl: this.props.primaryPhotoUrl,
      photos: this.props.photos,
      bioMarkdown: this.props.bioMarkdown,
      importantLinks: this.props.importantLinks,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      meta: buildMeta(this.props),
      updates,
    };
  }

  toOwnerDto(
    updates: PetUpdateSummaryDto[] = [],
    owner: PetOwnerSummaryDto | null = null
  ): PetOwnerDto {
    return this.toPublicDto(updates, owner);
  }

  /** List card without nested updates/meta bulk. */
  toListDto(): Omit<PetPublicDto, 'updates' | 'meta'> & { meta: PetMetaDto } {
    const full = this.toPublicDto([]);
    const { updates: _u, ...rest } = full;
    return rest;
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this.props.id,
      owner_id: this.props.ownerId,
      name: this.props.name,
      species: this.props.species,
      breed: this.props.breed,
      age_value: this.props.ageValue,
      age_unit: this.props.ageUnit,
      sex: this.props.sex,
      size: this.props.size,
      status: this.props.status,
      sub_status: this.props.subStatus,
      shelter_link_name: this.props.shelterLinkName,
      shelter_link_url: this.props.shelterLinkUrl,
      primary_photo_url: this.props.primaryPhotoUrl,
      photos: this.props.photos,
      bio_markdown: this.props.bioMarkdown,
      important_links: this.props.importantLinks,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
      deleted_at: this.props.deletedAt?.toISOString() ?? null,
    };
  }
}
