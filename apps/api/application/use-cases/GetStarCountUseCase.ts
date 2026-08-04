import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IStarRepository } from '@api/domain/repositories/IStarRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

export class GetStarCountUseCase {
  constructor(
    private readonly starRepository: IStarRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(
    starredUserId: string
  ): Promise<Result<{ starCount: number }>> {
    try {
      const user = await this.userRepository.findById(starredUserId);
      if (!user) {
        return Result.failure(ErrorCatalog.STAR_USER_NOT_FOUND);
      }
      const starCount = await this.starRepository.countStars(starredUserId);
      return Result.success({ starCount });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
