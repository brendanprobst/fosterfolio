import { randomUUID } from 'crypto';
import { Post, isPostType } from '@api/domain/entities/Post';
import type {
  CreatePostInput,
  FeedCursor,
  FeedPage,
  IPostRepository,
} from '@api/domain/repositories/IPostRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

type Stored = {
  post: Post;
  petName: string | null;
  petPrimaryPhotoUrl: string | null;
  authorHandle: string | null;
};

export class InMemoryPostRepository implements IPostRepository {
  private readonly posts = new Map<string, Stored>();

  constructor(
    private readonly petRepository?: IPetRepository,
    private readonly userRepository?: IUserRepository
  ) {}

  seed(post: Post, pet?: { name: string | null; primaryPhotoUrl: string | null }): void {
    this.posts.set(post.id, {
      post,
      petName: pet?.name ?? null,
      petPrimaryPhotoUrl: pet?.primaryPhotoUrl ?? null,
      authorHandle: null,
    });
  }

  private async withAuthorHandle(row: Stored): Promise<Stored> {
    if (!this.userRepository) return row;
    const author = await this.userRepository.findById(row.post.authorId);
    return { ...row, authorHandle: author?.handle ?? null };
  }

  async findById(id: string): Promise<Stored | null> {
    const row = this.posts.get(id) ?? null;
    if (!row || row.post.deletedAt) return null;
    return this.withAuthorHandle(row);
  }

  async create(input: CreatePostInput): Promise<Post> {
    if (!isPostType(input.postType)) {
      throw new Error('invalid post type');
    }
    const now = new Date();
    const post = new Post({
      id: randomUUID(),
      authorId: input.authorId,
      postType: input.postType,
      petId: input.petId ?? null,
      bodyText: input.bodyText?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      geoLock: input.geoLock?.trim() || 'local',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    let petName: string | null = null;
    let petPrimaryPhotoUrl: string | null = null;
    if (post.petId && this.petRepository) {
      const pet = await this.petRepository.findById(post.petId);
      if (pet) {
        const dto = pet.toListDto();
        petName = dto.name;
        petPrimaryPhotoUrl = dto.primaryPhotoUrl;
      }
    }

    this.posts.set(post.id, {
      post,
      petName,
      petPrimaryPhotoUrl,
      authorHandle: null,
    });
    return post;
  }

  async save(post: Post): Promise<void> {
    const existing = this.posts.get(post.id);
    this.posts.set(post.id, {
      post,
      petName: existing?.petName ?? null,
      petPrimaryPhotoUrl: existing?.petPrimaryPhotoUrl ?? null,
      authorHandle: existing?.authorHandle ?? null,
    });
  }

  async listFeed(options: {
    limit: number;
    cursor?: FeedCursor;
  }): Promise<FeedPage> {
    const all = Array.from(this.posts.values())
      .filter((row) => !row.post.deletedAt)
      .sort((a, b) => {
        const t = b.post.createdAt.getTime() - a.post.createdAt.getTime();
        if (t !== 0) return t;
        return b.post.id.localeCompare(a.post.id);
      });

    let start = 0;
    if (options.cursor) {
      start = all.findIndex((row) => {
        const t = row.post.createdAt.getTime() - options.cursor!.createdAt.getTime();
        if (t < 0) return true;
        if (t > 0) return false;
        return row.post.id < options.cursor!.id;
      });
      if (start < 0) start = all.length;
    }

    const slice = all.slice(start, start + options.limit);
    return {
      posts: await Promise.all(slice.map((row) => this.withAuthorHandle(row))),
      hasMore: start + options.limit < all.length,
    };
  }

  async listByAuthorId(
    authorId: string,
    options?: { excludePetUpdates?: boolean }
  ): Promise<Stored[]> {
    const rows = Array.from(this.posts.values())
      .filter((row) => {
        if (row.post.deletedAt) return false;
        if (row.post.authorId !== authorId) return false;
        if (options?.excludePetUpdates && row.post.postType === 'pet_update') {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.post.createdAt.getTime() - a.post.createdAt.getTime());
    return Promise.all(rows.map((row) => this.withAuthorHandle(row)));
  }
}
