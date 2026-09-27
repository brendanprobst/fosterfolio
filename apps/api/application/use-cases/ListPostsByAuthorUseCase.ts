import { resolveUser } from '@api/application/resolveUser';
import type { PostPublicDto } from '@api/domain/entities/Post';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IPostRepository } from '@api/domain/repositories/IPostRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

/** Public profile posts: general only (excludes pet_update). */
export class ListPostsByAuthorUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(authorId: string): Promise<Result<PostPublicDto[]>> {
    try {
      const user = await resolveUser(this.userRepository, authorId);
      if (!user) {
        return Result.failure(ErrorCatalog.USER_NOT_FOUND);
      }
      const rows = await this.postRepository.listByAuthorId(user.id, {
        excludePetUpdates: true,
      });
      return Result.success(
        rows.map((row) =>
          row.post.toPublicDto({
            name: row.petName,
            primaryPhotoUrl: row.petPrimaryPhotoUrl,
            authorHandle: row.authorHandle ?? user.handle,
          })
        )
      );
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
