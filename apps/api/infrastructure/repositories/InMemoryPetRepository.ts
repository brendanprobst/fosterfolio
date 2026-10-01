import { randomUUID } from 'crypto';
import {
  Pet,
  type PetUpdateSummaryDto,
  isPetSpecies,
} from '@api/domain/entities/Pet';
import type {
  CreatePetInput,
  IPetRepository,
} from '@api/domain/repositories/IPetRepository';

export class InMemoryPetRepository implements IPetRepository {
  private readonly pets = new Map<string, Pet>();
  private readonly updates = new Map<string, PetUpdateSummaryDto[]>();

  seed(pet: Pet, updates: PetUpdateSummaryDto[] = []): void {
    this.pets.set(pet.id, pet);
    this.updates.set(pet.id, updates);
  }

  async findById(id: string): Promise<Pet | null> {
    const pet = this.pets.get(id) ?? null;
    if (!pet || pet.deletedAt) return null;
    return pet;
  }

  async listByOwnerId(ownerId: string): Promise<Pet[]> {
    return Array.from(this.pets.values())
      .filter((p) => p.ownerId === ownerId && !p.deletedAt)
      .sort((a, b) => b.toListDto().createdAt.localeCompare(a.toListDto().createdAt));
  }

  async create(input: CreatePetInput): Promise<Pet> {
    if (!isPetSpecies(input.species)) {
      throw new Error('invalid species');
    }
    const now = new Date();
    const pet = new Pet({
      id: randomUUID(),
      ownerId: input.ownerId,
      name: input.name.trim(),
      species: input.species,
      breed: input.breed ?? null,
      ageValue: input.ageValue ?? null,
      ageUnit: input.ageUnit ?? null,
      sex: input.sex ?? null,
      size: input.size ?? null,
      status: input.status?.trim() || 'actively_fostering',
      subStatus: input.subStatus ?? null,
      shelterLinkName: input.shelterLinkName ?? null,
      shelterLinkUrl: input.shelterLinkUrl ?? null,
      primaryPhotoUrl: input.primaryPhotoUrl ?? null,
      photos: input.photos ?? [],
      bioMarkdown: input.bioMarkdown ?? null,
      importantLinks: input.importantLinks ?? [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    this.pets.set(pet.id, pet);
    return pet;
  }

  async save(pet: Pet): Promise<void> {
    this.pets.set(pet.id, pet);
  }

  async listPetUpdates(petId: string): Promise<PetUpdateSummaryDto[]> {
    return this.updates.get(petId) ?? [];
  }

  /** Test/search helper — not part of IPetRepository. */
  async listAllForSearch(): Promise<
    Array<{
      id: string;
      name: string;
      species: string;
      primaryPhotoUrl: string | null;
      ownerId: string;
    }>
  > {
    return Array.from(this.pets.values())
      .filter((p) => !p.deletedAt)
      .map((p) => {
        const dto = p.toListDto();
        return {
          id: dto.id,
          name: dto.name,
          species: dto.species,
          primaryPhotoUrl: dto.primaryPhotoUrl,
          ownerId: dto.ownerId,
        };
      });
  }
}

