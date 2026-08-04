import type { UserPublicDto } from '@api/domain/entities/User';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

export class GetUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<Result<UserPublicDto>> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return Result.failure(ErrorCatalog.USER_NOT_FOUND);
      }
      const starCount = await this.userRepository.countStars(id);
      return Result.success(user.toPublicDto(starCount));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
