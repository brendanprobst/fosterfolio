import type { PostOwnerDto } from '@api/domain/entities/Post';
import { isPostType } from '@api/domain/entities/Post';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { IPostRepository } from '@api/domain/repositories/IPostRepository';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export type CreatePostCommand = {
  postType?: string;
  petId?: string | null;
  bodyText?: string | null;
  imageUrl?: string | null;
  geoLock?: string;
};

export class CreatePostUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly petRepository: IPetRepository
  ) {}

  async execute(
    authorId: string,
    input: CreatePostCommand
  ): Promise<Result<PostOwnerDto>> {
    const postTypeRaw = input.postType?.trim() || 'general';
    if (!isPostType(postTypeRaw)) {
      return Result.failure(ErrorCatalog.POST_TYPE_INVALID);
    }

    let petId: string | null = input.petId ?? null;
    let petMeta: { name: string | null; primaryPhotoUrl: string | null } | null =
      null;

    if (postTypeRaw === 'pet_update') {
      if (!petId) {
        return Result.failure(ErrorCatalog.POST_PET_REQUIRED);
      }
      const pet = await this.petRepository.findById(petId);
      if (!pet || !pet.isOwnedBy(authorId)) {
        return Result.failure(ErrorCatalog.POST_PET_REQUIRED);
      }
      const list = pet.toListDto();
      petMeta = {
        name: list.name,
        primaryPhotoUrl: list.primaryPhotoUrl,
      };
    } else {
      petId = null;
    }

    try {
      const post = await this.postRepository.create({
        authorId,
        postType: postTypeRaw,
        ...(petId !== null ? { petId } : {}),
        ...(input.bodyText !== undefined ? { bodyText: input.bodyText } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.geoLock !== undefined ? { geoLock: input.geoLock } : {}),
      });
      return Result.success(post.toOwnerDto(petMeta));
    } catch (error) {
      logUnexpectedError('CreatePostUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
