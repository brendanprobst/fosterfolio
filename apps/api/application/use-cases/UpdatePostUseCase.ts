import type { PostOwnerDto } from '@api/domain/entities/Post';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IPostRepository } from '@api/domain/repositories/IPostRepository';

export type UpdatePostCommand = {
  bodyText?: string | null;
  imageUrl?: string | null;
  geoLock?: string;
};

export class UpdatePostUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(
    actorId: string,
    postId: string,
    input: UpdatePostCommand
  ): Promise<Result<PostOwnerDto>> {
    try {
      const row = await this.postRepository.findById(postId);
      if (!row) {
        return Result.failure(ErrorCatalog.POST_NOT_FOUND);
      }
      if (!row.post.isOwnedBy(actorId)) {
        return Result.failure(ErrorCatalog.POST_FORBIDDEN);
      }

      row.post.applyUpdate({
        ...(input.bodyText !== undefined ? { bodyText: input.bodyText } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.geoLock !== undefined ? { geoLock: input.geoLock } : {}),
      });
      await this.postRepository.save(row.post);
      return Result.success(
        row.post.toOwnerDto({
          name: row.petName,
          primaryPhotoUrl: row.petPrimaryPhotoUrl,
        })
      );
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
