import type { PetPublicDto } from '@api/domain/entities/Pet';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';

export class GetPetUseCase {
  constructor(private readonly petRepository: IPetRepository) {}

  async execute(id: string): Promise<Result<PetPublicDto>> {
    try {
      const pet = await this.petRepository.findById(id);
      if (!pet) {
        return Result.failure(ErrorCatalog.PET_NOT_FOUND);
      }
      const updates = await this.petRepository.listPetUpdates(id);
      return Result.success(pet.toPublicDto(updates));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
