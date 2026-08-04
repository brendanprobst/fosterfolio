import type { PetPublicDto } from '@api/domain/entities/Pet';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

export class ListPetsByOwnerUseCase {
  constructor(
    private readonly petRepository: IPetRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(ownerId: string): Promise<Result<PetPublicDto[]>> {
    try {
      const owner = await this.userRepository.findById(ownerId);
      if (!owner) {
        return Result.failure(ErrorCatalog.USER_NOT_FOUND);
      }
      const pets = await this.petRepository.listByOwnerId(ownerId);
      return Result.success(pets.map((p) => p.toPublicDto([])));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
