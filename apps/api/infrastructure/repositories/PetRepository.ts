import {
  Pet,
  type ImportantLink,
  type PetPhoto,
  type PetSpecies,
  type PetUpdateSummaryDto,
  isPetSpecies,
} from '@api/domain/entities/Pet';
import type {
  CreatePetInput,
  IPetRepository,
} from '@api/domain/repositories/IPetRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

type PetRecord = {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed: string | null;
  age_value: number | null;
  age_unit: string | null;
  sex: string | null;
  size: string | null;
  status: string;
  sub_status: string | null;
  shelter_link_name: string | null;
  shelter_link_url: string | null;
  primary_photo_url: string | null;
  photos: PetPhoto[] | null;
  bio_markdown: string | null;
  important_links: ImportantLink[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type PostUpdateRecord = {
  id: string;
  body_text: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

const PET_SELECT =
  'id,owner_id,name,species,breed,age_value,age_unit,sex,size,status,sub_status,shelter_link_name,shelter_link_url,primary_photo_url,photos,bio_markdown,important_links,created_at,updated_at,deleted_at';

function toPet(row: PetRecord): Pet {
  const species = isPetSpecies(row.species) ? row.species : 'other';
  return new Pet({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    species,
    breed: row.breed,
    ageValue: row.age_value,
    ageUnit: row.age_unit,
    sex: row.sex,
    size: row.size,
    status: row.status,
    subStatus: row.sub_status,
    shelterLinkName: row.shelter_link_name,
    shelterLinkUrl: row.shelter_link_url,
    primaryPhotoUrl: row.primary_photo_url,
    photos: Array.isArray(row.photos) ? row.photos : [],
    bioMarkdown: row.bio_markdown,
    importantLinks: Array.isArray(row.important_links) ? row.important_links : [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  });
}

export class PetRepository implements IPetRepository {
  private readonly table: string;
  private readonly postsTable: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_PETS_TABLE?.trim() || 'pets';
    this.postsTable = process.env.SUPABASE_POSTS_TABLE?.trim() || 'posts';
  }

  async findById(id: string): Promise<Pet | null> {
    const rows = await this.dataAdapter.get<PetRecord[]>(
      `${this.table}?select=${PET_SELECT}&id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`
    );
    const row = rows[0];
    return row ? toPet(row) : null;
  }

  async listByOwnerId(ownerId: string): Promise<Pet[]> {
    const rows = await this.dataAdapter.get<PetRecord[]>(
      `${this.table}?select=${PET_SELECT}&owner_id=eq.${encodeURIComponent(ownerId)}&deleted_at=is.null&order=created_at.desc`
    );
    return rows.map(toPet);
  }

  async create(input: CreatePetInput): Promise<Pet> {
    const payload = {
      owner_id: input.ownerId,
      name: input.name.trim(),
      species: input.species as PetSpecies,
      breed: input.breed ?? null,
      age_value: input.ageValue ?? null,
      age_unit: input.ageUnit ?? null,
      sex: input.sex ?? null,
      size: input.size ?? null,
      status: input.status?.trim() || 'actively_fostering',
      sub_status: input.subStatus ?? null,
      shelter_link_name: input.shelterLinkName ?? null,
      shelter_link_url: input.shelterLinkUrl ?? null,
      primary_photo_url: input.primaryPhotoUrl ?? null,
      photos: input.photos ?? [],
      bio_markdown: input.bioMarkdown ?? null,
      important_links: input.importantLinks ?? [],
    };

    const rows = await this.dataAdapter.insertReturning<PetRecord[]>(
      this.table,
      [payload]
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Pet insert returned no row');
    }
    return toPet(row);
  }

  async save(pet: Pet): Promise<void> {
    const row = pet.toPersistence();
    const { id, ...rest } = row;
    await this.dataAdapter.update(
      `${this.table}?id=eq.${encodeURIComponent(String(id))}`,
      rest,
      {
        headers: {
          Prefer: 'return=minimal',
        },
      }
    );
  }

  async listPetUpdates(petId: string): Promise<PetUpdateSummaryDto[]> {
    const rows = await this.dataAdapter.get<PostUpdateRecord[]>(
      `${this.postsTable}?select=id,body_text,image_url,created_at,updated_at&pet_id=eq.${encodeURIComponent(petId)}&post_type=eq.pet_update&deleted_at=is.null&order=created_at.desc`
    );
    return rows.map((row) => ({
      id: row.id,
      bodyText: row.body_text,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
