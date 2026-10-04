import type { PetOwnerSummaryDto, PetPublicDto } from '@api/domain/entities/Pet';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

export class GetPetUseCase {
  constructor(
    private readonly petRepository: IPetRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(id: string): Promise<Result<PetPublicDto>> {
    try {
      const pet = await this.petRepository.findById(id);
      if (!pet) {
        return Result.failure(ErrorCatalog.PET_NOT_FOUND);
      }
      const updates = await this.petRepository.listPetUpdates(id);
      const ownerUser = await this.userRepository.findById(pet.ownerId);
      let owner: PetOwnerSummaryDto | null = null;
      if (ownerUser) {
        const publicOwner = ownerUser.toPublicDto();
        owner = {
          id: publicOwner.id,
          handle: publicOwner.handle,
          displayName: publicOwner.displayName,
          avatarUrl: publicOwner.avatarUrl,
        };
      }
      return Result.success(pet.toPublicDto(updates, owner));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
