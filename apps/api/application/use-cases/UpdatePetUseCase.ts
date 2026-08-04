import type { ImportantLink, PetOwnerDto, PetSpecies } from '@api/domain/entities/Pet';
import { isPetSpecies } from '@api/domain/entities/Pet';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';

export type UpdatePetCommand = {
  name?: string;
  species?: string;
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

export class UpdatePetUseCase {
  constructor(private readonly petRepository: IPetRepository) {}

  async execute(
    actorId: string,
    petId: string,
    input: UpdatePetCommand
  ): Promise<Result<PetOwnerDto>> {
    if (input.name !== undefined && !input.name.trim()) {
      return Result.failure(ErrorCatalog.PET_NAME_REQUIRED);
    }
    if (input.species !== undefined && !isPetSpecies(input.species)) {
      return Result.failure(ErrorCatalog.PET_SPECIES_INVALID);
    }

    try {
      const pet = await this.petRepository.findById(petId);
      if (!pet) {
        return Result.failure(ErrorCatalog.PET_NOT_FOUND);
      }
      if (!pet.isOwnedBy(actorId)) {
        return Result.failure(ErrorCatalog.PET_FORBIDDEN);
      }

      pet.applyUpdate({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.species !== undefined
          ? { species: input.species as PetSpecies }
          : {}),
        ...(input.breed !== undefined ? { breed: input.breed } : {}),
        ...(input.ageValue !== undefined ? { ageValue: input.ageValue } : {}),
        ...(input.ageUnit !== undefined ? { ageUnit: input.ageUnit } : {}),
        ...(input.sex !== undefined ? { sex: input.sex } : {}),
        ...(input.size !== undefined ? { size: input.size } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.subStatus !== undefined ? { subStatus: input.subStatus } : {}),
        ...(input.shelterLinkName !== undefined
          ? { shelterLinkName: input.shelterLinkName }
          : {}),
        ...(input.shelterLinkUrl !== undefined
          ? { shelterLinkUrl: input.shelterLinkUrl }
          : {}),
        ...(input.primaryPhotoUrl !== undefined
          ? { primaryPhotoUrl: input.primaryPhotoUrl }
          : {}),
        ...(input.bioMarkdown !== undefined
          ? { bioMarkdown: input.bioMarkdown }
          : {}),
        ...(input.importantLinks !== undefined
          ? { importantLinks: input.importantLinks }
          : {}),
      });
      await this.petRepository.save(pet);
      const updates = await this.petRepository.listPetUpdates(petId);
      return Result.success(pet.toOwnerDto(updates));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
