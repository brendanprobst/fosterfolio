import type { PostPublicDto } from '@api/domain/entities/Post';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type {
  FeedCursor,
  IPostRepository,
} from '@api/domain/repositories/IPostRepository';

export type FeedPageDto = {
  items: PostPublicDto[];
  nextCursor: string | null;
};

export function parseFeedCursor(raw: string | undefined): FeedCursor | null {
  if (!raw?.trim()) return null;
  const comma = raw.indexOf(',');
  if (comma <= 0) return null;
  const createdAtRaw = raw.slice(0, comma);
  const id = raw.slice(comma + 1).trim();
  const createdAt = new Date(createdAtRaw);
  if (!id || Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

export function encodeFeedCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()},${id}`;
}

export class ListFeedUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(input: {
    limit?: number;
    cursor?: string;
  }): Promise<Result<FeedPageDto>> {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    const cursor = parseFeedCursor(input.cursor);
    if (input.cursor && !cursor) {
      return Result.failure(ErrorCatalog.POST_INVALID_INPUT);
    }

    try {
      const page = await this.postRepository.listFeed({
        limit,
        ...(cursor ? { cursor } : {}),
      });
      const items = page.posts.map((row) =>
        row.post.toPublicDto({
          name: row.petName,
          primaryPhotoUrl: row.petPrimaryPhotoUrl,
        })
      );
      let nextCursor: string | null = null;
      if (page.hasMore && page.posts.length > 0) {
        const last = page.posts[page.posts.length - 1]!;
        nextCursor = encodeFeedCursor(last.post.createdAt, last.post.id);
      }
      return Result.success({ items, nextCursor });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
