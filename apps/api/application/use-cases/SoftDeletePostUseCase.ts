import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IPostRepository } from '@api/domain/repositories/IPostRepository';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export class SoftDeletePostUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(actorId: string, postId: string): Promise<Result<void>> {
    try {
      const row = await this.postRepository.findById(postId);
      if (!row) {
        return Result.failure(ErrorCatalog.POST_NOT_FOUND);
      }
      if (!row.post.isOwnedBy(actorId)) {
        return Result.failure(ErrorCatalog.POST_FORBIDDEN);
      }
      row.post.softDelete();
      await this.postRepository.save(row.post);
      return Result.success(undefined);
    } catch (error) {
      logUnexpectedError('SoftDeletePostUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
