import type { PetUpdateSummaryDto } from '@api/domain/entities/Pet';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';

export class GetPetUpdatesUseCase {
  constructor(private readonly petRepository: IPetRepository) {}

  async execute(petId: string): Promise<Result<PetUpdateSummaryDto[]>> {
    try {
      const pet = await this.petRepository.findById(petId);
      if (!pet) {
        return Result.failure(ErrorCatalog.PET_NOT_FOUND);
      }
      const updates = await this.petRepository.listPetUpdates(petId);
      return Result.success(updates);
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
