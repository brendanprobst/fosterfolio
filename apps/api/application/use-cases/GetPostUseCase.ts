import type { PostPublicDto } from '@api/domain/entities/Post';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IPostRepository } from '@api/domain/repositories/IPostRepository';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export class GetPostUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(id: string): Promise<Result<PostPublicDto>> {
    try {
      const row = await this.postRepository.findById(id);
      if (!row) {
        return Result.failure(ErrorCatalog.POST_NOT_FOUND);
      }
      return Result.success(
        row.post.toPublicDto({
          name: row.petName,
          primaryPhotoUrl: row.petPrimaryPhotoUrl,
          authorHandle: row.authorHandle,
        })
      );
    } catch (error) {
      logUnexpectedError('GetPostUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
