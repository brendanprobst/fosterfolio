import { resolveUser } from '@api/application/resolveUser';
import type { PetPublicDto } from '@api/domain/entities/Pet';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export class ListPetsByOwnerUseCase {
  constructor(
    private readonly petRepository: IPetRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(ownerId: string): Promise<Result<PetPublicDto[]>> {
    try {
      const owner = await resolveUser(this.userRepository, ownerId);
      if (!owner) {
        return Result.failure(ErrorCatalog.USER_NOT_FOUND);
      }
      const pets = await this.petRepository.listByOwnerId(owner.id);
      return Result.success(pets.map((p) => p.toPublicDto([])));
    } catch (error) {
      logUnexpectedError('ListPetsByOwnerUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
