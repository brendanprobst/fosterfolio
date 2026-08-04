import type { Post, PostType } from '@api/domain/entities/Post';

export type CreatePostInput = {
  authorId: string;
  postType: PostType;
  petId?: string | null;
  bodyText?: string | null;
  imageUrl?: string | null;
  geoLock?: string;
};

export type FeedCursor = {
  createdAt: Date;
  id: string;
};

export type FeedPage = {
  posts: Array<{
    post: Post;
    petName: string | null;
    petPrimaryPhotoUrl: string | null;
  }>;
  /** True when more rows may exist beyond this page. */
  hasMore: boolean;
};

export interface IPostRepository {
  findById(id: string): Promise<{
    post: Post;
    petName: string | null;
    petPrimaryPhotoUrl: string | null;
  } | null>;
  create(input: CreatePostInput): Promise<Post>;
  save(post: Post): Promise<void>;
  listFeed(options: {
    limit: number;
    cursor?: FeedCursor;
  }): Promise<FeedPage>;
  listByAuthorId(
    authorId: string,
    options?: { excludePetUpdates?: boolean }
  ): Promise<
    Array<{
      post: Post;
      petName: string | null;
      petPrimaryPhotoUrl: string | null;
    }>
  >;
}
