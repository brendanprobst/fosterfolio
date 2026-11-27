import { canonicalHandleFor, resolveUser } from '@api/application/resolveUser';
import type { UserOwnerDto, UserPublicDto } from '@api/domain/entities/User';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export class GetUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(
    id: string,
    actorId?: string | null
  ): Promise<Result<UserPublicDto | UserOwnerDto>> {
    try {
      const user = await resolveUser(this.userRepository, id);
      if (!user) {
        return Result.failure(ErrorCatalog.USER_NOT_FOUND);
      }
      const starCount = await this.userRepository.countStars(user.id);
      const canonicalHandle = canonicalHandleFor(id, user);
      const dto =
        actorId && actorId === user.id
          ? user.toOwnerDto(starCount)
          : user.toPublicDto(starCount);
      return Result.success(canonicalHandle ? { ...dto, canonicalHandle } : dto);
    } catch (error) {
      logUnexpectedError('GetUserUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
