import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export class SoftDeletePetUseCase {
  constructor(private readonly petRepository: IPetRepository) {}

  async execute(actorId: string, petId: string): Promise<Result<void>> {
    try {
      const pet = await this.petRepository.findById(petId);
      if (!pet) {
        return Result.failure(ErrorCatalog.PET_NOT_FOUND);
      }
      if (!pet.isOwnedBy(actorId)) {
        return Result.failure(ErrorCatalog.PET_FORBIDDEN);
      }
      pet.softDelete();
      await this.petRepository.save(pet);
      return Result.success(undefined);
    } catch (error) {
      logUnexpectedError('SoftDeletePetUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
