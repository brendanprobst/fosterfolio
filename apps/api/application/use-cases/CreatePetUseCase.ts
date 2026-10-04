import type { ImportantLink, PetOwnerDto, PetPhoto } from '@api/domain/entities/Pet';
import { isPetSpecies, normalizePetPhotos } from '@api/domain/entities/Pet';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';

export type CreatePetCommand = {
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
  photos?: PetPhoto[] | null;
  bioMarkdown?: string | null;
  importantLinks?: ImportantLink[] | null;
};

export class CreatePetUseCase {
  constructor(private readonly petRepository: IPetRepository) {}

  async execute(ownerId: string, input: CreatePetCommand): Promise<Result<PetOwnerDto>> {
    const name = input.name?.trim() ?? '';
    if (!name) {
      return Result.failure(ErrorCatalog.PET_NAME_REQUIRED);
    }
    if (!isPetSpecies(input.species)) {
      return Result.failure(ErrorCatalog.PET_SPECIES_INVALID);
    }

    let photos: PetPhoto[] | undefined;
    let primaryPhotoUrl = input.primaryPhotoUrl;
    if (input.photos !== undefined) {
      const normalized = normalizePetPhotos(input.photos);
      if (!normalized.ok) {
        return Result.failure(
          normalized.reason === 'limit'
            ? ErrorCatalog.PET_PHOTOS_LIMIT
            : ErrorCatalog.PET_PHOTOS_INVALID
        );
      }
      photos = normalized.photos;
      primaryPhotoUrl = normalized.photos[0]?.url ?? null;
    }

    try {
      const pet = await this.petRepository.create({
        ownerId,
        name,
        species: input.species,
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
        ...(primaryPhotoUrl !== undefined ? { primaryPhotoUrl } : {}),
        ...(photos !== undefined ? { photos } : {}),
        ...(input.bioMarkdown !== undefined
          ? { bioMarkdown: input.bioMarkdown }
          : {}),
        ...(input.importantLinks !== undefined
          ? { importantLinks: input.importantLinks }
          : {}),
      });
      return Result.success(pet.toOwnerDto([]));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
