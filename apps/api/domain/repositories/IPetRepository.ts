import type { Pet } from '@api/domain/entities/Pet';
import type { PetUpdateSummaryDto } from '@api/domain/entities/Pet';

export type CreatePetInput = {
  ownerId: string;
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
  importantLinks?: { label: string; url: string }[] | null;
};

export interface IPetRepository {
  findById(id: string): Promise<Pet | null>;
  listByOwnerId(ownerId: string): Promise<Pet[]>;
  create(input: CreatePetInput): Promise<Pet>;
  save(pet: Pet): Promise<void>;
  listPetUpdates(petId: string): Promise<PetUpdateSummaryDto[]>;
}
