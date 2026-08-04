import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IStarRepository } from '@api/domain/repositories/IStarRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

export type StarResultDto = {
  starred: true;
  created: boolean;
  starCount: number;
};

export class AddStarUseCase {
  constructor(
    private readonly starRepository: IStarRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(input: {
    starredUserId: string;
    sessionToken: string;
    starrerUserId?: string | null;
  }): Promise<Result<StarResultDto>> {
    const sessionToken = input.sessionToken?.trim() ?? '';
    if (!sessionToken) {
      return Result.failure(ErrorCatalog.STAR_INVALID_INPUT);
    }

    try {
      const user = await this.userRepository.findById(input.starredUserId);
      if (!user) {
        return Result.failure(ErrorCatalog.STAR_USER_NOT_FOUND);
      }

      const result = await this.starRepository.addStar({
        starredUserId: input.starredUserId,
        sessionToken,
        starrerUserId: input.starrerUserId ?? null,
      });
      return Result.success({
        starred: true,
        created: result.created,
        starCount: result.starCount,
      });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
