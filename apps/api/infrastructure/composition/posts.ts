import { CreatePostUseCase } from '@api/application/use-cases/CreatePostUseCase';
import { GetPostUseCase } from '@api/application/use-cases/GetPostUseCase';
import { ListFeedUseCase } from '@api/application/use-cases/ListFeedUseCase';
import { ListPostsByAuthorUseCase } from '@api/application/use-cases/ListPostsByAuthorUseCase';
import { SoftDeletePostUseCase } from '@api/application/use-cases/SoftDeletePostUseCase';
import { UpdatePostUseCase } from '@api/application/use-cases/UpdatePostUseCase';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { IPostRepository } from '@api/domain/repositories/IPostRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { InMemoryPostRepository } from '@api/infrastructure/repositories/InMemoryPostRepository';
import { PostRepository } from '@api/infrastructure/repositories/PostRepository';

export type PostsModule = {
  postRepository: IPostRepository;
  getCreatePostUseCase: () => CreatePostUseCase;
  getGetPostUseCase: () => GetPostUseCase;
  getUpdatePostUseCase: () => UpdatePostUseCase;
  getSoftDeletePostUseCase: () => SoftDeletePostUseCase;
  getListFeedUseCase: () => ListFeedUseCase;
  getListPostsByAuthorUseCase: () => ListPostsByAuthorUseCase;
};

export function createPostsModule(
  dataAdapter: DataAdapter | null,
  petRepository: IPetRepository,
  userRepository: IUserRepository
): PostsModule {
  const postRepository: IPostRepository = dataAdapter
    ? new PostRepository(dataAdapter)
    : new InMemoryPostRepository(petRepository, userRepository);

  return {
    postRepository,
    getCreatePostUseCase: () =>
      new CreatePostUseCase(postRepository, petRepository),
    getGetPostUseCase: () => new GetPostUseCase(postRepository),
    getUpdatePostUseCase: () => new UpdatePostUseCase(postRepository),
    getSoftDeletePostUseCase: () => new SoftDeletePostUseCase(postRepository),
    getListFeedUseCase: () => new ListFeedUseCase(postRepository),
    getListPostsByAuthorUseCase: () =>
      new ListPostsByAuthorUseCase(postRepository, userRepository),
  };
}
